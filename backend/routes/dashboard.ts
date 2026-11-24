import { Router, Request, Response } from 'express';
import { queryRows } from '../db.js';
import { empresaDoPedido, ehMaster } from '../utils/permissoes.js';

const router = Router();

/**
 * GET /api/dashboard/resumo
 * Indicadores reais do Início, lidos do banco. Nada aqui é fixo.
 *  - empresas: todas, para o master; para os demais, só a própria
 *  - colaboradores_ativos: status 'ativo' da empresa em uso
 *  - permissoes_ativas: concessões de visualizar do cargo na empresa em uso
 */
router.get('/resumo', async (req: Request, res: Response) => {
  try {
    const empresa_id = empresaDoPedido(req);
    const master = ehMaster(req);

    const [empresasRow] = master
      ? await queryRows('SELECT COUNT(*) AS total FROM empresas', [])
      : [{ total: empresa_id ? 1 : 0 }];

    const [colabRow] = await queryRows(
      "SELECT COUNT(*) AS total FROM colaboradores WHERE empresa_id = ? AND status = 'ativo'",
      [empresa_id]
    );

    const [permRow] = await queryRows(
      'SELECT COUNT(*) AS total FROM cargos_permissoes WHERE empresa_id = ? AND visualizar = 1',
      [empresa_id]
    );

    res.json({
      success: true,
      data: {
        empresas: Number((empresasRow as any)?.total ?? 0),
        colaboradores_ativos: Number((colabRow as any)?.total ?? 0),
        permissoes_ativas: Number((permRow as any)?.total ?? 0),
        sistema: 'operacional',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, data: { sistema: 'indisponivel' } });
  }
});

export default router;
