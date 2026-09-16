import express from 'express';
import path from 'path';
import admissoesRouter  from './routes/admissoes.js';
import obrasRouter      from './routes/obras.js';
import supabaseRouter   from './routes/supabase.js';
import usuariosRouter   from './routes/usuarios.js';
import cargosRouter     from './routes/cargos.js';
import permissoesRouter from './routes/permissoes.js';
import solicitacoesRouter from './routes/solicitacoes.js';
import authRouter       from './routes/auth.js';
import empresasRouter   from './routes/empresas.js';
import colaboradoresRouter from './routes/colaboradores.js';
import documentosRouter from './routes/documentos.js';
import { applySecurityHeaders, rateLimiter, handleServerError, corsMiddleware } from './utils/security.js';
import { requireAuth } from './middleware/auth.js';
import { getDb } from './db.js';

const IS_PROD = process.env.NODE_ENV === 'production';
/** Quando true, o backend NÃO serve o frontend (deploy separado: Vercel + Railway) */
const API_ONLY = process.env.API_ONLY === 'true' || IS_PROD;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Railway/Vercel ficam atrás de proxy — necessário para req.ip e rate limit
  app.set('trust proxy', 1);

  // Inicializa banco SQLite
  await getDb();

  // ── Middleware global ──
  app.use(corsMiddleware);                          // CORS antes de tudo
  app.use(express.json({ limit: '15mb' }));         // base64 de até ~10MB
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(applySecurityHeaders);
  app.use('/api/', rateLimiter(300, 60 * 1000));

  // ── Health check (público) — usado pelo Railway ──
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Sistema Integra API',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });
  // Health na raiz também (Railway checa "/" por padrão)
  app.get('/', (_req, res, next) => {
    if (!API_ONLY) return next();
    res.json({ status: 'ok', service: 'Sistema Integra API', docs: '/api/health' });
  });

  // ── Autenticação (público) ──
  app.use('/api/auth', authRouter);

  // ── Rotas protegidas por JWT ──
  app.use('/api/admissoes',     requireAuth, admissoesRouter);
  app.use('/api/obras',         requireAuth, obrasRouter);
  app.use('/api/usuarios',      requireAuth, usuariosRouter);
  app.use('/api/cargos',        requireAuth, cargosRouter);
  app.use('/api/permissoes',    requireAuth, permissoesRouter);
  app.use('/api/solicitacoes',  requireAuth, solicitacoesRouter);
  app.use('/api/empresas',      requireAuth, empresasRouter);
  app.use('/api/colaboradores', requireAuth, colaboradoresRouter);
  app.use('/api/documentos',    requireAuth, documentosRouter);
  app.use('/api/supabase',      requireAuth, supabaseRouter);

  // ── 404 para rotas de API desconhecidas ──
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'Rota de API não encontrada.' });
  });

  // ── Error handler global ──
  app.use(handleServerError);

  // ── Frontend ──
  // API_ONLY=true (produção/Railway) → não serve frontend, quem serve é a Vercel.
  if (!API_ONLY) {
    // Import dinâmico: 'vite' é devDependency e não existe em produção
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.SERVE_STATIC === 'true') {
    // Opcional: rodar tudo junto num só servidor (monolito)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Sistema Integra] API rodando na porta ${PORT}`);
    console.log(`   Modo: ${API_ONLY ? 'API-ONLY (frontend separado)' : 'DEV (Vite integrado)'}`);
    console.log(`   CORS liberado para: ${process.env.CORS_ORIGINS || '* (dev)'}`);
  });
}

startServer().catch((err) => {
  console.error('Falha fatal ao iniciar o servidor:', err);
  process.exit(1);
});
