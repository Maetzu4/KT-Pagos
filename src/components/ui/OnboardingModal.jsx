import { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  PlusCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { Button } from './Button';

const STEPS = [
  {
    icon: Sparkles,
    badge: 'Bienvenida',
    title: 'Bienvenido a KT-Pagos',
    subtitle: 'Tu gestor de clases y finanzas 100% privado',
    description:
      'Diseñado para profesores y tutores independientes. Gestiona tus horarios, alumnos, proyecciones de cobro y bonos.',
    tip: 'Todos tus datos se procesan en tu propio dispositivo de forma segura.',
  },
  {
    icon: Layers,
    badge: 'Paso 1 · Configuración inicial',
    title: 'El Flujo Ideal',
    subtitle: '1º Crea tus Tarifas, 2º Crea tus Grupos',
    description:
      'Antes de crear grupos, define tus tarifas en Configuración (precio regular y extra). Luego, al registrar cada grupo, las clases de todo el periodo se generarán automáticamente.',
    tip: '¡Ahorras horas de registro manual cada mes!',
  },
  {
    icon: CheckCircle2,
    badge: 'Paso 2 · Día a día',
    title: 'Gestión de Clases',
    subtitle: 'Marca clases y mantén tus números al día',
    description:
      'Desde el Dashboard o el detalle del grupo, puedes marcar cada clase como Completada, Transferida o Cancelada. ¿Hay festivos o imprevistos? Aplaza clases fácilmente en lote.',
    tip: 'Las clases transferidas se registran con $0 cobrado para mantener el historial intacto.',
  },
  {
    icon: PlusCircle,
    badge: 'Paso 3 · Flexibilidad',
    title: 'Clases Extras',
    subtitle: 'Registra clases fuera del horario regular',
    description:
      '¿Tuviste una sesión de refuerzo o clase adicional? Usa el botón "Añadir Extra" para asignarla a cualquier grupo con su tarifa correspondiente.',
    tip: 'Aparecerán identificadas con la etiqueta EXTRA en tus reportes.',
  },
  {
    icon: ShieldCheck,
    badge: 'Paso 4 · Seguridad',
    title: 'Tus Datos, Tu Privacidad',
    subtitle: 'Toda la información vive en tu navegador',
    description:
      'En Modo Local, KT-Pagos almacena todo en la base de datos interna de tu navegador (IndexedDB). Nadie más tiene acceso a tus cifras.',
    tip: 'Recomendación de oro: descarga un respaldo JSON frecuentemente desde Configuración.',
  },
];

export function OnboardingModal({ open, onClose }) {
  const [step, setStep] = useState(0);

  // Reiniciar al paso 0 cada vez que se abre el modal
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleFinish = () => {
    localStorage.setItem('kt_onboarding_v1', 'true');
    onClose?.();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col justify-between min-h-[460px] animate-scale-up"
      >
        {/* Decoración luminosa sutil */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--accent-color)]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[var(--accent-color)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Barra superior con badge y botón cerrar */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--accent-color)]/10 text-[var(--accent-color)] uppercase tracking-wider">
            {current.badge}
          </span>
          <button
            onClick={handleFinish}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            title="Cerrar guía"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido principal del paso */}
        <div className="relative z-10 my-auto py-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-color)]/15 text-[var(--accent-color)] flex items-center justify-center shadow-sm">
            <Icon size={28} />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {current.title}
            </h2>
            <p className="text-sm font-semibold text-[var(--accent-color)] mt-0.5">
              {current.subtitle}
            </p>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {current.description}
          </p>

          <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Tip:</span> {current.tip}
          </div>
        </div>

        {/* Footer: Paginación y botones de avance */}
        <div className="relative z-10 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
          {/* Indicadores de pasos */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${idx === step
                  ? 'w-6 bg-[var(--accent-color)]'
                  : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400'
                  }`}
                aria-label={`Ir al paso ${idx + 1}`}
              />
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-9 px-3 text-xs"
              >
                <ChevronLeft size={16} /> Anterior
              </Button>
            )}

            {!isLast && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFinish}
                className="h-9 px-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Saltar
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              className="h-9 px-4 text-xs font-semibold shadow-sm"
              id="btn-onboarding-next"
            >
              {isLast ? '¡Comenzar!' : 'Siguiente'}
              {!isLast && <ChevronRight size={16} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

