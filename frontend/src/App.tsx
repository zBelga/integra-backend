import React, { useState, useEffect, useCallback } from 'react';
import { ActiveView, Empresa, UsuarioSessao } from './types';
import { Header } from './components/layout/Header';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { AdministrativoView } from './components/administrativo/AdministrativoView';
import { AdminSubModuleView } from './components/administrativo/AdminSubModules';
import { UsuariosMasterView } from './components/usuarios/UsuariosMasterView';
import { EmpresaSelection } from './components/empresa/EmpresaSelection';
import { PermissoesConfigView } from './components/permissoes/PermissoesConfigView';
import { SolicitacoesView } from './components/solicitacoes/SolicitacoesView';
import { LoginView } from './components/auth/LoginView';
import { DocumentosView } from './components/documentos/DocumentosView';
import { TiposDocumentoView } from './components/documentos/TiposDocumentoView';
import { DocumentosPorFuncaoView } from './components/documentos/DocumentosPorFuncaoView';
import { Toast, ToastMessage } from './components/ui/Toast';
import { fetchEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } from './services/api';

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
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [currentView, setCurrentView] = useState<ActiveView>('empresas');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadEmpresas = useCallback(async () => {
    try {
      const res = await fetchEmpresas();
      if (res.success) setEmpresas(res.data);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadEmpresas();
  }, [isAuthenticated, loadEmpresas]);

  const handleLoginSuccess = (credentials: UsuarioSessao) => {
    setCurrentUser(credentials);
    setIsAuthenticated(true);
    setCurrentView('empresas');
    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: `Bem-vindo, ${credentials.name}!`,
      message: 'Sessao autenticada. Selecione a empresa de trabalho.',
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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
          {currentView === 'empresas' && (
            <EmpresaSelection
              empresas={empresas}
              selectedEmpresa={selectedEmpresa}
              onSelectEmpresa={handleSelectEmpresa}
              onCreateEmpresa={handleCreateEmpresa}
              onUpdateEmpresa={handleUpdateEmpresa}
              onDeleteEmpresa={handleDeleteEmpresa}
            />
          )}
          {currentView === 'dashboard' && (
            <Dashboard
              onSelectModule={setCurrentView}
              selectedEmpresa={selectedEmpresa}
              onSwitchEmpresa={handleSwitchEmpresa}
              currentUser={currentUser}
            />
          )}
          {currentView === 'administrativo' && (
            <AdministrativoView onShowToast={setToast} selectedEmpresa={selectedEmpresa} />
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
                obras={[]}
                onBackToAdmissao={() => setCurrentView('administrativo')}
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
