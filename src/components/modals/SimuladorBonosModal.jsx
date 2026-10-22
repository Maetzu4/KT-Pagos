import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Sparkles, CheckCircle2, Trophy, RotateCcw, Zap } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { formatCurrency } from '../../lib/utils';

const GRADO_OPTIONS = [
  { value: 'none',    label: 'None',    sub: '0%'   },
  { value: 'good',    label: 'Good',    sub: '+5%'  },
  { value: 'amazing', label: 'Amazing', sub: '+10%' },
];

function RetentionRow({ label, description, value, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/40">
      <div>
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="bg-zinc-200/60 dark:bg-zinc-900/60 rounded-lg p-1 flex gap-1 w-full sm:w-64 shrink-0">
        {GRADO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer text-center',
              value === opt.value
                ? 'bg-[var(--accent-color)] text-white shadow-sm'
                : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300',
            ].join(' ')}
          >
            <span className="block leading-tight">{opt.label}</span>
            <span className="block text-[10px] mt-0.5 opacity-80 leading-tight">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DesgloseFila({ label, value, sub, highlight, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="shrink-0 opacity-60" />}
        <span className={'text-sm ' + (highlight ? 'font-semibold text-[var(--accent-color)]' : 'text-zinc-600 dark:text-zinc-400')}>
          {label}
        </span>
        {sub && <span className="text-xs text-zinc-400">{sub}</span>}
      </div>
      <span className={'font-mono font-semibold text-sm tabular-nums ' + (highlight ? 'text-[var(--accent-color)]' : 'text-zinc-900 dark:text-white')}>
        {value}
      </span>
    </div>
  );
}

export function SimuladorBonosModal({ open, onClose }) {
  const [montoInput, setMontoInput] = useState('10000');
  const [r1, setR1] = useState('none');
  const [r2, setR2] = useState('none');
  const [r3, setR3] = useState('none');

  const gradeMultiplier = (grade) => {
    if (grade === 'good') return 0.05;
    if (grade === 'amazing') return 0.10;
    return 0;
  };

  const montoBase = Math.max(0, parseFloat(montoInput) || 0);
  const porcentajeAcumulado = gradeMultiplier(r1) + gradeMultiplier(r2) + gradeMultiplier(r3);
  const montoBono = montoBase * porcentajeAcumulado;
  const subtotalRegulares = montoBase + montoBono;

  // Animaciones Dinámicas
  const animMontoBase = useCountUp(montoBase);
  const animMontoBono = useCountUp(montoBono);
  const animSubtotalRegulares = useCountUp(subtotalRegulares);

  const handleReset = () => {
    setMontoInput('');
    setR1('none');
    setR2('none');
    setR3('none');
  };

  return (
    <Modal open={open} onClose={onClose} title="Simulador Rápido de Bonos" size="lg" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Descripción rápida */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Calcula tu bono ingresando un monto estimado y ajustando los grados de retención.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0 ml-2 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Restablecer</span>
          </button>
        </div>

        {/* Input Monto Base */}
        <div className="space-y-2">
          <label htmlFor="simulador-monto" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
            Monto de Clases Regulares
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-zinc-400 font-semibold pointer-events-none">
              $
            </span>
            <input
              id="simulador-monto"
              type="number"
              min="0"
              step="100"
              value={montoInput}
              onChange={(e) => setMontoInput(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 pl-8 pr-4 rounded-xl border-0 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white text-base font-mono font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all"
            />
          </div>
        </div>

        {/* Gestor de Retenciones (Apilado vertical con control a la derecha) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap size={15} className="text-[var(--accent-color)]" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                Retenciones
              </span>
            </div>
            <span className="text-xs font-bold text-[var(--accent-color)] font-mono">
              +{(porcentajeAcumulado * 100).toFixed(0)}% de bono
            </span>
          </div>

          <div className="space-y-2.5">
            <RetentionRow
              label="Retención R1"
              description="Evaluación del primer bloque"
              value={r1}
              onChange={setR1}
            />
            <RetentionRow
              label="Retención R2"
              description="Evaluación del segundo bloque"
              value={r2}
              onChange={setR2}
            />
            <RetentionRow
              label="Retención R3"
              description="Evaluación del tercer bloque"
              value={r3}
              onChange={setR3}
            />
          </div>
        </div>

        {/* Resultados (Calculadora UI — Bloque sobrio sin bordes) */}
        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <Sparkles size={15} className="text-[var(--accent-color)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Proyección Calculada
            </h3>
          </div>

          <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
            <DesgloseFila
              icon={CheckCircle2}
              label="Monto Base"
              value={formatCurrency(animMontoBase)}
            />
            <DesgloseFila
              icon={Trophy}
              label="Bono Aplicado"
              sub={`(${(porcentajeAcumulado * 100).toFixed(0)}%)`}
              value={animMontoBono > 0 ? `+${formatCurrency(animMontoBono)}` : formatCurrency(0)}
              highlight={montoBono > 0}
            />
          </div>

          {/* Subtotal Regulares destacado */}
          <div className="pt-2">
            <div className="flex items-center justify-between rounded-xl bg-[var(--accent-color)]/10 px-4 py-3">
              <span className="text-sm font-semibold text-[var(--accent-color)]">
                Subtotal Regulares
              </span>
              <span className="font-mono font-bold text-lg text-[var(--accent-color)]">
                {formatCurrency(animSubtotalRegulares)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
