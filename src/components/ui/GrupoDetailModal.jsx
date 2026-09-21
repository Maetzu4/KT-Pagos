import { Modal } from './Modal';
import { Badge } from './Badge';
import { Button } from './Button';
import { ExternalLink, MessageCircle, Pencil } from 'lucide-react';
import { formatDate, parseISO, addDays, formatISO, calcularProximaClaseEsperada } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/utils';
import { useClases } from '../../hooks/useClases';

export function GrupoDetailModal({ grupo, open, onClose, onEdit, readOnly = false }) {
  const { clases } = useClases(grupo ? { grupo_id: grupo.id } : {});
  if (!grupo) return null;

  // Cálculo de fecha FIN: fecha_inicio + (cantidad_lecciones - 1) semanas
  let fechaFinStr = '—';
  if (grupo.fecha_inicio && grupo.cantidad_lecciones > 0) {
    const inicioDate = parseISO(grupo.fecha_inicio);
    const end = addDays(inicioDate, (grupo.cantidad_lecciones - 1) * 7);
    fechaFinStr = formatDate(formatISO(end));
  } else if (grupo.fecha_fin) {
    fechaFinStr = formatDate(grupo.fecha_fin);
  }

  return (
    <Modal open={open} onClose={onClose} title={grupo.nombre_grupo} size="md">
      <div className="space-y-5">
        {/* Estado y tarifa */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Estado</p>
            <Badge variant={grupo.estado}>
              {grupo.estado === 'activo' ? 'Activo' : grupo.estado === 'finalizado' ? 'Finalizado' : '—'}
            </Badge>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Lecciones</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {grupo.cantidad_lecciones ?? '—'}
            </p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 truncate">Próx. Clase</p>
            <p className="text-sm font-semibold text-[var(--accent-color)]">
              {calcularProximaClaseEsperada(grupo, clases) ? formatDate(calcularProximaClaseEsperada(grupo, clases)) : '—'}
            </p>
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3 px-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Inicio</p>
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{formatDate(grupo.fecha_inicio)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Fin</p>
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{fechaFinStr}</p>
          </div>
        </div>

        {/* Tarifa */}
        {grupo.tarifas && (
          <div className="space-y-1.5 px-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Tarifa</p>
            <div className="flex justify-between text-sm font-mono">
              <span className="text-zinc-600 dark:text-zinc-400">Duración</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{grupo.tarifas.duracion_minutos} min</span>
            </div>
            <div className="flex justify-between text-sm font-mono">
              <span className="text-zinc-600 dark:text-zinc-400">Precio Regular</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(grupo.tarifas.precio_regular)}</span>
            </div>
            <div className="flex justify-between text-sm font-mono">
              <span className="text-zinc-600 dark:text-zinc-400">Precio Extra</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(grupo.tarifas.precio_extra)}</span>
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="px-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-3">Accesos rápidos</p>
          <div className="flex flex-wrap gap-2">
            {grupo.link_backoffice ? (
              <a href={grupo.link_backoffice} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" id={`btn-backoffice-${grupo.id}`}>
                  <ExternalLink size={13} /> Backoffice
                </Button>
              </a>
            ) : (
              <span className="text-xs text-zinc-500 italic">Sin link de backoffice</span>
            )}
            {grupo.link_whatsapp ? (
              <a href={grupo.link_whatsapp} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" id={`btn-whatsapp-${grupo.id}`}>
                  <MessageCircle size={13} /> WhatsApp
                </Button>
              </a>
            ) : (
              <span className="text-xs text-zinc-500 italic">Sin link de WhatsApp</span>
            )}
          </div>
        </div>

        {/* Footer */}
        {!readOnly && (
          <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button size="sm" variant="ghost" onClick={() => { onClose(); onEdit?.(grupo); }}>
              <Pencil size={13} /> Editar grupo
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
