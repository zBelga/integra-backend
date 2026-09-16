import { Router, Request, Response } from 'express';
import { queryRows, executeQuery } from '../db.js';
import { cleanCPF, isValidCPF } from '../utils/cpf.js';

const router = Router();

// GET /api/admissoes - List admissions with pagination, search & filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string, 10) || 1;
    const page = Math.max(1, rawPage);

    const rawLimit = parseInt(req.query.limit as string, 10) || 25;
    // Strict upper limit safety cap to prevent giant data dumps
    const limit = Math.min(100, Math.max(1, rawLimit));

    const offset = (page - 1) * limit;

    const search = ((req.query.search as string) || '').trim();
    const obraId = ((req.query.obra as string) || '').trim();
    const funcao = ((req.query.funcao as string) || '').trim();
    const dataInicio = ((req.query.data_inicio as string) || '').trim();
    const dataFim = ((req.query.data_fim as string) || '').trim();

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Search filter (by name or CPF)
    if (search) {
      const cleanedSearch = cleanCPF(search);
      if (cleanedSearch.length >= 3) {
        whereClauses.push('(a.nome LIKE ? OR a.cpf LIKE ?)');
        params.push(`%${search}%`, `%${cleanedSearch}%`);
      } else {
        whereClauses.push('a.nome LIKE ?');
        params.push(`%${search}%`);
      }
    }

    // Filter by Obra ID
    if (obraId) {
      whereClauses.push('a.obra_id = ?');
      params.push(obraId);
    }

    // Filter by Função
    if (funcao) {
      whereClauses.push('a.funcao LIKE ?');
      params.push(`%${funcao}%`);
    }

    // Filter by date range (previsao_contratacao)
    if (dataInicio) {
      whereClauses.push('a.previsao_contratacao >= ?');
      params.push(dataInicio);
    }

    if (dataFim) {
      whereClauses.push('a.previsao_contratacao <= ?');
      params.push(dataFim);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query using index
    const countSQL = `SELECT COUNT(*) as total FROM admissoes a ${whereSQL}`;
    const countRes = await queryRows(countSQL, params);
    const total = countRes[0]?.total || 0;

    // Optimized select query with JOIN to retrieve Obra name without N+1 queries
    const selectSQL = `
      SELECT 
        a.id,
        a.nome,
        a.funcao,
        a.cpf,
        a.rg,
        a.data_nascimento,
        a.obra_id,
        a.data_exame,
        a.data_aso,
        a.previsao_contratacao,
        a.created_at,
        a.updated_at,
        o.nome as obra_nome,
        o.codigo as obra_codigo
      FROM admissoes a
      INNER JOIN obras o ON a.obra_id = o.id
      ${whereSQL}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const rows = await queryRows(selectSQL, queryParams);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao listar admissões.' });
  }
});

// GET /api/admissoes/:id - Single admission details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        a.*,
        o.nome as obra_nome,
        o.codigo as obra_codigo
      FROM admissoes a
      INNER JOIN obras o ON a.obra_id = o.id
      WHERE a.id = ?
    `;
    const rows = await queryRows(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Admissão não encontrada.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao buscar detalhes da admissão.' });
  }
});

// Helper to check cargo permissions
async function verifyCargoPermission(req: Request, acao: 'visualizar' | 'criar' | 'editar' | 'excluir' | 'solicitar' | 'aprovar'): Promise<{ allowed: boolean; message?: string }> {
  const cargoId = (req.headers['x-user-cargo-id'] as string) || (req.body?.user_cargo_id as string) || (req.query?.user_cargo_id as string);
  
  // If no cargo ID is explicitly passed (e.g. legacy/master calls), allow by default
  if (!cargoId) return { allowed: true };

  const rows = await queryRows(
    'SELECT * FROM cargos_permissoes WHERE cargo_id = ? AND modulo = ?',
    [cargoId, 'efetivo']
  );

  if (rows.length === 0) {
    return { allowed: true }; // Fallback
  }

  const hasPermission = Boolean(rows[0][acao]);
  if (!hasPermission) {
    return {
      allowed: false,
      message: `Seu cargo não possui permissão para ${acao} diretamente no módulo Efetivo. Solicite a alteração através do fluxo de aprovações.`,
    };
  }

  return { allowed: true };
}

