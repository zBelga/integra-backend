// Configuração central dos tipos de documentos do módulo

export interface TipoDocumentoConfig {
  codigo: string;
  nome: string;
  categoria: 'admissional' | 'saude' | 'treinamento' | 'pessoal' | 'outros';
  obrigatorio: boolean;
  temVencimento: boolean;
  validadeMeses?: number; // usado para sugerir a data de vencimento automaticamente
}

export const TIPOS_DOCUMENTO: TipoDocumentoConfig[] = [
  // ─── Saúde ocupacional ───
  { codigo: 'ASO',            nome: 'ASO — Atestado de Saúde Ocupacional', categoria: 'saude', obrigatorio: true,  temVencimento: true,  validadeMeses: 12 },
  { codigo: 'ASO_RETORNO',    nome: 'ASO de Retorno ao Trabalho',          categoria: 'saude', obrigatorio: false, temVencimento: true,  validadeMeses: 12 },
  { codigo: 'EXAME_COMP',     nome: 'Exames Complementares',               categoria: 'saude', obrigatorio: false, temVencimento: true,  validadeMeses: 12 },

  // ─── Treinamentos / NRs ───
  { codigo: 'NR-06',          nome: 'NR-06 — Ficha de EPI',                categoria: 'treinamento', obrigatorio: true,  temVencimento: false },
  { codigo: 'NR-10',          nome: 'NR-10 — Segurança em Eletricidade',   categoria: 'treinamento', obrigatorio: false, temVencimento: true, validadeMeses: 24 },
  { codigo: 'NR-11',          nome: 'NR-11 — Movimentação de Cargas',      categoria: 'treinamento', obrigatorio: false, temVencimento: true, validadeMeses: 12 },
  { codigo: 'NR-12',          nome: 'NR-12 — Máquinas e Equipamentos',     categoria: 'treinamento', obrigatorio: false, temVencimento: true, validadeMeses: 24 },
  { codigo: 'NR-18',          nome: 'NR-18 — Construção Civil',            categoria: 'treinamento', obrigatorio: false, temVencimento: true, validadeMeses: 12 },
  { codigo: 'NR-33',          nome: 'NR-33 — Espaço Confinado',            categoria: 'treinamento', obrigatorio: false, temVencimento: true, validadeMeses: 12 },
  { codigo: 'NR-34',          nome: 'NR-34 — Indústria Naval',             categoria: 'treinamento', obrigatorio: false, temVencimento: true, validadeMeses: 12 },
  { codigo: 'NR-35',          nome: 'NR-35 — Trabalho em Altura',          categoria: 'treinamento', obrigatorio: false, temVencimento: true, validadeMeses: 24 },
  { codigo: 'INTEGRACAO',     nome: 'Integração / Ordem de Serviço',       categoria: 'treinamento', obrigatorio: true,  temVencimento: false },

  // ─── Admissional ───
  { codigo: 'CONTRATO',       nome: 'Contrato de Trabalho',                categoria: 'admissional', obrigatorio: true,  temVencimento: false },
  { codigo: 'FICHA_REG',      nome: 'Ficha de Registro',                   categoria: 'admissional', obrigatorio: true,  temVencimento: false },
  { codigo: 'EXP_CONTRATO',   nome: 'Contrato de Experiência',             categoria: 'admissional', obrigatorio: false, temVencimento: true },
  { codigo: 'TERMO_LGPD',     nome: 'Termo de Consentimento LGPD',         categoria: 'admissional', obrigatorio: false, temVencimento: false },
  { codigo: 'VALE_TRANSP',    nome: 'Termo de Vale Transporte',            categoria: 'admissional', obrigatorio: false, temVencimento: false },

  // ─── Documentos pessoais ───
  { codigo: 'RG',             nome: 'RG — Documento de Identidade',        categoria: 'pessoal', obrigatorio: true,  temVencimento: false },
  { codigo: 'CPF',            nome: 'CPF',                                 categoria: 'pessoal', obrigatorio: true,  temVencimento: false },
  { codigo: 'CTPS',           nome: 'CTPS — Carteira de Trabalho',         categoria: 'pessoal', obrigatorio: true,  temVencimento: false },
  { codigo: 'COMP_RESID',     nome: 'Comprovante de Residência',           categoria: 'pessoal', obrigatorio: true,  temVencimento: false },
  { codigo: 'TITULO',         nome: 'Título de Eleitor',                   categoria: 'pessoal', obrigatorio: false, temVencimento: false },
  { codigo: 'RESERVISTA',     nome: 'Certificado de Reservista',           categoria: 'pessoal', obrigatorio: false, temVencimento: false },
  { codigo: 'CNH',            nome: 'CNH — Carteira de Motorista',         categoria: 'pessoal', obrigatorio: false, temVencimento: true },
  { codigo: 'PIS',            nome: 'PIS / NIT',                           categoria: 'pessoal', obrigatorio: false, temVencimento: false },
  { codigo: 'CERT_NASC',      nome: 'Certidão de Nascimento / Casamento',  categoria: 'pessoal', obrigatorio: false, temVencimento: false },
  { codigo: 'ESCOLARIDADE',   nome: 'Comprovante de Escolaridade',         categoria: 'pessoal', obrigatorio: false, temVencimento: false },
  { codigo: 'FOTO',           nome: 'Foto 3x4',                            categoria: 'pessoal', obrigatorio: false, temVencimento: false },

  // ─── Outros ───
  { codigo: 'ATESTADO',       nome: 'Atestado Médico',                     categoria: 'outros', obrigatorio: false, temVencimento: false },
  { codigo: 'ADVERTENCIA',    nome: 'Advertência / Suspensão',             categoria: 'outros', obrigatorio: false, temVencimento: false },
  { codigo: 'FERIAS',         nome: 'Aviso / Recibo de Férias',            categoria: 'outros', obrigatorio: false, temVencimento: false },
  { codigo: 'OUTRO',          nome: 'Outro documento',                     categoria: 'outros', obrigatorio: false, temVencimento: false },
];

