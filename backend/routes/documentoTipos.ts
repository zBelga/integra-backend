/**
 * Catálogo de tipos de documento por empresa + regras de obrigatoriedade por função.
 *
 * Princípios que valem para TODO este arquivo:
 *  - Nenhuma operação aqui apaga arquivo do Storage nem linha da tabela `documentos`.
 *    Desativar ou remover a exigência de um tipo mexe só na REGRA.
 *  - Isolamento por empresa: toda query filtra por empresa_id, sempre vindo do JWT
 *    quando disponível (o cliente não escolhe de qual empresa lê).
 *  - Sem duplicidade: índices únicos no banco + verificação amigável antes do insert.
 */
import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { queryRows } from '../db.js';

const router = Router();

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado no .env');
  return createClient(url, key);
}

/** empresa_id efetivo: o do token manda; query string só é aceita para o master. */
function empresaDoPedido(req: Request): string {
  const doToken = req.user?.empresa_id;
  const daQuery = String(req.query.empresa_id || req.body?.empresa_id || '');
  if (req.user?.perfil === 'master_admin' && daQuery) return daQuery;
  return doToken || daQuery;
}

/** Quem pode mexer no catálogo e nas regras. Não altera permissões globais. */
const PERFIS_GESTAO = new Set(['master_admin', 'administrador', 'gestor_rh']);
function podeGerenciar(req: Request): boolean {
  return PERFIS_GESTAO.has(String(req.user?.perfil || ''));
}
function bloqueado(res: Response) {
  return res
    .status(403)
    .json({ success: false, error: 'Você não tem permissão para alterar a configuração de documentos.' });
}

function normalizar(texto: string): string {
  return String(texto || '').trim().toUpperCase();
}

