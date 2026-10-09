/**
 * Segurança — Ficha de EPI.
 *
 * Três coisas vivem aqui:
 *   catálogo  — os EPIs que a empresa usa (descrição + CA)
 *   grupos    — "Ajudante", "Eletricista"... e o kit de cada um
 *   mapa      — qual função do Efetivo cai em qual grupo
 *
 * Com isso a tela de gerar a ficha já sabe o que a pessoa recebe assim que
 * você escolhe o colaborador. O PDF é montado no navegador.
 */
import { Router, Request, Response } from 'express';
import { queryRows, executeQuery } from '../db.js';
import { exigirTela, empresaDoPedido } from '../utils/permissoes.js';

const router = Router();

const TELA = 'seguranca.epis';
const podeVer = exigirTela(TELA, 'ver');
const podeEditar = exigirTela(TELA, 'editar');

/** Chave de comparação de função: sem acento, maiúscula, sem espaço duplicado. */
function chaveFuncao(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

function novoId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─────────────────────────────────────────────────────────────
// GET /api/epi/config — tudo que as telas precisam, de uma vez
// ─────────────────────────────────────────────────────────────
router.get('/config', podeVer, async (req: Request, res: Response) => {
  try {
    const empresa = empresaDoPedido(req);

    const [grupos, kit, mapa, catalogo] = await Promise.all([
      queryRows('SELECT id, nome, ordem FROM epi_grupos WHERE empresa_id = ? ORDER BY ordem, nome', [empresa]),
      queryRows('SELECT id, grupo_id, qtde, ca, descricao, ordem FROM epi_kit WHERE empresa_id = ? ORDER BY ordem', [empresa]),
      queryRows('SELECT id, funcao, grupo_id FROM epi_funcao_grupo WHERE empresa_id = ? ORDER BY funcao', [empresa]),
      queryRows("SELECT id, descricao, ca FROM epi_catalogo WHERE empresa_id = ? AND status = 'ativo' ORDER BY descricao", [empresa]),
    ]);

    const porGrupo: Record<string, any[]> = {};
    (kit as any[]).forEach(i => {
      (porGrupo[i.grupo_id] = porGrupo[i.grupo_id] || []).push({
        id: i.id, qtde: Number(i.qtde) || 1, ca: i.ca || '', descricao: i.descricao,
      });
    });

    res.json({
      success: true,
      data: {
        grupos: (grupos as any[]).map(g => ({ ...g, itens: porGrupo[g.id] || [] })),
        mapa: (mapa as any[]).map(m => ({ ...m, chave: chaveFuncao(m.funcao) })),
        catalogo,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao carregar a configuração de EPI.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/epi/grupos/:id/kit — substitui o kit do grupo
// ─────────────────────────────────────────────────────────────
router.put('/grupos/:id/kit', podeEditar, async (req: Request, res: Response) => {
  try {
    const empresa = empresaDoPedido(req);
    const grupoId = String(req.params.id);

    const grupo = await queryRows('SELECT id FROM epi_grupos WHERE id = ? AND empresa_id = ?', [grupoId, empresa]);
    if (!grupo.length) return res.status(404).json({ success: false, error: 'Grupo não encontrado.' });

    const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
    for (const i of itens) {
      if (!String(i?.descricao || '').trim()) {
        return res.status(400).json({ success: false, error: 'Todo item precisa de descrição.' });
      }
    }

    // Reescreve o kit inteiro: apaga e grava de novo, na ordem recebida.
    await executeQuery('DELETE FROM epi_kit WHERE grupo_id = ? AND empresa_id = ?', [grupoId, empresa]);

    let ordem = 0;
    for (const i of itens) {
      await executeQuery(
        `INSERT INTO epi_kit (id, empresa_id, grupo_id, qtde, ca, descricao, ordem, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [novoId('epik'), empresa, grupoId, Number(i.qtde) || 1,
         String(i.ca || '').trim(), String(i.descricao).trim(), ordem++]
      );
    }

    res.json({ success: true, message: `Kit salvo com ${itens.length} ite${itens.length === 1 ? 'm' : 'ns'}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao salvar o kit.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/epi/mapa — qual função cai em qual grupo
// ─────────────────────────────────────────────────────────────
router.put('/mapa', podeEditar, async (req: Request, res: Response) => {
  try {
    const empresa = empresaDoPedido(req);
    const funcao = String(req.body?.funcao || '').trim();
    const grupoId = String(req.body?.grupo_id || '').trim();
    if (!funcao) return res.status(400).json({ success: false, error: 'Informe a função.' });

    const existente = await queryRows(
      'SELECT id FROM epi_funcao_grupo WHERE empresa_id = ? AND UPPER(TRIM(funcao)) = ?',
      [empresa, funcao.toUpperCase()]
    );

    // Sem grupo = desvincula a função
    if (!grupoId) {
      if (existente.length) {
        await executeQuery('DELETE FROM epi_funcao_grupo WHERE id = ?', [existente[0].id]);
      }
      return res.json({ success: true, message: 'Função desvinculada.' });
    }

    const grupo = await queryRows('SELECT id FROM epi_grupos WHERE id = ? AND empresa_id = ?', [grupoId, empresa]);
    if (!grupo.length) return res.status(404).json({ success: false, error: 'Grupo não encontrado.' });

    if (existente.length) {
      await executeQuery(
        'UPDATE epi_funcao_grupo SET grupo_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [grupoId, existente[0].id]
      );
    } else {
      await executeQuery(
        `INSERT INTO epi_funcao_grupo (id, empresa_id, funcao, grupo_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [novoId('epif'), empresa, funcao, grupoId]
      );
    }

    res.json({ success: true, message: 'Função vinculada.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao vincular a função.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/epi/catalogo — novo EPI no catálogo
// ─────────────────────────────────────────────────────────────
router.post('/catalogo', podeEditar, async (req: Request, res: Response) => {
  try {
    const empresa = empresaDoPedido(req);
    const descricao = String(req.body?.descricao || '').trim();
    const ca = String(req.body?.ca || '').trim();
    if (!descricao) return res.status(400).json({ success: false, error: 'Informe a descrição do EPI.' });

    const repetido = await queryRows(
      `SELECT id FROM epi_catalogo
        WHERE empresa_id = ? AND UPPER(TRIM(descricao)) = ? AND UPPER(TRIM(COALESCE(ca,''))) = ?`,
      [empresa, descricao.toUpperCase(), ca.toUpperCase()]
    );
    if (repetido.length) {
      return res.status(400).json({ success: false, error: 'Esse EPI já está no catálogo com esse mesmo CA.' });
    }

    const id = novoId('epic');
    await executeQuery(
      `INSERT INTO epi_catalogo (id, empresa_id, descricao, ca, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ativo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, empresa, descricao, ca]
    );
    res.json({ success: true, data: { id, descricao, ca } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao cadastrar o EPI.' });
  }
});

export default router;
