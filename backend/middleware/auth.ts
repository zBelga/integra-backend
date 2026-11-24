import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const IS_PROD = process.env.NODE_ENV === 'production';

// Sem segredo padrão no código. Em produção o servidor não sobe sem JWT_SECRET.
// Em desenvolvimento, usa um segredo aleatório por execução (tokens expiram ao reiniciar).
const JWT_SECRET: string = (() => {
  const definido = process.env.JWT_SECRET;
  if (definido) {
    if (definido.length < 32) console.warn('[AUTH] JWT_SECRET curto: recomendado 32+ caracteres.');
    return definido;
  }
  if (IS_PROD) {
    throw new Error('JWT_SECRET não definido. Configure a variável no Railway antes de subir a API.');
  }
  console.warn('[AUTH] JWT_SECRET não definido: usando segredo temporário de desenvolvimento.');
  return randomBytes(48).toString('hex');
})();

export interface AuthPayload {
  id: string;
  email: string;
  nome: string;
  cargo: string;
  perfil: string;
  empresa_id: string;
  /** Senha definida pelo administrador: só vale para trocar a senha */
  trocar_senha?: boolean;
}

/** Rotas liberadas enquanto a senha ainda é provisória. */
const LIVRES_COM_SENHA_PROVISORIA = ['/api/auth/trocar-senha', '/api/auth/permissoes', '/api/auth/me'];

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Acesso não autorizado. Faça login para continuar.',
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;

    // Enquanto a senha for a que o administrador definiu, o sistema inteiro
    // fica fechado — só dá para trocar a senha.
    if (payload.trocar_senha) {
      const caminho = req.originalUrl.split('?')[0];
      const liberado = LIVRES_COM_SENHA_PROVISORIA.some(r => caminho === r || caminho.startsWith(r + '/'));
      if (!liberado) {
        return res.status(403).json({
          success: false,
          error: 'Defina uma nova senha para continuar usando o sistema.',
          precisa_trocar_senha: true,
        });
      }
    }

    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado. Faça login novamente.',
    });
  }
}
