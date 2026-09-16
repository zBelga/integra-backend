// ─────────────────────────────────────────────
// BASE DA API
// ─────────────────────────────────────────────
// Em desenvolvimento fica vazio → usa o proxy do Vite (/api → localhost:3000).
// Em produção (Vercel) aponta para o backend no Railway via VITE_API_URL.
// Ex.: VITE_API_URL=https://sistema-integra-production.up.railway.app
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/** Monta a URL final da API respeitando a base configurada */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

// ─────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────
export const TOKEN_KEY = 'si_auth_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Wrapper de fetch autenticado — resolve a URL contra API_BASE */
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = {
    ...(init.headers as Record<string, string> || {}),
    ...authHeaders(),
  };
  const res = await fetch(apiUrl(input), { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/';
  }
  return res;
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
  error?: string;
}

export async function loginUser(email: string, senha: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  const json = await res.json();
  if (res.ok && json.token) {
    setToken(json.token);
  }
  return json;
}

export async function logoutUser(): Promise<void> {
  clearToken();
}

import { 
  Admissao, 
  AdmissaoFormData, 
  Obra, 
  PaginationMeta, 
  UsuarioSistema, 
  UsuarioFormData, 
  CargoEmpresa, 
  CargoFormData,
  CargoPermissao,
  SolicitacaoAlteracao,
  SolicitacoesStats,
} from '../types';

export interface GetAdmissoesResponse {
  success: boolean;
  data: Admissao[];
  pagination: PaginationMeta;
  error?: string;
}

export interface GetObrasResponse {
  success: boolean;
  data: Obra[];
  error?: string;
}

export interface GetUsuariosResponse {
  success: boolean;
  data: UsuarioSistema[];
  total: number;
  error?: string;
}

export interface GetCargosResponse {
  success: boolean;
  data: CargoEmpresa[];
  total: number;
  error?: string;
}

export interface MutationResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export async function fetchAdmissoes(params: {
  page?: number;
  limit?: number;
  search?: string;
  obra?: string;
  funcao?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<GetAdmissoesResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.search) queryParams.set('search', params.search);
  if (params.obra) queryParams.set('obra', params.obra);
  if (params.funcao) queryParams.set('funcao', params.funcao);
  if (params.data_inicio) queryParams.set('data_inicio', params.data_inicio);
  if (params.data_fim) queryParams.set('data_fim', params.data_fim);

  const res = await apiFetch(`/api/admissoes?${queryParams.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar lista de admissões');
  }
  return json;
}

export async function createAdmissao(data: AdmissaoFormData): Promise<MutationResponse<Admissao>> {
  const res = await apiFetch('/api/admissoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao cadastrar admissão');
  }
  return json;
}

export async function updateAdmissao(id: string, data: AdmissaoFormData): Promise<MutationResponse<Admissao>> {
  const res = await apiFetch(`/api/admissoes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao atualizar admissão');
  }
  return json;
}

export async function deleteAdmissao(id: string): Promise<MutationResponse> {
  const res = await apiFetch(`/api/admissoes/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao excluir admissão');
  }
  return json;
}

export async function fetchObras(): Promise<GetObrasResponse> {
  const res = await apiFetch('/api/obras');
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar obras');
  }
  return json;
}

export async function createObra(data: { nome: string; codigo: string }): Promise<MutationResponse<Obra>> {
  const res = await apiFetch('/api/obras', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao cadastrar obra');
  }
  return json;
}

export async function updateObra(id: string, data: { nome: string; codigo: string }): Promise<MutationResponse<Obra>> {
  const res = await apiFetch(`/api/obras/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao atualizar obra');
  }
  return json;
}

export async function deleteObra(id: string): Promise<MutationResponse> {
  const res = await apiFetch(`/api/obras/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao excluir obra');
  }
  return json;
}

export async function fetchUsuarios(params?: {
  search?: string;
  empresa_id?: string;
  cargo_id?: string;
  cargo?: string;
  usuario_id?: string;
  status?: string;
  perfil?: string;
}): Promise<GetUsuariosResponse> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);
  if (params?.empresa_id) queryParams.set('empresa_id', params.empresa_id);
  if (params?.cargo_id) queryParams.set('cargo_id', params.cargo_id);
  if (params?.cargo) queryParams.set('cargo', params.cargo);
  if (params?.usuario_id) queryParams.set('usuario_id', params.usuario_id);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.perfil) queryParams.set('perfil', params.perfil);

  const res = await apiFetch(`/api/usuarios?${queryParams.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar lista de usuários');
  }
  return json;
}

export async function createUsuario(data: UsuarioFormData): Promise<MutationResponse<UsuarioSistema>> {
  const res = await apiFetch('/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao cadastrar usuário');
  }
  return json;
}

