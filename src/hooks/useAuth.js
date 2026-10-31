import { useSyncExternalStore } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';

// Estado global de autenticación compartido para evitar duplicación de listeners y parpadeos
let globalAuth = {
  session: null,
  user: null,
  isLoading: true,
};
const listeners = new Set();

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return globalAuth;
}

let authInitialized = false;

function initAuth() {
  if (authInitialized) return;
  authInitialized = true;

  // 1. Resolución ultra-rápida (almacenamiento local, 0ms)
  getCurrentUser()
    .then((currentUser) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        globalAuth = {
          session,
          user: currentUser || session?.user || null,
          isLoading: false,
        };
        listeners.forEach((cb) => cb());
      });
    })
    .catch((err) => {
      console.warn('Error resolviendo auth inicial:', err);
      globalAuth = {
        session: null,
        user: null,
        isLoading: false,
      };
      listeners.forEach((cb) => cb());
    });

  // 2. Suscripción a cambios de sesión (login, logout, refresh)
  supabase.auth.onAuthStateChange((_event, session) => {
    globalAuth = {
      session,
      user: session?.user ?? null,
      isLoading: false,
    };
    listeners.forEach((cb) => cb());
  });
}

/**
 * Hook reactivo para conocer el estado de autenticación de la app.
 * Utiliza useSyncExternalStore para garantizar renderizados consistentes sin parpadeos.
 */
export function useAuth() {
  initAuth();
  const authState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isOffline = !authState.isLoading && !authState.session;
  const isOnline = !authState.isLoading && Boolean(authState.session);

  return {
    session: authState.session,
    user: authState.user,
    isLoading: authState.isLoading,
    loading: authState.isLoading, // Alias de retrocompatibilidad
    isOffline,
    isOnline,
  };
}
