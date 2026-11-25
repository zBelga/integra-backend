/**
 * Segurança → Gerar documentos → Movimentação de Pessoal (FO-RH-12-V1).
 *
 * Mesmo padrão do Relatório de Atividades: escolhe o colaborador no Efetivo,
 * o sistema preenche a situação atual; o resto é digitado. Gera PDF no
 * navegador, sem gravar nada no banco.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Search, FileDown, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { fetchColaboradores, fetchObras } from '../../services/api';
import type { Obra } from '../../types';
import type { Colaborador, PermissoesUsuario } from '../../types';
import { podeNaTela } from '../../utils/permissoes';
import { baixarBlob } from '../../utils/fichaEpiPdf';
import {
  gerarMovimentacaoPessoalDocx,
  nomeArquivoMovimentacaoDocx,
} from '../../utils/movimentacaoPessoalDocx';

const TELA = 'seguranca.epis';

function chaveTexto(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

function hojeIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Texto da obra como aparece no formulário: "OBRA 085 - NOME" */
function rotuloObra(o: Obra): string {
  const nome = String(o.nome || '').trim();
  const codigo = String(o.codigo || '').trim();
  if (/^OBRA\b/i.test(nome)) return nome.toUpperCase();
  return codigo ? `OBRA ${codigo} - ${nome}`.toUpperCase() : nome.toUpperCase();
}

interface Props {
  onVoltar: () => void;
  permissoes?: PermissoesUsuario | null;
}

