import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Falha ao instanciar o cliente Supabase:', error);
  }
} else {
  console.warn('Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
}

export const supabase = supabaseInstance;
