import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';

// Caché en memoria indexado por filtros de consulta para acelerar re-visitas
const clasesCache = new Map();

// Selección optimizada: columnas estrictamente existentes en la tabla clases
const SELECT_CLASES_OPTIMIZADO = `
  id,
  fecha_clase,
  nombre_clase,
  tema_clase,
  estado_clase,
  es_adicional,
  fue_aplazada,
  precio_cobrado,
  en_reclamo,
  periodo_id,
  grupo_id,
  user_id,
  grupos (
    id,
    nombre_grupo,
    horario,
    tarifa_id,
    tarifas (
      id,
      precio_regular,
      precio_extra,
      duracion_minutos
    )
  )
`;

export function useClases(filtros = {}) {
  const cacheKey = `${filtros.grupo_id || ''}_${filtros.fecha_inicio || ''}_${filtros.fecha_fin || ''}_${filtros.periodo_id || ''}`;

  const [clases, setClases] = useState(() => {
    const cached = clasesCache.get(cacheKey);
    return cached && cached.length > 0 ? cached : [];
  });
  const [loading, setLoading] = useState(() => !clasesCache.has(cacheKey));
  const [error, setError] = useState(null);

  const fetchClases = useCallback(async (force = false) => {
    const cached = clasesCache.get(cacheKey);
    if (!force && cached && cached.length > 0) {
      setClases(cached);
      setLoading(false);
    } else if (!cached || cached.length === 0) {
      setLoading(true);
    }
    setError(null);

    const user = await getCurrentUser();
    if (!user) {
      setClases([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('clases')
      .select(SELECT_CLASES_OPTIMIZADO)
      .eq('user_id', user.id)
      .order('fecha_clase', { ascending: false });

    if (filtros.grupo_id) query = query.eq('grupo_id', filtros.grupo_id);
    if (filtros.fecha_inicio) query = query.gte('fecha_clase', filtros.fecha_inicio);
    if (filtros.fecha_fin) query = query.lte('fecha_clase', filtros.fecha_fin);
    if (filtros.periodo_id && !String(filtros.periodo_id).startsWith('virtual-')) {
      query = query.eq('periodo_id', filtros.periodo_id);
    }

    const { data, error: err } = await query;
    if (err) {
      console.error('Error fetching clases:', err);
      setError(err.message);
      setLoading(false);
      return;
    }

    const result = data || [];
    clasesCache.set(cacheKey, result);
    setClases(result);
    setLoading(false);
  }, [cacheKey, filtros.grupo_id, filtros.fecha_inicio, filtros.fecha_fin, filtros.periodo_id]);

  useEffect(() => {
    fetchClases();
  }, [fetchClases]);

  /**
   * Crea una clase aplicando el Motor de Precios (Snapshot):
   * Lee la tarifa del grupo y asigna precio_cobrado según es_adicional.
   */
  const createClase = async (values) => {
    const {
      grupo_id,
      fecha_clase,
      es_adicional,
      es_extra,
      nombre_clase,
      tema_clase,
      estado_clase,
      en_reclamo,
      recalc,
      ...rest
    } = values;

    const isAdicional = Boolean(es_adicional ?? es_extra);

    // 1. Obtener tarifa del grupo
    const rawGrupoId = String(grupo_id || '').trim();
    const isPureDigits = /^\d+$/.test(rawGrupoId);
    const resolvedGrupoId = isPureDigits ? Number(rawGrupoId) : rawGrupoId;

    const { data: grupo, error: gErr } = await supabase
      .from('grupos')
      .select('tarifa_id, tarifas(precio_regular, precio_extra)')
      .eq('id', resolvedGrupoId)
      .single();
    if (gErr) throw new Error(gErr.message);

    const tarifa = grupo?.tarifas;
    if (!tarifa) throw new Error('El grupo no tiene tarifa asociada.');

    // Motor de precios: snapshot inmutable
    const precio_cobrado = isAdicional ? tarifa.precio_extra : tarifa.precio_regular;

    const user = await getCurrentUser();

    const insertPayload = {
      grupo_id: resolvedGrupoId,
      user_id: user?.id ?? null,
      fecha_clase,
      nombre_clase: nombre_clase || tema_clase || null,
      tema_clase: tema_clase || nombre_clase || null,
      estado_clase: estado_clase || 'Programada',
      es_adicional: isAdicional,
      en_reclamo: Boolean(en_reclamo),
      fue_aplazada: Boolean(values.fue_aplazada),
      precio_cobrado,
      periodo_id: null,
    };

    // 2. Insertar la clase
    const { data, error: err } = await supabase
      .from('clases')
      .insert([insertPayload])
      .select(SELECT_CLASES_OPTIMIZADO)
      .single();
    if (err) throw new Error(err.message);

    clasesCache.clear(); // Limpiar caché tras mutación
    setClases((prev) => [data, ...prev]);
    return data;
  };

  const updateClase = async (id, values) => {
    // ── Snapshot Preservation ──
    const { recalc, es_extra, ...cleanValues } = values;

    if (es_extra !== undefined && cleanValues.es_adicional === undefined) {
      cleanValues.es_adicional = Boolean(es_extra);
    }

    let finalValues = { ...cleanValues };

    if (recalc) {
      const rawGrupoId = String(cleanValues.grupo_id || '').trim();
      const isPureDigits = /^\d+$/.test(rawGrupoId);
      const resolvedGrupoId = isPureDigits ? Number(rawGrupoId) : rawGrupoId;

      const { data: grupo, error: gErr } = await supabase
        .from('grupos')
        .select('tarifa_id, tarifas(precio_regular, precio_extra)')
        .eq('id', resolvedGrupoId)
        .single();
      if (gErr) throw new Error(gErr.message);

      const tarifa = grupo?.tarifas;
      if (!tarifa) throw new Error('El grupo no tiene tarifa asociada.');

      const precio_cobrado = cleanValues.es_adicional
        ? tarifa.precio_extra
        : tarifa.precio_regular;

      finalValues.precio_cobrado = precio_cobrado;
    }

    // Filtrar estrictamente columnas que existen en la tabla clases V2
    const ALLOWED_COLUMNS = new Set([
      'fecha_clase',
      'estado_clase',
      'precio_cobrado',
      'en_reclamo',
      'tema_clase',
      'nombre_clase',
      'es_adicional',
      'grupo_id',
      'periodo_id',
      'user_id',
      'fue_aplazada',
    ]);

    const sanitizedPayload = {};
    for (const [key, val] of Object.entries(finalValues)) {
      if (ALLOWED_COLUMNS.has(key)) {
        sanitizedPayload[key] = val;
      }
    }

    const { data, error: err } = await supabase
      .from('clases')
      .update(sanitizedPayload)
      .eq('id', id)
      .select(SELECT_CLASES_OPTIMIZADO)
      .single();
    if (err) throw new Error(err.message);

    clasesCache.clear(); // Limpiar caché tras mutación
    setClases((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteClase = async (id) => {
    const { error: err } = await supabase.from('clases').delete().eq('id', id);
    if (err) throw new Error(err.message);
    clasesCache.clear();
    setClases((prev) => prev.filter((c) => c.id !== id));
  };

  /** Alterna el booleano en_reclamo de una clase */
  const toggleReclamo = async (id) => {
    const clase = clases.find((c) => c.id === id);
    if (!clase) return;
    return updateClase(id, { en_reclamo: !clase.en_reclamo });
  };

  return {
    clases,
    loading,
    error,
    refetch: () => fetchClases(true),
    createClase,
    updateClase,
    deleteClase,
    toggleReclamo,
  };
}
