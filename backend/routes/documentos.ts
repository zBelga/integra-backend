import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { queryRows } from '../db.js';
import {
  pode,
  permissoesDocumentos,
  mesmaEmpresa,
  MENSAGEM_SEM_PERMISSAO,
} from '../utils/documentosAcesso.js';

const router = Router();

/** Colaborador vem do banco do servidor — é a fonte da empresa dele. */
async function buscarColaborador(id: string): Promise<any | null> {
  if (!id) return null;
  const rows = (await queryRows('SELECT * FROM colaboradores WHERE id = ?', [id])) as any[];
  return rows[0] || null;
}

/** Histórico de envio/substituição/exclusão. Nunca derruba a operação principal. */
async function registrarEventoDocumento(
  req: Request,
  ev: { empresa_id: string; colaborador_id: string; documento_id: string; acao: string; detalhes: string }
) {
  try {
    await getSupabase().from('documento_historico').insert({
      empresa_id: ev.empresa_id,
      entidade: 'documento',
      entidade_id: ev.documento_id,
      documento_id: ev.documento_id,
      colaborador_id: ev.colaborador_id,
      acao: ev.acao,
      usuario_id: req.user?.id || '',
      usuario_nome: req.user?.nome || '',
      detalhes: ev.detalhes,
    });
  } catch {
    /* best-effort */
  }
}

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

    const colaborador = await buscarColaborador(req.params.colaboradorId);
    if (!colaborador) {
      return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    }

    // Isolamento: ninguém lê documentos de colaborador de outra empresa
    if (!mesmaEmpresa(req, colaborador.empresa_id)) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }
    const permissoes = await permissoesDocumentos(req);
    if (!permissoes.visualizar) {
      return res.status(403).json({ success: false, error: MENSAGEM_SEM_PERMISSAO.visualizar });
    }

    const empresa_id = colaborador.empresa_id;

    // Garante o catálogo padrão da empresa (idempotente)
    const { error: erroCatalogo } = await sb.rpc('garantir_tipos_padrao', { p_empresa_id: empresa_id });
    if (erroCatalogo) throw erroCatalogo;

    const [{ todosOsTipos, tiposExigidos }, { data: docs, error }] = await Promise.all([
      exigenciasDaFuncao(sb, empresa_id, colaborador.funcao),
      sb
        .from('documentos')
        .select('id, tipo, tipo_id, nome, nome_arquivo, tamanho_bytes, data_emissao, data_vencimento, status, observacoes, created_at')
        .eq('colaborador_id', colaborador.id)
        .eq('status', 'ativo')
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
        permissoes,
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
    if (!empresa_id) return res.status(400).json({ success: false, error: 'Empresa não identificada.' });

    // Só os ativos: substituídos e excluídos não contam em indicadores
    const { data, error } = await supabase
      .from('documentos')
      .select('id, colaborador_id, tipo, tipo_id, data_vencimento')
      .eq('empresa_id', empresa_id)
      .eq('status', 'ativo');

    if (error) throw error;

    type DocLeve = { id: string; tipo: string; tipo_id: string | null; data_vencimento: string };
    const resumo: Record<string, { total: number; tipos: string[]; tipo_ids: string[]; docs: DocLeve[] }> = {};

    for (const doc of data || []) {
      const id = doc.colaborador_id;
      if (!id) continue;
      if (!resumo[id]) resumo[id] = { total: 0, tipos: [], tipo_ids: [], docs: [] };
      resumo[id].total++;
      if (doc.tipo) resumo[id].tipos.push(doc.tipo);
      if (doc.tipo_id) resumo[id].tipo_ids.push(doc.tipo_id);
      resumo[id].docs.push({
        id: doc.id,
        tipo: doc.tipo || '',
        tipo_id: doc.tipo_id || null,
        data_vencimento: doc.data_vencimento || '',
      });
    }

    res.json({ success: true, data: resumo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/documentos/permissoes — o que o usuário logado pode fazer (a tela usa para esconder botões) */
router.get('/permissoes', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await permissoesDocumentos(req) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/documentos/historico/:colaboradorId
 * Linha do tempo do colaborador + versões antigas (substituídas e excluídas),
 * que continuam guardadas e podem ser abertas ou restauradas.
 */
router.get('/historico/:colaboradorId', async (req: Request, res: Response) => {
  try {
    const colaborador = await buscarColaborador(req.params.colaboradorId);
    if (!colaborador) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    if (!mesmaEmpresa(req, colaborador.empresa_id)) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }
    if (!(await pode(req, 'visualizar'))) {
      return res.status(403).json({ success: false, error: MENSAGEM_SEM_PERMISSAO.visualizar });
    }

    const sb = getSupabase();
    const [{ data: eventos, error: e1 }, { data: versoes, error: e2 }] = await Promise.all([
      sb
        .from('documento_historico')
        .select('id, acao, usuario_nome, detalhes, documento_id, created_at')
        .eq('colaborador_id', colaborador.id)
        .order('created_at', { ascending: false })
        .limit(200),
      sb
        .from('documentos')
        .select('id, tipo, tipo_id, nome, nome_arquivo, tamanho_bytes, data_emissao, data_vencimento, status, created_at, uploaded_by, substituido_por, substituido_em, excluido_por, excluido_em, motivo_exclusao')
        .eq('colaborador_id', colaborador.id)
        .neq('status', 'ativo')
        .order('created_at', { ascending: false }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    res.json({ success: true, data: { eventos: eventos || [], versoes: versoes || [] } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documentos/colaborador/:id — documentos ATIVOS de um colaborador
router.get('/colaborador/:id', async (req: Request, res: Response) => {
  try {
    const colaborador = await buscarColaborador(req.params.id);
    if (!colaborador) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    if (!mesmaEmpresa(req, colaborador.empresa_id)) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('colaborador_id', req.params.id)
      .eq('status', 'ativo')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/documentos/upload — anexa um documento.
 * Com `substitui_id`, é uma SUBSTITUIÇÃO: o anterior vira 'substituido',
 * continua no Storage e aparece nas versões antigas do histórico.
 */
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const {
      colaborador_id,
      tipo,
      nome,
      nome_arquivo,
      fileBase64,
      mimeType,
      data_emissao,
      data_vencimento,
      observacoes,
      substitui_id,
    } = req.body;

    if (!colaborador_id || !tipo || !nome || !nome_arquivo || !fileBase64) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando.' });
    }

    // A empresa vem do CADASTRO do colaborador, nunca do que a tela mandou
    const colaborador = await buscarColaborador(colaborador_id);
    if (!colaborador) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    if (!mesmaEmpresa(req, colaborador.empresa_id)) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }
    const empresa_id: string = colaborador.empresa_id;

    const acao = substitui_id ? 'editar' : 'criar';
    if (!(await pode(req, acao))) {
      return res.status(403).json({ success: false, error: MENSAGEM_SEM_PERMISSAO[acao] });
    }

    const supabase = getSupabase();

    // Documento que será substituído precisa ser deste colaborador e estar ativo
    let anterior: any = null;
    if (substitui_id) {
      const { data } = await supabase
        .from('documentos')
        .select('id, colaborador_id, empresa_id, status, nome, tipo')
        .eq('id', substitui_id)
        .maybeSingle();
      if (!data || data.colaborador_id !== colaborador.id || data.status !== 'ativo') {
        return res.status(400).json({ success: false, error: 'O documento a substituir não está mais disponível.' });
      }
      anterior = data;
    }

    // Validação de tamanho e formato também no servidor
    const MAX_BYTES = 10 * 1024 * 1024;
    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Arquivo vazio.' });
    }
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({
        success: false,
        error: `Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Máximo 10 MB.`,
      });
    }
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(String(nome_arquivo))) {
      return res.status(400).json({ success: false, error: 'Formato não aceito. Use PDF, JPG, PNG ou WEBP.' });
    }
    if (data_emissao && data_vencimento && String(data_vencimento) < String(data_emissao)) {
      return res.status(400).json({ success: false, error: 'A validade não pode ser anterior à emissão.' });
    }

    // Tipo precisa existir no catálogo DESTA empresa (identificador estável)
    let tipo_id: string | null = req.body.tipo_id || null;
    if (tipo_id) {
      const { data: t } = await supabase
        .from('documento_tipos')
        .select('id, tem_validade')
        .eq('id', tipo_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle();
      if (!t) return res.status(400).json({ success: false, error: 'Tipo de documento inválido para esta empresa.' });
      if (t.tem_validade && !data_vencimento) {
        return res.status(400).json({ success: false, error: 'Este tipo de documento exige a data de validade.' });
      }
    } else {
      const { data: achado } = await supabase
        .from('documento_tipos')
        .select('id')
        .eq('empresa_id', empresa_id)
        .ilike('codigo', String(tipo).trim())
        .maybeSingle();
      tipo_id = achado?.id || null;
    }

    const id = generateId();
    const ext = String(nome_arquivo).split('.').pop()?.toLowerCase() || 'bin';
    // Caminho separado por empresa: isolamento também dentro do Storage
    const storagePath = `${empresa_id}/${colaborador.id}/${id}.${ext}`;

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
        colaborador_id: colaborador.id,
        empresa_id,
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
        uploaded_by: req.user?.nome || '',
      })
      .select()
      .single();

    if (dbError) {
      // Rollback do arquivo que acabou de subir (nenhum registro aponta para ele)
      await supabase.storage.from('documentos').remove([storagePath]);
      throw dbError;
    }

    if (anterior) {
      await supabase
        .from('documentos')
        .update({
          status: 'substituido',
          substituido_por: id,
          substituido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', anterior.id)
        .eq('status', 'ativo');
    }

    await registrarEventoDocumento(req, {
      empresa_id,
      colaborador_id: colaborador.id,
      documento_id: id,
      acao: anterior ? 'substituido' : 'enviado',
      detalhes: anterior
        ? `${tipo} — "${anterior.nome}" substituído por "${nome}" (${nome_arquivo})`
        : `${tipo} — "${nome}" (${nome_arquivo})`,
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documentos/:id/download — URL assinada temporária (2 min)
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .select('storage_path, nome_arquivo, empresa_id')
      .eq('id', req.params.id)
      .single();

    // Mesmo 404 para "não existe" e "é de outra empresa": não revela nada
    if (docError || !doc || !mesmaEmpresa(req, doc.empresa_id)) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
    }
    if (!(await pode(req, 'visualizar'))) {
      return res.status(403).json({ success: false, error: MENSAGEM_SEM_PERMISSAO.visualizar });
    }

    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(doc.storage_path, 120);

    if (error) throw error;

    res.json({ success: true, url: data.signedUrl, nome_arquivo: doc.nome_arquivo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/documentos/:id — exclusão REVERSÍVEL.
 * O registro vira 'excluido' e o arquivo continua no Storage. Some da lista
 * e dos indicadores, mas pode ser restaurado pelo histórico.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .select('id, empresa_id, colaborador_id, status, nome, tipo')
      .eq('id', req.params.id)
      .single();

    if (docError || !doc || !mesmaEmpresa(req, doc.empresa_id)) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
    }
    if (!(await pode(req, 'excluir'))) {
      return res.status(403).json({ success: false, error: MENSAGEM_SEM_PERMISSAO.excluir });
    }
    if (doc.status === 'excluido') return res.json({ success: true });

    const motivo = String(req.body?.motivo || req.query.motivo || '').slice(0, 300);

    const { error } = await supabase
      .from('documentos')
      .update({
        status: 'excluido',
        excluido_por: req.user?.nome || '',
        excluido_em: new Date().toISOString(),
        motivo_exclusao: motivo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id);

    if (error) throw error;

    await registrarEventoDocumento(req, {
      empresa_id: doc.empresa_id,
      colaborador_id: doc.colaborador_id,
      documento_id: doc.id,
      acao: 'excluido',
      detalhes: `${doc.tipo} — "${doc.nome}"${motivo ? ` · motivo: ${motivo}` : ''}`,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/documentos/:id/restaurar — desfaz uma exclusão */
router.post('/:id/restaurar', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: doc } = await supabase
      .from('documentos')
      .select('id, empresa_id, colaborador_id, status, nome, tipo')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!doc || !mesmaEmpresa(req, doc.empresa_id)) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
    }
    if (!(await pode(req, 'excluir'))) {
      return res.status(403).json({ success: false, error: MENSAGEM_SEM_PERMISSAO.excluir });
    }
    if (doc.status !== 'excluido') {
      return res.status(400).json({ success: false, error: 'Só documentos excluídos podem ser restaurados.' });
    }

    const { error } = await supabase
      .from('documentos')
      .update({
        status: 'ativo',
        excluido_por: null,
        excluido_em: null,
        motivo_exclusao: '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id);
    if (error) throw error;

    await registrarEventoDocumento(req, {
      empresa_id: doc.empresa_id,
      colaborador_id: doc.colaborador_id,
      documento_id: doc.id,
      acao: 'restaurado',
      detalhes: `${doc.tipo} — "${doc.nome}"`,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
