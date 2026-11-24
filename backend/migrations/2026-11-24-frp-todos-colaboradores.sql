-- FRP (Ficha Registro Promoção) só se aplica a mudança de função,
-- não a todos os colaboradores.
-- Rodar no Supabase SQL Editor. Confirme antes se já foi aplicado:
--   SELECT todos_colaboradores FROM documento_tipos WHERE empresa_id = 'emp-928389' AND codigo = 'FRP';

UPDATE documento_tipos
SET todos_colaboradores = false, updated_at = now()
WHERE empresa_id = 'emp-928389'
  AND codigo = 'FRP'
  AND status = 'ativo';
