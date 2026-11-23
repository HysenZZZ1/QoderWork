import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ListTree, PanelLeftOpen, PanelRightOpen, Sparkles } from 'lucide-react';
import { TopNav } from '@/components/layout/TopNav';
import { OutlineSidebar } from '@/modules/pdf/OutlineSidebar';
import { PdfViewer } from '@/modules/pdf/PdfViewer';
import { AiPanel } from '@/components/ai/AiPanel';
import { useAppStore } from '@/store/useAppStore';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { LEFT_SIDEBAR_WIDTH, RIGHT_PANEL_WIDTH } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function ReaderPage() {
  const leftOpen = useAppStore((s) => s.leftOpen);
  const rightOpen = useAppStore((s) => s.rightOpen);
  const toggleLeft = useAppStore((s) => s.toggleLeft);
  const toggleRight = useAppStore((s) => s.toggleRight);
  const setLeft = useAppStore((s) => s.setLeft);
  const setRight = useAppStore((s) => s.setRight);

  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 断点切换时给出合理的开合默认
  useEffect(() => {
    setLeft(isDesktop);
    setRight(isDesktop);
  }, [isDesktop, setLeft, setRight]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <TopNav />

      {isDesktop ? (
        <div className="flex min-h-0 flex-1">
          {leftOpen ? (
            <div className="shrink-0 border-r border-ink-200" style={{ width: LEFT_SIDEBAR_WIDTH }}>
              <OutlineSidebar />
            </div>
          ) : (
            <ReopenRail side="left" onOpen={toggleLeft} />
          )}

          <main className="min-w-0 flex-1">
            <PdfViewer />
          </main>

          {rightOpen ? (
            <div className="shrink-0 border-l border-ink-200" style={{ width: RIGHT_PANEL_WIDTH }}>
              <AiPanel />
            </div>
          ) : (
            <ReopenRail side="right" onOpen={toggleRight} />
          )}
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <main className="h-full">
            <PdfViewer />
          </main>

          {!leftOpen && (
            <FloatToggle className="left-3" onClick={toggleLeft} icon={<ListTree className="h-4 w-4" />} label="目录" />
          )}
          {!rightOpen && (
            <FloatToggle className="right-3" onClick={toggleRight} icon={<Sparkles className="h-4 w-4" />} label="AI" />
          )}

          <Drawer side="left" open={leftOpen} onClose={toggleLeft}>
            <OutlineSidebar />
          </Drawer>
          <Drawer side="right" open={rightOpen} onClose={toggleRight}>
            <AiPanel />
          </Drawer>
        </div>
      )}
    </div>
  );
}

function ReopenRail({ side, onOpen }: { side: 'left' | 'right'; onOpen: () => void }) {
  const Icon = side === 'left' ? PanelLeftOpen : PanelRightOpen;
  return (
    <button
      onClick={onOpen}
      aria-label={side === 'left' ? '展开论文目录' : '展开 AI 助手'}
      className={cn(
        'flex w-9 shrink-0 flex-col items-center gap-2 bg-white text-ink-500 transition-colors hover:bg-ink-50 hover:text-brand-700',
        side === 'left' ? 'border-r border-ink-200' : 'border-l border-ink-200',
      )}
    >
      <span className="mt-2.5 flex h-7 w-7 items-center justify-center rounded-md">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span
        className="mt-2 text-[11px] font-medium tracking-wide"
        style={{ writingMode: 'vertical-rl' }}
      >
        {side === 'left' ? '论文目录' : 'AI 助手'}
      </span>
    </button>
  );
}

function FloatToggle({
  onClick,
  icon,
  label,
  className,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-30 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-2 text-[12px] font-medium text-ink-700 shadow-panel transition-colors hover:bg-brand-50 hover:text-brand-700',
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Drawer({
  side,
  open,
  onClose,
  children,
}: {
  side: 'left' | 'right';
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 top-14 z-40 bg-ink-900/30 backdrop-blur-[1px] transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'fixed top-14 bottom-0 z-50 w-[86%] max-w-[340px] bg-white shadow-pop transition-transform duration-300',
          side === 'left' ? 'left-0' : 'right-0',
          open ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={side === 'left' ? '论文目录' : 'AI 助手'}
      >
        {children}
      </div>
    </>
  );
}