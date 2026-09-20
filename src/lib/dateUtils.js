/**
 * Utilidades de fechas ligeras (sin dependencia de date-fns).
 */

/** Parsea una cadena ISO 'YYYY-MM-DD' a Date local (evita problemas de zona horaria). */
export function parseISO(str) {
  if (!str) return new Date(NaN);
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Añade días a una fecha. */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** ¿La fecha a es posterior a la fecha b? */
export function isAfter(a, b) {
  return a.getTime() > b.getTime();
}

/** Obtiene el primer día del mes de una fecha. */
export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Obtiene el último día del mes de una fecha. */
export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Formatea Date a 'YYYY-MM-DD'. */
export function formatISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formatea una fecha para mostrar en UI: 'Ene 2025'. */
export function formatMonthYear(date) {
  return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

/** Formatea una fecha para mostrar: '15 Ene 2025'. */
export function formatDate(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Genera el nombre de periodo: 'Enero 2025'. */
export function nombrePeriodo(date) {
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Calcula la fecha de la próxima clase esperada para un grupo. */
export function calcularProximaClaseEsperada(grupo, clasesDelGrupo) {
  const hoyStr = formatISO(new Date());
  
  // 1. Buscar en clases registradas
  const clasesFuturas = clasesDelGrupo
    .filter(c => c.fecha_clase >= hoyStr)
    .sort((a, b) => a.fecha_clase.localeCompare(b.fecha_clase));
  if (clasesFuturas.length > 0) return clasesFuturas[0].fecha_clase;

  // 2. Si no hay clases futuras, iterar desde fecha_inicio
  if (!grupo.fecha_inicio) return null;
  const hoyTime = parseISO(hoyStr).getTime();
  let current = parseISO(grupo.fecha_inicio);
  
  let endTime = null;
  if (grupo.cantidad_lecciones > 0) {
    const end = new Date(current);
    end.setDate(end.getDate() + (grupo.cantidad_lecciones - 1) * 7);
    endTime = end.getTime();
  } else if (grupo.fecha_fin) {
    endTime = parseISO(grupo.fecha_fin).getTime();
  }

  if (endTime !== null && endTime < hoyTime) {
    return null; // El grupo ya finalizó
  }

  while (current.getTime() < hoyTime) {
    current.setDate(current.getDate() + 7);
  }
  
  if (endTime !== null && current.getTime() > endTime) {
    return null;
  }

  return formatISO(current);
}
