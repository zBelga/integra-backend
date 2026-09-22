import { Router, Request, Response } from 'express';
import { queryRows, executeQuery, saveDbToDisk } from '../db.js';

const router = Router();

// Helper to check user permission
async function checkCargoPermission(cargoId: string, modulo: string, acao: string): Promise<boolean> {
  if (!cargoId) return false;
  const rows = await queryRows(
    'SELECT * FROM cargos_permissoes WHERE cargo_id = ? AND modulo = ?',
    [cargoId, modulo]
  );
  if (rows.length === 0) return false;
  return Boolean(rows[0][acao]);
}

// GET /api/solicitacoes/stats/counts - Get badge counts
router.get('/stats/counts', async (req: Request, res: Response) => {
  try {
    const { empresa_id } = req.query;
    let sql = 'SELECT status, COUNT(*) as count FROM solicitacoes_alteracao WHERE 1=1';
    const params: any[] = [];

    if (empresa_id && empresa_id !== 'all') {
      sql += ' AND empresa_id = ?';
      params.push(empresa_id);
    }

    sql += ' GROUP BY status';

    const rows = await queryRows(sql, params);
    const counts = {
      total: 0,
      pendente: 0,
      aprovada: 0,
      recusada: 0,
    };

    for (const r of rows) {
      const c = Number(r.count) || 0;
      counts.total += c;
      if (r.status === 'pendente') counts.pendente = c;
      if (r.status === 'aprovada') counts.aprovada = c;
      if (r.status === 'recusada') counts.recusada = c;
    }

    res.json({
      success: true,
      data: counts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao contar solicitações.',
    });
  }
});

// GET /api/solicitacoes - List change requests with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresa_id, modulo, status, search, solicitante_id } = req.query;

    let sql = `
      SELECT 
        s.*,
        e.nome as empresa_nome,
        e.corPrimaria as empresa_cor
      FROM solicitacoes_alteracao s
      LEFT JOIN empresas e ON s.empresa_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (empresa_id && empresa_id !== 'all') {
      sql += ' AND s.empresa_id = ?';
      params.push(empresa_id);
    }

    if (modulo && modulo !== 'all') {
      sql += ' AND s.modulo = ?';
      params.push(modulo);
    }

    if (status && status !== 'all') {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    if (solicitante_id && solicitante_id !== 'all') {
      sql += ' AND s.solicitante_id = ?';
      params.push(solicitante_id);
    }

    if (search) {
      sql += ' AND (s.registro_identificador LIKE ? OR s.solicitante_nome LIKE ? OR s.campo LIKE ? OR CAST(s.codigo_sequencial AS TEXT) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY CASE WHEN s.status = 'pendente' THEN 0 ELSE 1 END, s.data_solicitacao DESC`;

    const rows = await queryRows(sql, params);

    const formatted = rows.map((r: any) => {
      let dadosAnterioresParsed = {};
      let dadosSolicitadosParsed = {};
      try {
        dadosAnterioresParsed = r.dados_anteriores ? JSON.parse(r.dados_anteriores) : {};
      } catch {}
      try {
        dadosSolicitadosParsed = r.dados_solicitados ? JSON.parse(r.dados_solicitados) : {};
      } catch {}

      return {
        ...r,
        dados_anteriores_parsed: dadosAnterioresParsed,
        dados_solicitados_parsed: dadosSolicitadosParsed,
      };
    });

    res.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao carregar solicitações de alteração.',
    });
  }
});

