import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { localDb, generateLocalId } from '../lib/localDb';

// Caché en memoria para tarifas
let tarifasCache = null;
let tarifasCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1 minuto de validez

const SELECT_TARIFAS = 'id, user_id, duracion_minutos, precio_regular, precio_extra';

export function useTarifas() {
  const { isOffline, user } = useAuth();
  const currentUserId = user?.id || 'local-user';

  const [tarifas, setTarifas] = useState(() => tarifasCache || []);
  const [loading, setLoading] = useState(() => !tarifasCache);
  const [error, setError] = useState(null);

  const fetchTarifas = useCallback(async (force = false) => {
    // ── Modo local (IndexedDB) ────────────────────────────────────────────────
    if (isOffline) {
      setLoading(true);
      setError(null);
      try {
        const data = await localDb.tarifas
          .where('user_id')
          .equals(currentUserId)
          .toArray();
        // Ordenar por duracion_minutos ascendente (equivalente a Supabase .order)
        data.sort((a, b) => (a.duracion_minutos ?? 0) - (b.duracion_minutos ?? 0));
        setTarifas(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Modo online (Supabase) ────────────────────────────────────────────────
    if (!force && tarifasCache && (Date.now() - tarifasCacheTime < CACHE_TTL_MS)) {
      setTarifas(tarifasCache);
      setLoading(false);
      return;
    }

    if (!tarifasCache) {
      setLoading(true);
    }
    setError(null);

    const onlineUser = await getCurrentUser();
    if (!onlineUser) {
      setTarifas([]);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('tarifas')
      .select(SELECT_TARIFAS)
      .eq('user_id', onlineUser.id)
      .order('duracion_minutos', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      tarifasCache = data || [];
      tarifasCacheTime = Date.now();
      setTarifas(tarifasCache);
    }
    setLoading(false);
  }, [isOffline, currentUserId]);

  useEffect(() => { fetchTarifas(); }, [fetchTarifas]);

  // ── CREATE ────────────────────────────────────────────────────────────────
  const createTarifa = async (values) => {
    if (isOffline) {
      const id = generateLocalId();
      const newRecord = { id, user_id: currentUserId, ...values };
      await localDb.tarifas.put(newRecord);
      setTarifas((prev) => {
        const updated = [...prev, newRecord].sort(
          (a, b) => (a.duracion_minutos ?? 0) - (b.duracion_minutos ?? 0)
        );
        return updated;
      });
      return newRecord;
    }

    const onlineUser = await getCurrentUser();
    if (!onlineUser) throw new Error('No hay sesión de usuario activa.');

    const payload = { ...values, user_id: onlineUser.id };

    const { data, error: err } = await supabase
      .from('tarifas')
      .insert([payload])
      .select(SELECT_TARIFAS)
      .single();

    if (err) throw new Error(err.message);

    setTarifas((prev) => {
      const updated = [...prev, data];
      tarifasCache = updated;
      tarifasCacheTime = Date.now();
      return updated;
    });
    return data;
  };

  // ── UPDATE ────────────────────────────────────────────────────────────────
  const updateTarifa = async (id, values) => {
    if (isOffline) {
      const existing = await localDb.tarifas.get(id);
      const updated = { ...(existing || {}), ...values, id, user_id: currentUserId };
      await localDb.tarifas.put(updated);
      setTarifas((prev) =>
        prev
          .map((t) => (t.id === id ? updated : t))
          .sort((a, b) => (a.duracion_minutos ?? 0) - (b.duracion_minutos ?? 0))
      );
      return updated;
    }

    const { data, error: err } = await supabase
      .from('tarifas')
      .update(values)
      .eq('id', id)
      .select(SELECT_TARIFAS)
      .single();

    if (err) throw new Error(err.message);

    setTarifas((prev) => {
      const updated = prev.map((t) => (t.id === id ? data : t));
      tarifasCache = updated;
      tarifasCacheTime = Date.now();
      return updated;
    });
    return data;
  };

  // ── DELETE ────────────────────────────────────────────────────────────────
  const deleteTarifa = async (id) => {
    if (isOffline) {
      await localDb.tarifas.delete(id);
      setTarifas((prev) => prev.filter((t) => t.id !== id));
      return;
    }

    const { error: err } = await supabase.from('tarifas').delete().eq('id', id);
    if (err) throw new Error(err.message);

    setTarifas((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      tarifasCache = updated;
      tarifasCacheTime = Date.now();
      return updated;
    });
  };

  return { tarifas, loading, error, refetch: () => fetchTarifas(true), createTarifa, updateTarifa, deleteTarifa };
}
