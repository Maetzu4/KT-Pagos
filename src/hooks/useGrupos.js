import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { localDb, generateLocalId } from '../lib/localDb';
import { parseISO, addDays, formatISO } from '../lib/dateUtils';
import { generarClasesParaGrupo } from '../lib/generadorClases';

// Caché en memoria para evitar re-fetches innecesarios entre navegaciones
let gruposCache = null;
let gruposCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1 minuto de validez

// El estado de cada grupo se lee directamente desde la columna `estado` de la BD (V2).

const SELECT_GRUPOS = `
  id, nombre_grupo, estado,
  id_externo, fecha_inicio_grupo, horario,
  link_bo, curso_codigo, curso_nombre,
  duracion_minutos, lecciones_totales,
  tarifa_id, user_id, leccion_inicio_cobro
`;

export function useGrupos() {
  const { isOffline, user } = useAuth();
  const currentUserId = user?.id || 'local-user';

  const [grupos, setGrupos] = useState(() => gruposCache || []);
  const [loading, setLoading] = useState(() => !gruposCache);
  const [error, setError] = useState(null);

  const fetchGrupos = useCallback(async (force = false) => {
    // ── Modo local (IndexedDB) ────────────────────────────────────────────────
    if (isOffline) {
      setLoading(true);
      setError(null);
      try {
        const data = await localDb.grupos
          .where('user_id')
          .equals(currentUserId)
          .toArray();
        data.sort((a, b) => (a.nombre_grupo ?? '').localeCompare(b.nombre_grupo ?? ''));
        setGrupos(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Modo online (Supabase) ────────────────────────────────────────────────
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

    const onlineUser = await getCurrentUser();
    if (!onlineUser) {
      setGrupos([]);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('grupos')
      .select(SELECT_GRUPOS)
      .eq('user_id', onlineUser.id)
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
  }, [isOffline, currentUserId]);

  useEffect(() => { fetchGrupos(); }, [fetchGrupos]);

  // ── CREATE ────────────────────────────────────────────────────────────────
  const createGrupo = async (values) => {
    const { link_whatsapp, ...cleanPayload } = values || {};

    if (isOffline) {
      const id = generateLocalId();
      const newGrupo = { id, user_id: currentUserId, ...cleanPayload };
      await localDb.grupos.put(newGrupo);

      // Generar clases localmente si aplica
      if (newGrupo.fecha_inicio_grupo && (newGrupo.lecciones_totales ?? 0) > 0) {
        const clases = generarClasesParaGrupo({ ...newGrupo });
        for (const clase of clases) {
          await localDb.clases.put({ ...clase, id: generateLocalId(), user_id: currentUserId });
        }
      }

      setGrupos((prev) => {
        const updated = [...prev, newGrupo].sort(
          (a, b) => (a.nombre_grupo ?? '').localeCompare(b.nombre_grupo ?? '')
        );
        return updated;
      });
      return newGrupo;
    }

    const { data: { user: sbUser } } = await supabase.auth.getUser();
    const payload = {
      ...cleanPayload,
      user_id: cleanPayload.user_id ?? sbUser?.id ?? null,
    };

    const { data, error: err } = await supabase
      .from('grupos')
      .insert([payload])
      .select(SELECT_GRUPOS)
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

  // ── UPDATE ────────────────────────────────────────────────────────────────
  const updateGrupo = async (id, values) => {
    const { link_whatsapp, created_at, ...cleanPayload } = values || {};

    // ── Modo local (IndexedDB) ──────────────────────────────────────────────
    if (isOffline) {
      const grupoOriginal = await localDb.grupos.get(id);
      if (!grupoOriginal) throw new Error('Grupo no encontrado en la base de datos local.');

      const updatedGrupo = { ...grupoOriginal, ...cleanPayload, id, user_id: currentUserId };
      await localDb.grupos.put(updatedGrupo);

      const fechaOriginalStr = grupoOriginal.fecha_inicio_grupo
        ? String(grupoOriginal.fecha_inicio_grupo).split('T')[0]
        : null;
      const fechaNuevaStr = cleanPayload.fecha_inicio_grupo !== undefined
        ? (cleanPayload.fecha_inicio_grupo ? String(cleanPayload.fecha_inicio_grupo).split('T')[0] : null)
        : fechaOriginalStr;

      const leccionesOriginales = grupoOriginal.lecciones_totales != null
        ? Number(grupoOriginal.lecciones_totales) : null;
      const leccionesNuevas = cleanPayload.lecciones_totales !== undefined
        ? (cleanPayload.lecciones_totales != null ? Number(cleanPayload.lecciones_totales) : null)
        : leccionesOriginales;

      const huboCambios = (fechaNuevaStr !== fechaOriginalStr) ||
        (leccionesNuevas !== leccionesOriginales && leccionesNuevas != null);

      // Recalcular clases locales si la fecha o lecciones cambiaron
      if (huboCambios && fechaNuevaStr && leccionesNuevas != null) {
        // Eliminar clases programadas del grupo
        const clasesActuales = await localDb.clases
          .where('grupo_id')
          .equals(id)
          .toArray();
        const programadas = clasesActuales.filter((c) => c.estado_clase === 'Programada');
        for (const c of programadas) {
          await localDb.clases.delete(c.id);
        }

        const completadas = clasesActuales
          .filter((c) => c.estado_clase === 'Completada')
          .sort((a, b) => (a.fecha_clase ?? '').localeCompare(b.fecha_clase ?? ''));

        const cantidadCompletadas = completadas.length;
        const clasesFaltantes = leccionesNuevas - cantidadCompletadas;

        if (clasesFaltantes > 0) {
          let fechaCursor;
          if (cantidadCompletadas > 0 && completadas[completadas.length - 1]?.fecha_clase) {
            const ultimaFechaStr = String(completadas[completadas.length - 1].fecha_clase).split('T')[0];
            fechaCursor = addDays(parseISO(ultimaFechaStr), 7);
          } else {
            fechaCursor = parseISO(fechaNuevaStr);
          }

          const inicioCobro = (updatedGrupo.leccion_inicio_cobro != null && updatedGrupo.leccion_inicio_cobro >= 1)
            ? Number(updatedGrupo.leccion_inicio_cobro) : 1;
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);

          for (let i = 0; i < clasesFaltantes; i++) {
            const numLeccion = cantidadCompletadas + i + 1;
            const fechaClaseStr = formatISO(fechaCursor);
            const esHeredada = numLeccion < inicioCobro;
            const estadoCalculado = esHeredada
              ? 'Transferida'
              : (parseISO(fechaClaseStr) < hoy ? 'Completada' : 'Programada');

            await localDb.clases.put({
              id: generateLocalId(),
              grupo_id: id,
              user_id: currentUserId,
              fecha_clase: fechaClaseStr,
              estado_clase: estadoCalculado,
              es_adicional: false,
              tema_clase: `Lección ${numLeccion}`,
              nombre_clase: `Lección ${numLeccion}`,
              precio_cobrado: esHeredada ? 0 : null,
              periodo_id: null,
            });

            fechaCursor = addDays(fechaCursor, 7);
          }
        }
      }

      setGrupos((prev) => {
        const updated = prev.map((g) => (g.id === id ? updatedGrupo : g));
        return updated;
      });
      return updatedGrupo;
    }

    // ── Modo online (Supabase) ──────────────────────────────────────────────

    // 1. Detección de Cambios: Fetch del grupo original
    const { data: grupoOriginal, error: fetchErr } = await supabase
      .from('grupos')
      .select('id, fecha_inicio_grupo, lecciones_totales, user_id, leccion_inicio_cobro')
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

    const inicioCobro_original = grupoOriginal?.leccion_inicio_cobro != null
      ? Number(grupoOriginal.leccion_inicio_cobro)
      : 1;
    const inicioCobro_nuevo = cleanPayload.leccion_inicio_cobro !== undefined
      ? Number(cleanPayload.leccion_inicio_cobro) || 1
      : inicioCobro_original;

    const cambioFecha    = cleanPayload.fecha_inicio_grupo !== undefined && fechaNuevaStr !== fechaOriginalStr;
    const cambioLecciones = cleanPayload.lecciones_totales !== undefined && leccionesNuevas !== leccionesOriginales;
    const cambioInicioCobro = inicioCobro_nuevo !== inicioCobro_original;
    const huboCambios = cambioFecha || cambioLecciones;

    // Actualizar el grupo en Supabase
    const { data, error: err } = await supabase
      .from('grupos')
      .update(cleanPayload)
      .eq('id', id)
      .select(SELECT_GRUPOS)
      .single();
    if (err) throw new Error(err.message);

    // ── 2a. Actualización retroactiva cuando leccion_inicio_cobro cambió ──────
    if (cambioInicioCobro) {
      const { data: todasClases, error: tErr } = await supabase
        .from('clases')
        .select('id, estado_clase, precio_cobrado')
        .eq('grupo_id', id)
        .eq('es_adicional', false)
        .order('fecha_clase', { ascending: true });
      if (tErr) throw new Error(tErr.message);

      const clasesOrdenadas = todasClases || [];

      const aTransferir = clasesOrdenadas
        .slice(0, inicioCobro_nuevo - 1)
        .filter((c) => c.estado_clase !== 'Transferida' || c.precio_cobrado !== 0)
        .map((c) => c.id);

      const aRestaurar = clasesOrdenadas
        .slice(inicioCobro_nuevo - 1)
        .filter((c) => c.estado_clase === 'Transferida')
        .map((c) => c.id);

      // Marcar heredadas: Transferida + $0
      if (aTransferir.length > 0) {
        const { error: tfrErr } = await supabase
          .from('clases')
          .update({ estado_clase: 'Transferida', precio_cobrado: 0 })
          .in('id', aTransferir);
        if (tfrErr) throw new Error(tfrErr.message);
      }

      // Restaurar clases que ya no son heredadas: Programada/Completada según fecha
      if (aRestaurar.length > 0) {
        const hoyRest = new Date();
        hoyRest.setHours(0, 0, 0, 0);

        const { data: filasARestaurar, error: frErr } = await supabase
          .from('clases')
          .select('id, fecha_clase')
          .in('id', aRestaurar);
        if (frErr) throw new Error(frErr.message);

        for (const fila of filasARestaurar || []) {
          const fechaObj = new Date(`${String(fila.fecha_clase).split('T')[0]}T12:00:00`);
          const estadoRestaurado = fechaObj < hoyRest ? 'Completada' : 'Programada';
          const { error: rErr } = await supabase
            .from('clases')
            .update({ estado_clase: estadoRestaurado, precio_cobrado: null })
            .eq('id', fila.id);
          if (rErr) throw new Error(rErr.message);
        }
      }
    }

    // 2b. Recálculo inteligente (solo si la fecha de inicio o las lecciones totales cambiaron)
    if (huboCambios && fechaNuevaStr && leccionesNuevas != null) {
      const { error: delErr } = await supabase
        .from('clases')
        .delete()
        .eq('grupo_id', id)
        .eq('estado_clase', 'Programada');
      if (delErr) throw new Error(delErr.message);

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
        let fechaCursor;
        if (cantidadCompletadas > 0 && clasesCompletadas[0]?.fecha_clase) {
          const ultimaFechaStr = String(clasesCompletadas[0].fecha_clase).split('T')[0].split(' ')[0];
          fechaCursor = addDays(parseISO(ultimaFechaStr), 7);
        } else {
          fechaCursor = parseISO(fechaNuevaStr);
        }

        const { data: { user: sbUser } } = await supabase.auth.getUser();
        const userId = sbUser?.id ?? cleanPayload.user_id ?? data?.user_id ?? grupoOriginal?.user_id ?? null;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const inicioCobro = (data?.leccion_inicio_cobro != null && data.leccion_inicio_cobro >= 1)
          ? Number(data.leccion_inicio_cobro)
          : 1;

        const nuevasClases = [];
        for (let i = 0; i < clasesFaltantes; i++) {
          const numLeccion = cantidadCompletadas + i + 1;
          const fechaClaseStr = formatISO(fechaCursor);
          const fechaObj = parseISO(fechaClaseStr);
          const esHeredada = numLeccion < inicioCobro;
          const estadoCalculado = esHeredada ? 'Transferida' : (fechaObj < hoy ? 'Completada' : 'Programada');

          nuevasClases.push({
            grupo_id: id,
            user_id: userId,
            fecha_clase: fechaClaseStr,
            estado_clase: estadoCalculado,
            es_adicional: false,
            tema_clase: `Lección ${numLeccion}`,
            nombre_clase: `Lección ${numLeccion}`,
            precio_cobrado: esHeredada ? 0 : null,
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

  // ── DELETE ────────────────────────────────────────────────────────────────
  const deleteGrupo = async (id) => {
    if (isOffline) {
      // Eliminar clases asociadas primero para no dejar huérfanos
      const clasesDelGrupo = await localDb.clases.where('grupo_id').equals(id).toArray();
      for (const c of clasesDelGrupo) {
        await localDb.clases.delete(c.id);
      }
      await localDb.grupos.delete(id);
      setGrupos((prev) => prev.filter((g) => g.id !== id));
      return;
    }

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