// GET /api/solicitacoes/:id - Single request details with audit timeline
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await queryRows(
      `SELECT s.*, e.nome as empresa_nome, e.corPrimaria as empresa_cor 
       FROM solicitacoes_alteracao s 
       LEFT JOIN empresas e ON s.empresa_id = e.id 
       WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Solicitação não encontrada.',
      });
    }

    const solicitacao = rows[0];
    const historico = await queryRows(
      'SELECT * FROM solicitacoes_historico WHERE solicitacao_id = ? ORDER BY created_at ASC',
      [id]
    );

    let dadosAnterioresParsed = {};
    let dadosSolicitadosParsed = {};
    try {
      dadosAnterioresParsed = solicitacao.dados_anteriores ? JSON.parse(solicitacao.dados_anteriores) : {};
    } catch {}
    try {
      dadosSolicitadosParsed = solicitacao.dados_solicitados ? JSON.parse(solicitacao.dados_solicitados) : {};
    } catch {}

    res.json({
      success: true,
      data: {
        ...solicitacao,
        dados_anteriores_parsed: dadosAnterioresParsed,
        dados_solicitados_parsed: dadosSolicitadosParsed,
        historico,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar detalhes da solicitação.',
    });
  }
});

// POST /api/solicitacoes - Create new change request
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      empresa_id,
      modulo,
      registro_id,
      registro_identificador,
      solicitante_id,
      solicitante_nome,
      solicitante_cargo,
      solicitante_cargo_id,
      campo,
      valor_atual,
      valor_solicitado,
      dados_anteriores,
      dados_solicitados,
      observacoes = '',
    } = req.body;

    if (!empresa_id || !modulo || !registro_id || !solicitante_id) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios ausentes (empresa_id, modulo, registro_id, solicitante_id).',
      });
    }

    // Check if user's cargo has permission to submit requests for this module
    if (solicitante_cargo_id) {
      const canRequest = await checkCargoPermission(solicitante_cargo_id, modulo, 'solicitar');
      if (!canRequest) {
        return res.status(403).json({
          success: false,
          error: 'Seu cargo não possui permissão para solicitar alterações neste módulo.',
        });
      }
    }

    // Get max sequential code
    const seqRows = await queryRows('SELECT MAX(codigo_sequencial) as maxSeq FROM solicitacoes_alteracao');
    const nextSeq = (seqRows[0]?.maxSeq || 1024) + 1;
    const newId = `sol-${nextSeq}`;

    const strDadosAnteriores = typeof dados_anteriores === 'object' ? JSON.stringify(dados_anteriores) : (dados_anteriores || '{}');
    const strDadosSolicitados = typeof dados_solicitados === 'object' ? JSON.stringify(dados_solicitados) : (dados_solicitados || '{}');

    await executeQuery(
      `INSERT INTO solicitacoes_alteracao (
        id, codigo_sequencial, empresa_id, modulo, registro_id, registro_identificador,
        solicitante_id, solicitante_nome, solicitante_cargo, campo, valor_atual, valor_solicitado,
        dados_anteriores, dados_solicitados, status, observacoes, data_solicitacao, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        newId,
        nextSeq,
        empresa_id,
        modulo,
        registro_id,
        registro_identificador || `Registro ${registro_id}`,
        solicitante_id,
        solicitante_nome || 'Usuário do Sistema',
        solicitante_cargo || 'Assistente',
        campo || 'Dados Cadastrais',
        valor_atual || '',
        valor_solicitado || '',
        strDadosAnteriores,
        strDadosSolicitados,
        observacoes,
      ]
    );

    // Insert history record
    const histId = `hist-${newId}-1`;
    await executeQuery(
      `INSERT INTO solicitacoes_historico (id, solicitacao_id, tipo_evento, usuario_id, usuario_nome, usuario_cargo, detalhes, created_at)
       VALUES (?, ?, 'CRIADA', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        histId,
        newId,
        solicitante_id,
        solicitante_nome || 'Usuário do Sistema',
        solicitante_cargo || 'Assistente',
        `Solicitação #${nextSeq} criada para alteração do campo: ${campo || 'Dados'}`,
      ]
    );

    await saveDbToDisk();

    const createdRows = await queryRows('SELECT * FROM solicitacoes_alteracao WHERE id = ?', [newId]);

    res.status(201).json({
      success: true,
      message: `Solicitação #${nextSeq} criada com sucesso e encaminhada para aprovação!`,
      data: createdRows[0],
    });
  } catch (error: any) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao registrar solicitação de alteração.',
    });
  }
});

