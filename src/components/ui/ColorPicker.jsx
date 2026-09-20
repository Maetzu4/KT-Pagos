import { ACCENT_COLORS } from '../../context/ThemeContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export function ColorPicker() {
  const { accentKey, changeAccent } = useTheme();

  return (
    <div className="flex gap-2.5 flex-wrap">
      {Object.entries(ACCENT_COLORS).map(([key, color]) => (
        <div key={key} className="flex flex-col items-center gap-1.5 group">
          <button
            onClick={() => changeAccent(key)}
            title={color.label}
            aria-label={`Color ${color.label}`}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              'transition-all duration-200 ease-in-out',
              accentKey === key
                ? 'scale-110 ring-2 ring-offset-2 ring-offset-black'
                : 'opacity-60 hover:opacity-100 hover:scale-105'
            )}
            style={{
              backgroundColor: color.value,
              ringColor: color.value,
              boxShadow: accentKey === key ? `0 0 0 2px black, 0 0 0 4px ${color.value}` : undefined,
            }}
          >
            {accentKey === key && <Check size={13} className="text-white drop-shadow" />}
          </button>
          <span className={cn(
            'text-[10px] font-medium leading-none transition-colors duration-200',
            accentKey === key ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
          )}>
            {color.label.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
}
