import { useNavigate } from 'react-router-dom';
import { Home, Settings, Sparkles } from 'lucide-react';
import { Badge, Button, IconButton } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { usePaperStore } from '@/store/usePaperStore';
import { API_STATUS_META, RUN_MODE_META } from '@/lib/constants';
import { cn, truncate } from '@/lib/utils';
import { UploadButton } from '@/modules/pdf/PdfUpload';

export function TopNav({ className }: { className?: string }) {
  const navigate = useNavigate();
  const paper = usePaperStore((s) => s.currentPaper);
  const runMode = useAppStore((s) => s.runMode);
  const apiStatus = useAppStore((s) => s.apiStatus);
  const openSettings = useAppStore((s) => s.openSettings);

  const mode = RUN_MODE_META[runMode];
  const api = API_STATUS_META[apiStatus.code];

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-3 sm:px-4',
        className,
      )}
    >
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-ink-50"
        aria-label="Research Reader 首页"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <BookGlyph />
        </span>
        <span className="hidden text-[15px] font-semibold tracking-tight text-ink-900 sm:block">
          Research Reader
        </span>
      </button>

      <div className="mx-1 hidden h-5 w-px bg-ink-200 sm:block" />

      {paper ? (
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-ink-600"
          title={paper.title}
        >
          {truncate(paper.title, 48)}
        </span>
      ) : (
        <span className="flex-1 text-sm text-ink-400">未打开论文</span>
      )}

      <div className="flex items-center gap-2">
        <Badge tone={api.tone} dot className="hidden md:inline-flex">
          {api.label}
        </Badge>
        <Badge tone={runMode === 'real' ? 'success' : runMode === 'demo' ? 'info' : 'neutral'} icon={<Sparkles className="h-3 w-3" />}>
          {mode.short}
        </Badge>

        <UploadButton size="sm" label="上传" />
        <IconButton
          label="设置与 API 配置"
          icon={<Settings className="h-[18px] w-[18px]" />}
          onClick={openSettings}
        />
        <Button variant="outline" size="sm" leftIcon={<Home className="h-4 w-4" />} onClick={() => navigate('/')}>
          <span className="hidden lg:inline">返回首页</span>
        </Button>
      </div>
    </header>
  );
}

function BookGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 7.5h7M9 11h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}