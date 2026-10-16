import { useState, useEffect } from 'react';
import { ClipboardPaste, CheckCircle2, AlertCircle, Loader2, Upload, ExternalLink, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generarClasesParaGrupo } from '../lib/generadorClases';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const EJEMPLO_JSON = JSON.stringify(
  {
    grupos: [
      {
        idExterno: "PRM_COL12864_MI-18",
        estado: "activo",
        fechaInicio: "2025-03-01",
        horarioTexto: "Mié 18:00",
        linkBO: "https://backoffice.example.com",
        curso: {
          codigo: "MC-LVL2",
          nombre: "Minecraft Education LVL2",
          duracionMinutos: 60,
          leccionesTotales: 24
        }
      }
    ]
  },
  null,
  2
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extrae un string seguro desde distintas formas que puede venir el campo. */
const str = (v) => (v != null ? String(v).trim() : null) || null;

/** Extrae el ID externo del grupo soportando distintas convenciones del JSON. */
const getIdExterno = (g) => str(g?.idExterno ?? g?.id_externo ?? g?.id ?? g?.curso?.id);

/**
 * Abrevia el nombre completo de un curso en una etiqueta corta.
 * Ejemplos:
 *   'Minecraft Education LVL2'          → 'MC LVL2'
 *   'Minecraft Craftforge Intermediate'  → 'Craftforge Int.'
 *   'Inicio de desarrollo Web'           → 'Des. Web'
 *   'Code & Game'                        → 'C&G'
 *   'Minecraft. Secret Level'            → 'Secret Lvl'
 */
function getShortCourseName(name) {
  if (!name) return null;
  const n = name.trim();

  // Patrones específicos en orden de prioridad
  if (/minecraft.*education.*lvl2/i.test(n))          return 'MC LVL2';
  if (/minecraft.*craftforge.*intermediate/i.test(n)) return 'Craftforge Int.';
  if (/minecraft.*secret.*level/i.test(n))            return 'Secret Lvl';
  if (/minecraft/i.test(n)) {
    // Extrae todo lo que viene después de 'Minecraft[ .]'
    const rest = n.replace(/^minecraft[.\s]+/i, '').trim();
    return rest || 'MC';
  }
  if (/inicio.*desarrollo.*web/i.test(n))  return 'Des. Web';
  if (/code\s*&\s*game/i.test(n))          return 'C&G';

  // Fallback: primera letra de cada palabra significativa (>= 3 letras)
  const stopWords = new Set(['de', 'la', 'el', 'los', 'las', 'del', 'y', 'en', 'a']);
  const words = n.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()) && w.length >= 3);
  if (words.length === 0) return n;
  if (words.length === 1) return words[0];
  // Si hay 2 palabras, abreviamos la primera
  return words[0].charAt(0).toUpperCase() + '. ' + words.slice(1).join(' ');
}

/**
 * Extrae el bloque numérico principal de un idExterno.
 * 'PRM_COL12864_MI-18'  → '12864'
 * 'GRP-00042'           → '42'
 * 'ABC'                 → null
 */
function extractNumFromId(idExterno) {
  if (!idExterno) return null;
  // Busca el primer grupo de 3+ dígitos que no esté solo al final de un separador corto
  const match = idExterno.match(/[^\d](\d{4,})|^(\d{4,})/);
  if (match) return match[1] ?? match[2];
  // Fallback: cualquier secuencia numérica
  const m2 = idExterno.match(/\d+/);
  return m2 ? m2[0] : null;
}

/** Mapea un objeto del JSON al payload de la tabla grupos. */
function mapGrupo(g, userId) {
  const shortName = getShortCourseName(g.curso?.nombre ?? null);
  const rawIdExterno = getIdExterno(g);
  const numId     = extractNumFromId(rawIdExterno);
  const nombreGrupo = shortName && numId
    ? `${shortName} #${numId}`
    : shortName ?? rawIdExterno ?? 'Sin nombre';

  return {
    nombre_grupo:       nombreGrupo,
    user_id:            userId,
    estado:             str(g.estado?.toLowerCase()) ?? 'activo',
    id_externo:         rawIdExterno,
    fecha_inicio_grupo: g.fechaInicio ?? g.fecha_inicio_grupo ?? null,
    horario:            str(g.horarioTexto ?? g.horario) ?? null,
    link_bo:            str(g.linkBO ?? g.link_bo)    ?? null,
    curso_codigo:       str(g.curso?.codigo)  ?? null,
    curso_nombre:       str(g.curso?.nombre)  ?? null,
    duracion_minutos:   g.curso?.duracionMinutos  ?? null,
    lecciones_totales:  g.curso?.leccionesTotales ?? null,
  };
}