/** Registra no histórico. Falha aqui nunca derruba a operação principal. */
async function registrarHistorico(
  sb: SupabaseClient,
  req: Request,
  entidade: 'tipo' | 'exigencia',
  entidadeId: string,
  acao: string,
  detalhes: string
) {
  try {
    await sb.from('documento_historico').insert({
      empresa_id: empresaDoPedido(req),
      entidade,
      entidade_id: entidadeId,
      acao,
      usuario_id: req.user?.id || '',
      usuario_nome: req.user?.nome || '',
      detalhes,
    });
  } catch {
    /* histórico é best-effort */
  }
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES (CARGOS) DA EMPRESA
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/documento-tipos/funcoes
 * Junta as funções que já existem no sistema: cargos cadastrados + funções dos
 * colaboradores + funções das admissões. Não cria cargo nenhum.
 */
router.get('/meta/funcoes', async (req: Request, res: Response) => {
  try {
    const empresa_id = empresaDoPedido(req);
    if (!empresa_id) return res.status(400).json({ success: false, error: 'Empresa não identificada.' });

    const [cargos, colabs, adms] = await Promise.all([
      queryRows('SELECT nome FROM cargos WHERE empresa_id = ? AND status = ?', [empresa_id, 'ativo']),
      queryRows('SELECT DISTINCT funcao FROM colaboradores WHERE empresa_id = ?', [empresa_id]),
      queryRows('SELECT DISTINCT funcao FROM admissoes WHERE empresa_id = ?', [empresa_id]),
    ]);

    const mapa = new Map<string, string>(); // chave normalizada -> rótulo exibido
    const juntar = (valor: any) => {
      const texto = String(valor || '').trim();
      if (!texto) return;
      const chave = normalizar(texto);
      if (!mapa.has(chave)) mapa.set(chave, texto);
    };

    (cargos as any[]).forEach(c => juntar(c.nome));
    (colabs as any[]).forEach(c => juntar(c.funcao));
    (adms as any[]).forEach(a => juntar(a.funcao));

    // Quantos colaboradores em cada função — ajuda a priorizar na tela
    const contagem = new Map<string, number>();
    (colabs as any[]).forEach(() => {});
    const porFuncao = (await queryRows(
      'SELECT funcao, COUNT(*) as total FROM colaboradores WHERE empresa_id = ? GROUP BY funcao',
      [empresa_id]
    )) as any[];
    porFuncao.forEach(r => contagem.set(normalizar(r.funcao), Number(r.total) || 0));

    const data = Array.from(mapa.entries())
      .map(([chave, rotulo]) => ({ chave, nome: rotulo, colaboradores: contagem.get(chave) || 0 }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// EXIGÊNCIAS POR FUNÇÃO
// ─────────────────────────────────────────────────────────────

/** GET /api/documento-tipos/exigencias?funcao=X — regras de uma função (ou todas) */
router.get('/exigencias/lista', async (req: Request, res: Response) => {
  try {
    const empresa_id = empresaDoPedido(req);
    const sb = getSupabase();

    let q = sb.from('documento_exigencias').select('*').eq('empresa_id', empresa_id);
    if (req.query.funcao) q = q.eq('funcao', normalizar(String(req.query.funcao)));

    const { data, error } = await q;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/documento-tipos/exigencias — grava a lista de obrigatórios de uma função.
 * Recebe { funcao, tipo_ids: [] } e faz a regra ficar exatamente igual à lista.
 * Mexe SÓ na tabela de regras.
 */
router.put('/exigencias', async (req: Request, res: Response) => {
  try {
    if (!podeGerenciar(req)) return bloqueado(res);

    const empresa_id = empresaDoPedido(req);
    const funcao = normalizar(req.body.funcao);
    const tipoIds: string[] = Array.isArray(req.body.tipo_ids) ? req.body.tipo_ids.map(String) : [];

    if (!empresa_id) return res.status(400).json({ success: false, error: 'Empresa não identificada.' });
    if (!funcao) return res.status(400).json({ success: false, error: 'Selecione a função.' });

    const sb = getSupabase();

    // Só aceita tipos que existem nesta empresa (bloqueia id de outra empresa)
    const { data: tiposValidos } = await sb
      .from('documento_tipos')
      .select('id')
      .eq('empresa_id', empresa_id)
      .in('id', tipoIds.length ? tipoIds : ['__nenhum__']);

    const idsOk = new Set((tiposValidos || []).map(t => t.id));
    const desejados = tipoIds.filter(id => idsOk.has(id));

    const { data: atuais } = await sb
      .from('documento_exigencias')
      .select('id, tipo_id')
      .eq('empresa_id', empresa_id)
      .eq('funcao', funcao);

    const atuaisIds = new Set((atuais || []).map(e => e.tipo_id));

    const inserir = desejados.filter(id => !atuaisIds.has(id));
    const remover = (atuais || []).filter(e => !desejados.includes(e.tipo_id)).map(e => e.id);

    if (inserir.length) {
      const { error } = await sb.from('documento_exigencias').insert(
        inserir.map(tipo_id => ({ empresa_id, funcao, tipo_id, obrigatorio: true }))
      );
      if (error) throw error;
    }

    // Remove apenas a REGRA. Arquivos e histórico ficam intactos.
    if (remover.length) {
      const { error } = await sb.from('documento_exigencias').delete().in('id', remover);
      if (error) throw error;
    }

    await registrarHistorico(
      sb,
      req,
      'exigencia',
      funcao,
      'atualizada',
      `${funcao}: ${desejados.length} documento(s) obrigatório(s)`
    );

    res.json({ success: true, data: { funcao, total: desejados.length, adicionados: inserir.length, removidos: remover.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/documento-tipos/exigencias/resumo — nº de exigências por função (para a matriz) */
router.get('/exigencias/resumo', async (req: Request, res: Response) => {
  try {
    const empresa_id = empresaDoPedido(req);
    const sb = getSupabase();

    const { data, error } = await sb
      .from('documento_exigencias')
      .select('funcao, tipo_id')
      .eq('empresa_id', empresa_id);

    if (error) throw error;

    const resumo: Record<string, string[]> = {};
    (data || []).forEach(e => {
      if (!resumo[e.funcao]) resumo[e.funcao] = [];
      resumo[e.funcao].push(e.tipo_id);
    });

    res.json({ success: true, data: resumo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// TIPOS DE DOCUMENTO
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/documento-tipos
 * Lista o catálogo da empresa ativa. Na primeira chamada garante os 8 padrões
 * (função SQL idempotente — nunca duplica, nunca sobrescreve edições).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const empresa_id = empresaDoPedido(req);
    if (!empresa_id) return res.status(400).json({ success: false, error: 'Empresa não identificada.' });

    const sb = getSupabase();
    const { error: erroCatalogo } = await sb.rpc('garantir_tipos_padrao', { p_empresa_id: empresa_id });
    if (erroCatalogo) throw erroCatalogo;

    let q = sb.from('documento_tipos').select('*').eq('empresa_id', empresa_id);
    if (req.query.status && req.query.status !== 'all') q = q.eq('status', String(req.query.status));

    const { data, error } = await q.order('ordem', { ascending: true }).order('nome', { ascending: true });
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/documento-tipos — cria um tipo novo no catálogo da empresa */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!podeGerenciar(req)) return bloqueado(res);

    const empresa_id = empresaDoPedido(req);
    const nome = String(req.body.nome || '').trim();
    const codigo = String(req.body.codigo || '').trim();

    if (!empresa_id) return res.status(400).json({ success: false, error: 'Empresa não identificada.' });
    if (!nome) return res.status(400).json({ success: false, error: 'Informe o nome do documento.' });
    if (!codigo) return res.status(400).json({ success: false, error: 'Informe a sigla ou código.' });
    if (!/^[A-Za-z0-9._-]{2,20}$/.test(codigo)) {
      return res.status(400).json({
        success: false,
        error: 'O código deve ter de 2 a 20 caracteres, sem espaços ou acentos. Ex.: PEMT',
      });
    }

    const sb = getSupabase();

    // Checagem amigável antes do índice único disparar
    const { data: existentes } = await sb
      .from('documento_tipos')
      .select('id, nome, codigo')
      .eq('empresa_id', empresa_id);

    const duplicado = (existentes || []).find(
      t => normalizar(t.codigo) === normalizar(codigo) || normalizar(t.nome) === normalizar(nome)
    );
    if (duplicado) {
      return res.status(409).json({
        success: false,
        error: `Já existe um tipo com esse ${normalizar(duplicado.codigo) === normalizar(codigo) ? 'código' : 'nome'} nesta empresa: ${duplicado.nome} (${duplicado.codigo}).`,
      });
    }

    const temValidade = req.body.tem_validade === true || req.body.tem_validade === 'true';

    const { data, error } = await sb
      .from('documento_tipos')
      .insert({
        empresa_id,
        nome,
        codigo: codigo.toUpperCase(),
        descricao: String(req.body.descricao || '').trim(),
        tem_validade: temValidade,
        validade_meses: temValidade && req.body.validade_meses ? Number(req.body.validade_meses) : null,
        dias_alerta: Number(req.body.dias_alerta) > 0 ? Number(req.body.dias_alerta) : 30,
        status: req.body.status === 'inativo' ? 'inativo' : 'ativo',
        padrao: false,
        ordem: 200,
        todos_colaboradores: req.body.todos_colaboradores === true || req.body.todos_colaboradores === 'true',
      })
      .select()
      .single();

    if (error) throw error;

    await registrarHistorico(sb, req, 'tipo', data.id, 'criado', `${data.nome} (${data.codigo})`);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** PUT /api/documento-tipos/:id — edita (inclusive os 8 padrão) */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!podeGerenciar(req)) return bloqueado(res);

    const empresa_id = empresaDoPedido(req);
    const sb = getSupabase();

    const { data: atual, error: erroBusca } = await sb
      .from('documento_tipos')
      .select('*')
      .eq('id', req.params.id)
      .eq('empresa_id', empresa_id)
      .single();

    if (erroBusca || !atual) {
      return res.status(404).json({ success: false, error: 'Tipo de documento não encontrado nesta empresa.' });
    }

    const nome = req.body.nome !== undefined ? String(req.body.nome).trim() : atual.nome;
    const codigo = req.body.codigo !== undefined ? String(req.body.codigo).trim().toUpperCase() : atual.codigo;

    if (!nome || !codigo) {
      return res.status(400).json({ success: false, error: 'Nome e código são obrigatórios.' });
    }

    const { data: outros } = await sb
      .from('documento_tipos')
      .select('id, nome, codigo')
      .eq('empresa_id', empresa_id)
      .neq('id', req.params.id);

    const duplicado = (outros || []).find(
      t => normalizar(t.codigo) === normalizar(codigo) || normalizar(t.nome) === normalizar(nome)
    );
    if (duplicado) {
      return res.status(409).json({
        success: false,
        error: `Já existe outro tipo com esse nome ou código: ${duplicado.nome} (${duplicado.codigo}).`,
      });
    }

    const temValidade =
      req.body.tem_validade !== undefined
        ? req.body.tem_validade === true || req.body.tem_validade === 'true'
        : atual.tem_validade;

    const patch: Record<string, any> = {
      nome,
      codigo,
      descricao: req.body.descricao !== undefined ? String(req.body.descricao).trim() : atual.descricao,
      tem_validade: temValidade,
      validade_meses: temValidade
        ? req.body.validade_meses
          ? Number(req.body.validade_meses)
          : atual.validade_meses
        : null,
      dias_alerta:
        Number(req.body.dias_alerta) > 0 ? Number(req.body.dias_alerta) : atual.dias_alerta,
      updated_at: new Date().toISOString(),
    };
    if (req.body.status === 'ativo' || req.body.status === 'inativo') patch.status = req.body.status;
    if (req.body.todos_colaboradores !== undefined) {
      patch.todos_colaboradores = req.body.todos_colaboradores === true || req.body.todos_colaboradores === 'true';
    }

    const { data, error } = await sb
      .from('documento_tipos')
      .update(patch)
      .eq('id', req.params.id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;

    await registrarHistorico(sb, req, 'tipo', data.id, 'editado', `${data.nome} (${data.codigo})`);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/documento-tipos/:id/status — ativa ou desativa.
 *
 * Desativar NÃO apaga nada: os arquivos já enviados continuam no Storage e
 * continuam aparecendo no histórico do colaborador. O tipo apenas deixa de
 * contar como pendência e some das listas de seleção. Reativar é só chamar
 * de novo com status 'ativo'.
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!podeGerenciar(req)) return bloqueado(res);

    const status = req.body.status === 'ativo' ? 'ativo' : 'inativo';
    const empresa_id = empresaDoPedido(req);
    const sb = getSupabase();

    const { data, error } = await sb
      .from('documento_tipos')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Tipo não encontrado.' });

    // Quantos arquivos ficaram preservados — devolvido para a UI poder avisar
    const { count } = await sb
      .from('documentos')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa_id)
      .eq('tipo_id', req.params.id);

    await registrarHistorico(
      sb,
      req,
      'tipo',
      data.id,
      status === 'ativo' ? 'reativado' : 'desativado',
      `${data.nome} — ${count || 0} arquivo(s) preservado(s)`
    );

    res.json({ success: true, data, arquivos_preservados: count || 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
