import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, variant = 'underline', className }: TabsProps<T>) {
  if (variant === 'pill') {
    return (
      <div className={cn('inline-flex rounded-md bg-ink-100 p-0.5', className)} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={value === t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-medium transition-colors',
              value === t.id ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={cn('flex border-b border-ink-200', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'relative inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors',
            value === t.id ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {t.icon}
          {t.label}
          {value === t.id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
          )}
        </button>
      ))}
    </div>
  );
}