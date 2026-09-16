-- Database schema for Sistema SaaS Empresarial
-- Compatible with PostgreSQL & SQLite

-- Table: empresas
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  razaoSocial TEXT,
  cnpj TEXT NOT NULL UNIQUE,
  segmento TEXT DEFAULT 'Construção Civil & Infraestrutura',
  corPrimaria TEXT DEFAULT '#176B87',
  logoUrl TEXT,
  obrasCount INTEGER DEFAULT 0,
  colaboradoresCount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativa',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: obras
CREATE TABLE IF NOT EXISTS obras (
  id TEXT PRIMARY KEY,
  empresa_id TEXT,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
);

-- Table: admissoes
CREATE TABLE IF NOT EXISTS admissoes (
  id TEXT PRIMARY KEY,
  empresa_id TEXT,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  rg TEXT DEFAULT '',
  data_nascimento TEXT NOT NULL,
  obra_id TEXT NOT NULL,
  data_exame TEXT DEFAULT '',
  data_aso TEXT DEFAULT '',
  previsao_contratacao TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
);

-- Table: cargos (Funções profissionais exclusivas por empresa)
CREATE TABLE IF NOT EXISTS cargos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  UNIQUE(empresa_id, nome)
);

-- Table: usuarios (Gestão Master & Vínculo Empresarial)
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT,
  cargo_id TEXT DEFAULT '',
  cargo TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'operacional',
  empresa_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  telefone TEXT DEFAULT '',
  departamento TEXT DEFAULT '',
  permissoes TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
  FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL
);

-- Table: cargos_permissoes (Matriz de Permissões Granulares por Cargo e Módulo)
CREATE TABLE IF NOT EXISTS cargos_permissoes (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  cargo_id TEXT NOT NULL,
  modulo TEXT NOT NULL,
  visualizar INTEGER DEFAULT 1,
  criar INTEGER DEFAULT 0,
  editar INTEGER DEFAULT 0,
  excluir INTEGER DEFAULT 0,
  solicitar INTEGER DEFAULT 1,
  aprovar INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE CASCADE,
  UNIQUE(cargo_id, modulo)
);

-- Table: solicitacoes_alteracao (Central de Solicitações e Fluxo de Aprovações)
CREATE TABLE IF NOT EXISTS solicitacoes_alteracao (
  id TEXT PRIMARY KEY,
  codigo_sequencial INTEGER,
  empresa_id TEXT NOT NULL,
  modulo TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  registro_identificador TEXT NOT NULL,
  solicitante_id TEXT NOT NULL,
  solicitante_nome TEXT NOT NULL,
  solicitante_cargo TEXT NOT NULL,
  campo TEXT NOT NULL,
  valor_atual TEXT,
  valor_solicitado TEXT,
  dados_anteriores TEXT,
  dados_solicitados TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  aprovador_id TEXT,
  aprovador_nome TEXT,
  aprovador_cargo TEXT,
  data_aprovacao DATETIME,
  motivo_recusa TEXT,
  observacoes TEXT,
  data_solicitacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Table: solicitacoes_historico (Trilha de Auditoria Imutável de Solicitações)
CREATE TABLE IF NOT EXISTS solicitacoes_historico (
  id TEXT PRIMARY KEY,
  solicitacao_id TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  usuario_cargo TEXT,
  detalhes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes_alteracao(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cargos_empresa_id ON cargos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_cargo_modulo ON cargos_permissoes(cargo_id, modulo);
CREATE INDEX IF NOT EXISTS idx_permissoes_empresa ON cargos_permissoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa ON solicitacoes_alteracao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_alteracao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_modulo ON solicitacoes_alteracao(modulo);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_registro ON solicitacoes_alteracao(registro_id);
CREATE INDEX IF NOT EXISTS idx_historico_solicitacao ON solicitacoes_historico(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_admissoes_cpf ON admissoes(cpf);
CREATE INDEX IF NOT EXISTS idx_admissoes_nome ON admissoes(nome);
CREATE INDEX IF NOT EXISTS idx_admissoes_obra_id ON admissoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_admissoes_previsao ON admissoes(previsao_contratacao);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON usuarios(empresa_id);

