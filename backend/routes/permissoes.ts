import { Router, Request, Response } from 'express';
import { queryRows, executeQuery, saveDbToDisk } from '../db.js';

const router = Router();

// GET /api/permissoes - List permissions by empresa_id and/or cargo_id
router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresa_id, cargo_id } = req.query;

    let sql = `
      SELECT 
        cp.*,
        c.nome as cargo_nome,
        c.descricao as cargo_descricao,
        c.status as cargo_status
      FROM cargos_permissoes cp
      JOIN cargos c ON cp.cargo_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (empresa_id && empresa_id !== 'all') {
      sql += ' AND cp.empresa_id = ?';
      params.push(empresa_id);
    }

    if (cargo_id && cargo_id !== 'all') {
      sql += ' AND cp.cargo_id = ?';
      params.push(cargo_id);
    }

    sql += ' ORDER BY c.nome ASC, cp.modulo ASC';

    const permissions = await queryRows(sql, params);

    // Convert integer booleans to true/false
    const formatted = permissions.map((p: any) => ({
      ...p,
      visualizar: Boolean(p.visualizar),
      criar: Boolean(p.criar),
      editar: Boolean(p.editar),
      excluir: Boolean(p.excluir),
      solicitar: Boolean(p.solicitar),
      aprovar: Boolean(p.aprovar),
    }));

    res.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error('Erro ao listar permissões:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao carregar permissões dos cargos.',
    });
  }
});

// GET /api/permissoes/cargo/:cargo_id - Get permissions matrix for a single cargo
router.get('/cargo/:cargo_id', async (req: Request, res: Response) => {
  try {
    const { cargo_id } = req.params;
    const { empresa_id } = req.query;

    const cargoRows = await queryRows('SELECT * FROM cargos WHERE id = ?', [cargo_id]);
    if (cargoRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cargo não encontrado.',
      });
    }

    const cargo = cargoRows[0];
    const permissions = await queryRows(
      'SELECT * FROM cargos_permissoes WHERE cargo_id = ? ORDER BY modulo ASC',
      [cargo_id]
    );

    const formatted = permissions.map((p: any) => ({
      ...p,
      visualizar: Boolean(p.visualizar),
      criar: Boolean(p.criar),
      editar: Boolean(p.editar),
      excluir: Boolean(p.excluir),
      solicitar: Boolean(p.solicitar),
      aprovar: Boolean(p.aprovar),
    }));

    res.json({
      success: true,
      cargo,
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar permissões do cargo.',
    });
  }
});

// PUT /api/permissoes/cargo/:cargo_id - Update or replace permissions matrix for a cargo
router.put('/cargo/:cargo_id', async (req: Request, res: Response) => {
  try {
    const { cargo_id } = req.params;
    const { empresa_id, modulos } = req.body;

    if (!Array.isArray(modulos)) {
      return res.status(400).json({
        success: false,
        error: 'A lista de módulos de permissão deve ser um array.',
      });
    }

    const cargoRows = await queryRows('SELECT * FROM cargos WHERE id = ?', [cargo_id]);
    if (cargoRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cargo não encontrado.',
      });
    }

    const cargo = cargoRows[0];
    const targetEmpresaId = empresa_id || cargo.empresa_id;

    for (const mod of modulos) {
      const {
        modulo,
        visualizar = true,
        criar = false,
        editar = false,
        excluir = false,
        solicitar = true,
        aprovar = false,
      } = mod;

      if (!modulo) continue;

      const permId = `prm-${cargo_id}-${modulo}`;

      await executeQuery(
        `INSERT OR REPLACE INTO cargos_permissoes 
         (id, empresa_id, cargo_id, modulo, visualizar, criar, editar, excluir, solicitar, aprovar, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          permId,
          targetEmpresaId,
          cargo_id,
          modulo,
          visualizar ? 1 : 0,
          criar ? 1 : 0,
          editar ? 1 : 0,
          excluir ? 1 : 0,
          solicitar ? 1 : 0,
          aprovar ? 1 : 0,
        ]
      );
    }

    await saveDbToDisk();

    const updatedPermissions = await queryRows(
      'SELECT * FROM cargos_permissoes WHERE cargo_id = ? ORDER BY modulo ASC',
      [cargo_id]
    );

    const formatted = updatedPermissions.map((p: any) => ({
      ...p,
      visualizar: Boolean(p.visualizar),
      criar: Boolean(p.criar),
      editar: Boolean(p.editar),
      excluir: Boolean(p.excluir),
      solicitar: Boolean(p.solicitar),
      aprovar: Boolean(p.aprovar),
    }));

    res.json({
      success: true,
      message: 'Matriz de permissões salva com sucesso!',
      data: formatted,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar permissões:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao salvar permissões do cargo.',
    });
  }
});

// GET /api/permissoes/check - Verify if cargo/user has permission for specific action in module
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { cargo_id, modulo, acao } = req.query;

    if (!cargo_id || !modulo || !acao) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros cargo_id, modulo e acao são obrigatórios.',
      });
    }

    const rows = await queryRows(
      'SELECT * FROM cargos_permissoes WHERE cargo_id = ? AND modulo = ?',
      [cargo_id, modulo]
    );

    if (rows.length === 0) {
      // Default fallback
      return res.json({
        success: true,
        allowed: false,
        reason: 'Nenhuma permissão configurada para este cargo/módulo.',
      });
    }

    const perm = rows[0];
    const allowed = Boolean(perm[acao as string]);

    res.json({
      success: true,
      allowed,
      permission: perm,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar permissão.',
    });
  }
});

// Helper for backend permission enforcement across routes
export async function verifyCargoPermission(
  cargoId: string,
  modulo: string,
  acao: 'visualizar' | 'criar' | 'editar_direto' | 'excluir' | 'solicitar_alteracao'
): Promise<boolean> {
  try {
    const rows = await queryRows(
      'SELECT * FROM cargos_permissoes WHERE cargo_id = ? AND modulo = ?',
      [cargoId, modulo]
    );
    if (rows.length === 0) return false;
    return Boolean(rows[0][acao]);
  } catch (err) {
    console.error('Error verifying cargo permission:', err);
    return false;
  }
}

export default router;
