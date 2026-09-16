import { Router, Request, Response } from 'express';
import { queryRows } from '../db.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * Autentica o usuário e retorna JWT.
 * Body: { email: string; senha: string }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'E-mail e senha são obrigatórios.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const rows = await queryRows(
      `SELECT u.id, u.nome, u.email, u.senha, u.cargo, u.perfil, u.empresa_id, u.status,
              e.nome AS empresa_nome, e.corPrimaria AS empresa_cor
       FROM usuarios u
       LEFT JOIN empresas e ON u.empresa_id = e.id
       WHERE LOWER(u.email) = ?`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas.',
      });
    }

    const user = rows[0];

    if (user.status === 'inativo') {
      return res.status(403).json({
        success: false,
        error: 'Conta inativa. Contate o administrador.',
      });
    }

    // Comparação simples de senha (texto puro)
    // TODO: migrar para bcrypt — hash as senhas existentes com uma migration
    if (user.senha !== senha) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas.',
      });
    }

    const token = generateToken({
      id:         user.id,
      email:      user.email,
      nome:       user.nome,
      cargo:      user.cargo,
      perfil:     user.perfil,
      empresa_id: user.empresa_id,
    });

    // Nunca retornar a senha
    const { senha: _senha, ...userSemSenha } = user;

    return res.json({
      success: true,
      message: `Bem-vindo, ${user.nome}!`,
      token,
      user: userSemSenha,
    });
  } catch (err: any) {
    console.error('[AUTH] Erro ao autenticar:', err?.message);
    return res.status(500).json({ success: false, error: 'Erro interno de autenticação.' });
  }
});

/**
 * POST /api/auth/logout
 * JWT é stateless — o cliente descarta o token.
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Sessão encerrada.' });
});

/**
 * GET /api/auth/me
 * Retorna os dados do usuário autenticado (requer token).
 */
import { requireAuth } from '../middleware/auth.js';

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await queryRows(
      `SELECT u.id, u.nome, u.email, u.cargo_id, u.cargo, u.perfil, u.empresa_id,
              u.status, u.telefone, u.departamento, u.permissoes, u.created_at,
              e.nome AS empresa_nome, e.corPrimaria AS empresa_cor, e.logoUrl AS empresa_logo
       FROM usuarios u
       LEFT JOIN empresas e ON u.empresa_id = e.id
       WHERE u.id = ?`,
      [req.user!.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }

    const u = rows[0];
    return res.json({
      success: true,
      user: {
        ...u,
        permissoes: typeof u.permissoes === 'string' ? JSON.parse(u.permissoes || '[]') : u.permissoes,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Erro ao buscar dados do usuário.' });
  }
});

export default router;
