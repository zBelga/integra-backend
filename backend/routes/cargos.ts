import { Router } from 'express';
import { queryRows, executeQuery, saveDbToDisk } from '../db.js';

const router = Router();

// GET /api/cargos - List cargos filtered by empresa_id (strict company isolation)
router.get('/', async (req, res) => {
  try {
    const { empresa_id, status } = req.query;

    let sql = 'SELECT * FROM cargos WHERE 1=1';
    const params: any[] = [];

    if (empresa_id) {
      sql += ' AND empresa_id = ?';
      params.push(empresa_id);
    }

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY nome ASC';

    const cargos = await queryRows(sql, params);

    res.json({
      success: true,
      data: cargos,
      total: cargos.length,
    });
  } catch (error: any) {
    console.error('Erro ao listar cargos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao carregar lista de cargos da empresa',
    });
  }
});

// GET /api/cargos/:id - Get single cargo
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cargos = await queryRows('SELECT * FROM cargos WHERE id = ?', [id]);

    if (cargos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cargo não encontrado',
      });
    }

    res.json({
      success: true,
      data: cargos[0],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar cargo',
    });
  }
});

// POST /api/cargos - Create new cargo for a company
router.post('/', async (req, res) => {
  try {
    const { empresa_id, nome, descricao, status } = req.body;

    if (!empresa_id) {
      return res.status(400).json({
        success: false,
        error: 'A empresa vinculada é obrigatória para cadastrar um cargo.',
      });
    }

    if (!nome || !nome.trim()) {
      return res.status(400).json({
        success: false,
        error: 'O nome do cargo / função é obrigatório.',
      });
    }

    const trimmedNome = nome.trim();

    // Check for duplicate cargo name within the same company (case-insensitive)
    const existing = await queryRows(
      'SELECT id FROM cargos WHERE empresa_id = ? AND LOWER(TRIM(nome)) = LOWER(?)',
      [empresa_id, trimmedNome]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Já existe um cargo com o nome "${trimmedNome}" cadastrado para esta empresa.`,
      });
    }

    const newId = `crg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const cargoStatus = status === 'inativo' ? 'inativo' : 'ativo';

    await executeQuery(
      `INSERT INTO cargos (id, empresa_id, nome, descricao, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [newId, empresa_id, trimmedNome, descricao?.trim() || '', cargoStatus]
    );

    const created = await queryRows('SELECT * FROM cargos WHERE id = ?', [newId]);

    res.status(201).json({
      success: true,
      message: 'Cargo criado com sucesso!',
      data: created[0],
    });
  } catch (error: any) {
    console.error('Erro ao criar cargo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao criar cargo',
    });
  }
});

// PUT /api/cargos/:id - Update cargo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, status, empresa_id } = req.body;

    const existing = await queryRows('SELECT * FROM cargos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cargo não encontrado para atualização.',
      });
    }

    const currentCargo = existing[0];
    const targetEmpresaId = empresa_id || currentCargo.empresa_id;
    const targetNome = (nome !== undefined ? nome.trim() : currentCargo.nome);

    if (!targetNome) {
      return res.status(400).json({
        success: false,
        error: 'O nome do cargo não pode ficar vazio.',
      });
    }

    // Check duplicate name in same company (excluding current record)
    const duplicateCheck = await queryRows(
      'SELECT id FROM cargos WHERE empresa_id = ? AND LOWER(TRIM(nome)) = LOWER(?) AND id != ?',
      [targetEmpresaId, targetNome, id]
    );

    if (duplicateCheck.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Já existe outro cargo com o nome "${targetNome}" para esta empresa.`,
      });
    }

    const targetDesc = descricao !== undefined ? descricao.trim() : (currentCargo.descricao || '');
    const targetStatus = status !== undefined ? status : currentCargo.status;

    await executeQuery(
      `UPDATE cargos 
       SET nome = ?, descricao = ?, status = ?, empresa_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [targetNome, targetDesc, targetStatus, targetEmpresaId, id]
    );

    // Also update cargo string in users table if the name changed
    if (targetNome !== currentCargo.nome) {
      await executeQuery(
        `UPDATE usuarios SET cargo = ? WHERE cargo_id = ?`,
        [targetNome, id]
      );
    }

    const updated = await queryRows('SELECT * FROM cargos WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Cargo atualizado com sucesso!',
      data: updated[0],
    });
  } catch (error: any) {
    console.error('Erro ao atualizar cargo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao atualizar cargo',
    });
  }
});

// PATCH /api/cargos/:id/status - Toggle active/inactive status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ativo', 'inativo'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status inválido. Use "ativo" ou "inativo".',
      });
    }

    const existing = await queryRows('SELECT * FROM cargos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cargo não encontrado.',
      });
    }

    await executeQuery(
      'UPDATE cargos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    const updated = await queryRows('SELECT * FROM cargos WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Cargo ${status === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`,
      data: updated[0],
    });
  } catch (error: any) {
    console.error('Erro ao alterar status do cargo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao alterar status do cargo',
    });
  }
});

// DELETE /api/cargos/:id - Delete cargo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await queryRows('SELECT * FROM cargos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cargo não encontrado.',
      });
    }

    // Check if users are using this cargo
    const usersWithCargo = await queryRows('SELECT id, nome FROM usuarios WHERE cargo_id = ?', [id]);
    if (usersWithCargo.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Não é possível excluir este cargo pois existem ${usersWithCargo.length} usuário(s) vinculado(s) a ele. Você pode desativar o cargo em vez de excluir.`,
      });
    }

    await executeQuery('DELETE FROM cargos WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Cargo excluído com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro ao excluir cargo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao excluir cargo',
    });
  }
});

export default router;
