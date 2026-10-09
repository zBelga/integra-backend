import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ActiveView, Empresa, PermissoesUsuario, UsuarioSessao } from './types';
import { Header } from './components/layout/Header';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { EmpresaSelection } from './components/empresa/EmpresaSelection';
import { Dashboard } from './components/dashboard/Dashboard';
import { LoginView } from './components/auth/LoginView';
import { RedefinirSenhaView } from './components/auth/RedefinirSenhaView';
import { Toast, ToastMessage } from './components/ui/Toast';

/**
 * Telas pesadas carregadas só quando alguém entra nelas.
 *
 * Antes, abrir o login já baixava o sistema inteiro — perfil do colaborador,
 * gestão de usuários, matriz de permissões, tipos de documento. Agora cada
 * uma vira um arquivo separado, buscado no primeiro acesso àquela tela e
 * guardado no cache do navegador. O que todo mundo usa sempre (login, seleção
 * de empresa, painel, menu) continua vindo junto, sem espera.
 */
const AdministrativoView = lazy(() =>
  import('./components/administrativo/AdministrativoView').then(m => ({ default: m.AdministrativoView })));
const AdminSubModuleView = lazy(() =>
  import('./components/administrativo/AdminSubModules').then(m => ({ default: m.AdminSubModuleView })));
const UsuariosMasterView = lazy(() =>
  import('./components/usuarios/UsuariosMasterView').then(m => ({ default: m.UsuariosMasterView })));
const PermissoesConfigView = lazy(() =>
  import('./components/permissoes/PermissoesConfigView').then(m => ({ default: m.PermissoesConfigView })));
const SolicitacoesView = lazy(() =>
  import('./components/solicitacoes/SolicitacoesView').then(m => ({ default: m.SolicitacoesView })));
const DocumentosView = lazy(() =>
  import('./components/documentos/DocumentosView').then(m => ({ default: m.DocumentosView })));
const TiposDocumentoView = lazy(() =>
  import('./components/documentos/TiposDocumentoView').then(m => ({ default: m.TiposDocumentoView })));
const DocumentosPorFuncaoView = lazy(() =>
  import('./components/documentos/DocumentosPorFuncaoView').then(m => ({ default: m.DocumentosPorFuncaoView })));

/** Enquanto o arquivo da tela chega (normalmente alguns milissegundos). */
const CarregandoTela: React.FC = () => (
  <div className="flex-1 flex items-center justify-center p-16">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#176B87] border-t-transparent" />
      <p className="mt-3 text-xs text-[#687582]">Carregando...</p>
    </div>
  </div>
);
import {
  fetchEmpresas,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  fetchPermissoesUsuario,
  setEmpresaAtiva,
  clearEmpresaAtiva,
  EVENTO_SENHA_PROVISORIA,
} from './services/api';
import { podeNaTela, ehMaster } from './utils/permissoes';

/**
 * Qual tela do catálogo de permissões libera cada view.
 * View fora desta lista é livre (painel, seleção de empresa, "em breve").
 * As views marcadas 'master' são exclusivas do administrador geral.
 */
const TELA_DA_VIEW: Partial<Record<ActiveView, string>> = {
  administrativo: 'administrativo.admissoes',
  efetivo: 'administrativo.efetivo',
  'efetivo-obra': 'administrativo.efetivoObra',
  documentos: 'documentacao.documentos',
  'colaborador-perfil': 'documentacao.documentos',
  'documento-tipos': 'documentacao.tipos',
  'documentos-funcao': 'documentacao.porFuncao',
  solicitacoes: 'aprovacoes.solicitacoes',
  permissoes: 'master',
  usuarios: 'master',
};

