import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart3, Settings, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/grupos',       icon: Users,           label: 'Grupos' },
  { to: '/clases',       icon: BookOpen,        label: 'Clases' },
  { to: '/finanzas',     icon: BarChart3,       label: 'Finanzas' },
  { to: '/configuracion',icon: Settings,        label: 'Config' },
];

export function Navbar() {
  const { mode } = useTheme();

  return (
    <>
      {/* ── Sidebar para escritorio ─────────────────────────────────── */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-16 lg:w-56
                      bg-white border-r border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 z-40 py-6 transition-all">
        {/* Logo */}
        <div className="px-4 mb-8 flex items-center gap-3">
          <img src="/favicon.svg" alt="KT-Pagos Logo" className="w-9 h-9 rounded-xl shadow-sm hover:opacity-90 transition-opacity" />
          <span className="hidden lg:block text-zinc-900 dark:text-white font-semibold text-sm">KT-Pagos</span>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-1.5 px-2 flex-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm',
                'transition-all duration-200 ease-in-out group relative',
                isActive
                  ? 'bg-[var(--accent-color)] text-white shadow-md font-medium'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5 font-normal'
              )}
            >
              <Icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="hidden lg:block">{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Botón Logout (Desktop) */}
        <div className="mt-auto px-2">
          <button
            onClick={() => supabase.auth.signOut()}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-600 dark:text-zinc-400',
              'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400',
              'transition-all duration-200 ease-in-out group relative'
            )}
          >
            <LogOut size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span className="hidden lg:block font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* ── Bottom bar para móvil ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                      bg-white/95 border-t border-zinc-200 dark:bg-zinc-950/95 dark:border-zinc-800 backdrop-blur-md
                      flex items-center justify-around px-2 py-1.5 safe-area-inset-bottom">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs',
              'transition-all duration-200 ease-in-out',
              isActive
                ? 'bg-[var(--accent-color)] text-white shadow-sm font-medium'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5'
            )}
          >
            <Icon size={20} className="transition-transform duration-200" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Botón Logout (Mobile) */}
        <button
          onClick={() => supabase.auth.signOut()}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-400',
            'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400',
            'transition-all duration-200 ease-in-out'
          )}
        >
          <LogOut size={20} className="transition-transform duration-200" />
          <span>Salir</span>
        </button>
      </nav>
    </>
  );
}
