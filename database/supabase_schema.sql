-- ==============================================================================
-- SCHEMA SUPABASE: ÍNTEGRA SAAS EMPRESARIAL & RH
-- Permite persistência completa para Empresas, Obras, Admissões e Usuários Admin
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE EMPRESAS (Multi-Tenant & Identidade Visual)
CREATE TABLE IF NOT EXISTS public.empresas (
    id TEXT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(30) NOT NULL UNIQUE,
    segmento VARCHAR(255) DEFAULT 'Construção Civil & Infraestrutura',
    cor_primaria VARCHAR(30) DEFAULT '#176B87',
    logo_url TEXT,
    obras_count INTEGER DEFAULT 0,
    colaboradores_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ativa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE OBRAS
CREATE TABLE IF NOT EXISTS public.obras (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE CARGOS / FUNÇÕES (Isolamento Exclusivo por Empresa)
CREATE TABLE IF NOT EXISTS public.cargos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Regra de unicidade: Não permitir cargos com mesmo nome dentro da MESMA empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_cargos_empresa_nome_unique ON public.cargos (empresa_id, LOWER(nome));

-- 5. TABELA DE ADMISSÕES / PRÉ-CONTRATAÇÃO
CREATE TABLE IF NOT EXISTS public.admissoes (
    id TEXT PRIMARY KEY,
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE SET NULL,
    obra_id TEXT REFERENCES public.obras(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    funcao VARCHAR(150) NOT NULL,
    cpf VARCHAR(20) NOT NULL,
    rg VARCHAR(50),
    data_nascimento VARCHAR(20),
    data_exame VARCHAR(20),
    data_aso VARCHAR(20),
    previsao_contratacao VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE USUÁRIOS & PERMISSÕES
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    cargo_id TEXT REFERENCES public.cargos(id) ON DELETE SET NULL,
    cargo VARCHAR(150),
    empresa_id TEXT REFERENCES public.empresas(id) ON DELETE CASCADE,
    perfil VARCHAR(50) DEFAULT 'operacional',
    role VARCHAR(50) DEFAULT 'Administrador Geral',
    is_admin BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_cargos_empresa ON public.cargos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_admissoes_cpf ON public.admissoes (cpf);
CREATE INDEX IF NOT EXISTS idx_admissoes_obra ON public.admissoes (obra_id);
CREATE INDEX IF NOT EXISTS idx_admissoes_empresa ON public.admissoes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_obras_codigo ON public.obras (codigo);

-- 8. SEED INICIAL: USUÁRIO ADMINISTRADOR (Fabrício Oliveira)
INSERT INTO public.usuarios (email, nome, role, is_admin, status)
VALUES ('fabriciooliveira2431@gmail.com', 'Fabrício Oliveira', 'Administrador Geral', true, 'ativo')
ON CONFLICT (email) DO UPDATE SET 
    role = 'Administrador Geral', 
    is_admin = true;

-- 9. SEED INICIAL: EMPRESAS PADRÃO COM IDENTIDADE VISUAL
INSERT INTO public.empresas (id, nome, razao_social, cnpj, segmento, cor_primaria, logo_url, obras_count, colaboradores_count, status)
VALUES 
('emp-001', 'Construtora Horizonte', 'Horizonte Construções & Engenharia S/A', '12.345.678/0001-90', 'Construção Civil & Infraestrutura', '#176B87', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=160&auto=format&fit=crop&q=80', 5, 42, 'ativa'),
('emp-002', 'Vanguarda Obras e Estruturas', 'Vanguarda Empreendimentos Imobiliários Ltda', '98.765.432/0001-10', 'Edificações Residenciais & Comerciais', '#0284C7', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=160&auto=format&fit=crop&q=80', 3, 29, 'ativa'),
('emp-003', 'Pinnacle Engenharia Pesada', 'Pinnacle Infraestrutura Rodoviária e Pontes S/A', '45.678.901/0001-23', 'Pontes, Viadutos & Rodovias', '#D97706', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=160&auto=format&fit=crop&q=80', 4, 65, 'ativa'),
('emp-004', 'Delta Instalações & Montagens', 'Delta Engenharia Industrial & Manutenção Ltda', '33.222.111/0001-55', 'Montagens Industriais & Elétricas', '#059669', 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=160&auto=format&fit=crop&q=80', 2, 18, 'ativa')
ON CONFLICT (id) DO NOTHING;

-- 10. SEED INICIAL: CARGOS EXCLUSIVOS POR EMPRESA
INSERT INTO public.cargos (id, empresa_id, nome, descricao, status)
VALUES
-- Construtora Horizonte
('crg-hor-01', 'emp-001', 'Encarregado Geral', 'Supervisão de frentes de obra e equipes', 'ativo'),
('crg-hor-02', 'emp-001', 'Pedreiro', 'Execução de alvenaria e acabamentos estruturais', 'ativo'),
('crg-hor-03', 'emp-001', 'Almoxarife', 'Gestão de materiais e controle de estoque do canteiro', 'ativo'),
('crg-hor-04', 'emp-001', 'Assistente Administrativo', 'Suporte às rotinas de DP e canteiro', 'ativo'),

-- Pinnacle Engenharia Pesada
('crg-pin-01', 'emp-003', 'Encarregado de Terraplenagem', 'Liderança de equipes pesadas de terraplenagem e pavimentação', 'ativo'),
('crg-pin-02', 'emp-003', 'Assistente Técnico de Engenharia', 'Controle tecnológico e apoio aos engenheiros de campo', 'ativo'),
('crg-pin-03', 'emp-003', 'Mestre de Obras', 'Coordenação executiva no canteiro de obras rodoviárias', 'ativo'),
('crg-pin-04', 'emp-003', 'Engenheiro de Campo', 'Fiscalização técnica e cumprimento de cronograma', 'ativo'),

-- Vanguarda Obras e Estruturas
('crg-van-01', 'emp-002', 'Encarregado de Armação', 'Gestão das equipes de ferragem e concreto', 'ativo'),
('crg-van-02', 'emp-002', 'Engenheiro Residente', 'Responsável técnico pelo empreendimento imobiliário', 'ativo'),
('crg-van-03', 'emp-002', 'Técnico de Segurança do Trabalho', 'Prevenção de acidentes e conformidade com NRs', 'ativo'),

-- Delta Instalações & Montagens
('crg-del-01', 'emp-004', 'Montador Industrial', 'Montagem de estruturas metálicas e tubulações', 'ativo'),
('crg-del-02', 'emp-004', 'Soldador TIG / Eletrodo', 'Soldagem especializada em alta precisão', 'ativo'),
('crg-del-03', 'emp-004', 'Auxiliar Técnico', 'Apoio geral em montagens elétricas', 'ativo')
ON CONFLICT (id) DO NOTHING;

-- 9. SEED INICIAL: OBRAS
INSERT INTO public.obras (id, empresa_id, nome, codigo)
VALUES 
('obra-001', 'emp-001', 'Obra Centro Empresarial Horizon', 'OBR-001'),
('obra-002', 'emp-001', 'Obra Ponte JK Expansão Sul', 'OBR-002'),
('obra-003', 'emp-002', 'Obra Residencial Parque das Flores', 'OBR-003'),
('obra-004', 'emp-003', 'Obra Complexo Industrial Norte', 'OBR-004'),
('obra-005', 'emp-004', 'Obra Arena Multiuso Capital', 'OBR-005')
ON CONFLICT (id) DO NOTHING;