/** Tela bloqueada pelo cargo */
const AcessoRestrito: React.FC<{ onVoltar: () => void }> = ({ onVoltar }) => (
  <div className="flex-1 flex items-center justify-center p-6">
    <div className="text-center max-w-md">
      <div className="w-14 h-14 rounded-2xl bg-[#FDEBEC] border border-[#F5C6CA] flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl" aria-hidden="true">🔒</span>
      </div>
      <h2 className="text-lg font-bold text-[#17212B]">Acesso restrito</h2>
      <p className="text-sm text-[#687582] mt-2 leading-relaxed">
        Seu cargo não tem permissão para esta tela. Se você precisa dela, peça a
        liberação em Cargos &amp; Permissões.
      </p>
      <button
        onClick={onVoltar}
        className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-[#176B87] hover:bg-[#135a73] rounded-lg transition-colors cursor-pointer"
      >
        Voltar aos módulos
      </button>
    </div>
  </div>
);

/** Placeholder para telas que ainda não existem */
const EmBreve: React.FC<{ titulo: string; onVoltar: () => void }> = ({ titulo, onVoltar }) => (
  <div className="flex-1 flex items-center justify-center p-6">
    <div className="text-center max-w-md">
      <div className="w-14 h-14 rounded-2xl bg-[#F4F6F8] border border-[#DDE3E8] flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl" aria-hidden="true">🚧</span>
      </div>
      <h2 className="text-lg font-bold text-[#17212B]">{titulo}</h2>
      <p className="text-sm text-[#687582] mt-2 leading-relaxed">
        Este módulo ainda está em desenvolvimento. Ele já aparece no menu para
        você acompanhar a estrutura final do sistema.
      </p>
      <button
        onClick={onVoltar}
        className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-[#176B87] hover:bg-[#135a73] rounded-lg transition-colors cursor-pointer"
      >
        Voltar aos módulos
      </button>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UsuarioSessao>({
    email: 'fabriciooliveira2431@gmail.com',
    name: 'Fabrício Oliveira',
    role: 'Administrador Geral',
  });
  const [permissoes, setPermissoes] = useState<PermissoesUsuario | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [currentView, setCurrentView] = useState<ActiveView>('empresas');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  /**
   * Primeiro acesso: a senha ainda é a que o administrador cadastrou.
   * Vem da resposta do login (é a fonte da verdade) e qualquer rota que
   * responda "troque a senha" também acende isto, como garantia.
   */
  const [precisaRedefinirSenha, setPrecisaRedefinirSenha] = useState(false);

  useEffect(() => {
    const aoAvisar = () => setPrecisaRedefinirSenha(true);
    window.addEventListener(EVENTO_SENHA_PROVISORIA, aoAvisar);
    return () => window.removeEventListener(EVENTO_SENHA_PROVISORIA, aoAvisar);
  }, []);

  /** A view atual é liberada para o cargo? (o servidor confere de novo) */
  const telaDaView = TELA_DA_VIEW[currentView];
  const viewLiberada = !telaDaView
    ? true
    : !permissoes
      ? false // sem resposta do servidor ainda: não mostra nada
      : telaDaView === 'master'
        ? ehMaster(permissoes)
        : podeNaTela(permissoes, telaDaView, 'ver');
  const telaBloqueada = !!permissoes && !viewLiberada;

  const loadEmpresas = useCallback(async () => {
    try {
      const res = await fetchEmpresas();
      if (res.success) setEmpresas(res.data);
    } catch {
      // silencioso
    }
  }, []);

  /** Permissões do cargo — sem elas, a tela assume o mínimo (só visualizar). */
  const loadPermissoes = useCallback(async () => {
    try {
      const res = await fetchPermissoesUsuario();
      if (res.success) setPermissoes(res.data);
    } catch {
      setPermissoes(null);
    }
  }, []);

  useEffect(() => {
    // Enquanto a senha for a provisória o sistema está fechado no servidor:
    // nem adianta pedir empresas ou permissões.
    if (isAuthenticated && !precisaRedefinirSenha) {
      loadEmpresas();
      loadPermissoes();
    }
  }, [isAuthenticated, precisaRedefinirSenha, loadEmpresas, loadPermissoes]);

  const handleLoginSuccess = (credentials: UsuarioSessao, precisaRedefinir = false) => {
    setCurrentUser(credentials);
    setIsAuthenticated(true);
    setCurrentView('empresas');

    // Primeiro acesso: cai direto na tela de redefinir senha, sem toast
    if (precisaRedefinir) {
      setPrecisaRedefinirSenha(true);
      return;
    }

    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: `Bem-vindo, ${credentials.name}!`,
      message: 'Sessao autenticada. Selecione a empresa de trabalho.',
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    clearEmpresaAtiva();
    setPrecisaRedefinirSenha(false);
    setSelectedEmpresa(null);
    setEmpresas([]);
    setCurrentView('empresas');
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Sessao Encerrada',
      message: 'Voce saiu do sistema com seguranca.',
    });
  };

  const handleSelectEmpresa = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setEmpresaAtiva(empresa.id); // viaja em todo pedido daqui pra frente
    setCurrentView('dashboard');
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Empresa Selecionada',
      message: `Empresa ativa: ${empresa.nome}`,
    });
  };

  const handleSwitchEmpresa = () => {
    setCurrentView('empresas');
  };

  const handleCreateEmpresa = async (newEmpresaData: Omit<Empresa, 'id' | 'obrasCount' | 'colaboradoresCount'>) => {
    try {
      const res = await createEmpresa(newEmpresaData);
      if (res.success && res.data) {
        setEmpresas(prev => [res.data!, ...prev]);
        setToast({ id: Date.now().toString(), type: 'success', title: 'Empresa Cadastrada', message: `${res.data.nome} cadastrada com sucesso!` });
      }
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    }
  };

  const handleUpdateEmpresa = async (
    empresaData: Omit<Empresa, 'id' | 'obrasCount' | 'colaboradoresCount'>,
    id?: string
  ) => {
    if (!id) return;
    try {
      const res = await updateEmpresa(id, empresaData);
      if (res.success && res.data) {
        setEmpresas(prev => prev.map(emp => emp.id === id ? res.data! : emp));
        if (selectedEmpresa?.id === id) setSelectedEmpresa(res.data);
        setToast({ id: Date.now().toString(), type: 'success', title: 'Empresa Atualizada', message: `${empresaData.nome} atualizada com sucesso!` });
      }
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    }
  };

  const handleDeleteEmpresa = async (id: string) => {
    try {
      const res = await deleteEmpresa(id);
      if (res.success) {
        setEmpresas(prev => prev.filter(emp => emp.id !== id));
        if (selectedEmpresa?.id === id) {
          setSelectedEmpresa(null);
          setCurrentView('empresas');
        }
        setToast({ id: Date.now().toString(), type: 'success', title: 'Empresa Excluida', message: res.message || 'Empresa removida com sucesso.' });
      }
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    }
  };

  const isSidebarVisible = currentView !== 'empresas' && currentView !== 'usuarios';

  if (!isAuthenticated) {
    return (
      <>
        <LoginView onLogin={handleLoginSuccess} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  // Primeiro acesso: o sistema não abre antes de a pessoa criar a senha dela.
  if (precisaRedefinirSenha) {
    return (
      <>
        <RedefinirSenhaView
          nome={currentUser?.name}
          email={currentUser?.email}
          onPronto={() => {
            setPrecisaRedefinirSenha(false);
            setToast({
              id: Date.now().toString(),
              type: 'success',
              title: 'Senha criada',
              message: 'Pronto! Agora é só usar o sistema normalmente.',
            });
          }}
          onSair={handleLogout}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex text-[#17212B] font-sans antialiased">
      {isSidebarVisible && (
        <LeftSidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          selectedEmpresa={selectedEmpresa}
          currentUser={currentUser}
          permissoes={permissoes}
          onLogout={handleLogout}
        />
      )}

      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarVisible
            ? isSidebarCollapsed
              ? 'lg:ml-20'
              : 'lg:ml-64'
            : 'ml-0'
        }`}
      >
        <Header
          currentView={currentView}
          onNavigate={setCurrentView}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          showMobileToggle={isSidebarVisible}
          selectedEmpresa={selectedEmpresa}
          onSwitchEmpresa={handleSwitchEmpresa}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1">
          {telaBloqueada && <AcessoRestrito onVoltar={() => setCurrentView('dashboard')} />}
          {!telaBloqueada && (<Suspense fallback={<CarregandoTela />}>
          {currentView === 'empresas' && (
            <EmpresaSelection
              empresas={empresas}
              selectedEmpresa={selectedEmpresa}
              onSelectEmpresa={handleSelectEmpresa}
              onCreateEmpresa={handleCreateEmpresa}
              onUpdateEmpresa={handleUpdateEmpresa}
              onDeleteEmpresa={handleDeleteEmpresa}
              podeGerenciar={!!permissoes?.master}
            />
          )}
          {currentView === 'dashboard' && (
            <Dashboard
              onSelectModule={setCurrentView}
              selectedEmpresa={selectedEmpresa}
              onSwitchEmpresa={handleSwitchEmpresa}
              currentUser={currentUser}
              permissoes={permissoes}
            />
          )}
          {currentView === 'administrativo' && (
            <AdministrativoView onShowToast={setToast} selectedEmpresa={selectedEmpresa} permissoes={permissoes} />
          )}
          {(currentView === 'efetivo-obra' || currentView === 'seguranca' || currentView === 'almoxarifado') && (
            <EmBreve
              titulo={
                currentView === 'efetivo-obra' ? 'Efetivo por Obra'
                : currentView === 'seguranca'  ? 'Segurança & EPIs'
                : 'Almoxarifado & Materiais'
              }
              onVoltar={() => setCurrentView('dashboard')}
            />
          )}
          {currentView === 'efetivo' && (
            <div className="flex-1 overflow-y-auto p-6">
              <AdminSubModuleView
                section="efetivo"
                onBackToAdmissao={() => setCurrentView('administrativo')}
                permissoes={permissoes}
              />
            </div>
          )}
          {currentView === 'documentos' && (
            <DocumentosView
              selectedEmpresaId={selectedEmpresa?.id}
              onConfigurarExigencias={() => setCurrentView('documentos-funcao')}
            />
          )}
          {currentView === 'documento-tipos' && <TiposDocumentoView />}
          {currentView === 'documentos-funcao' && <DocumentosPorFuncaoView />}
          {currentView === 'solicitacoes' && (
            <SolicitacoesView selectedEmpresa={selectedEmpresa} onShowToast={setToast} onNavigate={setCurrentView} />
          )}
          {currentView === 'permissoes' && (
            <PermissoesConfigView selectedEmpresa={selectedEmpresa} onShowToast={setToast} />
          )}
          {currentView === 'usuarios' && (
            <UsuariosMasterView
              empresas={empresas}
              selectedEmpresa={selectedEmpresa}
              currentUser={currentUser}
              onShowToast={setToast}
              onSelectEmpresa={handleSelectEmpresa}
              onNavigate={setCurrentView}
            />
          )}
          </Suspense>)}
        </main>

        <Toast toast={toast} onClose={() => setToast(null)} />

        <footer className="bg-white border-t border-[#DDE3E8] py-4 mt-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#687582] gap-2">
            <p>© 2026 Íntegra - Gestão Operacional & RH. Todos os direitos reservados.</p>
            <div className="flex items-center space-x-4 text-[11px]">
              <span className="text-[#159A72] font-medium">● LGPD & SSL 256-bit</span>
              <span>•</span>
              <span>Suporte Multi-Empresas</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
