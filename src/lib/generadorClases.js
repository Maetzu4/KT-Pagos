/**
 * generadorClases.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor que genera el array de clases programadas a partir de un grupo V2.
 *
 * NOTA: tarifa_id pertenece a la tabla `grupos`, NO a `clases`.
 * El payload de cada clase solo lleva las columnas permitidas:
 * grupo_id, user_id, fecha_clase, estado_clase, es_adicional, tema_clase, nombre_clase,
 * omitiendo (o enviando como null) precio_cobrado y periodo_id.
 */

/**
 * Genera el array de payloads listos para insertar en `clases`.
 *
 * @param {object} grupo                    - Fila de la tabla grupos (V2)
 * @param {string} grupo.id                 - UUID del grupo
 * @param {string} [grupo.user_id]          - UUID del propietario
 * @param {string} grupo.fecha_inicio_grupo - 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss' o ISO
 * @param {number} grupo.lecciones_totales  - cantidad de lecciones
 *
 * @returns {object[]} Array síncrono de payloads listos para insertar
 */
export function generarClasesParaGrupo(grupo) {
  const { id: grupo_id, user_id, fecha_inicio_grupo, lecciones_totales } = grupo;

  if (!fecha_inicio_grupo) {
    throw new Error(`El grupo "${grupo.nombre_grupo ?? grupo_id}" no tiene fecha_inicio_grupo.`);
  }
  if (!lecciones_totales || lecciones_totales < 1) {
    throw new Error(`El grupo "${grupo.nombre_grupo ?? grupo_id}" no tiene lecciones_totales válido.`);
  }

  // Extraer 'YYYY-MM-DD' de cualquier formato
  const cleanDateStr = fecha_inicio_grupo.split('T')[0].split(' ')[0];
  let currentDate = new Date(`${cleanDateStr}T12:00:00`);

  if (isNaN(currentDate.getTime())) {
    throw new Error(`fecha_inicio_grupo inválida: "${fecha_inicio_grupo}"`);
  }

  const clases = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let i = 1; i <= lecciones_totales; i++) {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');

    clases.push({
      grupo_id,
      user_id: user_id ?? null,
      fecha_clase: `${y}-${m}-${d}`,
      estado_clase: currentDate < hoy ? 'Completada' : 'Programada',
      es_adicional: false,
      tema_clase: `Lección ${i}`,
      nombre_clase: `Lección ${i}`,
      precio_cobrado: null,
      periodo_id: null,
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return clases;
}
