import { Router, Request, Response } from 'express';
import { queryRows, executeQuery } from '../db.js';

const router = Router();

const MASTER_EMAIL = 'fabriciooliveira2431@gmail.com';

// GET /api/usuarios - List all system users with company binding details
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = ((req.query.search as string) || '').trim();
    const empresaId = ((req.query.empresa_id as string) || '').trim();
    const cargoId = ((req.query.cargo_id as string) || '').trim();
    const cargo = ((req.query.cargo as string) || '').trim();
    const usuarioId = ((req.query.usuario_id as string) || '').trim();
    const status = ((req.query.status as string) || '').trim();
    const perfil = ((req.query.perfil as string) || '').trim();

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      whereClauses.push('(u.nome LIKE ? OR u.email LIKE ? OR u.cargo LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (empresaId && empresaId !== 'all') {
      whereClauses.push('u.empresa_id = ?');
      params.push(empresaId);
    }

    if (cargoId && cargoId !== 'all') {
      whereClauses.push('u.cargo_id = ?');
      params.push(cargoId);
    } else if (cargo && cargo !== 'all') {
      whereClauses.push('LOWER(TRIM(u.cargo)) = LOWER(TRIM(?))');
      params.push(cargo);
    }

    if (usuarioId && usuarioId !== 'all') {
      whereClauses.push('u.id = ?');
      params.push(usuarioId);
    }

    if (status && (status === 'ativo' || status === 'inativo')) {
      whereClauses.push('u.status = ?');
      params.push(status);
    }

    if (perfil && perfil !== 'all') {
      whereClauses.push('u.perfil = ?');
      params.push(perfil);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.cargo_id,
        u.cargo,
        u.perfil,
        u.empresa_id,
        u.status,
        u.telefone,
        u.departamento,
        u.permissoes,
        u.created_at,
        u.updated_at,
        e.nome AS empresa_nome,
        e.corPrimaria AS empresa_cor,
        e.logoUrl AS empresa_logo
      FROM usuarios u
      LEFT JOIN empresas e ON u.empresa_id = e.id
      ${whereSql}
      ORDER BY 
        CASE WHEN u.email = '${MASTER_EMAIL}' THEN 0 ELSE 1 END,
        u.created_at DESC
    `;

    const rows = await queryRows(sql, params);

    const formattedUsers = rows.map((u: any) => ({
      ...u,
      permissoes: typeof u.permissoes === 'string' ? JSON.parse(u.permissoes || '[]') : u.permissoes,
    }));

    res.json({
      success: true,
      data: formattedUsers,
      total: formattedUsers.length,
    });
  } catch (err: any) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar usuários do sistema' });
  }
});

// POST /api/usuarios - Create new user with company linkage
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      nome,
      email,
      senha,
      cargo_id,
      cargo,
      perfil = 'operacional',
      empresa_id,
      status = 'ativo',
      telefone = '',
      departamento = '',
      permissoes = [],
    } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ success: false, error: 'O nome completo é obrigatório' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'O e-mail é obrigatório' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!empresa_id) {
      return res.status(400).json({ success: false, error: 'Selecione uma empresa para vincular o usuário' });
    }

    // Resolve cargo and cargo_id with company isolation
    let resolvedCargoId = cargo_id || '';
    let resolvedCargoName = (cargo || '').trim();

    if (resolvedCargoId) {
      const cargoRows = await queryRows(
        'SELECT id, nome, empresa_id FROM cargos WHERE id = ?',
        [resolvedCargoId]
      );
      if (cargoRows.length > 0) {
        // Enforce company isolation: cargo must belong to the selected empresa
        if (cargoRows[0].empresa_id !== empresa_id) {
          return res.status(400).json({
            success: false,
            error: 'O cargo selecionado não pertence à empresa vinculada.',
          });
        }
        resolvedCargoName = cargoRows[0].nome;
      }
    } else if (resolvedCargoName) {
      const cargoRows = await queryRows(
        'SELECT id, nome FROM cargos WHERE empresa_id = ? AND LOWER(TRIM(nome)) = LOWER(?)',
        [empresa_id, resolvedCargoName]
      );
      if (cargoRows.length > 0) {
        resolvedCargoId = cargoRows[0].id;
        resolvedCargoName = cargoRows[0].nome;
      }
    }

    if (!resolvedCargoName) {
      return res.status(400).json({
        success: false,
        error: 'O cargo / função do usuário é obrigatório.',
      });
    }

    // Check if email already exists
    const existing = await queryRows('SELECT id FROM usuarios WHERE LOWER(email) = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Este e-mail já está cadastrado no sistema' });
    }

    const id = `usr-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5)}`;
    const initialPassword = (senha && senha.trim()) || '12345678';
    const permissionsJson = JSON.stringify(Array.isArray(permissoes) ? permissoes : []);

    const insertSql = `
      INSERT INTO usuarios (
        id, nome, email, senha, cargo_id, cargo, perfil, empresa_id, status, telefone, departamento, permissoes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await executeQuery(insertSql, [
      id,
      nome.trim(),
      normalizedEmail,
      initialPassword,
      resolvedCargoId,
      resolvedCargoName,
      perfil,
      empresa_id,
      status === 'inativo' ? 'inativo' : 'ativo',
      telefone.trim(),
      departamento.trim(),
      permissionsJson,
    ]);

    // Fetch created user with company details
    const created = await queryRows(`
      SELECT 
        u.id, u.nome, u.email, u.cargo_id, u.cargo, u.perfil, u.empresa_id, u.status, u.telefone, u.departamento, u.permissoes, u.created_at,
        e.nome AS empresa_nome, e.corPrimaria AS empresa_cor, e.logoUrl AS empresa_logo
      FROM usuarios u
      LEFT JOIN empresas e ON u.empresa_id = e.id
      WHERE u.id = ?
    `, [id]);

    const userObj = created[0] ? {
      ...created[0],
      permissoes: JSON.parse(created[0].permissoes || '[]'),
    } : null;

    res.status(201).json({
      success: true,
      message: `Usuário ${nome.trim()} criado com sucesso e vinculado à empresa!`,
      data: userObj,
    });
  } catch (err: any) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ success: false, error: 'Falha interna ao criar usuário' });
  }
});

