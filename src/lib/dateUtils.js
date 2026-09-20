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
