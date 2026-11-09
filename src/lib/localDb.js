import Dexie from 'dexie';

/**
 * Base de datos IndexedDB local para KT-Pagos.
 * Soporta funcionamiento 100% offline para usuarios sin sesión activa.
 * El esquema y los nombres de tablas replican exactamente la estructura de Supabase.
 */
export const localDb = new Dexie('KTPagosLocal');

// Definición de tablas e índices primarios y secundarios.
// 'id' es la clave primaria (UUID string idéntico al de Supabase).
localDb.version(1).stores({
  tarifas: 'id, duracion_minutos, user_id',
  grupos: 'id, id_externo, nombre_grupo, estado, tarifa_id, user_id, fecha_inicio_grupo, leccion_inicio_cobro',
  periodos: 'id, key_periodo, mes, anio, user_id',
  clases: 'id, grupo_id, periodo_id, user_id, fecha_clase, estado_clase, es_adicional, fue_aplazada, en_reclamo',
});

// Version 2: adds es_externa, descripcion_externa, tarifa_id on clases for external extras
localDb.version(2).stores({
  tarifas: 'id, duracion_minutos, user_id',
  grupos: 'id, id_externo, nombre_grupo, estado, tarifa_id, user_id, fecha_inicio_grupo, leccion_inicio_cobro',
  periodos: 'id, key_periodo, mes, anio, user_id',
  clases: 'id, grupo_id, periodo_id, user_id, fecha_clase, estado_clase, es_adicional, fue_aplazada, en_reclamo, es_externa',
});

/**
 * Genera un UUID estándar (v4) para asegurar compatibilidad total con Supabase.
 */
export function generateLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

