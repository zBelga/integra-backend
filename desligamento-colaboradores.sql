-- ============================================================
--  ÍNTEGRA — Desligamento de colaboradores
--  Rode no SQL Editor do Supabase ANTES de publicar o sistema.
--
--  Nada é apagado por este script. Ele só acrescenta três colunas
--  na tabela de colaboradores:
--
--    status               'ativo' (no efetivo) ou 'desligado'
--    desligado_em         data do desligamento (AAAA-MM-DD)
--    motivo_desligamento  texto livre, opcional
--
--  Todo mundo que já está no banco continua 'ativo' — ninguém sai
--  do efetivo por causa deste script. Pode rodar mais de uma vez:
--  o IF NOT EXISTS evita qualquer erro na segunda execução.
-- ============================================================

alter table colaboradores add column if not exists status text not null default 'ativo';
alter table colaboradores add column if not exists desligado_em text default '';
alter table colaboradores add column if not exists motivo_desligamento text default '';

-- Garante que ninguém fique com status nulo (registros antigos)
update colaboradores set status = 'ativo' where status is null or trim(status) = '';

-- A lista do efetivo filtra por status o tempo todo; o índice deixa
-- essa consulta barata mesmo com a empresa inteira na tabela.
create index if not exists idx_colaboradores_empresa_status
  on colaboradores (empresa_id, status);

-- ── Conferência ──────────────────────────────────────────────
-- Deve mostrar todos os colaboradores como 'ativo' e nenhum desligado.
select
  status,
  count(*) as total
from colaboradores
group by status
order by status;
