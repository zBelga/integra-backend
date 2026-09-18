export interface Empresa {
  id: string;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  corPrimaria?: string;
  logoUrl?: string;
  logoColor?: string;
  obrasCount?: number;
  colaboradoresCount?: number;
  segmento: string;
  status: 'ativa' | 'inativa';
}

export interface Obra {
  id: string;
  empresa_id?: string;
  nome: string;
  codigo: string;
  created_at?: string;
  updated_at?: string;
}

export interface Admissao {
  id: string;
  empresa_id?: string;
  nome: string;
  funcao: string;
  cpf: string;
  rg?: string;
  data_nascimento: string;
  obra_id: string;
  obra_nome?: string;
  obra_codigo?: string;
  data_exame?: string;
  data_aso?: string;
  previsao_contratacao: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdmissaoFormData {
  nome: string;
  funcao: string;
  cpf: string;
  rg?: string;
  data_nascimento: string;
  obra_id: string;
  data_exame?: string;
  data_aso?: string;
  previsao_contratacao: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdmissaoFilterState {
  search: string;
  obra_id: string;
  funcao: string;
  data_inicio: string;
  data_fim: string;
}

export type ActiveView =
  | 'empresas'
  | 'dashboard'
  | 'administrativo'
  | 'efetivo'
  | 'efetivo-obra'
  | 'admissao'
  | 'usuarios'
  | 'permissoes'
  | 'solicitacoes'
  | 'documentos'
  | 'colaborador-perfil'
  | 'seguranca'
  | 'almoxarifado';

/** Os 4 modulos do sistema. A lateral mostra so as telas do modulo aberto. */
export type ChaveModulo = 'administrativo' | 'documentacoes' | 'seguranca' | 'almoxarifado';

/**
 * Usuario autenticado na sessao.
 * `perfil` e `permissoes` vem do login e decidem o que aparece no menu.
 */
export interface UsuarioSessao {
  email: string;
  name: string;
  role: string;
  perfil?: PerfilUsuario | string;
  permissoes?: string[];
}

export type AdminSubSection = 'admissao' | 'efetivo' | 'desligados' | 'ferias';

export type PerfilUsuario =
  | 'master_admin'
  | 'administrador'
  | 'gestor_rh'
  | 'engenheiro'
  | 'operacional'
  | 'visualizador';

export type ModuloSistema =
  | 'efetivo'
  | 'obras'
  | 'documentos'
  | 'rh'
  | 'equipamentos'
  | 'veiculos'
  | 'estoque'
  | 'relatorios'
  | 'usuarios';

export interface CargoPermissao {
  id: string;
  empresa_id: string;
  cargo_id: string;
  cargo_nome?: string;
  modulo: ModuloSistema | string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  solicitar: boolean;
  aprovar: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SolicitacaoStatus = 'pendente' | 'aprovada' | 'recusada';

export interface SolicitacaoHistorico {
  id: string;
  solicitacao_id: string;
  tipo_evento: 'CRIADA' | 'APROVADA' | 'RECUSADA' | 'CANCELADA';
  usuario_id: string;
  usuario_nome: string;
  usuario_cargo?: string;
  detalhes?: string;
  created_at: string;
}

export interface SolicitacaoAlteracao {
  id: string;
  codigo_sequencial: number;
  empresa_id: string;
  empresa_nome?: string;
  empresa_cor?: string;
  modulo: string;
  registro_id: string;
  registro_identificador: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_cargo: string;
  campo: string;
  valor_atual: string;
  valor_solicitado: string;
  dados_anteriores?: string;
  dados_solicitados?: string;
  dados_anteriores_parsed?: any;
  dados_solicitados_parsed?: any;
  status: SolicitacaoStatus;
  aprovador_id?: string | null;
  aprovador_nome?: string | null;
  aprovador_cargo?: string | null;
  data_aprovacao?: string | null;
  motivo_recusa?: string | null;
  observacoes?: string;
  data_solicitacao: string;
  updated_at?: string;
  historico?: SolicitacaoHistorico[];
}

export interface SolicitacoesStats {
  total: number;
  pendente: number;
  aprovada: number;
  recusada: number;
}

export interface CargoEmpresa {
  id: string;
  empresa_id: string;
  nome: string;
  descricao?: string;
  status: 'ativo' | 'inativo';
  created_at?: string;
  updated_at?: string;
}

export interface CargoFormData {
  empresa_id: string;
  nome: string;
  descricao?: string;
  status?: 'ativo' | 'inativo';
}

export interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  cargo_id?: string;
  cargo: string;
  perfil: PerfilUsuario;
  empresa_id: string;
  empresa_nome?: string;
  empresa_cor?: string;
  empresa_logo?: string;
  status: 'ativo' | 'inativo';
  telefone?: string;
  departamento?: string;
  permissoes?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UsuarioFormData {
  nome: string;
  email: string;
  cargo_id?: string;
  cargo: string;
  perfil: PerfilUsuario;
  empresa_id: string;
  status: 'ativo' | 'inativo';
  telefone?: string;
  departamento?: string;
  permissoes?: string[];
}

export interface Colaborador {
  id: string;
  empresa_id: string;
  nome: string;
  funcao: string;
  cpf: string;
  rg?: string;
  numero_chapa: string;
  obra_id: string;
  obra_nome?: string;
  obra_codigo?: string;
  data_admissao: string;
  data_aso?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Documento {
  id: string;
  colaborador_id: string;
  empresa_id: string;
  tipo: string;
  nome: string;
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number;
  data_emissao: string;
  data_vencimento: string;
  status: string;
  observacoes?: string;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
}
