import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-12',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-ink-100 text-ink-400',
            compact ? 'h-10 w-10' : 'h-14 w-14',
          )}
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className={cn('font-semibold text-ink-700', compact ? 'text-sm' : 'text-base')}>{title}</h3>
        {description && (
          <p className={cn('mx-auto max-w-xs leading-relaxed text-ink-500', compact ? 'text-xs' : 'text-[13px]')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}