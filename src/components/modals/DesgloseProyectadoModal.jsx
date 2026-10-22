import { useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { CheckCircle2, Zap, Trophy, RotateCcw, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

/** Precio efectivo de una clase (excluye Canceladas) */
const getPrecioClase = (c) => {
  if (c?.estado_clase === 'Cancelada') return 0;
  return Number(c?.precio_cobrado ?? c?.grupos?.tarifas?.precio_regular ?? 0);
};

function Fila({ icon: Icon, label, value, sub, highlight, badge, muted }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={[
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
            highlight
              ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
          ].join(' ')}
        >
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className={'text-sm font-medium truncate ' + (muted ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200')}>
              {label}
            </p>
            {badge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--accent-color)]/15 text-[var(--accent-color)]">
                {badge}
              </span>
            )}
          </div>
          {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      <span className={'font-mono font-semibold text-sm tabular-nums shrink-0 ml-4 ' + (highlight ? 'text-[var(--accent-color)]' : 'text-zinc-900 dark:text-white')}>
        {value}
      </span>
    </div>
  );
}

export function DesgloseProyectadoModal({ open, onClose, periodo, clases }) {
  if (!periodo) return null;

  // Clases válidas (excluyendo canceladas)
  const listaClases = (clases && clases.length > 0) ? clases : (periodo?.clases || []);
  const validClases = useMemo(
    () => (listaClases || []).filter((c) => c?.estado_clase !== 'Cancelada'),
    [listaClases]
  );

  // Clases regulares y extras
  const clasesRegulares = useMemo(() => validClases.filter((c) => !c?.es_adicional), [validClases]);
  const clasesExtras    = useMemo(() => validClases.filter((c) => c?.es_adicional), [validClases]);

  // Conteos
  const cantRegulares = clasesRegulares.length > 0
    ? clasesRegulares.length
    : (periodo?.clases?.filter((c) => !c?.es_adicional && c?.estado_clase !== 'Cancelada').length || 0);

  const cantExtras = clasesExtras.length > 0
    ? clasesExtras.length
    : (periodo?.clases?.filter((c) => c?.es_adicional && c?.estado_clase !== 'Cancelada').length || 0);

  // Montos base proyectados
  const montoRegulares = clasesRegulares.length > 0
    ? clasesRegulares.reduce((s, c) => s + getPrecioClase(c), 0)
    : (periodo?.ingresos_regulares ?? 0);

  const montoExtras = clasesExtras.length > 0
    ? clasesExtras.reduce((s, c) => s + getPrecioClase(c), 0)
    : (periodo?.ingresos_extras ?? 0);

  // Bono
  const multiplicador = Number(periodo?.multiplicador_bono ?? 0);
  const pctBono = Math.round(multiplicador * 100);
  const montoBono = montoRegulares * multiplicador;

  // Deuda anterior
  const deudaAnterior = Number(periodo?.deuda_anterior ?? 0);

  // Proyectado Total del Mes
  const totalProyectado = montoRegulares + montoExtras + montoBono + (deudaAnterior > 0 ? deudaAnterior : 0) ||
    (periodo?.total_a_cobrar ?? periodo?.estimado_real ?? 0);

  // Total Ganado a la fecha (solo clases en estado 'Completada')
  const completadas = useMemo(
    () => validClases.filter((c) => c?.estado_clase === 'Completada'),
    [validClases]
  );

  const { totalGanado, cantCompletadas } = useMemo(() => {
    if (validClases.length > 0) {
      const compReg = completadas.filter((c) => !c?.es_adicional);
      const compExt = completadas.filter((c) => c?.es_adicional);
      const ganadoReg = compReg.reduce((s, c) => s + getPrecioClase(c), 0);
      const ganadoExt = compExt.reduce((s, c) => s + getPrecioClase(c), 0);
      const ganadoBono = ganadoReg * multiplicador;
      return {
        totalGanado: ganadoReg + ganadoExt + ganadoBono,
        cantCompletadas: completadas.length,
      };
    }
    // Fallback: periodo.estimado_real calculado en usePeriodos se basa solo en Completadas
    return {
      totalGanado: Number(periodo?.estimado_real ?? 0),
      cantCompletadas: periodo?.clases?.filter((c) => c?.estado_clase === 'Completada').length || 0,
    };
  }, [validClases, completadas, multiplicador, periodo]);

  const pctAvance = totalProyectado > 0 ? Math.min(Math.round((totalGanado / totalProyectado) * 100), 100) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Desglose Proyectado">
      <div className="space-y-4">
        {/* ── Arriba: Proyectado Total del Mes ── */}
        <div className="rounded-2xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/30 p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent-color)]">
                Proyectado Total del Mes
              </span>
              {periodo?.nombre_periodo && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  · {periodo.nombre_periodo}
                </span>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
              {formatCurrency(totalProyectado)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-color)]/15 text-[var(--accent-color)] flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* ── Medio: Desglose ── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden px-4 shadow-sm">
          <Fila
            icon={CheckCircle2}
            label="Clases Regulares"
            sub={`${cantRegulares} ${cantRegulares === 1 ? 'clase' : 'clases'}`}
            value={formatCurrency(montoRegulares)}
          />
          <Fila
            icon={Zap}
            label="Clases Extras"
            sub={`${cantExtras} ${cantExtras === 1 ? 'clase' : 'clases'}`}
            value={formatCurrency(montoExtras)}
          />
          <Fila
            icon={Trophy}
            label="Bono Aplicado"
            badge={pctBono > 0 ? `+${pctBono}%` : null}
            sub={pctBono > 0
              ? `${pctBono}% ganado sobre ingresos regulares`
              : '0% · Sin bono este período'}
            value={montoBono > 0 ? `+${formatCurrency(montoBono)}` : formatCurrency(0)}
            highlight={montoBono > 0}
            muted={montoBono === 0}
          />
          {deudaAnterior > 0 && (
            <Fila
              icon={RotateCcw}
              label="Deuda Arrastrada"
              sub="Saldo pendiente del período anterior"
              value={`+${formatCurrency(deudaAnterior)}`}
              highlight
            />
          )}
        </div>

        {/* ── Abajo: Sección destacada Total Ganado a la fecha ── */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                  Total Ganado a la fecha
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {validClases.length > 0
                    ? `${cantCompletadas} de ${validClases.length} clases completadas`
                    : `${cantCompletadas} clases completadas`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(totalGanado)}
              </p>
              {totalProyectado > 0 && (
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {pctAvance}% del proyectado
                </p>
              )}
            </div>
          </div>

          {/* Barra de progreso sutil */}
          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pctAvance}%` }}
            />
          </div>
        </div>

        {/* Nota al pie */}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center px-2">
          {periodo.nombre_periodo} · Los montos excluyen clases Canceladas
        </p>
      </div>
    </Modal>
  );
}

