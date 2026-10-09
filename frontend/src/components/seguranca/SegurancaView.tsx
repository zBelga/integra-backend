/**
 * Módulo Segurança — porta de entrada.
 *
 * A tela é uma lista de modelos de documento. Hoje tem a ficha de EPI; os
 * próximos formulários do RH/SESMT entram aqui como novos cartões, sem mexer
 * em mais nada do sistema.
 *
 * A navegação é interna (useState) de propósito: o módulo é uma coisa só do
 * ponto de vista do menu, e assim nenhuma rota nova precisa ser criada a cada
 * modelo que for adicionado.
 */
import React, { useState } from 'react';
import { HardHat, FileText, Settings2, Lock } from 'lucide-react';
import type { PermissoesUsuario } from '../../types';
import { podeNaTela } from '../../utils/permissoes';
import { FichaEpiView } from './FichaEpiView';
import { KitsEpiView } from './KitsEpiView';

const TELA = 'seguranca.epis';

type Dentro = 'modelos' | 'ficha-epi' | 'kits';

interface Modelo {
  id: Dentro;
  nome: string;
  codigo: string;
  descricao: string;
  pronto: boolean;
}

const MODELOS: Modelo[] = [
  {
    id: 'ficha-epi',
    nome: 'Ficha de Entrega de EPI',
    codigo: 'FO-RH-05-V2',
    descricao: 'Puxa os dados do Efetivo, sugere o kit da função e sai em PDF para assinar.',
    pronto: true,
  },
];

interface Props {
  permissoes?: PermissoesUsuario | null;
  onVoltar: () => void;
}

export const SegurancaView: React.FC<Props> = ({ permissoes, onVoltar }) => {
  const [dentro, setDentro] = useState<Dentro>('modelos');
  const podeVer = podeNaTela(permissoes, TELA, 'ver');
  const podeEditar = podeNaTela(permissoes, TELA, 'editar');

  if (!podeVer) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-[#FDEBEC] border border-[#F5C6CA] flex items-center justify-center mx-auto mb-4">
            <Lock size={22} className="text-[#D64550]" />
          </div>
          <h2 className="text-lg font-bold text-[#17212B]">Acesso restrito</h2>
          <p className="text-sm text-[#687582] mt-2">
            Seu cargo não tem permissão para o módulo de Segurança.
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
  }

  if (dentro === 'ficha-epi') {
    return (
      <FichaEpiView
        permissoes={permissoes}
        onVoltar={() => setDentro('modelos')}
        onAbrirKits={() => setDentro('kits')}
      />
    );
  }

  if (dentro === 'kits') {
    return <KitsEpiView permissoes={permissoes} onVoltar={() => setDentro('ficha-epi')} />;
  }

  return (
    <div className="flex-1 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#17212B] flex items-center gap-2">
            <HardHat size={20} className="text-[#176B87]" />
            Segurança &amp; EPIs
          </h1>
          <p className="text-sm text-[#687582] mt-1">
            Gerar documentos — escolha o modelo, o sistema preenche com os dados de quem já está no Efetivo.
          </p>
        </div>
        {podeEditar && (
          <button
            onClick={() => setDentro('kits')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#176B87] border border-[#B8D4DD] bg-[#E8F3F6] hover:bg-[#d8ebf0] rounded-lg transition-colors cursor-pointer"
          >
            <Settings2 size={14} />
            Kits por função
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODELOS.map(m => (
          <button
            key={m.id}
            onClick={() => setDentro(m.id)}
            className="doc-card text-left border border-[#DDE3E8] rounded-xl p-5 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F6] border border-[#B8D4DD] flex items-center justify-center shrink-0">
                <FileText size={18} className="text-[#176B87]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#17212B] truncate">{m.nome}</h2>
                <p className="text-[11px] text-[#687582]">{m.codigo}</p>
              </div>
            </div>
            <p className="text-xs text-[#687582] leading-relaxed">{m.descricao}</p>
            <span className="inline-block mt-4 text-[11px] font-semibold text-[#176B87]">
              Gerar documento →
            </span>
          </button>
        ))}

        <div className="border border-dashed border-[#DDE3E8] rounded-xl p-5 flex flex-col justify-center">
          <p className="text-xs font-semibold text-[#17212B]">Outros formulários</p>
          <p className="text-[11px] text-[#687582] mt-1 leading-relaxed">
            Manda o modelo em Excel ou PDF que eu monto o gerador dele aqui, do
            mesmo jeito que a ficha de EPI.
          </p>
        </div>
      </div>
    </div>
  );
};
