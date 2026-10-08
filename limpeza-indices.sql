-- ÍNTEGRA — limpeza de índices duplicados
-- Cole no Supabase > SQL Editor e execute.
--
-- Cada índice abaixo precisava ser reescrito a cada INSERT/UPDATE da tabela,
-- mas não atendia nenhuma consulta que outro índice já não atendesse.
-- Ao lado de cada um está quem continua cobrindo aquela busca.

drop index if exists public.idx_admissoes_cpf;            -- admissoes_cpf_key (unique)
drop index if exists public.idx_cargos_empresa_id;        -- cargos_empresa_id_nome_key
drop index if exists public.idx_permissoes_cargo_modulo;  -- cargos_permissoes_cargo_id_modulo_key
drop index if exists public.idx_colaboradores_empresa;    -- colaboradores_empresa_idx
drop index if exists public.idx_documentos_empresa;       -- documentos_empresa_idx (empresa_id, status)
drop index if exists public.idx_documentos_colaborador;   -- documentos_colaborador_idx (colaborador_id, status)
drop index if exists public.idx_solicitacoes_empresa;     -- solicitacoes_empresa_idx (empresa_id, status)
drop index if exists public.idx_usuarios_email;           -- usuarios_email_key (unique)
drop index if exists public.idx_usuarios_empresa_id;      -- usuarios_empresa_idx

-- Falta um índice para a ordenação da lista do Efetivo
-- (WHERE empresa_id = ? ORDER BY created_at DESC).
create index if not exists colaboradores_empresa_recentes
  on public.colaboradores (empresa_id, created_at desc);

-- Conferência: deve sobrar apenas idx_admissoes_obra_id e idx_solicitacoes_status.
select indexname from pg_indexes
where schemaname = 'public' and indexname like 'idx_%'
order by indexname;
