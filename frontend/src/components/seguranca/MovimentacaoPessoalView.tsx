/**
 * Segurança → Gerar documentos → Movimentação de Pessoal (FO-RH-12-V1).
 *
 * Mesmo padrão do Relatório de Atividades: escolhe o colaborador no Efetivo,
 * o sistema preenche a situação atual; o resto é digitado. Gera PDF no
 * navegador, sem gravar nada no banco.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Search, FileDown, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { fetchColaboradores } from '../../services/api';
import type { Colaborador, PermissoesUsuario } from '../../types';
import { podeNaTela } from '../../utils/permissoes';
import { baixarBlob } from '../../utils/fichaEpiPdf';
import {
  gerarMovimentacaoPessoalPdf,
  nomeArquivoMovimentacao,
  type TipoMudanca,
  type FeriasModo,
} from '../../utils/movimentacaoPessoalPdf';

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

const TIPOS: { valor: TipoMudanca; rotulo: string }[] = [
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'aumento', rotulo: 'Aumento de mérito' },
  { valor: 'promocao', rotulo: 'Promoção' },
  { valor: 'ferias', rotulo: 'Férias' },
  { valor: 'outros', rotulo: 'Outros' },
];

interface Props {
  onVoltar: () => void;
  permissoes?: PermissoesUsuario | null;
}

export const MovimentacaoPessoalView: React.FC<Props> = ({ onVoltar, permissoes }) => {
  const podeGerar = podeNaTela(permissoes, TELA, 'ver');

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
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
  const [tipo, setTipo] = useState<TipoMudanca>('transferencia');
  const [mudDepartamento, setMudDepartamento] = useState('');
  const [mudCargo, setMudCargo] = useState('');
  const [mudSalario, setMudSalario] = useState('');
  const [superiorImediato, setSuperiorImediato] = useState('');
  const [valorProposto, setValorProposto] = useState('');
  const [baseProposta, setBaseProposta] = useState<'' | 'mensal' | 'horario'>('');
  const [funcaoProposta, setFuncaoProposta] = useState('');
  const [dataMudanca, setDataMudanca] = useState(hojeIso());
  const [dataFerias, setDataFerias] = useState('');
  const [feriasModo, setFeriasModo] = useState<FeriasModo>('');

  // Cabeçalho
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [dataFormulario, setDataFormulario] = useState(hojeIso());

  useEffect(() => {
    let ativo = true;
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
    if (tipo === '') return setErro('Escolha o tipo de movimentação.');

    setGerando(true);
    try {
      const blob = await gerarMovimentacaoPessoalPdf({
        elaboradoPor: elaboradoPor.trim(),
        dataFormulario,
        nome: nome.trim(),
        registro: registro.trim(),
        departamento: departamento.trim(),
        cargo: cargo.trim(),
        salario: salario.trim(),
        baseMensal: baseAtual === '' ? null : baseAtual === 'mensal',
        tipo,
        mudDepartamento: mudDepartamento.trim(),
        mudCargo: mudCargo.trim(),
        mudSalario: mudSalario.trim(),
        superiorImediato: superiorImediato.trim(),
        valorProposto: valorProposto.trim(),
        mudBaseMensal: baseProposta === '' ? null : baseProposta === 'mensal',
        funcaoProposta: funcaoProposta.trim(),
        dataMudanca,
        dataFerias,
        feriasModo: tipo === 'ferias' ? feriasModo : '',
      });
      baixarBlob(blob, nomeArquivoMovimentacao(nome, dataFormulario));
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

        <div className="flex flex-wrap gap-2">
          {TIPOS.map(t => (
            <button
              key={t.valor}
              onClick={() => setTipo(t.valor)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
                tipo === t.valor ? 'bg-[#176B87] text-white border-[#176B87]' : 'bg-white text-[#17212B] border-[#DDE3E8] hover:bg-[#F0F7F9]'
              }`}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block sm:col-span-2"><span className={rotulo}>Departamento / Obra de destino</span>
            <input value={mudDepartamento} onChange={e => setMudDepartamento(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Cargo proposto</span>
            <input value={mudCargo} onChange={e => setMudCargo(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Salário proposto</span>
            <input value={mudSalario} onChange={e => setMudSalario(e.target.value)} placeholder="R$ 0,00" className={classeCampo} /></label>
          <label className="block sm:col-span-2"><span className={rotulo}>Superior imediato</span>
            <input value={superiorImediato} onChange={e => setSuperiorImediato(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Valor proposto</span>
            <input value={valorProposto} onChange={e => setValorProposto(e.target.value)} placeholder="R$ 0,00" className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Base proposta</span>
            <select value={baseProposta} onChange={e => setBaseProposta(e.target.value as any)} className={classeCampo}>
              <option value="">Não informar</option>
              <option value="mensal">Mensal</option>
              <option value="horario">Horário</option>
            </select></label>
          <label className="block"><span className={rotulo}>Função proposta</span>
            <input value={funcaoProposta} onChange={e => setFuncaoProposta(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Data da mudança</span>
            <input type="date" value={dataMudanca} onChange={e => setDataMudanca(e.target.value)} className={classeCampo} /></label>
          <label className="block"><span className={rotulo}>Data para férias</span>
            <input type="date" value={dataFerias} onChange={e => setDataFerias(e.target.value)} className={classeCampo} /></label>
          {tipo === 'ferias' && (
            <label className="block"><span className={rotulo}>Modo das férias</span>
              <select value={feriasModo} onChange={e => setFeriasModo(e.target.value as FeriasModo)} className={classeCampo}>
                <option value="">Não marcar</option>
                <option value="20+10">20 dias + 10 de abono</option>
                <option value="30">30 dias</option>
              </select></label>
          )}
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