// ─── Estados del componente ──────────────────────────────────────────────────
const STEP = {
  IDLE:      'idle',
  PREVIEW:   'preview',
  SAVING:    'saving',
  SUCCESS:   'success',
  ERROR:     'error',
};

// ─── Componente principal ────────────────────────────────────────────────────
export function ImportadorJSON() {
  const [step,        setStep]        = useState(STEP.IDLE);
  const [grupos,      setGrupos]      = useState([]);
  const [mensaje,     setMensaje]     = useState('');
  const [results,     setResults]     = useState({ gruposOk: 0, gruposErr: 0, clasesOk: 0, clasesErr: 0, gruposOmitidos: 0 });
  const [showEjemplo, setShowEjemplo] = useState(false);

  /** Permite al usuario editar las lecciones de un grupo antes de guardar. */
  const handleUpdateLecciones = (index, value) => {
    const num = parseInt(value, 10);
    setGrupos((prev) => {
      const next = [...prev];
      // Mutamos una copia del objeto para no perder las demás propiedades del JSON original
      next[index] = {
        ...next[index],
        curso: {
          ...(next[index].curso ?? {}),
          leccionesTotales: isNaN(num) ? null : num,
        },
      };
      return next;
    });
  };

  // ── 1. Leer portapapeles y validar ──────────────────────────────────────
  const handlePegar = async () => {
    setMensaje('');
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) {
        setMensaje('El portapapeles está vacío.');
        setStep(STEP.ERROR);
        return;
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        setMensaje('El contenido del portapapeles no es un JSON válido.');
        setStep(STEP.ERROR);
        return;
      }

      const rawGrupos = Array.isArray(json) ? json : (json?.grupos ?? json?.data ?? json?.groups);
      if (!Array.isArray(rawGrupos) || rawGrupos.length === 0) {
        setMensaje('El JSON no contiene un arreglo de grupos válido.');
        setStep(STEP.ERROR);
        return;
      }

      setGrupos(rawGrupos);
      setStep(STEP.PREVIEW);
    } catch (err) {
      // El usuario denegó el permiso del portapapeles
      setMensaje(
        'No se pudo acceder al portapapeles. Asegúrate de conceder permiso en el navegador.'
      );
      setStep(STEP.ERROR);
    }
  };

  // ── 2. Validación previa + Inserción grupos nuevos + generación de clases ──
  const handleGuardar = async () => {
    setStep(STEP.SAVING);
    setMensaje('');

    try {
      // Obtener user_id de la sesión activa
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setMensaje('No hay sesión activa. Por favor inicia sesión nuevamente.');
        setStep(STEP.ERROR);
        return;
      }

      // ── FASE 0: Validación Previa (Protección contra duplicados) ─────────
      const arrayDeIds = Array.from(
        new Set(
          grupos
            .map((g) => getIdExterno(g))
            .filter(Boolean)
        )
      );

      let setExistentes = new Set();
      if (arrayDeIds.length > 0) {
        const { data: existentes, error: existErr } = await supabase
          .from('grupos')
          .select('id_externo')
          .in('id_externo', arrayDeIds);

        if (existErr) throw new Error(existErr.message);
        setExistentes = new Set(
          (existentes || []).map((e) => e.id_externo).filter(Boolean)
        );
      }

      // Separar el flujo en gruposNuevos y gruposOmitidos
      const gruposNuevos = [];
      const gruposOmitidos = [];

      for (const g of grupos) {
        const idExt = getIdExterno(g);
        if (idExt && setExistentes.has(idExt)) {
          gruposOmitidos.push(g);
        } else {
          gruposNuevos.push(g);
        }
      }

      // Detener tempranamente si todos ya existían
      if (gruposNuevos.length === 0) {
        setResults({
          gruposOk: 0,
          gruposErr: 0,
          clasesOk: 0,
          clasesErr: 0,
          gruposOmitidos: gruposOmitidos.length,
        });
        setMensaje('Todos los grupos importados ya existen en el sistema. No se realizaron cambios.');
        setStep(STEP.SUCCESS);
        return;
      }

      // ── Cargar tarifas ANTES de Fase 1 para el cruce en el insert ─────────
      const { data: tarifasDB, error: tarifasErr } = await supabase
        .from('tarifas')
        .select('id, duracion_minutos')
        .order('duracion_minutos', { ascending: true });

      if (tarifasErr) console.error('Error cargando tarifas:', tarifasErr);
      const tarifas        = tarifasDB ?? [];
      const tarifaFallback = tarifas[0] ?? null;

      // ── FASE 1: Inserción de grupos NUEVOS (con tarifa_id cruzada) ────────
      let gruposOk = 0;
      let gruposErr = 0;
      const erroresGrupos = [];
      const gruposInsertados = [];

      for (const g of gruposNuevos) {
        const payload = mapGrupo(g, user.id);

        // Cruce automático de tarifa por duración del curso
        const tarifaMatch = tarifas.find(t => t.duracion_minutos === g.curso?.duracionMinutos)
          ?? tarifaFallback;
        payload.tarifa_id = tarifaMatch?.id ?? null;

        const conflictCol = payload.id_externo ? 'id_externo' : undefined;
        console.log('Payload grupo nuevo:', payload);

        try {
          let data;
          if (conflictCol) {
            ({ data } = await supabase
              .from('grupos')
              .upsert(payload, { onConflict: conflictCol, ignoreDuplicates: false })
              .select('id, nombre_grupo, user_id, fecha_inicio_grupo, lecciones_totales, horario, duracion_minutos, tarifa_id')
              .throwOnError());
          } else {
            ({ data } = await supabase
              .from('grupos')
              .insert(payload)
              .select('id, nombre_grupo, user_id, fecha_inicio_grupo, lecciones_totales, horario, duracion_minutos, tarifa_id')
              .throwOnError());
          }
          const fila = Array.isArray(data) ? data[0] : data;
          if (fila) gruposInsertados.push(fila);
          gruposOk++;
        } catch (err) {
          console.error('Error insertando grupo:', err);
          gruposErr++;
          erroresGrupos.push(`"${payload.nombre_grupo}": ${err.message}`);
        }
      }

      // ── FASE 2: Generar clases (síncrono) para grupos NUEVOS + bulk insert
      let clasesOk  = 0;
      let clasesErr = 0;
      const erroresClases = [];
      const todasLasClases = [];

      console.log('Iniciando Fase 2: Generación de clases para grupos nuevos');

      for (const grupo of gruposInsertados) {
        if (!grupo.fecha_inicio_grupo || !grupo.lecciones_totales) {
          console.warn(`Grupo "${grupo.nombre_grupo}" omitido: faltan fecha o lecciones.`);
          continue;
        }
        try {
          const lote = generarClasesParaGrupo(grupo);
          console.log(`Clases generadas para "${grupo.nombre_grupo}":`, lote.length);
          todasLasClases.push(...lote);
        } catch (err) {
          console.error(`Error generando clases para "${grupo.nombre_grupo}":`, err);
          clasesErr++;
          erroresClases.push(`"${grupo.nombre_grupo}": ${err.message}`);
        }
      }

      console.log('Total de clases generadas en memoria:', todasLasClases.length);

      if (todasLasClases.length > 0) {
        console.log('Enviando a Supabase...');
        const CHUNK = 100;
        for (let i = 0; i < todasLasClases.length; i += CHUNK) {
          await supabase
            .from('clases')
            .insert(todasLasClases.slice(i, i + CHUNK))
            .throwOnError();
        }
        clasesOk = todasLasClases.length;
        console.log('Clases insertadas correctamente:', clasesOk);
      }

      // ── Resultado final ──────────────────────────────────────────────────
      const omitidosCount = gruposOmitidos.length;
      setResults({ gruposOk, gruposErr, clasesOk, clasesErr, gruposOmitidos: omitidosCount });

      let resumenTexto = `Se añadieron ${gruposOk} grupos nuevos y ${clasesOk} clases.`;
      if (omitidosCount > 0) {
        resumenTexto += ` (${omitidosCount} grupo${omitidosCount > 1 ? 's' : ''} ya existente${omitidosCount > 1 ? 's' : ''} ${omitidosCount > 1 ? 'fueron omitidos' : 'fue omitido'}).`;
      }

      const lineas = [resumenTexto];
      if (gruposErr > 0) lineas.push(`${gruposErr} grupo(s) con error:\n• ${erroresGrupos.join('\n• ')}`);
      if (clasesErr > 0) lineas.push(`${clasesErr} grupo(s) sin clases:\n• ${erroresClases.join('\n• ')}`);
      setMensaje(lineas.join('\n\n'));

      setStep(STEP.SUCCESS);

    } catch (fatalErr) {
      console.error('ERROR FATAL EN GUARDADO:', fatalErr);
      setMensaje(`Error inesperado: ${fatalErr?.message ?? String(fatalErr)}`);
      setStep(STEP.ERROR);
    }
  };

  const handleReiniciar = () => {
    setStep(STEP.IDLE);
    setGrupos([]);
    setMensaje('');
    setResults({ gruposOk: 0, gruposErr: 0, clasesOk: 0, clasesErr: 0, gruposOmitidos: 0 });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <ClipboardPaste size={20} className="text-[var(--accent-color)]" />
          Importar Grupos
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Pega el JSON aquí para sincronizar tus grupos y generar clases automáticamente.
        </p>
      </div>

      {/* ── IDLE ── */}
      {step === STEP.IDLE && (
        <div className="flex flex-col items-center justify-center gap-4 py-10 px-4 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
            <ClipboardPaste size={26} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Pega el JSON aquí para importar tus grupos
            </p>
            <p className="text-xs text-zinc-500">
              Haz clic en el botón para leer el portapapeles y generar clases automáticamente
            </p>
          </div>

          <Button onClick={handlePegar} id="btn-pegar-importar">
            <ClipboardPaste size={15} />
            Pegar e Importar Grupos
          </Button>

          {/* Formato JSON de ejemplo colapsable */}
          <div className="flex flex-col items-center w-full max-w-lg pt-1">
            <button
              type="button"
              onClick={() => setShowEjemplo((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-color)] hover:opacity-80 transition-all font-medium py-1 px-2.5 rounded-lg hover:bg-[var(--accent-color)]/10"
            >
              <Code2 size={13} />
              <span>{showEjemplo ? 'Ocultar formato JSON de ejemplo' : 'Ver formato JSON de ejemplo'}</span>
              {showEjemplo ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showEjemplo && (
              <div className="w-full mt-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 p-3.5 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] text-zinc-400 font-mono">
                  <span>Estructura JSON (1 grupo)</span>
                  <span className="text-[var(--accent-color)]">JSON</span>
                </div>
                <pre className="text-xs font-mono text-zinc-200 overflow-x-auto p-1 leading-relaxed selection:bg-[var(--accent-color)]/30 max-h-56">
                  <code>{EJEMPLO_JSON}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === STEP.ERROR && (
        <div className="space-y-4">
          <div className="flex gap-3 p-4 rounded-xl
                          border border-red-500/20 dark:border-red-500/20
                          bg-red-500/10 dark:bg-red-950/25">
            <AlertCircle size={18} className="text-red-400 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Error</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 whitespace-pre-line">{mensaje}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleReiniciar} id="btn-reiniciar-error">
            Intentar de nuevo
          </Button>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === STEP.PREVIEW && (
        <div className="h-full flex flex-col overflow-hidden gap-3">

          {/* Cabecera fija */}
          <div className="flex items-center justify-between shrink-0">
            <p className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-900 dark:text-white">{grupos.length}</span>{' '}
              grupos detectados &mdash; revisa y edita antes de guardar
            </p>
            <Button variant="ghost" size="sm" onClick={handleReiniciar}>
              Cancelar
            </Button>
          </div>

          {/* Tabla con scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    {['Grupo', 'Horario', 'Estado', 'Lecciones', 'ID Externo', 'Link BO'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {grupos.map((g, i) => {
                    const m = mapGrupo(g, '—');
                    return (
                      <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">

                        {/* Grupo */}
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white whitespace-nowrap max-w-[200px]">
                          <div className="truncate" title={m.nombre_grupo}>{m.nombre_grupo}</div>
                          {m.curso_nombre && (
                            <div className="text-[11px] text-zinc-400 truncate mt-0.5" title={m.curso_nombre}>
                              {m.curso_nombre}
                            </div>
                          )}
                        </td>

                        {/* Horario */}
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                          {m.horario ?? <span className="text-zinc-400 italic">—</span>}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3">
                          <Badge variant={m.estado === 'activo' ? 'activo' : 'default'}>
                            {m.estado ?? '—'}
                          </Badge>
                        </td>

                        {/* Lecciones — editable */}
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={m.lecciones_totales ?? ''}
                            onChange={(e) => handleUpdateLecciones(i, e.target.value)}
                            className="w-16 text-center text-sm rounded-lg
                                       bg-zinc-100 dark:bg-zinc-800
                                       border border-zinc-300 dark:border-zinc-700
                                       text-zinc-900 dark:text-white
                                       px-2 py-1 focus:outline-none
                                       focus:ring-2 focus:ring-[var(--accent-color)]/40
                                       transition-all"
                            placeholder="—"
                          />
                        </td>

                        {/* ID Externo */}
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400 whitespace-nowrap">
                          {m.id_externo ?? <span className="italic">sin ID</span>}
                        </td>

                        {/* Link BO */}
                        <td className="px-4 py-3">
                          {m.link_bo
                            ? <a href={m.link_bo} target="_blank" rel="noreferrer"
                                 className="inline-flex items-center gap-1 text-[var(--accent-color)] hover:underline text-xs">
                                Ver <ExternalLink size={11} />
                              </a>
                            : <span className="text-zinc-400 italic text-xs">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pie fijo */}
          <div className="flex justify-end gap-3 shrink-0 pt-1">
            <Button variant="ghost" onClick={handleReiniciar} id="btn-cancelar-import">
              Cancelar
            </Button>
            <Button onClick={handleGuardar} id="btn-guardar-grupos">
              <Upload size={15} />
              Guardar {grupos.length} grupos + generar clases
            </Button>
          </div>
        </div>
      )}

      {/* ── SAVING ── */}
      {step === STEP.SAVING && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 size={32} className="text-[var(--accent-color)] animate-spin" />
          <p className="text-sm text-zinc-500">Guardando grupos en Supabase…</p>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {step === STEP.SUCCESS && (
        <div className="space-y-4">
          <div className="flex gap-3 p-4 rounded-xl
                          border border-[var(--accent-color)]/30
                          bg-[var(--accent-color)]/10">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-[var(--accent-color)]" />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {results.gruposOk === 0 && (results.gruposOmitidos || 0) > 0
                  ? 'Sin cambios pendientes'
                  : results.gruposErr === 0
                    ? `¡${results.gruposOk} grupos sincronizados!`
                    : `${results.gruposOk} sincronizados, ${results.gruposErr} con error`
                }
              </p>
              {results.clasesOk > 0 && (
                <p className="text-xs text-[var(--accent-color)] opacity-90 mt-0.5 font-medium">
                  {results.clasesOk} clases generadas
                  {results.clasesErr > 0 ? ` · ${results.clasesErr} grupos sin clases` : ''}
                </p>
              )}
              {mensaje && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 whitespace-pre-line">{mensaje}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" onClick={handleReiniciar} id="btn-nueva-importacion">
            Nueva importación
          </Button>
        </div>
      )}
    </div>
  );
}
