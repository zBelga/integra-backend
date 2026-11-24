-- Ativa RLS nas tabelas de EPI e cria a política de service_role,
-- igual às demais tabelas do sistema.
-- O backend acessa o banco com a chave service_role, que ignora RLS,
-- então esta mudança não quebra a API. Protege contra uso da chave anon.
-- Rodar no Supabase SQL Editor. Não rodar sem revisão.

ALTER TABLE public.epi_catalogo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_grupos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_kit           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_funcao_grupo  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.epi_catalogo;
DROP POLICY IF EXISTS "Service role full access" ON public.epi_grupos;
DROP POLICY IF EXISTS "Service role full access" ON public.epi_kit;
DROP POLICY IF EXISTS "Service role full access" ON public.epi_funcao_grupo;

CREATE POLICY "Service role full access" ON public.epi_catalogo
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.epi_grupos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.epi_kit
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.epi_funcao_grupo
  FOR ALL TO service_role USING (true) WITH CHECK (true);
