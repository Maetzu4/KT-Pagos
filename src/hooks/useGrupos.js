import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';
import { parseISO, addDays, formatISO } from '../lib/dateUtils';
import { generarClasesParaGrupo } from '../lib/generadorClases';

// Caché en memoria para evitar re-fetches innecesarios entre navegaciones
let gruposCache = null;
let gruposCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1 minuto de validez

// El estado de cada grupo se lee directamente desde la columna `estado` de la BD (V2).

export function useGrupos() {
  const [grupos, setGrupos] = useState(() => gruposCache || []);
  const [loading, setLoading] = useState(() => !gruposCache);
  const [error, setError] = useState(null);

  const fetchGrupos = useCallback(async (force = false) => {
    // Si la caché está viva y no es una recarga forzada, no volvemos a consultar
    if (!force && gruposCache && (Date.now() - gruposCacheTime < CACHE_TTL_MS)) {
      setGrupos(gruposCache);
      setLoading(false);
      return;
    }

    if (!gruposCache) {
      setLoading(true);
    }
    setError(null);

    const user = await getCurrentUser();
    if (!user) {
      setGrupos([]);
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('grupos')
      .select(`
        id, nombre_grupo, estado,
        id_externo, fecha_inicio_grupo, horario,
        link_bo, curso_codigo, curso_nombre,
        duracion_minutos, lecciones_totales,
        tarifa_id, user_id
      `)
      .eq('user_id', user.id)
      .order('nombre_grupo', { ascending: true });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    gruposCache = data || [];
    gruposCacheTime = Date.now();
    setGrupos(gruposCache);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGrupos(); }, [fetchGrupos]);

  const createGrupo = async (values) => {
    const { link_whatsapp, ...cleanPayload } = values || {};
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      ...cleanPayload,
      user_id: cleanPayload.user_id ?? user?.id ?? null,
    };

    const { data, error: err } = await supabase
      .from('grupos')
      .insert([payload])
      .select(`
        id, nombre_grupo, estado,
        id_externo, fecha_inicio_grupo, horario,
        link_bo, curso_codigo, curso_nombre,
        duracion_minutos, lecciones_totales,
        tarifa_id, user_id
      `)
      .single();
    if (err) throw new Error(err.message);

    if (data?.fecha_inicio_grupo && data?.lecciones_totales > 0) {
      const clases = generarClasesParaGrupo(data);
      if (clases.length > 0) {
        const { error: insErr } = await supabase.from('clases').insert(clases);
        if (insErr) throw new Error(insErr.message);
      }
    }

    setGrupos((prev) => {
      const updated = [...prev, data];
      gruposCache = updated;
      gruposCacheTime = Date.now();
      return updated;
    });
    return data;
  };

  const updateGrupo = async (id, values) => {
    const { link_whatsapp, created_at, ...cleanPayload } = values || {};

    // 1. Detección de Cambios: Fetch del grupo original
    const { data: grupoOriginal, error: fetchErr } = await supabase
      .from('grupos')
      .select('id, fecha_inicio_grupo, lecciones_totales, user_id')
      .eq('id', id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const fechaOriginalStr = grupoOriginal?.fecha_inicio_grupo
      ? String(grupoOriginal.fecha_inicio_grupo).split('T')[0].split(' ')[0]
      : null;
    const fechaNuevaStr = cleanPayload.fecha_inicio_grupo !== undefined
      ? (cleanPayload.fecha_inicio_grupo ? String(cleanPayload.fecha_inicio_grupo).split('T')[0].split(' ')[0] : null)
      : fechaOriginalStr;

    const leccionesOriginales = grupoOriginal?.lecciones_totales != null
      ? Number(grupoOriginal.lecciones_totales)
      : null;
    const leccionesNuevas = cleanPayload.lecciones_totales !== undefined
      ? (cleanPayload.lecciones_totales != null ? Number(cleanPayload.lecciones_totales) : null)
      : leccionesOriginales;

    const cambioFecha = cleanPayload.fecha_inicio_grupo !== undefined && fechaNuevaStr !== fechaOriginalStr;
    const cambioLecciones = cleanPayload.lecciones_totales !== undefined && leccionesNuevas !== leccionesOriginales;
    const huboCambios = cambioFecha || cambioLecciones;

    // Actualizar el grupo en Supabase
    const { data, error: err } = await supabase
      .from('grupos')
      .update(cleanPayload)
      .eq('id', id)
      .select(`
        id, nombre_grupo, estado,
        id_externo, fecha_inicio_grupo, horario,
        link_bo, curso_codigo, curso_nombre,
        duracion_minutos, lecciones_totales,
        tarifa_id, user_id
      `)
      .single();
    if (err) throw new Error(err.message);

    // 2. Recálculo inteligente (solo si la fecha de inicio o las lecciones totales cambiaron)
    if (huboCambios && fechaNuevaStr && leccionesNuevas != null) {
      // Eliminar todas las clases programadas existentes de este grupo
      const { error: delErr } = await supabase
        .from('clases')
        .delete()
        .eq('grupo_id', id)
        .eq('estado_clase', 'Programada');
      if (delErr) throw new Error(delErr.message);

      // Consultar clases completadas para saber cuántas lecciones ya se impartieron y la última fecha
      const { data: clasesCompletadas, error: compErr } = await supabase
        .from('clases')
        .select('id, fecha_clase, tema_clase')
        .eq('grupo_id', id)
        .eq('estado_clase', 'Completada')
        .order('fecha_clase', { ascending: false });
      if (compErr) throw new Error(compErr.message);

      const cantidadCompletadas = (clasesCompletadas || []).length;
      const clasesFaltantes = leccionesNuevas - cantidadCompletadas;

      if (clasesFaltantes > 0) {
        // Determinar fecha de arranque
        let fechaCursor;
        if (cantidadCompletadas > 0 && clasesCompletadas[0]?.fecha_clase) {
          const ultimaFechaStr = String(clasesCompletadas[0].fecha_clase).split('T')[0].split(' ')[0];
          fechaCursor = addDays(parseISO(ultimaFechaStr), 7);
        } else {
          fechaCursor = parseISO(fechaNuevaStr);
        }

        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? cleanPayload.user_id ?? data?.user_id ?? grupoOriginal?.user_id ?? null;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const nuevasClases = [];
        for (let i = 0; i < clasesFaltantes; i++) {
          const numLeccion = cantidadCompletadas + i + 1;
          const fechaClaseStr = formatISO(fechaCursor);
          const fechaObj = parseISO(fechaClaseStr);
          const estadoCalculado = fechaObj < hoy ? 'Completada' : 'Programada';

          nuevasClases.push({
            grupo_id: id,
            user_id: userId,
            fecha_clase: fechaClaseStr,
            estado_clase: estadoCalculado,
            es_adicional: false,
            tema_clase: `Lección ${numLeccion}`,
            nombre_clase: `Lección ${numLeccion}`,
            precio_cobrado: null,
            periodo_id: null,
          });

          fechaCursor = addDays(fechaCursor, 7);
        }

        if (nuevasClases.length > 0) {
          const { error: insErr } = await supabase
            .from('clases')
            .insert(nuevasClases);
          if (insErr) throw new Error(insErr.message);
        }
      }
    }

    setGrupos((prev) => {
      const updated = prev.map((g) => (g.id === id ? data : g));
      gruposCache = updated;
      gruposCacheTime = Date.now();
      return updated;
    });
    return data;
  };

  const deleteGrupo = async (id) => {
    // Eliminar clases asociadas para evitar registros huérfanos en Finanzas y Dashboard
    await supabase.from('clases').delete().eq('grupo_id', id);
    const { error: err } = await supabase.from('grupos').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setGrupos((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      gruposCache = updated;
      gruposCacheTime = Date.now();
      return updated;
    });
  };

  const gruposActivos = grupos.filter((g) => g.estado === 'activo');

  return { grupos, gruposActivos, loading, error, refetch: fetchGrupos, createGrupo, updateGrupo, deleteGrupo };
}
