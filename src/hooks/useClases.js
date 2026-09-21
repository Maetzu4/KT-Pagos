import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useClases(filtros = {}) {
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClases = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('clases')
      .select(`*, grupos(nombre_grupo, tarifa_id, tarifas(*)), periodos(nombre_periodo)`)
      .order('fecha_clase', { ascending: false });

    if (filtros.grupo_id) query = query.eq('grupo_id', filtros.grupo_id);
    if (filtros.periodo_id) query = query.eq('periodo_id', filtros.periodo_id);

    const { data, error: err } = await query;
    if (err) { setError(err.message); setLoading(false); return; }
    setClases(data || []);
    setLoading(false);
  }, [filtros.grupo_id, filtros.periodo_id]);

  useEffect(() => { fetchClases(); }, [fetchClases]);

  /**
   * Crea una clase aplicando el Motor de Precios (Snapshot):
   * Lee la tarifa del grupo y asigna precio_cobrado según es_extra.
   * Requiere que getOrCreatePeriodo sea pasado desde usePeriodos.
   */
  const createClase = async (values, getOrCreatePeriodo) => {
    const { grupo_id, fecha_clase, es_extra, recalc, ...rest } = values;

    // 1. Obtener tarifa del grupo
    const { data: grupo, error: gErr } = await supabase
      .from('grupos')
      .select(`tarifa_id, tarifas(precio_regular, precio_extra)`)
      .eq('id', grupo_id)
      .single();
    if (gErr) throw new Error(gErr.message);

    const tarifa = grupo?.tarifas;
    if (!tarifa) throw new Error('El grupo no tiene tarifa asociada.');

    // Motor de precios: snapshot inmutable
    const precio_cobrado = es_extra ? tarifa.precio_extra : tarifa.precio_regular;

    // 2. Obtener o crear el periodo del mes
    const periodo = await getOrCreatePeriodo(fecha_clase);

    // 3. Insertar la clase
    const { data, error: err } = await supabase
      .from('clases')
      .insert([{ grupo_id, fecha_clase, es_extra, precio_cobrado, periodo_id: periodo.id, ...rest }])
      .select(`*, grupos(nombre_grupo, tarifas(*)), periodos(nombre_periodo)`)
      .single();
    if (err) throw new Error(err.message);
    setClases((prev) => [data, ...prev]);
    return data;
  };

  const updateClase = async (id, values) => {
    // ── Snapshot Preservation ──
    // Si el payload incluye recalc: true, recalculamos el precio.
    // De lo contrario, respetamos el precio_cobrado existente y simplemente actualizamos.
    const { recalc, ...cleanValues } = values;

    let finalValues = cleanValues;

    if (recalc) {
      // El usuario cambió grupo_id o es_extra → recalcular precio snapshot
      const rawGrupoId = String(cleanValues.grupo_id || '').trim();
      const isPureDigits = /^\d+$/.test(rawGrupoId);
      const resolvedGrupoId = isPureDigits ? Number(rawGrupoId) : rawGrupoId;

      const { data: grupo, error: gErr } = await supabase
        .from('grupos')
        .select(`tarifa_id, tarifas(precio_regular, precio_extra)`)
        .eq('id', resolvedGrupoId)
        .single();
      if (gErr) throw new Error(gErr.message);

      const tarifa = grupo?.tarifas;
      if (!tarifa) throw new Error('El grupo no tiene tarifa asociada.');

      const precio_cobrado = cleanValues.es_extra
        ? tarifa.precio_extra
        : tarifa.precio_regular;

      finalValues = { ...cleanValues, precio_cobrado };
    }

    const { data, error: err } = await supabase
      .from('clases')
      .update(finalValues)
      .eq('id', id)
      .select(`*, grupos(nombre_grupo, tarifas(*)), periodos(nombre_periodo)`)
      .single();
    if (err) throw new Error(err.message);
    setClases((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteClase = async (id) => {
    const { error: err } = await supabase.from('clases').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setClases((prev) => prev.filter((c) => c.id !== id));
  };

  /** Alterna el booleano en_reclamo de una clase */
  const toggleReclamo = async (id) => {
    const clase = clases.find((c) => c.id === id);
    if (!clase) return;
    return updateClase(id, { en_reclamo: !clase.en_reclamo });
  };

  return { clases, loading, error, refetch: fetchClases, createClase, updateClase, deleteClase, toggleReclamo };
}
