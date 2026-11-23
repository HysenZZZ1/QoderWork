import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, FileUp, Loader2, Lock, TriangleAlert, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn, formatBytes } from '@/lib/utils';
import { MAX_PDF_BYTES } from '@/lib/constants';
import { useAppStore } from '@/store/useAppStore';
import { usePaperStore } from '@/store/usePaperStore';
import { usePdfUpload, cancelPasswordPrompt, retryWithPassword } from './usePdfUpload';

/** 顶栏/卡片使用：点击触发文件选择。 */
export function UploadButton({
  label = '上传论文',
  variant = 'primary',
  size = 'md',
  className,
  icon = true,
  compact = false,
}: {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = usePdfUpload();
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        aria-label={compact ? label : undefined}
        leftIcon={icon || compact ? <Upload className="h-4 w-4" /> : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {compact ? <span className="hidden sm:inline">{label}</span> : label}
      </Button>
      <HiddenInput ref={inputRef} onFile={upload} />
    </>
  );
}

/** 首页主入口：点击 + 拖拽上传。 */
export function PdfDropzone({ className, children }: { className?: string; children?: ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = usePdfUpload();
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
        dragging
          ? 'border-brand-500 bg-brand-50 scale-[1.01]'
          : 'border-ink-300 bg-white hover:border-brand-400 hover:bg-brand-50/40',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
          dragging ? 'bg-brand-100 text-brand-600' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-100',
        )}
      >
        <FileUp className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-ink-800">
          {dragging ? '松开以载入论文' : '点击或拖拽 PDF 到此区域'}
        </p>
        <p className="text-xs text-ink-500">
          支持 PDF · 单文件最大 {formatBytes(MAX_PDF_BYTES)} · 全部在本地浏览器解析，不上传服务器
        </p>
      </div>
      {children}
      <HiddenInput ref={inputRef} onFile={upload} />
    </div>
  );
}

/** 载入随站点本地部署的内置示例论文（用于体验阅读器与自动化测试）。 */
export function LoadSampleButton({
  label = '阅读示例论文',
  variant = 'outline',
  size = 'md',
  className,
}: {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const upload = usePdfUpload();
  const toast = useAppStore((s) => s.toast);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}samples/sample-paper.pdf`);
      if (!res.ok) throw new Error('missing');
      const buf = await res.arrayBuffer();
      const file = new File([buf], 'PS2A.pdf', { type: 'application/pdf' });
      await upload(file);
    } catch {
      toast('示例论文加载失败', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={loading}
      leftIcon={<BookOpen className="h-4 w-4" />}
      onClick={load}
    >
      {label}
    </Button>
  );
}

const HiddenInput = forwardRef<HTMLInputElement, { onFile: (f: File) => void }>(function HiddenInput(
  { onFile },
  ref,
) {
  return (
    <input
      ref={ref}
      type="file"
      accept="application/pdf,.pdf"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onFile(file);
        e.target.value = '';
      }}
    />
  );
});

// ============ 全局上传反馈：解析进度 / 失败提示 / 加密 PDF 密码 ============

const PHASE_LABEL: Record<string, string> = {
  loading: '读取文件',
  parsing: '解析文档结构',
  extracting: '提取页面文本',
  rendering: '渲染页面',
};

export function PdfUploadFeedback() {
  const isLoading = usePaperStore((s) => s.isLoading);
  const progress = usePaperStore((s) => s.parseProgress);
  const parseError = usePaperStore((s) => s.parseError);
  const setParseError = usePaperStore((s) => s.setParseError);
  const passwordPending = usePaperStore((s) => s.passwordPending);
  const [pwd, setPwd] = useState('');

  useEffect(() => {
    if (passwordPending) setPwd('');
  }, [passwordPending]);

  return (
    <>
      {isLoading && progress && !passwordPending && (
        <div className="fixed bottom-6 left-1/2 z-[60] w-[320px] -translate-x-1/2 rounded-lg border border-ink-200 bg-white p-3 shadow-pop">
          <div className="flex items-center justify-between text-[12px] font-medium text-ink-700">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
              {PHASE_LABEL[progress.phase] ?? '解析中'}…
            </span>
            <span className="tabular-nums text-ink-500">{progress.percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-400">全部在浏览器本地解析，不上传服务器</p>
        </div>
      )}

      {parseError && !passwordPending && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex w-[min(420px,92vw)] -translate-x-1/2 items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 shadow-pop">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium leading-snug text-red-800">{parseError}</p>
            <p className="mt-0.5 text-[11px] text-red-500">文件未被修改；可修正后重新上传。</p>
          </div>
          <button
            aria-label="关闭提示"
            onClick={() => setParseError(null)}
            className="rounded p-0.5 text-red-400 hover:bg-red-100 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {passwordPending && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-[1px]">
          <form
            className="w-[min(380px,92vw)] rounded-xl border border-ink-200 bg-white p-5 shadow-pop"
            onSubmit={(e) => {
              e.preventDefault();
              if (pwd) void retryWithPassword(pwd);
            }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink-900">该 PDF 已加密</p>
                <p className="text-[12px] text-ink-500">输入打开密码以继续（仅本次使用，不会被保存）</p>
              </div>
            </div>
            <p className="mt-3 truncate rounded-md bg-ink-50 px-2.5 py-1.5 text-[12px] text-ink-600">{passwordPending}</p>
            <input
              autoFocus
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="文档打开密码"
              className="mt-3 h-9 w-full rounded-md border border-ink-200 px-3 text-[13px] text-ink-800 focus:border-brand-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  cancelPasswordPrompt();
                }}
              >
                取消
              </Button>
              <Button type="submit" size="sm" disabled={!pwd}>
                解锁并打开
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}