export const MovimentacaoPessoalView: React.FC<Props> = ({ onVoltar, permissoes }) => {
  const podeGerar = podeNaTela(permissoes, TELA, 'ver');

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState('');
  const [gerando, setGerando] = useState(false);

  // Situação atual (puxada do Efetivo)
  const [busca, setBusca] = useState('');
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const campoBusca = useRef<HTMLDivElement>(null);
  const [nome, setNome] = useState('');
  const [registro, setRegistro] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [cargo, setCargo] = useState('');
  const [salario, setSalario] = useState('');
  const [baseAtual, setBaseAtual] = useState<'' | 'mensal' | 'horario'>('');

  // Mudança de situação
  // Este modelo é só para transferência de obra
  const [mudDepartamento, setMudDepartamento] = useState('');
  const [mudCargo, setMudCargo] = useState('');
  const [mudSalario, setMudSalario] = useState('');
  const [superiorImediato, setSuperiorImediato] = useState('');
  const [valorProposto, setValorProposto] = useState('');
  const [baseProposta, setBaseProposta] = useState<'' | 'mensal' | 'horario'>('');
  const [funcaoProposta, setFuncaoProposta] = useState('');
  const [dataMudanca, setDataMudanca] = useState(hojeIso());

  // Cabeçalho
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [dataFormulario, setDataFormulario] = useState(hojeIso());

  useEffect(() => {
    let ativo = true;
    fetchObras()
      .then(res => { if (ativo) setObras(res.data || []); })
      .catch(() => { /* sem obras: o campo continua digitável */ });
    fetchColaboradores({ limit: 500, status: 'ativo' })
      .then(res => { if (ativo) setColaboradores(res.data || []); })
      .catch((e: any) => { if (ativo) setErro(e.message || 'Não foi possível carregar o efetivo.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!sugestoesAbertas) return;
    const fora = (e: MouseEvent) => {
      if (campoBusca.current && !campoBusca.current.contains(e.target as Node)) setSugestoesAbertas(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [sugestoesAbertas]);

  const sugestoes = useMemo(() => {
    const t = chaveTexto(busca);
    const lista = !t
      ? colaboradores
      : colaboradores.filter(c => chaveTexto(c.nome).includes(t) || String(c.numero_chapa || '').includes(busca.trim()));
    return lista.slice(0, 50);
  }, [colaboradores, busca]);

  const escolher = (c: Colaborador) => {
    setNome(c.nome || '');
    setRegistro(c.numero_chapa || '');
    setDepartamento(c.obra_nome || c.obra_codigo || '');
    setCargo(c.funcao || '');
    setBusca(c.nome || '');
    setSugestoesAbertas(false);
    setFeito(''); setErro('');
  };

  const limpar = () => {
    setBusca(''); setNome(''); setRegistro(''); setDepartamento(''); setCargo('');
    setSalario(''); setBaseAtual('');
    setFeito(''); setErro('');
  };

  const gerar = async () => {
    setErro(''); setFeito('');
    if (!nome.trim()) return setErro('Escolha o colaborador no Efetivo.');

    setGerando(true);
    try {
      const blob = await gerarMovimentacaoPessoalDocx({
        elaboradoPor: elaboradoPor.trim(),
        dataFormulario,
        nome: nome.trim(),
        registro: registro.trim(),
        departamento: departamento.trim(),
        cargo: cargo.trim(),
        salario: salario.trim(),
        baseMensal: baseAtual === '' ? null : baseAtual === 'mensal',
        superiorImediato: superiorImediato.trim(),
        mudDepartamento: mudDepartamento.trim(),
        dataMudanca,
        // Transferência de obra: cargo, salário e base não mudam
        valorProposto: salario.trim(),
        funcaoProposta: cargo.trim(),
      });
      baixarBlob(blob, nomeArquivoMovimentacaoDocx(nome, dataFormulario));
      setFeito(`Movimentação de ${nome.trim()} gerada.`);
    } catch (e: any) {
      setErro(e.message || 'Não foi possível gerar o PDF.');
    } finally {
      setGerando(false);
    }
  };

  const classeCampo =
    'mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87] bg-white';
  const rotulo = 'text-[11px] font-semibold text-[#17212B]';

  if (!podeGerar) {
    return (
      <div className="p-6 text-sm text-[#687582]">
        Seu cargo não tem permissão para gerar este documento.
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-4xl">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-xs font-semibold text-[#176B87] mb-4 cursor-pointer">
        <ArrowLeft size={14} /> Voltar aos modelos
      </button>
      <h1 className="text-xl font-bold text-[#17212B]">Movimentação de Pessoal — CLT</h1>
      <p className="text-sm text-[#687582] mt-1">
        Modelo FO-RH-12-V1. Escolha o colaborador; o restante é digitado e o PDF sai com a mesma estrutura do formulário.
      </p>

      {erro && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[#FDEBEC] border border-[#F5C6CA] text-xs text-[#A8323C]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {erro}
        </div>
      )}
      {feito && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[#E8F6F1] border border-[#B8E8D9] text-xs text-[#0F7A5A]">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {feito}
        </div>
      )}

      {/* Situação atual */}
      <section className="mt-6 border border-[#DDE3E8] rounded-xl p-5 bg-white">
        <h2 className="text-sm font-bold text-[#17212B] mb-4">1. Situação atual</h2>

        <div className={rotulo}>Colaborador (busca no Efetivo)</div>
        <div ref={campoBusca} className="relative mt-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8995A1]" />
            <input
              value={busca}
              onChange={e => { setBusca(e.target.value); setSugestoesAbertas(true); }}
              onFocus={() => setSugestoesAbertas(true)}
              placeholder={carregando ? 'Carregando efetivo…' : 'Digite o nome ou a chapa'}
              className="w-full pl-9 pr-9 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]"
              disabled={carregando}
            />
            {busca && (
              <button onClick={limpar} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8995A1] cursor-pointer" aria-label="Limpar">
                <X size={14} />
              </button>
            )}
          </div>
          {sugestoesAbertas && sugestoes.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-auto bg-white border border-[#DDE3E8] rounded-lg shadow-lg">
              {sugestoes.map(c => (
                <li key={c.id}>
                  <button onClick={() => escolher(c)} className="w-full text-left px-3 py-2 text-xs hover:bg-[#F0F7F9] cursor-pointer">
                    <span className="font-semibold text-[#17212B]">{c.nome}</span>
                    <span className="text-[#8995A1]"> · chapa {c.numero_chapa || '—'} · {c.funcao || '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block"><span className={rotulo}>Registro</span>
            <input value={registro} onChange={e => setRegistro(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Departamento / Obra</span>
            <input value={departamento} onChange={e => setDepartamento(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Cargo</span>
            <input value={cargo} onChange={e => setCargo(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Salário</span>
            <input value={salario} onChange={e => setSalario(e.target.value)} placeholder="R$ 0,00" className={classeCampo} /></label>
          <label className="block sm:col-span-2"><span className={rotulo}>Base de pagamento</span>
            <select value={baseAtual} onChange={e => setBaseAtual(e.target.value as any)} className={classeCampo}>
              <option value="">Não informar</option>
              <option value="mensal">Mensal</option>
              <option value="horario">Horário</option>
            </select></label>
        </div>
      </section>

      {/* Mudança de situação */}
      <section className="mt-5 border border-[#DDE3E8] rounded-xl p-5 bg-white">
        <h2 className="text-sm font-bold text-[#17212B] mb-4">2. Mudança de situação</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block sm:col-span-2"><span className={rotulo}>Departamento / Obra de destino</span>
            <select value={mudDepartamento} onChange={e => setMudDepartamento(e.target.value)} className={classeCampo}>
              <option value="">{obras.length ? 'Escolha a obra' : 'Carregando obras…'}</option>
              {obras.map(o => (
                <option key={o.id} value={rotuloObra(o)}>{rotuloObra(o)}</option>
              ))}
            </select></label>
          <label className="block sm:col-span-2"><span className={rotulo}>Superior imediato</span>
            <input value={superiorImediato} onChange={e => setSuperiorImediato(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Data da mudança</span>
            <input type="date" value={dataMudanca} onChange={e => setDataMudanca(e.target.value)} className={classeCampo} /></label>
        </div>

      </section>

      {/* Cabeçalho do formulário */}
      <section className="mt-5 border border-[#DDE3E8] rounded-xl p-5 bg-white">
        <h2 className="text-sm font-bold text-[#17212B] mb-4">3. Elaboração</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block"><span className={rotulo}>Elaborado por</span>
            <input value={elaboradoPor} onChange={e => setElaboradoPor(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Data do formulário</span>
            <input type="date" value={dataFormulario} onChange={e => setDataFormulario(e.target.value)} className={classeCampo} /></label>
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <button
          onClick={gerar}
          disabled={gerando || !nome}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#176B87] hover:bg-[#135a73] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
        >
          {gerando ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {gerando ? 'Gerando…' : 'Gerar movimentação em PDF'}
        </button>
      </div>
    </div>
  );
};
