import { Request, Response, NextFunction } from 'express';

// ── Rate Limiter (sliding window, in-memory) ──────────────────────────────────
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipLimits = new Map<string, RateLimitRecord>();

export function rateLimiter(maxRequests = 300, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = ipLimits.get(ip);

    if (!record || now > record.resetTime) {
      ipLimits.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Muitas requisições. Aguarde um momento antes de tentar novamente.',
      });
    }
    record.count++;
    next();
  };
}

// ── Security Headers ──────────────────────────────────────────────────────────
export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const apiOnly = process.env.API_ONLY === 'true' || process.env.NODE_ENV === 'production';

  // Em modo API-ONLY não há HTML servido daqui: CSP mínimo evita conflito com a Vercel.
  if (apiOnly) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  } else {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",   // unsafe-inline necessário para Vite HMR em dev
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        // Supabase Storage + WebSocket do HMR
        "connect-src 'self' ws: wss: https://*.supabase.co",
        "frame-src 'self' blob: https://*.supabase.co",
      ].join('; ')
    );
  }
  next();
}

// ── CORS ──────────────────────────────────────────────────────────────────────
// Origens liberadas vêm de CORS_ORIGINS (lista separada por vírgula).
// Ex.: CORS_ORIGINS=https://sistema-integra.vercel.app,https://app.suaempresa.com
// Em desenvolvimento, qualquer localhost é aceito automaticamente.
function parseOrigins(): string[] {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function isOriginPermitida(origin: string): boolean {
  const permitidas = parseOrigins();
  const limpa = origin.replace(/\/+$/, '');

  // Dev: libera localhost/127.0.0.1 em qualquer porta
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(limpa)) return true;

  // Match exato
  if (permitidas.includes(limpa)) return true;

  // Wildcard de subdomínio: https://*.vercel.app
  return permitidas.some(p => {
    if (!p.includes('*')) return false;
    const rx = new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') + '$');
    return rx.test(limpa);
  });
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin && isOriginPermitida(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  } else if (origin) {
    console.warn(`[CORS] Origem bloqueada: ${origin}`);
  }

  // Responde o preflight imediatamente
  if (req.method === 'OPTIONS') {
    res.sendStatus(origin && isOriginPermitida(origin) ? 204 : 403);
    return;
  }

  next();
}

// ── Error Handler Global ──────────────────────────────────────────────────────
export function handleServerError(err: any, _req: Request, res: Response, _next: NextFunction) {
  const isDev = process.env.NODE_ENV !== 'production';

  // LGPD: nunca loga dados sensíveis, só a mensagem de erro
  console.error('[SERVER ERROR]', err?.message || 'Unknown error');

  res.status(err.status || 500).json({
    success: false,
    // Em produção, mensagem genérica; em dev, detalhe do erro para debug
    error: isDev
      ? (err.message || 'Erro interno do servidor.')
      : 'Erro interno do servidor. Operação não concluída.',
  });
}
