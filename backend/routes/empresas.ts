import { Router, Request, Response } from 'express';
import { queryRows, executeQuery } from '../db.js';

const router = Router();

// GET /api/empresas
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await queryRows(
      'SELECT * FROM empresas ORDER BY created_at DESC',
      []
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/empresas
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, razaoSocial, cnpj, segmento, corPrimaria, logoUrl, status } = req.body;

    if (!nome?.trim()) return res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    if (!cnpj?.trim()) return res.status(400).json({ success: false, error: 'CNPJ é obrigatório.' });

    const dup = await queryRows('SELECT id FROM empresas WHERE cnpj = ?', [cnpj.trim()]);
    if (dup.length > 0) return res.status(409).json({ success: false, error: 'CNPJ já cadastrado.' });

    const id = `emp-${Date.now().toString().slice(-6)}`;
    await executeQuery(
      `INSERT INTO empresas (id, nome, razaoSocial, cnpj, segmento, corPrimaria, logoUrl, obrasCount, colaboradoresCount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, nome.trim(), razaoSocial || '', cnpj.trim(), segmento || '', corPrimaria || '#176B87', logoUrl || '', status || 'ativa']
    );

    const rows = await queryRows('SELECT * FROM empresas WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/empresas/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, razaoSocial, cnpj, segmento, corPrimaria, logoUrl, status } = req.body;

    const existing = await queryRows('SELECT id FROM empresas WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: 'Empresa não encontrada.' });

    if (cnpj) {
      const dup = await queryRows('SELECT id FROM empresas WHERE cnpj = ? AND id != ?', [cnpj.trim(), id]);
      if (dup.length > 0) return res.status(409).json({ success: false, error: 'CNPJ já cadastrado em outra empresa.' });
    }

    await executeQuery(
      `UPDATE empresas SET nome = ?, razaoSocial = ?, cnpj = ?, segmento = ?, corPrimaria = ?, logoUrl = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nome, razaoSocial || '', cnpj, segmento || '', corPrimaria || '#176B87', logoUrl || '', status || 'ativa', id]
    );

    const rows = await queryRows('SELECT * FROM empresas WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/empresas/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await queryRows('SELECT nome FROM empresas WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: 'Empresa não encontrada.' });

    await executeQuery('DELETE FROM empresas WHERE id = ?', [id]);
    res.json({ success: true, message: `Empresa "${existing[0].nome}" excluída com sucesso.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
