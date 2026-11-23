import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import type { Toast } from '@/store/useAppStore';

const toneStyles: Record<Toast['tone'], { cls: string; icon: typeof Info }> = {
  info: { cls: 'border-brand-200 bg-white text-ink-800', icon: Info },
  success: { cls: 'border-emerald-200 bg-white text-ink-800', icon: CheckCircle2 },
  warning: { cls: 'border-amber-200 bg-white text-ink-800', icon: AlertCircle },
  danger: { cls: 'border-red-200 bg-white text-ink-800', icon: AlertCircle },
};

const iconColor: Record<Toast['tone'], string> = {
  info: 'text-brand-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  danger: 'text-red-500',
};

export function Toaster() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  if (!toasts.length) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4">
      {toasts.map((t) => {
        const { cls, icon: Icon } = toneStyles[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-pop animate-fade-up',
              cls,
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor[t.tone])} />
            <p className="flex-1 text-[13px] leading-relaxed">{t.message}</p>
            <button
              aria-label="关闭提示"
              onClick={() => dismiss(t.id)}
              className="text-ink-400 transition-colors hover:text-ink-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}