export const CATEGORIAS: Record<TipoDocumentoConfig['categoria'], { label: string; cor: string; bg: string; border: string }> = {
  saude:       { label: 'Saúde Ocupacional', cor: '#159A72', bg: '#E8F6F1', border: '#B8E8D9' },
  treinamento: { label: 'Treinamentos / NRs', cor: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  admissional: { label: 'Admissional',        cor: '#176B87', bg: '#E8F3F6', border: '#C6E3EB' },
  pessoal:     { label: 'Documentos Pessoais', cor: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' },
  outros:      { label: 'Outros',             cor: '#687582', bg: '#F4F6F8', border: '#DDE3E8' },
};

/** Documentos obrigatórios para todo colaborador do efetivo */
export const DOCS_OBRIGATORIOS = TIPOS_DOCUMENTO.filter(t => t.obrigatorio);

export function getTipoConfig(codigo: string): TipoDocumentoConfig | undefined {
  return TIPOS_DOCUMENTO.find(t => t.codigo === codigo || t.nome === codigo);
}

export type StatusVencimento = 'vencido' | 'a_vencer' | 'ok' | 'sem_data';

export function getStatusVencimento(dataVencimento?: string): StatusVencimento {
  if (!dataVencimento) return 'sem_data';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento + 'T00:00:00');
  if (isNaN(venc.getTime())) return 'sem_data';
  const diff = (venc.getTime() - hoje.getTime()) / 86400000;
  if (diff < 0) return 'vencido';
  if (diff <= 30) return 'a_vencer';
  return 'ok';
}

export function diasParaVencer(dataVencimento?: string): number | null {
  if (!dataVencimento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento + 'T00:00:00');
  if (isNaN(venc.getTime())) return null;
  return Math.round((venc.getTime() - hoje.getTime()) / 86400000);
}

/** Soma meses a uma data ISO (YYYY-MM-DD) e devolve ISO */
export function addMeses(dataISO: string, meses: number): string {
  if (!dataISO) return '';
  const d = new Date(dataISO + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + meses);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
