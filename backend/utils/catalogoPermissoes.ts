/**
 * Catálogo de acesso do ÍNTEGRA: módulos, as telas de cada módulo e as ações
 * especiais de cada tela.
 *
 * É a lista única do sistema — o servidor confere por ela e a tela de
 * "Cargos & Permissões" é desenhada a partir dela (o frontend busca em
 * GET /api/permissoes/catalogo). Tela nova no sistema entra aqui e aparece
 * sozinha na configuração, já fechada para todo mundo menos o master.
 */

export type AcaoTela = 'ver' | 'criar' | 'editar' | 'excluir';

export const ACOES_TELA: AcaoTela[] = ['ver', 'criar', 'editar', 'excluir'];

export interface ExtraTela {
  /** id curto, guardado no banco */
  id: string;
  nome: string;
  descricao: string;
}

export interface TelaInfo {
  id: string;
  nome: string;
  descricao: string;
  /** Ações que só existem nesta tela (contratar, baixar arquivo, exportar…) */
  extras: ExtraTela[];
  /** Ações do quadrado padrão que esta tela não tem */
  semAcoes?: AcaoTela[];
}

export interface ModuloInfo {
  id: string;
  nome: string;
  descricao: string;
  telas: TelaInfo[];
  /** Módulo ainda não construído: aparece desabilitado na configuração */
  emBreve?: boolean;
}

export const CATALOGO: ModuloInfo[] = [
  {
    id: 'administrativo',
    nome: 'Administrativo',
    descricao: 'Admissões, efetivo e obras',
    telas: [
      {
        id: 'admissoes',
        nome: 'Admissões',
        descricao: 'Fichas de admissão e abas de contratados',
        extras: [
          { id: 'contratar', nome: 'Contratar', descricao: 'Mover a admissão para o efetivo' },
          { id: 'importar', nome: 'Importar planilha', descricao: 'Cadastrar admissões em lote' },
          { id: 'exportar', nome: 'Exportar Excel', descricao: 'Baixar a lista filtrada' },
        ],
      },
      {
        id: 'efetivo',
        nome: 'Efetivo Geral',
        descricao: 'Colaboradores contratados da empresa',
        extras: [
          { id: 'exportar', nome: 'Exportar Excel', descricao: 'Baixar a lista do efetivo' },
          { id: 'desligar', nome: 'Desligar', descricao: 'Registrar o desligamento do colaborador' },
        ],
      },
      {
        id: 'efetivoObra',
        nome: 'Efetivo por Obra',
        descricao: 'Equipe alocada em cada obra',
        extras: [{ id: 'remanejar', nome: 'Remanejar de obra', descricao: 'Trocar o colaborador de obra' }],
      },
      {
        id: 'obras',
        nome: 'Gerenciar Obras',
        descricao: 'Cadastro de obras e códigos',
        extras: [],
      },
    ],
  },
  {
    id: 'documentacao',
    nome: 'Documentação',
    descricao: 'Documentos dos colaboradores e suas regras',
    telas: [
      {
        id: 'documentos',
        nome: 'Documentos do colaborador',
        descricao: 'Checklist, anexos, substituição e histórico',
        extras: [
          { id: 'baixar', nome: 'Baixar arquivo', descricao: 'Abrir e baixar o arquivo anexado' },
          { id: 'restaurar', nome: 'Restaurar excluído', descricao: 'Trazer de volta um documento excluído' },
        ],
      },
      {
        id: 'tipos',
        nome: 'Tipos de Documentos',
        descricao: 'Catálogo: ASO, NR-06, CTPS, Comprovante...',
        extras: [],
      },
      {
        id: 'porFuncao',
        nome: 'Documentos por Função',
        descricao: 'O que cada função precisa entregar',
        extras: [],
      },
    ],
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    descricao: 'Consultas consolidadas',
    telas: [
      {
        id: 'gerais',
        nome: 'Relatórios gerais',
        descricao: 'Painéis e consultas',
        extras: [{ id: 'exportar', nome: 'Exportar dados', descricao: 'Baixar os dados do relatório' }],
        semAcoes: ['criar', 'editar', 'excluir'],
      },
    ],
  },
  {
    id: 'aprovacoes',
    nome: 'Aprovações',
    descricao: 'Pedidos de alteração que passam por alguém',
    telas: [
      {
        id: 'solicitacoes',
        nome: 'Solicitações',
        descricao: 'Criar = solicitar alteração',
        extras: [{ id: 'aprovar', nome: 'Aprovar / recusar', descricao: 'Decidir as solicitações do time' }],
        semAcoes: ['excluir'],
      },
    ],
  },
  {
    id: 'seguranca',
    nome: 'Segurança & EPIs',
    descricao: 'Fichas e entrega de equipamento de proteção',
    telas: [
      {
        id: 'epis',
        nome: 'Ficha de EPI',
        descricao: 'Gerar a ficha de entrega e manter os kits por função',
        extras: [{ id: 'gerar', nome: 'Gerar documento', descricao: 'Baixar a ficha preenchida em PDF' }],
      },
    ],
  },
  {
    id: 'almoxarifado',
    nome: 'Almoxarifado',
    descricao: 'Módulo em desenvolvimento',
    emBreve: true,
    telas: [{ id: 'estoque', nome: 'Estoque e materiais', descricao: 'Em desenvolvimento', extras: [] }],
  },
];

/** 'administrativo.admissoes' → { modulo, tela } */
export function partirChave(chave: string): { modulo: string; tela: string } {
  const [modulo, tela] = String(chave).split('.');
  return { modulo: modulo || '', tela: tela || '' };
}

export function buscarTela(chave: string): { modulo: ModuloInfo; tela: TelaInfo } | null {
  const { modulo, tela } = partirChave(chave);
  const m = CATALOGO.find(x => x.id === modulo);
  if (!m) return null;
  const t = m.telas.find(x => x.id === tela);
  if (!t) return null;
  return { modulo: m, tela: t };
}

/** Todas as chaves 'modulo.tela' do sistema. */
export function todasAsChaves(): string[] {
  const saida: string[] = [];
  CATALOGO.forEach(m => m.telas.forEach(t => saida.push(`${m.id}.${t.id}`)));
  return saida;
}
