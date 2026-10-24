import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';

// Caché en memoria para tarifas
let tarifasCache = null;
let tarifasCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1 minuto de validez

const SELECT_TARIFAS = 'id, user_id, duracion_minutos, precio_regular, precio_extra';

export function useTarifas() {
  const [tarifas, setTarifas] = useState(() => tarifasCache || []);
  const [loading, setLoading] = useState(() => !tarifasCache);
  const [error, setError] = useState(null);

  const fetchTarifas = useCallback(async (force = false) => {
    if (!force && tarifasCache && (Date.now() - tarifasCacheTime < CACHE_TTL_MS)) {
      setTarifas(tarifasCache);
      setLoading(false);
      return;
    }

    if (!tarifasCache) {
      setLoading(true);
    }
    setError(null);

    const user = await getCurrentUser();
    if (!user) {
      setTarifas([]);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('tarifas')
      .select(SELECT_TARIFAS)
      .eq('user_id', user.id)
      .order('duracion_minutos', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      tarifasCache = data || [];
      tarifasCacheTime = Date.now();
      setTarifas(tarifasCache);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTarifas(); }, [fetchTarifas]);

  const createTarifa = async (values) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('No hay sesión de usuario activa.');

    const payload = {
      ...values,
      user_id: user?.id,
    };

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

  const updateTarifa = async (id, values) => {
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

  const deleteTarifa = async (id) => {
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