export async function updateUsuario(id: string, data: Partial<UsuarioFormData>): Promise<MutationResponse<UsuarioSistema>> {
  const res = await apiFetch(`/api/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao atualizar dados do usuário');
  }
  return json;
}

export async function toggleUsuarioStatus(id: string, status: 'ativo' | 'inativo'): Promise<MutationResponse> {
  const res = await apiFetch(`/api/usuarios/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao alterar status do usuário');
  }
  return json;
}

export async function deleteUsuario(id: string): Promise<MutationResponse> {
  const res = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao excluir usuário');
  }
  return json;
}

// -----------------------------------------
// CARGOS / FUNÇÕES (Isolamento por Empresa)
// -----------------------------------------

export async function fetchCargos(empresa_id: string, status?: string): Promise<GetCargosResponse> {
  const queryParams = new URLSearchParams();
  if (empresa_id) queryParams.set('empresa_id', empresa_id);
  if (status) queryParams.set('status', status);

  const res = await apiFetch(`/api/cargos?${queryParams.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar cargos da empresa');
  }
  return json;
}

export const fetchCargosByEmpresa = fetchCargos;

export async function createCargo(data: CargoFormData): Promise<MutationResponse<CargoEmpresa>> {
  const res = await apiFetch('/api/cargos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao criar cargo');
  }
  return json;
}

export async function updateCargo(id: string, data: Partial<CargoFormData>): Promise<MutationResponse<CargoEmpresa>> {
  const res = await apiFetch(`/api/cargos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao atualizar cargo');
  }
  return json;
}

export async function toggleCargoStatus(id: string, status: 'ativo' | 'inativo'): Promise<MutationResponse<CargoEmpresa>> {
  const res = await apiFetch(`/api/cargos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao alterar status do cargo');
  }
  return json;
}

export async function deleteCargo(id: string): Promise<MutationResponse> {
  const res = await apiFetch(`/api/cargos/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao excluir cargo');
  }
  return json;
}

// -----------------------------------------
// PERMISSÕES POR CARGO & MÓDULO
// -----------------------------------------

export interface GetPermissoesResponse {
  success: boolean;
  data: CargoPermissao[];
  total: number;
  error?: string;
}

export interface GetCargoPermissoesResponse {
  success: boolean;
  cargo: CargoEmpresa;
  data: CargoPermissao[];
  error?: string;
}

export async function fetchPermissoes(params?: { empresa_id?: string; cargo_id?: string }): Promise<GetPermissoesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.empresa_id) queryParams.set('empresa_id', params.empresa_id);
  if (params?.cargo_id) queryParams.set('cargo_id', params.cargo_id);

  const res = await apiFetch(`/api/permissoes?${queryParams.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar matriz de permissões');
  }
  return json;
}

export async function fetchCargoPermissoes(cargo_id: string, empresa_id?: string): Promise<GetCargoPermissoesResponse> {
  const queryParams = new URLSearchParams();
  if (empresa_id) queryParams.set('empresa_id', empresa_id);

  const res = await apiFetch(`/api/permissoes/cargo/${cargo_id}?${queryParams.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar permissões do cargo');
  }
  return json;
}

