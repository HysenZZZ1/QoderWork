import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
  tooltipSide?: 'top' | 'bottom';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, active, size = 'md', tooltipSide = 'bottom', className, disabled, ...rest },
  ref,
) {
  return (
    <Tooltip label={label} side={tooltipSide}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-ink-600 transition-colors duration-150',
          'hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200',
          'disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent',
          active && 'bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800',
          size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
          className,
        )}
        {...rest}
      >
        {icon}
      </button>
    </Tooltip>
  );
});