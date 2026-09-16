import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const ADMIN_USER_DEFAULT = {
  email: 'fabriciooliveira2431@gmail.com',
  name: 'Fabrício Oliveira',
  role: 'Administrador Geral',
  isAdmin: true,
};

let browserSupabaseClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!browserSupabaseClient) {
    try {
      browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.warn('Erro ao inicializar Supabase no navegador:', err);
      return null;
    }
  }
  return browserSupabaseClient;
}

export interface SupabaseStatusResponse {
  connected: boolean;
  configured: boolean;
  message: string;
  adminUser: {
    email: string;
    name: string;
    role: string;
    isAdmin: boolean;
  };
  url?: string;
  database: string;
}

export async function fetchSupabaseStatus(): Promise<SupabaseStatusResponse> {
  try {
    const res = await fetch('/api/supabase/status');
    const json = await res.json();
    if (json.success) {
      return json.data;
    }
    return {
      connected: false,
      configured: false,
      message: json.error || 'Erro ao conectar ao Supabase',
      adminUser: ADMIN_USER_DEFAULT,
      database: 'SQLite Local',
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: false,
      message: 'Não foi possível verificar status do backend Supabase',
      adminUser: ADMIN_USER_DEFAULT,
      database: 'SQLite Local',
    };
  }
}

export async function fetchSupabaseSchema(): Promise<string> {
  try {
    const res = await fetch('/api/supabase/schema');
    const json = await res.json();
    if (json.success && json.data?.sql) {
      return json.data.sql;
    }
    return '';
  } catch {
    return '';
  }
}
