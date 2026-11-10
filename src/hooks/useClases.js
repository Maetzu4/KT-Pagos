import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { localDb, generateLocalId } from '../lib/localDb';
import { addDays, format, parseISO } from 'date-fns';

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
  es_externa,
  descripcion_externa,
  tarifa_id,
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
  ),
  tarifas (
    id,
    precio_regular,
    precio_extra,
    duracion_minutos
  )
`;

/**
 * Aplaza masivamente todas las clases de un grupo desde una fecha dada,
 * empujando su fecha_clase exactamente 7 días hacia el futuro y manteniendo
 * el estado fue_aplazada original.
 *
 * Soporta ejecución tanto en modo offline (IndexedDB) como online (Supabase).
 *
 * @param {string} grupo_id     - UUID del grupo
 * @param {string} fecha_origen - 'YYYY-MM-DD' — se aplaza esta clase y TODAS las posteriores
 * @returns {Promise<number>} Cantidad de clases modificadas
 */
export async function aplazarClasesMasivo(grupo_id, fecha_origen) {
  if (!grupo_id || !fecha_origen) throw new Error('grupo_id y fecha_origen son requeridos.');

  const user = await getCurrentUser();
  const isOffline = !user;
  const currentUserId = user?.id || 'local-user';

  // ── Modo local (IndexedDB) ──────────────────────────────────────────────────
  if (isOffline) {
    const todasClases = await localDb.clases
      .where('user_id')
      .equals(currentUserId)
      .toArray();

    const clasesAfectadas = todasClases.filter(
      (c) => String(c.grupo_id) === String(grupo_id) && c.fecha_clase >= fecha_origen
    );

    if (clasesAfectadas.length === 0) return 0;

    for (const c of clasesAfectadas) {
      const fechaOriginal = String(c.fecha_clase).split('T')[0].split(' ')[0];
      const nuevaFecha = format(addDays(parseISO(fechaOriginal), 7), 'yyyy-MM-dd');
      await localDb.clases.update(c.id, {
        fecha_clase: nuevaFecha,
      });
    }

    clasesCache.clear();
    return clasesAfectadas.length;
  }

  // ── Modo online (Supabase) ──────────────────────────────────────────────────
  // 1. Obtener todas las clases del grupo desde la fecha origen (inclusive)
  const { data: clasesAfectadas, error: fetchErr } = await supabase
    .from('clases')
    .select('id, fecha_clase, fue_aplazada')
    .eq('grupo_id', grupo_id)
    .eq('user_id', user.id)
    .gte('fecha_clase', fecha_origen)
    .order('fecha_clase', { ascending: true });

  if (fetchErr) throw new Error(fetchErr.message);
  if (!clasesAfectadas || clasesAfectadas.length === 0) return 0;

  // 2. Construir el payload de upsert: +7 días por cada fila manteniendo formato 'yyyy-MM-dd'
  const upsertPayload = clasesAfectadas.map((c) => {
    const fechaOriginal = String(c.fecha_clase).split('T')[0].split(' ')[0];
    const nuevaFecha    = format(addDays(parseISO(fechaOriginal), 7), 'yyyy-MM-dd');
    return {
      id:           c.id,
      fecha_clase:  nuevaFecha,
      fue_aplazada: c.fue_aplazada, // Conserva su estado original
      user_id:      user.id,
      grupo_id:     grupo_id,
    };
  });

  // 3. Upsert en bloque (la PK 'id' ya está presente → Supabase hace UPDATE)
  const CHUNK = 100;
  for (let i = 0; i < upsertPayload.length; i += CHUNK) {
    const { error: upsErr } = await supabase
      .from('clases')
      .upsert(upsertPayload.slice(i, i + CHUNK), { onConflict: 'id' });
    if (upsErr) throw new Error(upsErr.message);
  }

  // 4. Invalida la caché local para que el próximo fetch traiga datos frescos
  clasesCache.clear();

  return clasesAfectadas.length;
}

export function useClases(filtros = {}) {
  const { isOffline, user } = useAuth();
  const currentUserId = user?.id || 'local-user';

  const cacheKey = `${filtros.grupo_id || ''}_${filtros.fecha_inicio || ''}_${filtros.fecha_fin || ''}_${filtros.periodo_id || ''}_${isOffline ? 'local' : 'remote'}`;

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
      return;
    }

    setLoading(true);
    setError(null);

    // ── Modo local (IndexedDB) ────────────────────────────────────────────────
    if (isOffline) {
      try {
        const [rawClases, rawGrupos, rawTarifas] = await Promise.all([
          localDb.clases.where('user_id').equals(currentUserId).toArray(),
          localDb.grupos.where('user_id').equals(currentUserId).toArray(),
          localDb.tarifas.where('user_id').equals(currentUserId).toArray(),
        ]);

        const tarifasMap = new Map(rawTarifas.map((t) => [t.id, t]));
        const gruposMap = new Map(
          rawGrupos.map((g) => [
            g.id,
            {
              ...g,
              tarifas: tarifasMap.get(g.tarifa_id) || null,
            },
          ])
        );

        let filtradas = rawClases;

        if (filtros.grupo_id) {
          filtradas = filtradas.filter((c) => String(c.grupo_id) === String(filtros.grupo_id));
        }
        if (filtros.fecha_inicio) {
          filtradas = filtradas.filter((c) => c.fecha_clase >= filtros.fecha_inicio);
        }
        if (filtros.fecha_fin) {
          filtradas = filtradas.filter((c) => c.fecha_clase <= filtros.fecha_fin);
        }
        if (filtros.periodo_id && !String(filtros.periodo_id).startsWith('virtual-')) {
          filtradas = filtradas.filter((c) => String(c.periodo_id) === String(filtros.periodo_id));
        }

        // Ordenar descendente por fecha_clase
        filtradas.sort((a, b) => (b.fecha_clase ?? '').localeCompare(a.fecha_clase ?? ''));

        const resultado = filtradas.map((c) => ({
          ...c,
          grupos: gruposMap.get(c.grupo_id) || null,
        }));

        clasesCache.set(cacheKey, resultado);
        setClases(resultado);
      } catch (e) {
        console.error('Error fetching clases local:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Modo online (Supabase) ────────────────────────────────────────────────
    const onlineUser = await getCurrentUser();
    if (!onlineUser) {
      setClases([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('clases')
      .select(SELECT_CLASES_OPTIMIZADO)
      .eq('user_id', onlineUser.id)
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
  }, [cacheKey, isOffline, currentUserId, filtros.grupo_id, filtros.fecha_inicio, filtros.fecha_fin, filtros.periodo_id]);

  useEffect(() => {
    fetchClases();
  }, [fetchClases]);

  /**
   * Crea una clase aplicando el Motor de Precios (Snapshot):
   * Lee la tarifa del grupo y asigna precio_cobrado según es_adicional.
   * Si es_externa === true, grupo_id puede ser null y se usa tarifa_id directamente.
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
      es_externa,
      descripcion_externa,
      tarifa_id: tarifaIdExterno,
      ...rest
    } = values;

    const isAdicional = Boolean(es_adicional ?? es_extra);
    const isExterna = Boolean(es_externa);

    // For external extras, grupo_id may be null
    const rawGrupoId = grupo_id != null ? String(grupo_id).trim() : null;
    const isPureDigits = rawGrupoId != null && /^\d+$/.test(rawGrupoId);
    const resolvedGrupoId = rawGrupoId == null ? null : (isPureDigits ? Number(rawGrupoId) : rawGrupoId);

    // ── Modo local (IndexedDB) ────────────────────────────────────────────────
    if (isOffline) {
      let precio_cobrado = 0;

      if (isExterna && tarifaIdExterno) {
        // External extra: resolve price directly from tarifa
        const tarifa = await localDb.tarifas.get(tarifaIdExterno);
        precio_cobrado = isAdicional
          ? (tarifa?.precio_extra ?? 0)
          : (tarifa?.precio_regular ?? 0);
      } else if (resolvedGrupoId != null) {
        const grupo = await localDb.grupos.get(resolvedGrupoId);
        const tarifa = grupo?.tarifa_id ? await localDb.tarifas.get(grupo.tarifa_id) : null;
        precio_cobrado = isAdicional
          ? (tarifa?.precio_extra ?? 0)
          : (tarifa?.precio_regular ?? 0);
      }

      const id = generateLocalId();
      const insertPayload = {
        id,
        grupo_id: resolvedGrupoId,
        user_id: currentUserId,
        fecha_clase,
        nombre_clase: nombre_clase || tema_clase || descripcion_externa || null,
        tema_clase: tema_clase || nombre_clase || descripcion_externa || null,
        estado_clase: estado_clase || 'Programada',
        es_adicional: isAdicional,
        en_reclamo: Boolean(en_reclamo),
        fue_aplazada: Boolean(values.fue_aplazada),
        precio_cobrado,
        periodo_id: null,
        es_externa: isExterna,
        descripcion_externa: descripcion_externa || null,
        tarifa_id: tarifaIdExterno || null,
      };

      await localDb.clases.put(insertPayload);

      const grupo = resolvedGrupoId != null ? await localDb.grupos.get(resolvedGrupoId) : null;
      const tarifa = grupo?.tarifa_id ? await localDb.tarifas.get(grupo.tarifa_id) : null;
      const enrichedNewClase = {
        ...insertPayload,
        grupos: grupo ? { ...grupo, tarifas: tarifa || null } : null,
      };

      clasesCache.clear();
      setClases((prev) => [enrichedNewClase, ...prev]);
      return enrichedNewClase;
    }

    // ── Modo online (Supabase) ────────────────────────────────────────────────
    let precio_cobrado = 0;

    if (isExterna && tarifaIdExterno) {
      // External extra: fetch price from tarifa directly
      const { data: tarifa } = await supabase
        .from('tarifas')
        .select('precio_regular, precio_extra')
        .eq('id', tarifaIdExterno)
        .single();
      precio_cobrado = isAdicional
        ? (tarifa?.precio_extra ?? 0)
        : (tarifa?.precio_regular ?? 0);
    } else if (resolvedGrupoId != null) {
      const { data: grupo, error: gErr } = await supabase
        .from('grupos')
        .select('tarifa_id, tarifas(precio_regular, precio_extra)')
        .eq('id', resolvedGrupoId)
        .single();
      if (gErr) throw new Error(gErr.message);

      const tarifa = grupo?.tarifas;
      if (!tarifa) throw new Error('El grupo no tiene tarifa asociada.');
      precio_cobrado = isAdicional ? tarifa.precio_extra : tarifa.precio_regular;
    }

    const onlineUser = await getCurrentUser();

    const insertPayload = {
      grupo_id: resolvedGrupoId,
      user_id: onlineUser?.id ?? null,
      fecha_clase,
      nombre_clase: nombre_clase || tema_clase || descripcion_externa || null,
      tema_clase: tema_clase || nombre_clase || descripcion_externa || null,
      estado_clase: estado_clase || 'Programada',
      es_adicional: isAdicional,
      en_reclamo: Boolean(en_reclamo),
      fue_aplazada: Boolean(values.fue_aplazada),
      precio_cobrado,
      periodo_id: null,
      es_externa: isExterna,
      descripcion_externa: descripcion_externa || null,
      tarifa_id: tarifaIdExterno || null,
    };

    const { data, error: err } = await supabase
      .from('clases')
      .insert([insertPayload])
      .select(SELECT_CLASES_OPTIMIZADO)
      .single();
    if (err) throw new Error(err.message);

    clasesCache.clear();
    setClases((prev) => [data, ...prev]);
    return data;
  };

  const updateClase = async (id, values) => {
    const { recalc, es_extra, ...cleanValues } = values;

    if (es_extra !== undefined && cleanValues.es_adicional === undefined) {
      cleanValues.es_adicional = Boolean(es_extra);
    }

    let finalValues = { ...cleanValues };

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
      'es_externa',
      'descripcion_externa',
      'tarifa_id',
    ]);

    const sanitizedPayload = {};
    for (const [key, val] of Object.entries(finalValues)) {
      if (ALLOWED_COLUMNS.has(key)) {
        sanitizedPayload[key] = val;
      }
    }

    // ── Modo local (IndexedDB) ────────────────────────────────────────────────
    if (isOffline) {
      const claseExistente = await localDb.clases.get(id);
      if (!claseExistente) throw new Error('Clase no encontrada.');

      let precio_cobrado = cleanValues.precio_cobrado !== undefined
        ? cleanValues.precio_cobrado
        : claseExistente.precio_cobrado;

      if (recalc) {
        const grupoId = cleanValues.grupo_id || claseExistente.grupo_id;
        const grupo = await localDb.grupos.get(grupoId);
        const tarifa = grupo?.tarifa_id ? await localDb.tarifas.get(grupo.tarifa_id) : null;
        if (tarifa) {
          const esAdicional = cleanValues.es_adicional !== undefined
            ? cleanValues.es_adicional
            : claseExistente.es_adicional;
          precio_cobrado = esAdicional ? tarifa.precio_extra : tarifa.precio_regular;
        }
      }

      const updatedClase = {
        ...claseExistente,
        ...sanitizedPayload,
        ...(recalc ? { precio_cobrado } : {}),
        id,
        user_id: currentUserId,
      };
      await localDb.clases.put(updatedClase);

      // grupo_id may be null for external extras — handle gracefully
      const grupoEnriquecido = updatedClase.grupo_id != null
        ? await localDb.grupos.get(updatedClase.grupo_id)
        : null;
      const tarifaEnriquecida = grupoEnriquecido?.tarifa_id
        ? await localDb.tarifas.get(grupoEnriquecido.tarifa_id)
        : null;
      const enriched = {
        ...updatedClase,
        grupos: grupoEnriquecido ? { ...grupoEnriquecido, tarifas: tarifaEnriquecida || null } : null,
      };

      clasesCache.clear();
      setClases((prev) => prev.map((c) => (c.id === id ? enriched : c)));
      return enriched;
    }

    // ── Modo online (Supabase) ────────────────────────────────────────────────
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

      sanitizedPayload.precio_cobrado = precio_cobrado;
    }

    const { data, error: err } = await supabase
      .from('clases')
      .update(sanitizedPayload)
      .eq('id', id)
      .select(SELECT_CLASES_OPTIMIZADO)
      .single();
    if (err) throw new Error(err.message);

    clasesCache.clear();
    setClases((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteClase = async (id) => {
    if (isOffline) {
      await localDb.clases.delete(id);
      clasesCache.clear();
      setClases((prev) => prev.filter((c) => c.id !== id));
      return;
    }

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
    aplazarClasesMasivo,
  };
}
