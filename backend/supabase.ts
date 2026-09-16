import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Admin Email
export const ADMIN_EMAIL = 'fabriciooliveira2431@gmail.com';
export const ADMIN_NAME = 'Fabrício Oliveira';
export const ADMIN_ROLE = 'Administrador Geral';

let supabaseClient: SupabaseClient | null = null;

/**
 * Lazy initialization of Supabase Client to prevent crashes on startup if keys are missing
 */
export function getSupabase(): SupabaseClient | null {
  const currentUrl = process.env.SUPABASE_URL || '';
  const currentKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!currentUrl || !currentKey) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(currentUrl, currentKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('✅ [Supabase] Cliente conectado com sucesso a:', currentUrl);
    } catch (err) {
      console.warn('⚠️ [Supabase] Erro ao instanciar cliente:', err);
      return null;
    }
  }

  return supabaseClient;
}

/**
 * Checks connection status to Supabase
 */
export async function getSupabaseStatus() {
  const client = getSupabase();
  const isConfigured = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));

  if (!client || !isConfigured) {
    return {
      connected: false,
      configured: false,
      message: 'Supabase aguardando chaves de ambiente (SUPABASE_URL e SUPABASE_ANON_KEY).',
      adminUser: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: ADMIN_ROLE,
        isAdmin: true,
      },
      url: process.env.SUPABASE_URL ? 'Configurado' : 'Não informado',
      database: 'SQLite Local (Pronto para migrar para Supabase)',
    };
  }

  try {
    // Test query on table or auth
    const { data, error } = await client.from('obras').select('id').limit(1);

    if (error && error.code !== 'PGRST116') {
      return {
        connected: false,
        configured: true,
        message: `Supabase configurado, porém tabela precisa ser criada: ${error.message}`,
        error: error.message,
        adminUser: {
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          role: ADMIN_ROLE,
          isAdmin: true,
        },
        url: process.env.SUPABASE_URL,
        database: 'Supabase PostgreSQL (Aguardando Schema)',
      };
    }

    return {
      connected: true,
      configured: true,
      message: 'Conectado ao Supabase PostgreSQL com sucesso.',
      adminUser: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: ADMIN_ROLE,
        isAdmin: true,
      },
      url: process.env.SUPABASE_URL,
      database: 'Supabase PostgreSQL',
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      message: `Erro ao testar conexão Supabase: ${err.message}`,
      adminUser: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: ADMIN_ROLE,
        isAdmin: true,
      },
      url: process.env.SUPABASE_URL,
      database: 'SQLite Local',
    };
  }
}
