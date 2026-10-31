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

/**
 * Determina si la aplicación debe operar en modo local (IndexedDB)
 * o en modo remoto (Supabase).
 * Retorna true si NO hay sesión activa o si no hay usuario autenticado.
 */
export async function isAppOffline() {
  const user = await getCurrentUser();
  return !user;
}

/**
 * Retorna true si hay un usuario con sesión activa en Supabase.
 */
export async function hasActiveSession() {
  const user = await getCurrentUser();
  return Boolean(user);
}