export async function updateCargoPermissoes(
  cargo_id: string,
  modulos: Partial<CargoPermissao>[],
  empresa_id?: string
): Promise<MutationResponse<CargoPermissao[]>> {
  const res = await apiFetch(`/api/permissoes/cargo/${cargo_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresa_id, modulos }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao atualizar permissões do cargo');
  }
  return json;
}

// -----------------------------------------
// SOLICITAÇÕES E FLUXO DE APROVAÇÕES
// -----------------------------------------

export interface GetSolicitacoesResponse {
  success: boolean;
  data: SolicitacaoAlteracao[];
  total: number;
  error?: string;
}

export async function fetchSolicitacoes(params?: {
  empresa_id?: string;
  modulo?: string;
  status?: string;
  solicitante_id?: string;
  search?: string;
}): Promise<GetSolicitacoesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.empresa_id) queryParams.set('empresa_id', params.empresa_id);
  if (params?.modulo) queryParams.set('modulo', params.modulo);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.solicitante_id) queryParams.set('solicitante_id', params.solicitante_id);
  if (params?.search) queryParams.set('search', params.search);

  const res = await apiFetch(`/api/solicitacoes?${queryParams.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar solicitações');
  }
  return json;
}

export async function fetchSolicitacaoById(id: string): Promise<{ success: boolean; data: SolicitacaoAlteracao; error?: string }> {
  const res = await apiFetch(`/api/solicitacoes/${id}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao carregar detalhes da solicitação');
  }
  return json;
}

export async function createSolicitacao(payload: {
  empresa_id: string;
  modulo: string;
  registro_id: string;
  registro_identificador: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_cargo: string;
  solicitante_cargo_id?: string;
  campo: string;
  valor_atual?: string;
  valor_solicitado?: string;
  dados_anteriores?: any;
  dados_solicitados?: any;
  observacoes?: string;
}): Promise<MutationResponse<SolicitacaoAlteracao>> {
  const res = await apiFetch('/api/solicitacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao enviar solicitação');
  }
  return json;
}

export async function aprovarSolicitacao(
  id: string,
  payload: {
    aprovador_id: string;
    aprovador_nome?: string;
    aprovador_cargo?: string;
    aprovador_cargo_id?: string;
    observacoes_aprovacao?: string;
  }
): Promise<MutationResponse<SolicitacaoAlteracao>> {
  const res = await apiFetch(`/api/solicitacoes/${id}/aprovar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao aprovar solicitação');
  }
  return json;
}

export async function recusarSolicitacao(
  id: string,
  payload: {
    aprovador_id: string;
    aprovador_nome?: string;
    aprovador_cargo?: string;
    aprovador_cargo_id?: string;
    motivo_recusa: string;
  }
): Promise<MutationResponse<SolicitacaoAlteracao>> {
  const res = await apiFetch(`/api/solicitacoes/${id}/recusar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao recusar solicitação');
  }
  return json;
}

export async function fetchSolicitacoesStats(empresa_id?: string): Promise<{ success: boolean; data: SolicitacoesStats; error?: string }> {
  const queryParams = new URLSearchParams();
  if (empresa_id) queryParams.set('empresa_id', empresa_id);

  const res = await apiFetch(`/api/solicitacoes/stats/counts?${queryParams.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao obter estatísticas de solicitações');
  }
  return json;
}

// -----------------------------------------
// EMPRESAS
// -----------------------------------------

export interface GetEmpresasResponse {
  success: boolean;
  data: import('../types').Empresa[];
  error?: string;
}

export async function fetchEmpresas(): Promise<GetEmpresasResponse> {
  const res = await apiFetch('/api/empresas');
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao carregar empresas');
  return json;
}

export async function createEmpresa(data: Omit<import('../types').Empresa, 'id' | 'obrasCount' | 'colaboradoresCount'>): Promise<MutationResponse<import('../types').Empresa>> {
  const res = await apiFetch('/api/empresas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao cadastrar empresa');
  return json;
}

export async function updateEmpresa(id: string, data: Partial<import('../types').Empresa>): Promise<MutationResponse<import('../types').Empresa>> {
  const res = await apiFetch(`/api/empresas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao atualizar empresa');
  return json;
}

export async function deleteEmpresa(id: string): Promise<MutationResponse> {
  const res = await apiFetch(`/api/empresas/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao excluir empresa');
  return json;
}

// ─── Colaboradores (Efetivo) ──────────────────────────────────────────────────
export async function fetchColaboradores(params: {
  page?: number; limit?: number; search?: string; obra?: string;
} = {}): Promise<{ data: import('../types').Colaborador[]; pagination: import('../types').PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.obra) q.set('obra', params.obra);
  const res = await apiFetch(`/api/colaboradores?${q.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao listar colaboradores');
  return json;
}

export async function contratarAdmissao(
  admissaoId: string,
  data: { rg?: string; numero_chapa: string; data_admissao?: string }
): Promise<MutationResponse<import('../types').Colaborador>> {
  const res = await apiFetch(`/api/admissoes/${admissaoId}/contratar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Erro ao contratar: servidor retornou resposta inválida (status ${res.status}). Reinicie o servidor e tente novamente.`);
  }
  if (!res.ok) throw new Error(json?.error || 'Erro ao contratar colaborador');
  return json;
}

export async function updateColaborador(
  id: string,
  data: Partial<import('../types').Colaborador>
): Promise<MutationResponse<import('../types').Colaborador>> {
  const res = await apiFetch(`/api/colaboradores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  let json: any;
  try { json = await res.json(); } catch { throw new Error('Resposta inválida do servidor'); }
  if (!res.ok) throw new Error(json?.error || 'Erro ao atualizar colaborador');
  return json;
}

// ─── Documentos ──────────────────────────────────────────────────────────────

export interface UploadDocumentoPayload {
  colaborador_id: string;
  empresa_id: string;
  tipo: string;
  nome: string;
  nome_arquivo: string;
  fileBase64: string;
  mimeType: string;
  data_emissao?: string;
  data_vencimento?: string;
  observacoes?: string;
}

export async function fetchDocumentosColaborador(
  colaboradorId: string
): Promise<{ success: boolean; data: import('../types').Documento[] }> {
  const res = await apiFetch(`/api/documentos/colaborador/${colaboradorId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao listar documentos');
  return json;
}

export async function uploadDocumento(
  payload: UploadDocumentoPayload
): Promise<{ success: boolean; data: import('../types').Documento }> {
  const res = await apiFetch('/api/documentos/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao fazer upload do documento');
  return json;
}

export async function downloadDocumento(
  id: string
): Promise<{ success: boolean; url: string; nome_arquivo: string }> {
  const res = await apiFetch(`/api/documentos/${id}/download`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao obter link de download');
  return json;
}

export async function deleteDocumento(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/documentos/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao excluir documento');
  return json;
}
