import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { queryRows } from '../db.js';

const router = Router();

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado no .env');
  return createClient(url, key);
}

function generateId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** empresa_id efetivo: o do token manda; a query só vale para o master. */
function empresaDoPedido(req: Request): string {
  const doToken = req.user?.empresa_id;
  const daQuery = String(req.query.empresa_id || req.body?.empresa_id || '');
  if (req.user?.perfil === 'master_admin' && daQuery) return daQuery;
  return doToken || daQuery;
}

function normalizar(texto: string): string {
  return String(texto || '').trim().toUpperCase();
}

export type StatusDoc = 'valido' | 'a_vencer' | 'vencido' | 'sem_validade';

/**
 * Situação de um documento entregue.
 *  - sem data de vencimento → 'sem_validade' (conta como válido)
 *  - vencido                → 'vencido'      (NÃO conta como válido)
 *  - dentro do prazo de alerta → 'a_vencer'  (ainda conta como válido)
 */
export function situacaoDoDocumento(dataVencimento?: string, diasAlerta = 30): StatusDoc {
  const iso = String(dataVencimento || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'sem_validade';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(`${iso}T00:00:00`);
  const dias = Math.round((venc.getTime() - hoje.getTime()) / 86400000);

  if (dias < 0) return 'vencido';
  if (dias <= (diasAlerta > 0 ? diasAlerta : 30)) return 'a_vencer';
  return 'valido';
}

/** Vale como "entregue e em dia"? Vencido não vale; a vencer ainda vale. */
export function contaComoValido(situacao: StatusDoc): boolean {
  return situacao !== 'vencido';
}

/** Busca as exigências da função, já resolvidas para os tipos ativos da empresa. */
async function exigenciasDaFuncao(sb: SupabaseClient, empresa_id: string, funcao: string) {
  const [{ data: tipos }, { data: regras }] = await Promise.all([
    sb.from('documento_tipos').select('*').eq('empresa_id', empresa_id).eq('status', 'ativo'),
    sb
      .from('documento_exigencias')
      .select('tipo_id')
      .eq('empresa_id', empresa_id)
      .eq('funcao', normalizar(funcao)),
  ]);

  const exigidos = new Set((regras || []).map(r => r.tipo_id));
  // Tipo desativado sai da conta de pendências automaticamente (filtro status=ativo acima)
  return {
    todosOsTipos: tipos || [],
    tiposExigidos: (tipos || []).filter(t => exigidos.has(t.id)),
  };
}

/**
 * GET /api/documentos/resumo
 *
 * Devolve, numa única requisição, o resumo de documentos de TODOS os
 * colaboradores — usado pela tela de Documentos para montar a lista.
 *
 * Antes a tela fazia uma requisição por colaborador (N+1): com 300
 * colaboradores seriam 300 chamadas, que estouram o rate limit (300/min)
 * e fazem a tela exibir contagens zeradas. Agora é uma só.
 *
 * Formato: { "<colaborador_id>": { total, tipos: [], vencimentos: [] } }
 */
/**
 * GET /api/documentos/checklist/:colaboradorId
 *
 * Devolve, numa requisição só, tudo que a tela do colaborador precisa:
 *  - os documentos exigidos para a FUNÇÃO dele (checklist inteligente)
 *  - os documentos já anexados (metadados apenas — nenhum arquivo é lido)
 *  - os indicadores e a conformidade já calculados
 *
 * Trocar o colaborador de função muda o checklist na hora: a regra é lida
 * pela função atual, nunca gravada no colaborador.
 */
router.get('/checklist/:colaboradorId', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();

    const colabs = (await queryRows('SELECT * FROM colaboradores WHERE id = ?', [
      req.params.colaboradorId,
    ])) as any[];

    if (!colabs.length) {
      return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    }
    const colaborador = colabs[0];

    // Isolamento: ninguém lê documentos de colaborador de outra empresa
    const empresaToken = req.user?.empresa_id;
    if (empresaToken && req.user?.perfil !== 'master_admin' && colaborador.empresa_id !== empresaToken) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }

    const empresa_id = colaborador.empresa_id;

    // Garante o catálogo padrão da empresa (idempotente)
    await sb.rpc('garantir_tipos_padrao', { p_empresa_id: empresa_id });

    const [{ todosOsTipos, tiposExigidos }, { data: docs, error }] = await Promise.all([
      exigenciasDaFuncao(sb, empresa_id, colaborador.funcao),
      sb
        .from('documentos')
        .select('id, tipo, tipo_id, nome, nome_arquivo, tamanho_bytes, data_emissao, data_vencimento, status, observacoes, created_at')
        .eq('colaborador_id', colaborador.id)
        .order('created_at', { ascending: false }),
    ]);

    if (error) throw error;

    const anexados = docs || [];
    const porTipoId = new Map<string, any[]>();
    const porCodigo = new Map<string, any[]>();
    anexados.forEach(d => {
      if (d.tipo_id) {
        if (!porTipoId.has(d.tipo_id)) porTipoId.set(d.tipo_id, []);
        porTipoId.get(d.tipo_id)!.push(d);
      }
      const cod = normalizar(d.tipo);
      if (!porCodigo.has(cod)) porCodigo.set(cod, []);
      porCodigo.get(cod)!.push(d);
    });

    // Checklist: um item por tipo exigido, com o documento mais recente daquele tipo
    const checklist = tiposExigidos.map(tipo => {
      // Casa por tipo_id (vínculo estável); cai para o código nos registros antigos
      const candidatos = porTipoId.get(tipo.id) || porCodigo.get(normalizar(tipo.codigo)) || [];
      const doc = candidatos[0] || null;
      const situacao: StatusDoc | 'pendente' = doc
        ? situacaoDoDocumento(doc.data_vencimento, tipo.dias_alerta)
        : 'pendente';

      return {
        tipo_id: tipo.id,
        codigo: tipo.codigo,
        nome: tipo.nome,
        descricao: tipo.descricao,
        tem_validade: tipo.tem_validade,
        validade_meses: tipo.validade_meses,
        dias_alerta: tipo.dias_alerta,
        situacao,
        documento_id: doc?.id || null,
        data_vencimento: doc?.data_vencimento || '',
        data_emissao: doc?.data_emissao || '',
      };
    });

    const validos = checklist.filter(i => i.situacao !== 'pendente' && contaComoValido(i.situacao as StatusDoc));
    const conformidade =
      checklist.length === 0
        ? null // sem exigências configuradas — a tela mostra o aviso, não 100%
        : Math.round((validos.length / checklist.length) * 100);

    // Indicadores sobre TODOS os anexados (inclusive os não obrigatórios)
    let vencidos = 0;
    let aVencer = 0;
    anexados.forEach(d => {
      const alerta = todosOsTipos.find(t => t.id === d.tipo_id)?.dias_alerta ?? 30;
      const s = situacaoDoDocumento(d.data_vencimento, alerta);
      if (s === 'vencido') vencidos++;
      else if (s === 'a_vencer') aVencer++;
    });

    res.json({
      success: true,
      data: {
        colaborador,
        checklist,
        anexados,
        catalogo: todosOsTipos.map(t => ({
          id: t.id,
          codigo: t.codigo,
          nome: t.nome,
          descricao: t.descricao,
          tem_validade: t.tem_validade,
          validade_meses: t.validade_meses,
          dias_alerta: t.dias_alerta,
        })),
        indicadores: {
          total: anexados.length,
          vencidos,
          a_vencer: aVencer,
          pendentes: checklist.filter(i => i.situacao === 'pendente').length,
          obrigatorios: checklist.length,
          validos: validos.length,
          conformidade,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/resumo', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const empresa_id = empresaDoPedido(req);

    let q = supabase.from('documentos').select('id, colaborador_id, tipo, data_vencimento');
    if (empresa_id) q = q.eq('empresa_id', empresa_id); // isolamento entre empresas

    const { data, error } = await q;

    if (error) throw error;

    type DocLeve = { id: string; tipo: string; data_vencimento: string };
    const resumo: Record<string, { total: number; tipos: string[]; docs: DocLeve[] }> = {};

    for (const doc of data || []) {
      const id = doc.colaborador_id;
      if (!id) continue;
      if (!resumo[id]) resumo[id] = { total: 0, tipos: [], docs: [] };
      resumo[id].total++;
      if (doc.tipo) resumo[id].tipos.push(doc.tipo);
      resumo[id].docs.push({
        id: doc.id,
        tipo: doc.tipo || '',
        data_vencimento: doc.data_vencimento || '',
      });
    }

    res.json({ success: true, data: resumo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documentos/colaborador/:id — lista documentos de um colaborador
router.get('/colaborador/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('colaborador_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/documentos/upload — faz upload de um documento
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const {
      colaborador_id,
      empresa_id,
      tipo,
      nome,
      nome_arquivo,
      fileBase64,
      mimeType,
      data_emissao,
      data_vencimento,
      observacoes,
    } = req.body;

    if (!colaborador_id || !tipo || !nome || !nome_arquivo || !fileBase64) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando.' });
    }

    const supabase = getSupabase();

    // Tamanho máximo: 10 MB (o base64 chega ~33% maior)
    const MAX_BYTES = 10 * 1024 * 1024;
    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({
        success: false,
        error: `Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Máximo 10 MB.`,
      });
    }
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(String(nome_arquivo))) {
      return res.status(400).json({ success: false, error: 'Formato não aceito. Use PDF, JPG, PNG ou WEBP.' });
    }

    // Vincula ao tipo do catálogo da empresa (identificador estável, não o nome)
    let tipo_id: string | null = req.body.tipo_id || null;
    if (!tipo_id) {
      const { data: achado } = await supabase
        .from('documento_tipos')
        .select('id')
        .eq('empresa_id', empresa_id || 'geral')
        .ilike('codigo', String(tipo).trim())
        .maybeSingle();
      tipo_id = achado?.id || null;
    }

    const id = generateId();
    const ext = nome_arquivo.split('.').pop()?.toLowerCase() || 'bin';
    const storagePath = `${empresa_id || 'geral'}/${colaborador_id}/${id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data, error: dbError } = await supabase
      .from('documentos')
      .insert({
        id,
        colaborador_id,
        empresa_id: empresa_id || 'geral',
        tipo,
        tipo_id,
        nome,
        nome_arquivo,
        storage_path: storagePath,
        tamanho_bytes: buffer.length,
        data_emissao: data_emissao || '',
        data_vencimento: data_vencimento || '',
        observacoes: observacoes || '',
        status: 'ativo',
        uploaded_by: (req as any).user?.nome || '',
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: remove o arquivo do storage
      await supabase.storage.from('documentos').remove([storagePath]);
      throw dbError;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documentos/:id/download — retorna URL assinada para download
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .select('storage_path, nome_arquivo')
      .eq('id', req.params.id)
      .single();

    if (docError || !doc) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
    }

    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(doc.storage_path, 120); // válido por 2 minutos

    if (error) throw error;

    res.json({ success: true, url: data.signedUrl, nome_arquivo: doc.nome_arquivo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/documentos/:id — exclui documento e arquivo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .select('storage_path')
      .eq('id', req.params.id)
      .single();

    if (docError || !doc) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
    }

    await supabase.storage.from('documentos').remove([doc.storage_path]);

    const { error: dbError } = await supabase
      .from('documentos')
      .delete()
      .eq('id', req.params.id);

    if (dbError) throw dbError;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
