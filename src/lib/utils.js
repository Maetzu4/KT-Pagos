/**
 * Utility: concatena clases CSS (alternativa ligera a clsx/cn de shadcn).
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formatea un número como moneda (MXN por defecto).
 */
export function formatCurrency(amount, currency = 'MXN') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
}
