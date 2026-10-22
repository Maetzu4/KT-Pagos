import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { parseISO, startOfMonth, endOfMonth, formatISO, nombrePeriodo } from '../lib/dateUtils';

/** Obtiene el precio efectivo de una clase V2 */
export const getPrecioClase = (c) => {
  if (c?.estado_clase === 'Cancelada') return 0;
  return Number(c?.precio_cobrado ?? c?.grupos?.tarifas?.precio_regular ?? 0);
};

export function usePeriodos() {
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPeriodos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch a clases donde estado_clase === 'Completada' trayendo grupos y tarifas
      const [
        { data: clasesData, error: clasesErr },
        { data: periodosData, error: periodosErr },
      ] = await Promise.all([
        supabase
          .from('clases')
          .select(`
            id,
            fecha_clase,
            estado_clase,
            precio_cobrado,
            en_reclamo,
            tema_clase,
            nombre_clase,
            es_adicional,
            grupo_id,
            grupos (
              id,
              nombre_grupo,
              tarifa_id,
              tarifas (
                id,
                duracion_minutos,
                precio_regular,
                precio_extra
              )
            )
          `)
          .eq('estado_clase', 'Completada')
          .order('fecha_clase', { ascending: false }),

        supabase
          .from('periodos')
          .select('id, user_id, mes, anio, key_periodo, pagado_real, notas_reclamo, arrastrado, requisitos_bono, r1_grado, r2_grado, r3_grado')
          .order('key_periodo', { ascending: false }),
      ]);

      if (clasesErr) throw new Error(clasesErr.message);
      if (periodosErr) throw new Error(periodosErr.message);

      const clasesCompletadas = clasesData || [];
      const periodosRegistrados = periodosData || [];

      // Mapear periodos de BD por key_periodo
      const periodosBDPorKey = new Map();
      for (const p of periodosRegistrados) {
        if (p.key_periodo) {
          periodosBDPorKey.set(p.key_periodo, p);
        }
      }

      // 2. Agrupar clases completadas por fecha creando key_periodo (YYYY-MM)
      const periodosMap = new Map();

      for (const c of clasesCompletadas) {
        if (!c.fecha_clase) continue;
        const key_periodo = c.fecha_clase.slice(0, 7); // 'YYYY-MM'

        if (!periodosMap.has(key_periodo)) {
          const [anio, mes] = key_periodo.split('-');
          const fechaRef = parseISO(`${key_periodo}-01`);
          const inicio = startOfMonth(fechaRef);
          const fin = endOfMonth(fechaRef);

          periodosMap.set(key_periodo, {
            id: null,
            key_periodo,
            key: key_periodo,
            mes,
            anio,
            fecha_inicio: formatISO(inicio),
            fecha_fin: formatISO(fin),
            nombre_periodo: nombrePeriodo(inicio),
            clases: [],
            pagado_real: 0,
            notas_reclamo: '',
            arrastrado: 0,
            user_id: null,
            existeEnBD: false,
            requisitos_bono: false,
            r1_grado: 'none',
            r2_grado: 'none',
            r3_grado: 'none',
          });
        }
        periodosMap.get(key_periodo).clases.push(c);
      }

      // Incluir también periodos de la BD que no tengan clases completadas
      for (const p of periodosRegistrados) {
        const key = p.key_periodo;
        if (!key) continue;

        if (!periodosMap.has(key)) {
          const anio = p.anio || key.split('-')[0];
          const mes = p.mes || key.split('-')[1];
          const fechaRef = parseISO(`${key}-01`);
          const inicio = startOfMonth(fechaRef);
          const fin = endOfMonth(fechaRef);

          periodosMap.set(key, {
            id: p.id,
            key_periodo: key,
            key,
            mes,
            anio,
            fecha_inicio: formatISO(inicio),
            fecha_fin: formatISO(fin),
            nombre_periodo: nombrePeriodo(inicio),
            clases: [],
            pagado_real: Number(p.pagado_real) || 0,
            notas_reclamo: p.notas_reclamo || '',
            arrastrado: Number(p.arrastrado) || 0,
            user_id: p.user_id,
            existeEnBD: true,
            requisitos_bono: p.requisitos_bono ?? false,
            r1_grado: p.r1_grado || 'none',
            r2_grado: p.r2_grado || 'none',
            r3_grado: p.r3_grado || 'none',
          });
        }
      }

      // 3. Cruzar datos: Si existe en periodos de la BD, mezclarlos; si no, virtual con pagado_real = 0
      for (const [key_periodo, virtual] of periodosMap.entries()) {
        const bdRecord = periodosBDPorKey.get(key_periodo);
        if (bdRecord) {
          virtual.id = bdRecord.id;
          virtual.pagado_real = Number(bdRecord.pagado_real) || 0;
          virtual.notas_reclamo = bdRecord.notas_reclamo || '';
          virtual.arrastrado = Number(bdRecord.arrastrado) || 0;
          virtual.user_id = bdRecord.user_id;
          virtual.existeEnBD = true;
          virtual.requisitos_bono = bdRecord.requisitos_bono ?? false;
          virtual.r1_grado = bdRecord.r1_grado || 'none';
          virtual.r2_grado = bdRecord.r2_grado || 'none';
          virtual.r3_grado = bdRecord.r3_grado || 'none';
          if (bdRecord.mes) virtual.mes = bdRecord.mes;
          if (bdRecord.anio) virtual.anio = bdRecord.anio;
        } else {
          virtual.id = `virtual-${key_periodo}`;
          virtual.pagado_real = 0;
          virtual.notas_reclamo = '';
          virtual.arrastrado = 0;
          virtual.existeEnBD = false;
          virtual.requisitos_bono = false;
          virtual.r1_grado = 'none';
          virtual.r2_grado = 'none';
          virtual.r3_grado = 'none';
        }
      }

      // 4. Calcular Total Estimado y Deuda por Reclamos (con lógica de bono)
      const gradeMultiplier = (grade) => {
        if (grade === 'good') return 0.05;
        if (grade === 'amazing') return 0.10;
        return 0;
      };

      const listaBase = Array.from(periodosMap.values()).map((p) => {
        const clases = p.clases || [];

        // Separar ingresos regulares y extras (excluyendo Canceladas)
        const ingresos_regulares = clases
          .filter((c) => !c.es_adicional && c.estado_clase !== 'Cancelada')
          .reduce((s, c) => Number(s) + Number(getPrecioClase(c)), 0);

        const ingresos_extras = clases
          .filter((c) => c.es_adicional && c.estado_clase !== 'Cancelada')
          .reduce((s, c) => Number(s) + Number(getPrecioClase(c)), 0);

        // Calcular multiplicador de bono
        const multiplicador_bono = p.requisitos_bono
          ? gradeMultiplier(p.r1_grado) + gradeMultiplier(p.r2_grado) + gradeMultiplier(p.r3_grado)
          : 0;

        const monto_bono = ingresos_regulares * multiplicador_bono;
        const estimado_real = ingresos_regulares + ingresos_extras + monto_bono;

        const deuda_reclamos = clases
          .filter((c) => c.en_reclamo)
          .reduce((s, c) => Number(s) + Number(getPrecioClase(c)), 0);

        return {
          ...p,
          ingresos_regulares,
          ingresos_extras,
          multiplicador_bono,
          monto_bono,
          estimado_real,
          deuda_reclamos,
        };
      });

      // 5. Calcular Arrastre de Deuda (Rollover) en orden cronológico ASC
      const cronologico = [...listaBase].sort((a, b) =>
        a.key_periodo.localeCompare(b.key_periodo)
      );

      const hoyDia = new Date().getDate();
      const esDeudaArrastradaActiva = hoyDia > 15;
      const hoyISO = formatISO(new Date());

      const idxActual = cronologico.findLastIndex(
        (p) => p.fecha_inicio <= hoyISO && p.fecha_fin >= hoyISO
      );

      let deuda_acumulada = 0;
      const enriched = cronologico.map((p, i) => {
        const esPeriodoActual = i === idxActual;
        const aplicarArrastre = !esPeriodoActual || esDeudaArrastradaActiva;

        const deuda_anterior = deuda_acumulada;
        const total_a_cobrar = p.estimado_real + (aplicarArrastre ? deuda_anterior : 0);
        const deuda_resuelta = deuda_anterior > 0 && (p.pagado_real || 0) >= total_a_cobrar;
        const error_pago = (p.pagado_real || 0) - total_a_cobrar;

        const estado_deuda_anterior = deuda_anterior === 0
          ? 'al_dia'
          : (esDeudaArrastradaActiva && esPeriodoActual ? 'atrasado' : 'pendiente');

        // La deuda para el SIGUIENTE mes es lo que quedó sin pagar del total de este mes
        deuda_acumulada = Math.max(0, total_a_cobrar - (p.pagado_real || 0));

        return {
          ...p,
          deuda_anterior,
          total_a_cobrar,
          deuda_resuelta,
          error_pago,
          estado_deuda_anterior,
        };
      });

      // Guardar en orden DESC (más reciente primero)
      setPeriodos([...enriched].reverse());
    } catch (err) {
      console.error('Error cargando periodos en Finanzas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriodos();
  }, [fetchPeriodos]);

  /**
   * Guardado Inteligente (Upsert):
   * Recibe el objeto del periodo (que ya trae mes, anio, y key_periodo desde React).
   * Hace un upsert en la tabla periodos usando key_periodo como llave de conflicto.
   * Guarda solo los campos financieros: user_id, mes, anio, key_periodo, pagado_real, notas_reclamo.
   */
  const savePeriodoFinanciero = async (periodoData, values) => {
    const { data: { user } } = await supabase.auth.getUser();

    const key_periodo = periodoData.key_periodo || periodoData.key || (periodoData.fecha_inicio ? periodoData.fecha_inicio.slice(0, 7) : null);
    if (!key_periodo) {
      throw new Error('key_periodo no válido para el periodo.');
    }

    const [anioCalculado, mesCalculado] = key_periodo.split('-');
    const anio = String(periodoData.anio || anioCalculado);
    const mes = String(periodoData.mes || mesCalculado);

    const pagado_real = parseFloat(values.pagado_real) || 0;
    const notas_reclamo = values.notas_reclamo ?? periodoData.notas_reclamo ?? '';

    const payload = {
      user_id: user?.id ?? periodoData.user_id ?? null,
      mes,
      anio,
      key_periodo,
      pagado_real,
      notas_reclamo,
      requisitos_bono: values.requisitos_bono ?? periodoData.requisitos_bono ?? false,
      r1_grado: values.r1_grado ?? periodoData.r1_grado ?? 'none',
      r2_grado: values.r2_grado ?? periodoData.r2_grado ?? 'none',
      r3_grado: values.r3_grado ?? periodoData.r3_grado ?? 'none',
    };

    const { data, error: err } = await supabase
      .from('periodos')
      .upsert(payload, { onConflict: 'key_periodo' })
      .select()
      .single();

    if (err) throw new Error(err.message);
    await fetchPeriodos();
    return data;
  };

  /**
   * upsertPeriodo: guarda los campos de bonos (y opcionalmente financieros) de un periodo.
   * Acepta el objeto completo del periodo con los campos actualizados.
   */
  const upsertPeriodo = async (periodoData, extraValues = {}) => {
    return savePeriodoFinanciero(periodoData, {
      pagado_real: periodoData.pagado_real,
      notas_reclamo: periodoData.notas_reclamo,
      requisitos_bono: periodoData.requisitos_bono,
      r1_grado: periodoData.r1_grado,
      r2_grado: periodoData.r2_grado,
      r3_grado: periodoData.r3_grado,
      ...extraValues,
    });
  };

  /** Alias para compatibilidad con interfaces existentes */
  const updatePeriodo = async (idOrKeyOrObj, values) => {
    let target = null;
    if (typeof idOrKeyOrObj === 'object' && idOrKeyOrObj !== null) {
      target = idOrKeyOrObj;
    } else {
      target = periodos.find(
        (p) => p.key_periodo === idOrKeyOrObj || p.key === idOrKeyOrObj || p.id === idOrKeyOrObj
      );
    }
    if (!target) {
      throw new Error('Periodo no encontrado');
    }
    return savePeriodoFinanciero(target, values);
  };

  const deletePeriodo = async (idOrKey) => {
    if (String(idOrKey).startsWith('virtual-')) {
      return;
    }
    const target = periodos.find((p) => p.id === idOrKey || p.key_periodo === idOrKey);
    const id = target?.id && !String(target.id).startsWith('virtual-') ? target.id : null;
    if (!id) return;

    const { error: err } = await supabase.from('periodos').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setPeriodos((prev) => prev.filter((p) => p.id !== id));
  };

  // Periodo del mes actual
  const hoyISO = formatISO(new Date());
  const periodoActual = periodos.find((p) => {
    return p.fecha_inicio <= hoyISO && p.fecha_fin >= hoyISO;
  });

  // Periodo del mes anterior
  const periodoAnterior = (() => {
    if (!periodoActual) return periodos[0] || null;
    const idx = periodos.findIndex(
      (p) => p.key_periodo === periodoActual.key_periodo || p.id === periodoActual.id
    );
    return periodos[idx + 1] || null;
  })();

  const totalEstimado = periodos.reduce((s, p) => s + (p.total_a_cobrar ?? p.estimado_real ?? 0), 0);
  const totalCobrado = periodos.reduce((s, p) => s + (p.pagado_real ?? 0), 0);
  const totalDeuda = periodos.reduce((s, p) => s + (p.deuda_reclamos ?? 0), 0);
  const totalRollover = periodos.reduce((s, p) => s + (p.deuda_anterior ?? 0), 0);

  const metricas = {
    totalEstimado,
    totalCobrado,
    totalPagado: totalCobrado,
    totalDeuda,
    totalRollover,
  };

  return {
    periodos,
    loading,
    error,
    refetch: fetchPeriodos,
    updatePeriodo,
    savePeriodoFinanciero,
    upsertPeriodo,
    deletePeriodo,
    periodoActual,
    periodoAnterior,
    metricas,
  };
}
