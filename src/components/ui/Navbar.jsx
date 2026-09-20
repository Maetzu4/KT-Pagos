import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart3, Settings } from 'lucide-react';
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
                      bg-black dark:bg-black border-r border-white/8 z-40 py-6 transition-all">
        {/* Logo */}
        <div className="px-4 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">KT</span>
          </div>
          <span className="hidden lg:block text-white font-semibold text-sm">KT-Pagos</span>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-1.5 px-2 flex-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-200 ease-in-out group relative',
                isActive
                  ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/30 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
              )}
            >
              <Icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="hidden lg:block">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Bottom bar para móvil ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                      bg-black/95 dark:bg-black/95 backdrop-blur-md border-t border-white/10
                      flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium',
              'transition-all duration-200 ease-in-out',
              isActive
                ? 'bg-[var(--accent-color)]/15 text-[var(--accent-color)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            )}
          >
            <Icon size={20} className="transition-transform duration-200" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
