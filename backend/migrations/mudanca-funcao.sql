-- Mudança de função: colunas para registrar a troca de cargo
-- Rodar no Supabase SQL Editor

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS funcao_anterior TEXT DEFAULT '';
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_mudanca_funcao TEXT DEFAULT '';