// POST /api/admissoes - Create new admission
router.post('/', async (req: Request, res: Response) => {
  try {
    const permCheck = await verifyCargoPermission(req, 'criar');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, error: permCheck.message });
    }

    const {
      nome,
      funcao,
      cpf,
      rg = '',
      data_nascimento,
      obra_id,
      data_exame = '',
      data_aso = '',
      previsao_contratacao,
    } = req.body;

    // Strict Backend Validation
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ success: false, error: 'O nome é obrigatório.' });
    }

    if (!funcao || typeof funcao !== 'string' || !funcao.trim()) {
      return res.status(400).json({ success: false, error: 'A função é obrigatória.' });
    }

    if (!cpf || typeof cpf !== 'string') {
      return res.status(400).json({ success: false, error: 'O CPF é obrigatório.' });
    }

    const cleanedCPF = cleanCPF(cpf);
    if (!isValidCPF(cleanedCPF)) {
      return res.status(400).json({ success: false, error: 'O CPF informado é inválido.' });
    }

    if (!obra_id || typeof obra_id !== 'string') {
      return res.status(400).json({ success: false, error: 'A seleção da obra é obrigatória.' });
    }

    if (!previsao_contratacao || typeof previsao_contratacao !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(previsao_contratacao)) {
      return res.status(400).json({ success: false, error: 'Previsão de contratação inválida (utilize AAAA-MM-DD).' });
    }

    // Verify if Obra exists
    const obraCheck = await queryRows('SELECT id FROM obras WHERE id = ?', [obra_id]);
    if (obraCheck.length === 0) {
      return res.status(400).json({ success: false, error: 'A obra selecionada não existe no cadastro.' });
    }

    // Check Duplicate CPF
    const cpfCheck = await queryRows('SELECT id FROM admissoes WHERE cpf = ?', [cleanedCPF]);
    if (cpfCheck.length > 0) {
      return res.status(400).json({ success: false, error: 'Já existe uma admissão cadastrada com este CPF.' });
    }

    const id = `adm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const trimmedNome = nome.trim();
    const trimmedFuncao = funcao.trim();
    const trimmedRG = typeof rg === 'string' ? rg.trim() : '';
    const trimmedDataExame = typeof data_exame === 'string' ? data_exame.trim() : '';
    const trimmedDataASO = typeof data_aso === 'string' ? data_aso.trim() : '';

    await executeQuery(
      `INSERT INTO admissoes (
        id, nome, funcao, cpf, rg, data_nascimento, obra_id, data_exame, data_aso, previsao_contratacao, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        trimmedNome,
        trimmedFuncao,
        cleanedCPF,
        trimmedRG,
        data_nascimento,
        obra_id,
        trimmedDataExame,
        trimmedDataASO,
        previsao_contratacao,
      ]
    );

    const selectCreated = `
      SELECT a.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM admissoes a
      INNER JOIN obras o ON a.obra_id = o.id
      WHERE a.id = ?
    `;
    const created = await queryRows(selectCreated, [id]);

    res.status(201).json({ success: true, data: created[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao cadastrar admissão.' });
  }
});

