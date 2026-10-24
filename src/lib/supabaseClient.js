import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[KT-Pagos] Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están configuradas. ' +
    'Edita el archivo .env.local con tus credenciales de Supabase.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * Obtiene el usuario autenticado actual de forma ultra-rápida:
 * Primero verifica la sesión local en almacenamiento (0ms, sin round-trip de red).
 * Solo si la sesión no está disponible hace fallback a getUser().
 */
export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session.user;
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch (err) {
    console.error('Error al obtener usuario actual:', err);
    return null;
  }
}
