import { Router, Request, Response } from 'express';
import { queryRows, executeQuery } from '../db.js';

const router = Router();

// GET /api/colaboradores - List efetivo with pagination and search
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;
    const search = ((req.query.search as string) || '').trim();
    const obraId = ((req.query.obra as string) || '').trim();

    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      where.push('(c.nome LIKE ? OR c.cpf LIKE ? OR c.numero_chapa LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (obraId) {
      where.push('c.obra_id = ?');
      params.push(obraId);
    }

    const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await queryRows(`SELECT COUNT(*) as total FROM colaboradores c ${whereSQL}`, params);
    const total = countRes[0]?.total || 0;

    const rows = await queryRows(`
      SELECT c.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM colaboradores c
      INNER JOIN obras o ON c.obra_id = o.id
      ${whereSQL}
      ORDER BY c.created_at DESC
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await queryRows(`
      SELECT c.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM colaboradores c
      INNER JOIN obras o ON c.obra_id = o.id
      WHERE c.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/colaboradores/:id
router.put('/:id', async (req: Request, res: Response) => {
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

export default router;
