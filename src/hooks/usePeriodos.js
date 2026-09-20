import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { parseISO, startOfMonth, endOfMonth, formatISO, nombrePeriodo } from '../lib/dateUtils';

export function usePeriodos() {
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPeriodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('periodos')
      .select(`*, clases(id, nombre_clase, fecha_clase, precio_cobrado, en_reclamo)`)
      .order('fecha_inicio', { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }

    // ── Paso 1: Calcular estimado_real y deuda_reclamos por período ──
    const base = (data || []).map((p) => {
      const clases = p.clases || [];
      const estimado_real = clases.reduce((s, c) => s + (c.precio_cobrado || 0), 0);
      const deuda_reclamos = clases
        .filter((c) => c.en_reclamo)
        .reduce((s, c) => s + (c.precio_cobrado || 0), 0);
      return { ...p, estimado_real, deuda_reclamos };
    });

    // ── Paso 2: Calcular arrastre de deuda (Rollover) ──
    // Los períodos están en orden DESC (más reciente primero).
    // Para el arrastre necesitamos el orden cronológico (ASC).
    const cronologico = [...base].sort((a, b) =>
      a.fecha_inicio.localeCompare(b.fecha_inicio)
    );

    const enriched = cronologico.map((p, i) => {
      // Deuda arrastrada del período anterior
      const prev = cronologico[i - 1];
      const deuda_anterior = prev
        ? Math.max(0, prev.estimado_real - (prev.pagado_real || 0))
        : 0;

      // Total real a cobrar este período
      const total_a_cobrar = p.estimado_real + deuda_anterior;

      // ¿La deuda anterior quedó resuelta con el pago de este período?
      const deuda_resuelta = deuda_anterior > 0 && (p.pagado_real || 0) >= total_a_cobrar;

      // Error de pago vs total_a_cobrar
      const error_pago = (p.pagado_real || 0) - total_a_cobrar;

      return { ...p, deuda_anterior, total_a_cobrar, deuda_resuelta, error_pago };
    });

    // Devolver en orden DESC (más reciente primero) para la UI
    setPeriodos([...enriched].reverse());
    setLoading(false);
  }, []);

  useEffect(() => { fetchPeriodos(); }, [fetchPeriodos]);

  /**
   * Busca el periodo del mes de una fecha o lo crea si no existe.
   * @param {string} fechaStr - 'YYYY-MM-DD'
   * @returns {Promise<object>} - El periodo existente o recién creado
   */
  const getOrCreatePeriodo = async (fechaStr) => {
    const fecha = parseISO(fechaStr);
    const inicio = startOfMonth(fecha);
    const fin = endOfMonth(fecha);
    const inicioStr = formatISO(inicio);
    const finStr = formatISO(fin);

    // Buscar periodo existente
    const { data: existing, error: findErr } = await supabase
      .from('periodos')
      .select('*')
      .eq('fecha_inicio', inicioStr)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (existing) return existing;

    // Crear periodo automáticamente
    const nombre = nombrePeriodo(inicio);
    const { data: created, error: createErr } = await supabase
      .from('periodos')
      .insert([{ nombre_periodo: nombre, fecha_inicio: inicioStr, fecha_fin: finStr, pagado_real: 0 }])
      .select()
      .single();
    if (createErr) throw new Error(createErr.message);
    await fetchPeriodos();
    return created;
  };

  const updatePeriodo = async (id, values) => {
    const { data, error: err } = await supabase
      .from('periodos')
      .update(values)
      .eq('id', id)
      .select()
      .single();
    if (err) throw new Error(err.message);
    await fetchPeriodos(); // Refetch para recalcular totales
    return data;
  };

  const deletePeriodo = async (id) => {
    const { error: err } = await supabase.from('periodos').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setPeriodos((prev) => prev.filter((p) => p.id !== id));
  };

  // Periodo del mes actual
  const periodoActual = periodos.find((p) => {
    const hoy = formatISO(new Date());
    return p.fecha_inicio <= hoy && p.fecha_fin >= hoy;
  });

  // Periodo del mes anterior
  const periodoAnterior = (() => {
    if (!periodoActual) return periodos[0] || null;
    const idx = periodos.findIndex((p) => p.id === periodoActual.id);
    return periodos[idx + 1] || null;
  })();

  return {
    periodos, loading, error, refetch: fetchPeriodos,
    getOrCreatePeriodo, updatePeriodo, deletePeriodo,
    periodoActual, periodoAnterior,
  };
}
