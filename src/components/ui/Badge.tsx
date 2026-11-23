import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-600 border-ink-200',
  info: 'bg-brand-50 text-brand-700 border-brand-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  brand: 'bg-brand-600 text-white border-brand-600',
};

const dots: Record<Tone, string> = {
  neutral: 'bg-ink-400',
  info: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  brand: 'bg-white',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, dot, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {icon}
      {children}
    </span>
  );
}