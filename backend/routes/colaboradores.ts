import { Router, Request, Response } from 'express';
import { queryRows, executeQuery } from '../db.js';
import { exigirTela, exigirAlgumaTela, exigirExtra, empresaDoPedido, mesmaEmpresa } from '../utils/permissoes.js';

const router = Router();

/**
 * A coluna `status` existe neste banco?
 *
 * O backend sobe antes de a migração ser aplicada em produção. Sem esta
 * verificação, a primeira consulta do Efetivo quebraria inteira por causa de
 * uma coluna que ainda não existe. Enquanto ela não estiver lá, a tela
 * funciona como antes (todo mundo é ativo) e desligar avisa o que falta.
 *
 * A resposta é lembrada: é uma consulta só, na primeira vez.
 */
let colunaStatus: Promise<boolean> | null = null;
function temColunaStatus(): Promise<boolean> {
  if (!colunaStatus) {
    colunaStatus = queryRows('SELECT status FROM colaboradores LIMIT 1')
      .then(() => true)
      .catch(() => false);
  }
  return colunaStatus;
}

const FALTA_MIGRACAO =
  'O banco ainda não tem a coluna de status. Rode o desligamento-colaboradores.sql para liberar o desligamento.';

// GET /api/colaboradores - List efetivo with pagination and search
router.get('/', exigirAlgumaTela(['administrativo.efetivo', 'administrativo.efetivoObra', 'documentacao.documentos']), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;
    const search = ((req.query.search as string) || '').trim();
    const obraId = ((req.query.obra as string) || '').trim();
    /**
     * Ativos x desligados.
     *
     * Desligar não apaga ninguém: o registro continua inteiro, só muda de
     * status. Por isso a lista precisa dizer qual lado ela quer — o padrão é
     * "ativo", que é o Efetivo de todo dia; 'desligado' traz a outra aba e
     * 'todos' junta os dois (relatórios, exportações).
     */
    const statusPedido = String(req.query.status || 'ativo').trim().toLowerCase();

    const where: string[] = [];
    const params: any[] = [];

    // Isolamento entre empresas: a lista só traz quem é da empresa ativa.
    const empresa = empresaDoPedido(req);
    if (empresa) {
      where.push('c.empresa_id = ?');
      params.push(empresa);
    }

    if (search) {
      where.push('(c.nome LIKE ? OR c.cpf LIKE ? OR c.numero_chapa LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (obraId) {
      where.push('c.obra_id = ?');
      params.push(obraId);
    }
    if ((statusPedido === 'ativo' || statusPedido === 'desligado') && await temColunaStatus()) {
      // COALESCE porque quem já estava na base antes da coluna existir vem NULL
      where.push("COALESCE(c.status, 'ativo') = ?");
      params.push(statusPedido);
    }

    const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await queryRows(`SELECT COUNT(*) as total FROM colaboradores c ${whereSQL}`, params);
    const total = countRes[0]?.total || 0;

    // Ordem da lista. Desligados: últimos demitidos primeiro (desligado_em DESC).
    // Ativos: alfabético por nome. `?ordenar=recentes` força created_at DESC.
    const ordem = String(req.query.ordenar || '') === 'recentes'
      ? 'c.created_at DESC'
      : statusPedido === 'desligado'
        ? 'c.desligado_em DESC NULLS LAST'
        : 'c.nome ASC';

    const rows = await queryRows(`
      SELECT c.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM colaboradores c
      LEFT JOIN obras o ON c.obra_id = o.id
      ${whereSQL}
      ORDER BY ${ordem}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/colaboradores/:id
router.get('/:id', exigirAlgumaTela(['administrativo.efetivo', 'administrativo.efetivoObra', 'documentacao.documentos']), async (req: Request, res: Response) => {
  try {
    const rows = await queryRows(`
      SELECT c.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM colaboradores c
      LEFT JOIN obras o ON c.obra_id = o.id
      WHERE c.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    if (!mesmaEmpresa(req, rows[0].empresa_id)) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/colaboradores/:id
router.put('/:id', exigirTela('administrativo.efetivo', 'editar'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, funcao, rg, numero_chapa, obra_id, data_admissao, data_aso } = req.body;

    const existing = await queryRows('SELECT id FROM colaboradores WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });

    if (!nome?.trim()) return res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    if (!numero_chapa?.trim()) return res.status(400).json({ success: false, error: 'Número da chapa é obrigatório.' });

    await executeQuery(
      `UPDATE colaboradores SET nome=?, funcao=?, rg=?, numero_chapa=?, obra_id=?, data_admissao=?, data_aso=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [nome.trim(), funcao?.trim() || '', rg?.trim() || '', numero_chapa.trim(), obra_id || '', data_admissao || '', data_aso || '', id]
    );

    const updated = await queryRows(`
      SELECT c.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM colaboradores c LEFT JOIN obras o ON c.obra_id = o.id
      WHERE c.id = ?
    `, [id]);

    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/colaboradores/:id/desligar
 *
 * Registra o desligamento. NADA é apagado: o colaborador sai da lista do
 * efetivo, vai para a aba "Desligados" e mantém documentos, histórico e
 * fichas. Dá para voltar atrás em /reativar.
 */
router.post('/:id/desligar', exigirExtra('administrativo.efetivo', 'desligar'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = String(req.body?.data_desligamento || '').trim();
    const motivo = String(req.body?.motivo || '').trim();

    if (!data) return res.status(400).json({ success: false, error: 'Informe a data do desligamento.' });
    if (!await temColunaStatus()) return res.status(400).json({ success: false, error: FALTA_MIGRACAO });

    const atual = await queryRows('SELECT id, nome, empresa_id, status FROM colaboradores WHERE id = ?', [id]);
    if (!atual.length) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    if (!mesmaEmpresa(req, atual[0].empresa_id)) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }
    if (String(atual[0].status || 'ativo') === 'desligado') {
      return res.status(400).json({ success: false, error: 'Esse colaborador já está desligado.' });
    }

    await executeQuery(
      `UPDATE colaboradores
          SET status = 'desligado', desligado_em = ?, motivo_desligamento = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [data, motivo, id]
    );

    res.json({ success: true, message: `${atual[0].nome} foi para a lista de desligados.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/colaboradores/:id/reativar — desfaz o desligamento. */
router.post('/:id/reativar', exigirExtra('administrativo.efetivo', 'desligar'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!await temColunaStatus()) return res.status(400).json({ success: false, error: FALTA_MIGRACAO });

    const atual = await queryRows('SELECT id, nome, empresa_id FROM colaboradores WHERE id = ?', [id]);
    if (!atual.length) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    if (!mesmaEmpresa(req, atual[0].empresa_id)) {
      return res.status(403).json({ success: false, error: 'Colaborador de outra empresa.' });
    }

    await executeQuery(
      `UPDATE colaboradores
          SET status = 'ativo', desligado_em = '', motivo_desligamento = '', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [id]
    );

    res.json({ success: true, message: `${atual[0].nome} voltou para o efetivo.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