// PUT /api/admissoes/:id - Update existing admission
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const permCheck = await verifyCargoPermission(req, 'editar');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, error: permCheck.message });
    }

    const { id } = req.params;
    const {
      nome,
      funcao,
      cpf,
      rg = '',
      data_nascimento,
      obra_id,
      data_exame = '',
      data_aso = '',
      previsao_contratacao,
    } = req.body;

    const existingAdm = await queryRows('SELECT id FROM admissoes WHERE id = ?', [id]);
    if (existingAdm.length === 0) {
      return res.status(404).json({ success: false, error: 'Admissão não encontrada.' });
    }

    // Validation
    if (!nome || !nome.trim()) {
      return res.status(400).json({ success: false, error: 'O nome é obrigatório.' });
    }

    if (!funcao || !funcao.trim()) {
      return res.status(400).json({ success: false, error: 'A função é obrigatória.' });
    }

    if (!cpf) {
      return res.status(400).json({ success: false, error: 'O CPF é obrigatório.' });
    }

    const cleanedCPF = cleanCPF(cpf);
    if (!isValidCPF(cleanedCPF)) {
      return res.status(400).json({ success: false, error: 'O CPF informado é inválido.' });
    }

    if (!obra_id) {
      return res.status(400).json({ success: false, error: 'A seleção da obra é obrigatória.' });
    }

    if (!previsao_contratacao || !/^\d{4}-\d{2}-\d{2}$/.test(previsao_contratacao)) {
      return res.status(400).json({ success: false, error: 'Previsão de contratação inválida.' });
    }

    // Verify if Obra exists
    const obraCheck = await queryRows('SELECT id FROM obras WHERE id = ?', [obra_id]);
    if (obraCheck.length === 0) {
      return res.status(400).json({ success: false, error: 'A obra selecionada não existe no cadastro.' });
    }

    // Check duplicate CPF on OTHER records
    const cpfCheck = await queryRows('SELECT id FROM admissoes WHERE cpf = ? AND id != ?', [cleanedCPF, id]);
    if (cpfCheck.length > 0) {
      return res.status(400).json({ success: false, error: 'Este CPF já está cadastrado em outra admissão.' });
    }

    const trimmedRG = typeof rg === 'string' ? rg.trim() : '';
    const trimmedDataExame = typeof data_exame === 'string' ? data_exame.trim() : '';
    const trimmedDataASO = typeof data_aso === 'string' ? data_aso.trim() : '';

    await executeQuery(
      `UPDATE admissoes 
       SET nome = ?, funcao = ?, cpf = ?, rg = ?, data_nascimento = ?, obra_id = ?, data_exame = ?, data_aso = ?, previsao_contratacao = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nome.trim(),
        funcao.trim(),
        cleanedCPF,
        trimmedRG,
        data_nascimento,
        obra_id,
        trimmedDataExame,
        trimmedDataASO,
        previsao_contratacao,
        id,
      ]
    );

    const selectUpdated = `
      SELECT a.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM admissoes a
      INNER JOIN obras o ON a.obra_id = o.id
      WHERE a.id = ?
    `;
    const updated = await queryRows(selectUpdated, [id]);

    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao atualizar admissão.' });
  }
});

// DELETE /api/admissoes/:id - Delete admission
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const permCheck = await verifyCargoPermission(req, 'excluir');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, error: permCheck.message });
    }

    const { id } = req.params;
    const existing = await queryRows('SELECT id FROM admissoes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Admissão não encontrada.' });
    }

    await executeQuery('DELETE FROM admissoes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Admissão excluída com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao excluir admissão.' });
  }
});

// POST /api/admissoes/:id/contratar - Promote admission to efetivo
router.post('/:id/contratar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rg = '', numero_chapa = '', data_admissao } = req.body;

    if (!numero_chapa || !numero_chapa.trim()) {
      return res.status(400).json({ success: false, error: 'O número da chapa é obrigatório.' });
    }

    // Fetch the admission
    const admRows = await queryRows(`
      SELECT a.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM admissoes a
      INNER JOIN obras o ON a.obra_id = o.id
      WHERE a.id = ?
    `, [id]);

    if (admRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Admissão não encontrada.' });
    }

    const adm = admRows[0];
    const empresaId = req.user?.empresa_id || adm.empresa_id || 'emp-001';

    // Check duplicate chapa
    const chapaCheck = await queryRows(
      'SELECT id FROM colaboradores WHERE numero_chapa = ? AND empresa_id = ?',
      [numero_chapa.trim(), empresaId]
    );
    if (chapaCheck.length > 0) {
      return res.status(400).json({ success: false, error: 'Já existe um colaborador com este número de chapa.' });
    }

    const colaboradorId = `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const admissaoDate = data_admissao || adm.previsao_contratacao || new Date().toISOString().split('T')[0];

    await executeQuery(
      `INSERT INTO colaboradores (id, empresa_id, nome, funcao, cpf, rg, numero_chapa, obra_id, data_admissao, data_aso, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        colaboradorId,
        empresaId,
        adm.nome,
        adm.funcao,
        adm.cpf,
        rg.trim() || adm.rg || '',
        numero_chapa.trim(),
        adm.obra_id,
        admissaoDate,
        adm.data_aso || '',
      ]
    );

    // Remove from admissoes
    await executeQuery('DELETE FROM admissoes WHERE id = ?', [id]);

    const created = await queryRows(`
      SELECT c.*, o.nome as obra_nome, o.codigo as obra_codigo
      FROM colaboradores c
      INNER JOIN obras o ON c.obra_id = o.id
      WHERE c.id = ?
    `, [colaboradorId]);

    res.status(201).json({ success: true, data: created[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao contratar colaborador.' });
  }
});

export default router;
