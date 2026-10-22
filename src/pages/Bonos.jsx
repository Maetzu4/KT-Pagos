import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Trophy, Gift, CheckCircle2, Circle, ChevronDown,
  Sparkles, TrendingUp, Save, Info, Star, Zap,
} from 'lucide-react';
import { usePeriodos } from '../hooks/usePeriodos';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────
const GRADO_OPTIONS = [
  { value: 'none',    label: 'N/A',              sub: '0%',    color: 'text-zinc-400' },
  { value: 'good',    label: 'Buen Trabajo',      sub: '+5%',   color: 'text-emerald-500' },
  { value: 'amazing', label: 'Trabajo Asombroso', sub: '+10%',  color: 'text-amber-500' },
];

const REQUISITOS = [
  { icon: Trophy,       text: 'Al menos 10 grupos activos' },
  { icon: CheckCircle2, text: '15+ alumnos en retención' },
  { icon: TrendingUp,   text: 'Métricas por encima de OK' },
];

// ─── Selector de grado ────────────────────────────────────────────────────────
function GradeSelector({ label, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const current = GRADO_OPTIONS.find((o) => o.value === value) || GRADO_OPTIONS[0];

  return (
    <div className="relative">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl',
          'border transition-all duration-200 text-left text-sm font-medium',
          disabled
            ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
            : 'cursor-pointer border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-[var(--accent-color)]/60 shadow-sm',
        ].join(' ')}
      >
        <span className={'flex items-center gap-2 ' + current.color}>
          {value === 'amazing' && <Sparkles size={14} />}
          {value === 'good'    && <Star size={14} />}
          {value === 'none'    && <Circle size={14} className="text-zinc-400" />}
          <span className="text-zinc-900 dark:text-white">{current.label}</span>
          <span className={'text-xs font-bold ' + current.color}>{current.sub}</span>
        </span>
        <ChevronDown size={14} className={'text-zinc-400 transition-transform duration-200 ' + (open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
          {GRADO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={[
                'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left',
                'hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors',
                value === opt.value ? 'bg-[var(--accent-color)]/5 font-semibold' : '',
              ].join(' ')}
            >
              <span className={'flex items-center gap-2 ' + opt.color}>
                {opt.value === 'amazing' && <Sparkles size={13} />}
                {opt.value === 'good'    && <Star size={13} />}
                {opt.value === 'none'    && <Circle size={13} className="text-zinc-400" />}
                <span className="text-zinc-900 dark:text-white">{opt.label}</span>
              </span>
              <span className={'text-xs font-bold ' + opt.color}>{opt.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fila de desglose ─────────────────────────────────────────────────────────
function DesgloseFila({ label, value, sub, highlight, icon: Icon }) {
  return (
    <div className={'flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 ' + (highlight ? 'text-[var(--accent-color)]' : '')}>
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

// ─── Página Principal (guard de loading) ─────────────────────────────────────
export default function Bonos() {
  const { periodos = [], periodoActual = null, upsertPeriodo, loading } = usePeriodos();

  // Guard temprano: evita renderizar con datos aún no disponibles
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] gap-3">
        <div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-zinc-500 animate-pulse">Cargando módulo de bonos...</p>
      </div>
    );
  }

  return (
    <BonosContent
      periodos={periodos || []}
      periodoActual={periodoActual || null}
      upsertPeriodo={upsertPeriodo}
    />
  );
}

// ─── Contenido real (sólo se monta cuando loading === false) ──────────────────
function BonosContent({ periodos = [], periodoActual = null, upsertPeriodo }) {
  const [selectedKey, setSelectedKey] = useState(null);

  const periodo = useMemo(() => {
    const key = selectedKey ?? periodoActual?.key_periodo;
    if (key) {
      const match = periodos?.find((p) => p?.key_periodo === key);
      if (match) return match;
    }
    return periodoActual ?? periodos?.[0] ?? null;
  }, [selectedKey, periodoActual, periodos]);

  const [formState, setFormState] = useState(() => ({
    requisitos_bono: Boolean(periodo?.requisitos_bono),
    r1_grado: periodo?.r1_grado || 'none',
    r2_grado: periodo?.r2_grado || 'none',
    r3_grado: periodo?.r3_grado || 'none',
  }));

  // Sincronizar formState cuando cambia el periodo seleccionado
  useEffect(() => {
    setFormState({
      requisitos_bono: Boolean(periodo?.requisitos_bono),
      r1_grado: periodo?.r1_grado || 'none',
      r2_grado: periodo?.r2_grado || 'none',
      r3_grado: periodo?.r3_grado || 'none',
    });
  }, [periodo?.key_periodo, periodo?.requisitos_bono, periodo?.r1_grado, periodo?.r2_grado, periodo?.r3_grado]);

  const [saving, setSaving]   = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const gradeMultiplier = (grade) => {
    if (grade === 'good')    return 0.05;
    if (grade === 'amazing') return 0.10;
    return 0;
  };

  const ingresos_regulares = periodo?.ingresos_regulares ?? 0;
  const ingresos_extras    = periodo?.ingresos_extras ?? 0;

  const multiplicador_bono = formState.requisitos_bono
    ? gradeMultiplier(formState.r1_grado) + gradeMultiplier(formState.r2_grado) + gradeMultiplier(formState.r3_grado)
    : 0;

  const monto_bono    = ingresos_regulares * multiplicador_bono;
  const total_preview = ingresos_regulares + ingresos_extras + monto_bono;

  const handleSave = useCallback(async () => {
    if (!periodo) return;
    setSaving(true);
    try {
      await upsertPeriodo({ ...periodo, ...formState });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err) {
      console.error('Error guardando bonos:', err);
    } finally {
      setSaving(false);
    }
  }, [periodo, formState, upsertPeriodo]);

  const periodosOrdenados = useMemo(
    () => [...(periodos || [])].sort((a, b) => (b?.key_periodo || '').localeCompare(a?.key_periodo || '')),
    [periodos]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent-color)]/10 flex items-center justify-center">
            <Trophy size={20} className="text-[var(--accent-color)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Módulo de Bonos</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Gestiona tus retenciones y calcula el bono mensual</p>
          </div>
        </div>

        {/* Selector de periodo */}
        <div className="relative">
          <select
            value={selectedKey ?? (periodoActual?.key_periodo || '')}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700
                       bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-medium
                       shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/40"
          >
            {periodosOrdenados.length === 0 ? (
              <option value="">Sin periodos disponibles</option>
            ) : (
              periodosOrdenados.map((p) => (
                <option key={p?.key_periodo || 'periodo'} value={p?.key_periodo || ''}>
                  {p?.nombre_periodo ?? p?.key_periodo ?? 'Periodo'}
                  {p?.key_periodo && p.key_periodo === periodoActual?.key_periodo ? ' · Actual' : ''}
                </option>
              ))
            )}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Izquierda: Requisitos + Retenciones ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Bloque Requisitos */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-[var(--accent-color)]" />
                <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">Requisitos del Bono</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Para activar el bono, debes cumplir todos los requisitos del mes
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {REQUISITOS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className={[
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                    formState.requisitos_bono
                      ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
                  ].join(' ')}>
                    <Icon size={14} />
                  </div>
                  <span className={'text-sm transition-colors duration-200 ' + (formState.requisitos_bono ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400')}>
                    {text}
                  </span>
                  {formState.requisitos_bono && (
                    <CheckCircle2 size={14} className="ml-auto shrink-0 text-[var(--accent-color)]" />
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <label className="flex items-center justify-between cursor-pointer gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Cumplo con todos los requisitos de este mes
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formState.requisitos_bono
                      ? '✅ Bono activado — configura tus retenciones abajo'
                      : 'Activa el switch para habilitar el módulo de retenciones'}
                  </p>
                </div>
                <Toggle
                  id="toggle-requisitos"
                  checked={formState.requisitos_bono}
                  onChange={(v) => setFormState((s) => ({
                    ...s,
                    requisitos_bono: v,
                    ...(v ? {} : { r1_grado: 'none', r2_grado: 'none', r3_grado: 'none' }),
                  }))}
                />
              </label>
            </div>
          </div>

          {/* Bloque Retenciones */}
          <div className={[
            'rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition-all duration-300',
            formState.requisitos_bono
              ? 'border-zinc-200 dark:border-zinc-800 opacity-100'
              : 'border-zinc-100 dark:border-zinc-800/50 opacity-50 pointer-events-none',
          ].join(' ')}>
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">Gestor de Retenciones</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Evalúa el desempeño de cada retención para calcular el % de bono acumulado
              </p>
            </div>

            <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GradeSelector label="Retención R1" value={formState.r1_grado} onChange={(v) => setFormState((s) => ({ ...s, r1_grado: v }))} disabled={!formState.requisitos_bono} />
              <GradeSelector label="Retención R2" value={formState.r2_grado} onChange={(v) => setFormState((s) => ({ ...s, r2_grado: v }))} disabled={!formState.requisitos_bono} />
              <GradeSelector label="Retención R3" value={formState.r3_grado} onChange={(v) => setFormState((s) => ({ ...s, r3_grado: v }))} disabled={!formState.requisitos_bono} />
            </div>

            {formState.requisitos_bono && (
              <div className="px-5 pb-5">
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-500">% de Bono Acumulado</span>
                      <span className="text-xs font-bold text-[var(--accent-color)]">
                        {(multiplicador_bono * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-500"
                        style={{ width: `${Math.min((multiplicador_bono / 0.30) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-500">Bono extra</p>
                    <p className="text-sm font-bold font-mono text-[var(--accent-color)]">
                      +{formatCurrency(monto_bono)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Derecha: Calculadora Preview ── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="bg-[var(--accent-color)] px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-white/80" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Calculadora de Bono</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{formatCurrency(total_preview)}</p>
              <p className="text-xs text-white/70 mt-0.5">{periodo?.nombre_periodo ?? '—'} · Total proyectado</p>
            </div>

            <div className="px-5 py-1">
              <DesgloseFila label="Clases Regulares"  value={formatCurrency(ingresos_regulares)} icon={CheckCircle2} />
              <DesgloseFila label="Clases Extras"     value={formatCurrency(ingresos_extras)}    icon={Zap} />
              <DesgloseFila
                label="Bono Aplicado"
                sub={multiplicador_bono > 0 ? `(${(multiplicador_bono * 100).toFixed(0)}%)` : undefined}
                value={monto_bono > 0 ? `+${formatCurrency(monto_bono)}` : formatCurrency(0)}
                icon={Trophy}
                highlight={monto_bono > 0}
              />
            </div>

            <div className="mx-5 my-2 border-t-2 border-dashed border-zinc-100 dark:border-zinc-800" />

            <div className="px-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Total Proyectado</span>
                <span className="font-mono font-bold text-lg text-zinc-900 dark:text-white">
                  {formatCurrency(total_preview)}
                </span>
              </div>

              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2.5 flex gap-2 mb-4">
                <Info size={13} className="shrink-0 mt-0.5 text-zinc-400" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {formState.requisitos_bono
                    ? 'El bono se calcula sobre los ingresos regulares (no aplica a extras).'
                    : 'Activa el toggle de requisitos para habilitar el bono mensual.'}
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !periodo}
                className={'w-full justify-center transition-all duration-300 ' + (savedOk ? 'bg-emerald-500 hover:bg-emerald-500' : '')}
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin mr-2" />Guardando…</>
                  : savedOk
                    ? <><CheckCircle2 size={16} className="mr-2" />¡Guardado!</>
                    : <><Save size={16} className="mr-2" />Guardar Bonos</>
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
