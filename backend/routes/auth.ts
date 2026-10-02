import { Router, Request, Response } from 'express';
import { queryRows, executeQuery, saveDbToDisk } from '../db.js';
import { generateToken } from '../middleware/auth.js';

import { requireAuth } from '../middleware/auth.js';
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
              u.senha_provisoria,
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

    // Senha que o administrador definiu: a pessoa troca antes de usar o sistema
    const precisaTrocarSenha = Number(user.senha_provisoria) === 1;

    const token = generateToken({
      id:         user.id,
      email:      user.email,
      nome:       user.nome,
      cargo:      user.cargo,
      perfil:     user.perfil,
      empresa_id: user.empresa_id,
      ...(precisaTrocarSenha ? { trocar_senha: true } : {}),
    });

    // Nunca retornar a senha
    const { senha: _senha, ...userSemSenha } = user;

    return res.json({
      success: true,
      message: precisaTrocarSenha
        ? 'Defina sua senha para continuar.'
        : `Bem-vindo, ${user.nome}!`,
      token,
      precisa_trocar_senha: precisaTrocarSenha,
      user: userSemSenha,
    });
  } catch (err: any) {
    console.error('[AUTH] Erro ao autenticar:', err?.message);
    return res.status(500).json({ success: false, error: 'Erro interno de autenticação.' });
  }
});

/**
 * GET /api/auth/permissoes
 * Matriz de permissões do usuário logado (módulo × ação) + se é master.
 * A tela usa isto para esconder o que o cargo não pode fazer — o servidor
 * continua validando tudo de novo em cada rota.
 */
router.get('/permissoes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { permissoesDoUsuario } = await import('../utils/permissoes.js');
    // Já vem { master, perfil, empresa_id, modulos } — não embrulhar de novo.
    res.json({ success: true, data: await permissoesDoUsuario(req) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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

/**
 * POST /api/auth/trocar-senha
 * A pessoa define a senha dela. Obrigatório no primeiro acesso, quando a senha
 * ainda é a que o administrador cadastrou; depois disso continua valendo para
 * quem quiser trocar, e aí a senha atual é exigida.
 * Body: { senha_atual?: string; nova_senha: string }
 */
router.post('/trocar-senha', requireAuth, async (req: Request, res: Response) => {
  try {
    const nova = String(req.body?.nova_senha || '');
    const atual = String(req.body?.senha_atual || '');

    const rows = await queryRows('SELECT id, senha, senha_provisoria FROM usuarios WHERE id = ?', [
      req.user?.id || '',
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }
    const u = rows[0];
    const provisoria = Number(u.senha_provisoria) === 1;

    // Fora do primeiro acesso, confere a senha atual antes de trocar
    if (!provisoria && u.senha !== atual) {
      return res.status(401).json({ success: false, error: 'Senha atual incorreta.' });
    }

    if (nova.trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A nova senha precisa ter pelo menos 6 caracteres.',
      });
    }
    if (nova.trim() === String(u.senha || '')) {
      return res.status(400).json({
        success: false,
        error: 'A nova senha precisa ser diferente da atual.',
      });
    }

    await executeQuery(
      'UPDATE usuarios SET senha = ?, senha_provisoria = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nova.trim(), u.id]
    );
    await saveDbToDisk();

    // Token novo, agora sem a trava de senha provisória
    const token = generateToken({
      id:         req.user!.id,
      email:      req.user!.email,
      nome:       req.user!.nome,
      cargo:      req.user!.cargo,
      perfil:     req.user!.perfil,
      empresa_id: req.user!.empresa_id,
    });

    return res.json({ success: true, message: 'Senha alterada. Bom trabalho!', token });
  } catch (err: any) {
    console.error('[AUTH] Erro ao trocar senha:', err?.message);
    return res.status(500).json({ success: false, error: 'Erro ao trocar a senha.' });
  }
});

export default router;
