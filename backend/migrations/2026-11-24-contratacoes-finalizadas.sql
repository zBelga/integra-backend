-- Abas "Contratados dd/mm" que foram finalizadas (escondidas da barra).
-- Só guarda a marca. Não altera colaboradores, documentos nem admissões.
-- Rodar no Supabase SQL Editor (no projeto sistema-integra).

CREATE TABLE IF NOT EXISTS public.contratacoes_finalizadas (
  empresa_id     text        NOT NULL,
  data           text        NOT NULL,
  finalizado_em  timestamptz NOT NULL DEFAULT now(),
  finalizado_por text        NOT NULL DEFAULT '',
  PRIMARY KEY (empresa_id, data)
);

ALTER TABLE public.contratacoes_finalizadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.contratacoes_finalizadas;
CREATE POLICY "Service role full access" ON public.contratacoes_finalizadas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
