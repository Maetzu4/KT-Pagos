import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { formatDate } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/utils';

export function ClaseDetailModal({ isOpen, onClose, clase }) {
  if (!clase) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title="Detalles de la Clase" size="md">
      <div className="space-y-4 pr-1">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Nombre / Tema</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{clase.nombre_clase || '—'}</p>
        </div>
        
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Grupo</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{clase.grupos?.nombre_grupo || '—'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Fecha</p>
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{formatDate(clase.fecha_clase)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Tipo</p>
            {clase.es_extra ? <Badge variant="extra">Extra</Badge> : <Badge variant="default">Regular</Badge>}
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Tarifa Cobrada</p>
            <p className="text-sm font-mono text-zinc-900 dark:text-white">{formatCurrency(clase.precio_cobrado)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Estado</p>
            {clase.en_reclamo ? (
              <p className="text-sm text-[var(--accent-color)] font-medium flex items-center gap-1">
                <AlertTriangle size={13} /> En Reclamo
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Normal</p>
            )}
          </div>
        </div>

        {clase.link_grabacion && (
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Grabación</p>
            <a href={clase.link_grabacion} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="w-full justify-start">
                <ExternalLink size={14} className="mr-2" /> Ver grabación
              </Button>
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