// POST /api/solicitacoes/:id/aprovar - Approve change request
router.post('/:id/aprovar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      aprovador_id,
      aprovador_nome = 'Encarregado / Aprovador',
      aprovador_cargo = 'Encarregado Geral',
      aprovador_cargo_id,
      observacoes_aprovacao = '',
    } = req.body;

    if (!aprovador_id) {
      return res.status(400).json({
        success: false,
        error: 'Identificação do aprovador (aprovador_id) é obrigatória.',
      });
    }

    const solRows = await queryRows('SELECT * FROM solicitacoes_alteracao WHERE id = ?', [id]);
    if (solRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Solicitação não encontrada.',
      });
    }

    const sol = solRows[0];

    if (sol.status !== 'pendente') {
      return res.status(400).json({
        success: false,
        error: `Esta solicitação já foi ${sol.status === 'aprovada' ? 'aprovada' : 'recusada'} anteriormente.`,
      });
    }

    // Security Rule: Impedir que o usuário aprove sua própria solicitação
    if (sol.solicitante_id === aprovador_id && !aprovador_cargo.toLowerCase().includes('master')) {
      return res.status(403).json({
        success: false,
        error: 'Regra de Segurança: Um usuário não pode aprovar a própria solicitação de alteração.',
      });
    }

    // Check approver permission for the module
    if (aprovador_cargo_id) {
      const canApprove = await checkCargoPermission(aprovador_cargo_id, sol.modulo, 'aprovar');
      if (!canApprove) {
        return res.status(403).json({
          success: false,
          error: 'Seu cargo não possui permissão para aprovar solicitações deste módulo.',
        });
      }
    }

    // Apply the change directly to the target module table!
    let dadosPayload: any = {};
    try {
      dadosPayload = sol.dados_solicitados ? JSON.parse(sol.dados_solicitados) : {};
    } catch {}

    if (sol.modulo === 'efetivo' || sol.modulo === 'admissoes') {
      // Update admissoes record
      const currentAdm = await queryRows('SELECT * FROM admissoes WHERE id = ?', [sol.registro_id]);
      if (currentAdm.length > 0) {
        const updatedNome = dadosPayload.nome !== undefined ? dadosPayload.nome : currentAdm[0].nome;
        const updatedFuncao = dadosPayload.funcao !== undefined ? dadosPayload.funcao : currentAdm[0].funcao;
        const updatedCpf = dadosPayload.cpf !== undefined ? dadosPayload.cpf : currentAdm[0].cpf;
        const updatedRg = dadosPayload.rg !== undefined ? dadosPayload.rg : currentAdm[0].rg;
        const updatedDataNasc = dadosPayload.data_nascimento !== undefined ? dadosPayload.data_nascimento : currentAdm[0].data_nascimento;
        const updatedObraId = dadosPayload.obra_id !== undefined ? dadosPayload.obra_id : currentAdm[0].obra_id;
        const updatedDataExame = dadosPayload.data_exame !== undefined ? dadosPayload.data_exame : currentAdm[0].data_exame;
        const updatedDataAso = dadosPayload.data_aso !== undefined ? dadosPayload.data_aso : currentAdm[0].data_aso;
        const updatedPrevisao = dadosPayload.previsao_contratacao !== undefined ? dadosPayload.previsao_contratacao : currentAdm[0].previsao_contratacao;

        await executeQuery(
          `UPDATE admissoes SET 
            nome = ?, funcao = ?, cpf = ?, rg = ?, data_nascimento = ?, 
            obra_id = ?, data_exame = ?, data_aso = ?, previsao_contratacao = ?, 
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            updatedNome,
            updatedFuncao,
            updatedCpf,
            updatedRg,
            updatedDataNasc,
            updatedObraId,
            updatedDataExame,
            updatedDataAso,
            updatedPrevisao,
            sol.registro_id,
          ]
        );
      }
    } else if (sol.modulo === 'obras') {
      const currentObra = await queryRows('SELECT * FROM obras WHERE id = ?', [sol.registro_id]);
      if (currentObra.length > 0) {
        const updatedNome = dadosPayload.nome !== undefined ? dadosPayload.nome : currentObra[0].nome;
        const updatedCodigo = dadosPayload.codigo !== undefined ? dadosPayload.codigo : currentObra[0].codigo;

        await executeQuery(
          `UPDATE obras SET nome = ?, codigo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [updatedNome, updatedCodigo, sol.registro_id]
        );
      }
    }

    // Mark request as approved
    await executeQuery(
      `UPDATE solicitacoes_alteracao SET 
        status = 'aprovada',
        aprovador_id = ?,
        aprovador_nome = ?,
        aprovador_cargo = ?,
        data_aprovacao = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [aprovador_id, aprovador_nome, aprovador_cargo, id]
    );

    // Audit log
    const histId = `hist-${id}-${Date.now().toString(36)}`;
    await executeQuery(
      `INSERT INTO solicitacoes_historico (id, solicitacao_id, tipo_evento, usuario_id, usuario_nome, usuario_cargo, detalhes, created_at)
       VALUES (?, ?, 'APROVADA', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        histId,
        id,
        aprovador_id,
        aprovador_nome,
        aprovador_cargo,
        `Solicitação aprovada. Alterações aplicadas ao cadastro oficial com sucesso.${observacoes_aprovacao ? ` Obs: ${observacoes_aprovacao}` : ''}`,
      ]
    );

    await saveDbToDisk();

    const updatedRows = await queryRows('SELECT * FROM solicitacoes_alteracao WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Solicitação #${sol.codigo_sequencial} APROVADA com sucesso! O registro foi atualizado.`,
      data: updatedRows[0],
    });
  } catch (error: any) {
    console.error('Erro ao aprovar solicitação:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar aprovação da solicitação.',
    });
  }
});