// PUT /api/usuarios/:id - Update existing user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      nome,
      email,
      senha,
      cargo_id,
      cargo,
      perfil,
      empresa_id,
      status,
      telefone,
      departamento,
      permissoes,
    } = req.body;

    const existing = await queryRows('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const current = existing[0];
    const normalizedEmail = email ? email.trim().toLowerCase() : current.email;

    // Check email collision
    if (normalizedEmail !== current.email.toLowerCase()) {
      const duplicate = await queryRows('SELECT id FROM usuarios WHERE LOWER(email) = ? AND id != ?', [normalizedEmail, id]);
      if (duplicate.length > 0) {
        return res.status(409).json({ success: false, error: 'Outro usuário já utiliza este e-mail' });
      }
    }

    const targetEmpresaId = empresa_id !== undefined ? empresa_id : current.empresa_id;
    let resolvedCargoId = cargo_id !== undefined ? cargo_id : (current.cargo_id || '');
    let resolvedCargoName = cargo !== undefined ? cargo.trim() : current.cargo;

    if (cargo_id) {
      const cargoRows = await queryRows(
        'SELECT id, nome, empresa_id FROM cargos WHERE id = ?',
        [cargo_id]
      );
      if (cargoRows.length > 0) {
        if (cargoRows[0].empresa_id !== targetEmpresaId) {
          return res.status(400).json({
            success: false,
            error: 'O cargo selecionado não pertence à empresa vinculada.',
          });
        }
        resolvedCargoName = cargoRows[0].nome;
      }
    }

    const updatedNome = nome !== undefined ? nome.trim() : current.nome;
    const updatedPerfil = perfil !== undefined ? perfil : current.perfil;
    const updatedEmpresaId = targetEmpresaId;
    const updatedStatus = status !== undefined ? status : current.status;
    const updatedTelefone = telefone !== undefined ? telefone.trim() : current.telefone;
    const updatedDepto = departamento !== undefined ? departamento.trim() : current.departamento;
    const updatedPermissoes = permissoes !== undefined 
      ? JSON.stringify(Array.isArray(permissoes) ? permissoes : []) 
      : current.permissoes;

    // Password update only if provided
    let updateSql = `
      UPDATE usuarios 
      SET nome = ?, email = ?, cargo_id = ?, cargo = ?, perfil = ?, empresa_id = ?, status = ?, telefone = ?, departamento = ?, permissoes = ?, updated_at = CURRENT_TIMESTAMP
    `;
    const params = [
      updatedNome,
      normalizedEmail,
      resolvedCargoId,
      resolvedCargoName,
      updatedPerfil,
      updatedEmpresaId,
      updatedStatus,
      updatedTelefone,
      updatedDepto,
      updatedPermissoes,
    ];

    if (senha && senha.trim()) {
      updateSql += `, senha = ?`;
      params.push(senha.trim());
    }

    updateSql += ` WHERE id = ?`;
    params.push(id);

    await executeQuery(updateSql, params);

    const updated = await queryRows(`
      SELECT 
        u.id, u.nome, u.email, u.cargo_id, u.cargo, u.perfil, u.empresa_id, u.status, u.telefone, u.departamento, u.permissoes, u.created_at, u.updated_at,
        e.nome AS empresa_nome, e.corPrimaria AS empresa_cor, e.logoUrl AS empresa_logo
      FROM usuarios u
      LEFT JOIN empresas e ON u.empresa_id = e.id
      WHERE u.id = ?
    `, [id]);

    const userObj = updated[0] ? {
      ...updated[0],
      permissoes: JSON.parse(updated[0].permissoes || '[]'),
    } : null;

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: userObj,
    });
  } catch (err: any) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ success: false, error: 'Falha ao atualizar dados do usuário' });
  }
});

// PATCH /api/usuarios/:id/status - Toggle status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await queryRows('SELECT email, status FROM usuarios WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    if (existing[0].email.toLowerCase() === MASTER_EMAIL.toLowerCase() && status === 'inativo') {
      return res.status(400).json({ success: false, error: 'O Administrador Master não pode ser inativado' });
    }

    const newStatus = status === 'inativo' ? 'inativo' : 'ativo';
    await executeQuery('UPDATE usuarios SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id]);

    res.json({
      success: true,
      message: `Status alterado para ${newStatus}`,
      status: newStatus,
    });
  } catch (err: any) {
    console.error('Erro ao alternar status do usuário:', err);
    res.status(500).json({ success: false, error: 'Falha ao atualizar status' });
  }
});

// DELETE /api/usuarios/:id - Delete user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await queryRows('SELECT email, nome FROM usuarios WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    if (existing[0].email.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'A conta do Administrador Master não pode ser excluída' });
    }

    await executeQuery('DELETE FROM usuarios WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Usuário ${existing[0].nome} excluído com sucesso`,
    });
  } catch (err: any) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ success: false, error: 'Falha ao excluir usuário' });
  }
});

export default router;
