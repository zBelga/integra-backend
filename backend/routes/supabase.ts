import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getSupabaseStatus, getSupabase, ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE } from '../supabase.js';

const router = Router();

// GET /api/supabase/status
router.get('/status', async (req, res) => {
  try {
    const status = await getSupabaseStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar status do Supabase',
    });
  }
});

// GET /api/supabase/schema
router.get('/schema', (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'supabase_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.json({
        success: true,
        data: {
          sql,
          adminEmail: ADMIN_EMAIL,
          adminName: ADMIN_NAME,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Arquivo de schema SQL não encontrado.',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao ler schema SQL',
    });
  }
});

export default router;
