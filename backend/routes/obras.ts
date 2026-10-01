import { Router, Request, Response } from 'express';
import { queryRows, executeQuery } from '../db.js';
import { exigirTela, exigirAlgumaTela } from '../utils/permissoes.js';

const router = Router();

// GET /api/obras - List all obras
router.get('/', exigirAlgumaTela(['administrativo.obras', 'administrativo.admissoes', 'administrativo.efetivo', 'administrativo.efetivoObra']), async (req: Request, res: Response) => {
  try {
    const obras = await queryRows(
      'SELECT id, nome, codigo, created_at, updated_at FROM obras ORDER BY nome ASC'
    );
    res.json({ success: true, data: obras });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao buscar obras.' });
  }
});

// POST /api/obras - Create new obra
router.post('/', exigirTela('administrativo.obras', 'criar'), async (req: Request, res: Response) => {
  try {

    const { nome, codigo } = req.body;

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ success: false, error: 'O nome da obra é obrigatório.' });
    }

    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      return res.status(400).json({ success: false, error: 'O código da obra é obrigatório.' });
    }

    const trimmedNome = nome.trim();
    const trimmedCodigo = codigo.trim().toUpperCase();

    // Check code duplication
    const existing = await queryRows('SELECT id FROM obras WHERE codigo = ?', [trimmedCodigo]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Já existe uma obra cadastrada com este código.' });
    }

    const id = `obra-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await executeQuery(
      'INSERT INTO obras (id, nome, codigo, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [id, trimmedNome, trimmedCodigo]
    );

    const [created] = await queryRows('SELECT id, nome, codigo, created_at FROM obras WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao criar obra.' });
  }
});

// PUT /api/obras/:id - Update obra
router.put('/:id', exigirTela('administrativo.obras', 'editar'), async (req: Request, res: Response) => {
  try {

    const { id } = req.params;
    const { nome, codigo } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ success: false, error: 'O nome da obra é obrigatório.' });
    }

    if (!codigo || !codigo.trim()) {
      return res.status(400).json({ success: false, error: 'O código da obra é obrigatório.' });
    }

    const existingObra = await queryRows('SELECT id FROM obras WHERE id = ?', [id]);
    if (existingObra.length === 0) {
      return res.status(404).json({ success: false, error: 'Obra não encontrada.' });
    }

    const trimmedNome = nome.trim();
    const trimmedCodigo = codigo.trim().toUpperCase();

    // Code collision check on other records
    const codeCheck = await queryRows('SELECT id FROM obras WHERE codigo = ? AND id != ?', [trimmedCodigo, id]);
    if (codeCheck.length > 0) {
      return res.status(400).json({ success: false, error: 'Código de obra já utilizado por outro registro.' });
    }

    await executeQuery(
      'UPDATE obras SET nome = ?, codigo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [trimmedNome, trimmedCodigo, id]
    );

    const [updated] = await queryRows('SELECT id, nome, codigo, updated_at FROM obras WHERE id = ?', [id]);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao atualizar obra.' });
  }
});

// DELETE /api/obras/:id - Delete obra
router.delete('/:id', exigirTela('administrativo.obras', 'excluir'), async (req: Request, res: Response) => {
  try {

    const { id } = req.params;

    // Check linked admissions
    const linkedAdmissions = await queryRows('SELECT COUNT(*) as count FROM admissoes WHERE obra_id = ?', [id]);
    const count = linkedAdmissions[0]?.count || 0;

    if (count > 0) {
      return res.status(400).json({
        success: false,
        error: `Não é possível excluir esta obra pois existem ${count} admissão(ões) vinculadas a ela.`,
      });
    }

    await executeQuery('DELETE FROM obras WHERE id = ?', [id]);
    res.json({ success: true, message: 'Obra excluída com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao excluir obra.' });
  }
});

export default router;