// POST /api/solicitacoes/:id/recusar - Reject change request
router.post('/:id/recusar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      aprovador_id,
      aprovador_nome = 'Encarregado / Aprovador',
      aprovador_cargo = 'Encarregado Geral',
      aprovador_cargo_id,
      motivo_recusa,
    } = req.body;

    if (!aprovador_id) {
      return res.status(400).json({
        success: false,
        error: 'Identificação do aprovador (aprovador_id) é obrigatória.',
      });
    }

    if (!motivo_recusa || !motivo_recusa.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, informe o motivo da recusa para registrar na auditoria.',
      });
    }

    const solRows = await queryRows('SELECT * FROM solicitacoes_alteracao WHERE id = ?', [id]);
    if (solRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Solicitação não encontrada.',
      });
    }

    const sol = solRows[0];

    if (sol.status !== 'pendente') {
      return res.status(400).json({
        success: false,
        error: `Esta solicitação já foi ${sol.status === 'aprovada' ? 'aprovada' : 'recusada'} anteriormente.`,
      });
    }

    // Check approver permission
    if (aprovador_cargo_id) {
      const canApprove = await checkCargoPermission(aprovador_cargo_id, sol.modulo, 'aprovar');
      if (!canApprove) {
        return res.status(403).json({
          success: false,
          error: 'Seu cargo não possui permissão para aprovar ou recusar solicitações deste módulo.',
        });
      }
    }

    // Mark as rejected - Do NOT touch the original data!
    await executeQuery(
      `UPDATE solicitacoes_alteracao SET 
        status = 'recusada',
        aprovador_id = ?,
        aprovador_nome = ?,
        aprovador_cargo = ?,
        data_aprovacao = CURRENT_TIMESTAMP,
        motivo_recusa = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [aprovador_id, aprovador_nome, aprovador_cargo, motivo_recusa.trim(), id]
    );

    // Audit log
    const histId = `hist-${id}-${Date.now().toString(36)}`;
    await executeQuery(
      `INSERT INTO solicitacoes_historico (id, solicitacao_id, tipo_evento, usuario_id, usuario_nome, usuario_cargo, detalhes, created_at)
       VALUES (?, ?, 'RECUSADA', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        histId,
        id,
        aprovador_id,
        aprovador_nome,
        aprovador_cargo,
        `Solicitação recusada. Motivo registrado: ${motivo_recusa.trim()}`,
      ]
    );

    await saveDbToDisk();

    const updatedRows = await queryRows('SELECT * FROM solicitacoes_alteracao WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Solicitação #${sol.codigo_sequencial} RECUSADA. O registro original não foi alterado.`,
      data: updatedRows[0],
    });
  } catch (error: any) {
    console.error('Erro ao recusar solicitação:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar recusa da solicitação.',
    });
  }
});

export default router;
