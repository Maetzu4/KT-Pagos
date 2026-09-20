import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useTarifas() {
  const [tarifas, setTarifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTarifas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('tarifas')
      .select('*')
      .order('duracion_minutos', { ascending: true });
    if (err) setError(err.message);
    else setTarifas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTarifas(); }, [fetchTarifas]);

  const createTarifa = async (values) => {
    const { data, error: err } = await supabase
      .from('tarifas')
      .insert([values])
      .select()
      .single();
    if (err) throw new Error(err.message);
    setTarifas((prev) => [...prev, data]);
    return data;
  };

  const updateTarifa = async (id, values) => {
    const { data, error: err } = await supabase
      .from('tarifas')
      .update(values)
      .eq('id', id)
      .select()
      .single();
    if (err) throw new Error(err.message);
    setTarifas((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  };

  const deleteTarifa = async (id) => {
    const { error: err } = await supabase.from('tarifas').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setTarifas((prev) => prev.filter((t) => t.id !== id));
  };

  return { tarifas, loading, error, refetch: fetchTarifas, createTarifa, updateTarifa, deleteTarifa };
}
