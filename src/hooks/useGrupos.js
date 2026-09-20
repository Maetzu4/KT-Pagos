import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addDays, parseISO, isAfter } from '../lib/dateUtils';

/**
 * Calcula si un grupo está activo o finalizado.
 * Se considera activo si la fecha estimada de fin (fecha_inicio + cantidad_lecciones días hábiles)
 * es posterior a hoy. Usamos una aproximación simple: cada lección = 7 días (semanal).
 */
function calcularEstadoGrupo(grupo) {
  if (!grupo.fecha_inicio || !grupo.cantidad_lecciones) return 'desconocido';
  const inicio = parseISO(grupo.fecha_inicio);
  // Aproximación: 7 días por lección (clase semanal)
  const diasTotales = grupo.cantidad_lecciones * 7;
  const fechaFin = addDays(inicio, diasTotales);
  return isAfter(fechaFin, new Date()) ? 'activo' : 'finalizado';
}

export function useGrupos() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGrupos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('grupos')
      .select(`*, tarifas(*)`)
      .order('nombre_grupo', { ascending: true });
    if (err) { setError(err.message); setLoading(false); return; }
    const enriched = (data || []).map((g) => ({ ...g, estado: calcularEstadoGrupo(g) }));
    setGrupos(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGrupos(); }, [fetchGrupos]);

  const createGrupo = async (values) => {
    const { data, error: err } = await supabase
      .from('grupos')
      .insert([values])
      .select(`*, tarifas(*)`)
      .single();
    if (err) throw new Error(err.message);
    const enriched = { ...data, estado: calcularEstadoGrupo(data) };
    setGrupos((prev) => [...prev, enriched]);
    return enriched;
  };

  const updateGrupo = async (id, values) => {
    const { data, error: err } = await supabase
      .from('grupos')
      .update(values)
      .eq('id', id)
      .select(`*, tarifas(*)`)
      .single();
    if (err) throw new Error(err.message);
    const enriched = { ...data, estado: calcularEstadoGrupo(data) };
    setGrupos((prev) => prev.map((g) => (g.id === id ? enriched : g)));
    return enriched;
  };

  const deleteGrupo = async (id) => {
    const { error: err } = await supabase.from('grupos').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setGrupos((prev) => prev.filter((g) => g.id !== id));
  };

  const gruposActivos = grupos.filter((g) => g.estado === 'activo');

  return { grupos, gruposActivos, loading, error, refetch: fetchGrupos, createGrupo, updateGrupo, deleteGrupo };
}
