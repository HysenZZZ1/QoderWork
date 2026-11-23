import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  FileUp,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { Badge, Button, EmptyState, IconButton, Tooltip } from '@/components/ui';
import { usePaperStore } from '@/store/usePaperStore';
import { useAppStore } from '@/store/useAppStore';
import { getRenderDoc } from './pdfEngine';
import type { PDFDocumentProxy } from './pdfWorker';
import { LoadSampleButton, UploadButton } from './PdfUpload';
import { renderTextLayer, highlightTerm } from './textLayer';
import { searchPaper, totalMatches } from './pdfSearch';
import { saveProgress } from '@/lib/idb';
import { MAX_SCALE, MIN_SCALE, SCALE_STEP } from '@/lib/constants';
import { clamp, cn } from '@/lib/utils';

type FitMode = 'width' | 'page' | 'custom';
const GUTTER = 64;

/** 画布抽样是否存在“内容像素”（非白、非透明）；pdf.js 后台停摆时用于确认像素已绘制。 */
function hasInk(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): boolean {
  try {
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const step = Math.max(4, Math.floor(d.length / 4 / 4096)) * 4;
    for (let i = 0; i < d.length; i += step) {
      if (d[i + 3] !== 0 && (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235)) return true;
    }
  } catch {
    /* getImageData 失败时按无内容处理 */
  }
  return false;
}

export function PdfViewer() {
  const paper = usePaperStore((s) => s.currentPaper);
  const file = usePaperStore((s) => s.currentFile);
  const currentPage = usePaperStore((s) => s.currentPage);
  const setCurrentPage = usePaperStore((s) => s.setCurrentPage);
  const nextPage = usePaperStore((s) => s.nextPage);
  const prevPage = usePaperStore((s) => s.prevPage);
  const searchTerm = usePaperStore((s) => s.searchTerm);
  const setSearchTerm = usePaperStore((s) => s.setSearchTerm);
  const setSelection = usePaperStore((s) => s.setSelection);
  const selectionRef = usePaperStore((s) => s.selectionRef);
  const setAiTab = useAppStore((s) => s.setAiTab);
  const toast = useAppStore((s) => s.toast);
  const navigate = useNavigate();

  const outerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef(new Map<number, HTMLDivElement>());
  const observedPage = useRef(0);
  const renderedPages = useRef(new Set<number>());

  const [proxy, setProxy] = useState<PDFDocumentProxy | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [customScale, setCustomScale] = useState(1.1);
  const [rotation, setRotation] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [base, setBase] = useState({ w: 612, h: 792 });
  const [isFs, setIsFs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderedCount, setRenderedCount] = useState(0);
  const [termDraft, setTermDraft] = useState('');
  const [hitIdx, setHitIdx] = useState(0);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number; text: string; page: number } | null>(null);

  // 绑定已加载的 proxy
  useEffect(() => {
    if (!paper) {
      setProxy(null);
      return;
    }
    const doc = getRenderDoc(paper.id);
    setProxy(doc);
    if (!doc) setError('文档已卸载，请重新上传');
    else setError(null);
    observedPage.current = 0;
    renderedPages.current.clear();
    setRenderedCount(0);
  }, [paper]);

  // 容器尺寸监听
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [proxy]);

  // 全屏状态
  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === outerRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // 从后台标签页返回时：补渲染此前因 rAF 停摆而未完成的页面
  const [visEpoch, setVisEpoch] = useState(0);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setVisEpoch((e) => e + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // 基准页尺寸（适应宽度/页面用；含页面自带旋转与用户旋转）
  useEffect(() => {
    if (!proxy) return;
    let cancelled = false;
    void (async () => {
      try {
        const page = await proxy.getPage(1);
        const vp = page.getViewport({ scale: 1, rotation: (((page.rotate + rotation) % 360) + 360) % 360 });
        if (!cancelled) setBase({ w: vp.width, h: vp.height });
      } catch {
        /* 使用默认尺寸 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proxy, rotation]);

  const scale = useMemo(() => {
    if (fitMode === 'width') return clamp(size.w > 0 ? (size.w - GUTTER) / base.w : 1, MIN_SCALE, MAX_SCALE);
    if (fitMode === 'page')
      return clamp(
        size.w > 0 && size.h > 0 ? Math.min((size.w - GUTTER) / base.w, (size.h - GUTTER) / base.h) : 1,
        MIN_SCALE,
        MAX_SCALE,
      );
    return clamp(customScale, MIN_SCALE, MAX_SCALE);
  }, [fitMode, customScale, size, base]);

  const scrollToPage = useCallback((n: number, behavior: ScrollBehavior = 'auto') => {
    const el = pageEls.current.get(n);
    const sc = scrollRef.current;
    if (!el || !sc) return;
    sc.scrollTo({ top: el.offsetTop - 20, behavior });
  }, []);

  // 外部（工具栏/目录/搜索）跳页 → 滚动定位
  useEffect(() => {
    if (!paper || !proxy) return;
    if (currentPage !== observedPage.current) scrollToPage(currentPage, 'smooth');
  }, [currentPage, paper, proxy, scrollToPage]);

  // 缩放/旋转变化后重新锚定当前页
  useEffect(() => {
    if (!proxy) return;
    const id = requestAnimationFrame(() => scrollToPage(currentPage));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, rotation]);

  // 缩放变化后各页重新渲染，重置计数
  useEffect(() => {
    renderedPages.current.clear();
    setRenderedCount(0);
  }, [scale, rotation, proxy]);

  const registerPage = useCallback((n: number, el: HTMLDivElement | null) => {
    if (el) pageEls.current.set(n, el);
    else pageEls.current.delete(n);
  }, []);

  const onPageRendered = useCallback((n: number) => {
    renderedPages.current.add(n);
    setRenderedCount(renderedPages.current.size);
  }, []);

  // 滚动 → 当前页同步
  const scrollTick = useRef(0);
  const handleScroll = () => {
    if (scrollTick.current) return;
    scrollTick.current = requestAnimationFrame(() => {
      scrollTick.current = 0;
      const sc = scrollRef.current;
      if (!sc) return;
      const probe = sc.scrollTop + sc.clientHeight * 0.3;
      // 取覆盖探测线的最小页号（页面自上而下排列）
      let page = 1;
      let best = Number.POSITIVE_INFINITY;
      for (const [n, el] of pageEls.current) {
        if (el.offsetTop <= probe && el.offsetTop + el.offsetHeight > sc.scrollTop) best = Math.min(best, n);
      }
      if (Number.isFinite(best)) page = best;
      if (page !== currentPage) {
        observedPage.current = page;
        setCurrentPage(page);
      }
    });
  };

  // 阅读进度持久化（IndexedDB，防抖）
  useEffect(() => {
    if (!paper) return;
    const id = setTimeout(() => void saveProgress(paper.id, currentPage, paper.totalPages).catch(() => undefined), 700);
    return () => clearTimeout(id);
  }, [paper, currentPage]);

  // 搜索：debounce 写入 store
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(termDraft), 250);
    return () => clearTimeout(id);
  }, [termDraft, setSearchTerm]);

  const hitPages = useMemo(() => searchPaper(paper, searchTerm), [paper, searchTerm]);
  const hitTotal = useMemo(() => totalMatches(hitPages), [hitPages]);

  useEffect(() => setHitIdx(0), [searchTerm]);

  const goHit = (delta: number) => {
    if (!hitPages.length) return;
    const idx = (hitIdx + delta + hitPages.length) % hitPages.length;
    setHitIdx(idx);
    const page = hitPages[idx].pageNumber;
    setCurrentPage(page);
  };

  // 文本选中 → 引用接口（论文 id + 页码 + 文本）
  const handleMouseUp = () => {
    window.setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (!sel || !text || !scrollRef.current || !sel.rangeCount) {
        setFloatPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!scrollRef.current.contains(range.commonAncestorContainer)) {
        setFloatPos(null);
        return;
      }
      if (text.length > 5000) {
        setFloatPos(null);
        return;
      }
      const parentEl =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as HTMLElement)
          : range.startContainer.parentElement;
      const pageEl = parentEl?.closest<HTMLElement>('[data-page]');
      const pageNumber = Number(pageEl?.dataset.page ?? currentPage) || currentPage;
      setSelection(text, pageNumber);
      const rect = range.getBoundingClientRect();
      const host = scrollRef.current.getBoundingClientRect();
      setFloatPos({
        x: clamp(rect.right - host.left - 60, 8, Math.max(8, host.width - 150)),
        y: clamp(rect.top - host.top + scrollRef.current.scrollTop - 44, 8, 100000),
        text,
        page: pageNumber,
      });
    }, 0);
  };

  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void outerRef.current?.requestFullscreen?.();
    else void document.exitFullscreen();
  };

  const zoomBy = (delta: number) => {
    setFitMode('custom');
    setCustomScale((s) => clamp((fitMode === 'custom' ? s : scale) + delta, MIN_SCALE, MAX_SCALE));
  };

  // ===== 空状态 =====
  if (!paper) {
    return (
      <div className="flex h-full flex-col bg-canvas">
        <ViewerToolbar disabled />
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={<FileUp className="h-7 w-7" />}
            title="还没有打开论文"
            description="上传 PDF 后在此阅读。核心阅读功能不依赖任何 API。"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <UploadButton size="md" label="上传论文" />
                <LoadSampleButton />
                <Button variant="ghost" onClick={() => navigate('/')}>
                  返回首页
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const renderDone = !proxy || error ? 0 : renderedCount;

  return (
    <div ref={outerRef} className="flex h-full flex-col bg-ink-100">
      <ViewerToolbar
        page={currentPage}
        total={paper.totalPages}
        scale={scale}
        disabled={!!error || !proxy}
        isFirst={currentPage <= 1}
        isLast={currentPage >= paper.totalPages}
        fitMode={fitMode}
        isFs={isFs}
        termDraft={termDraft}
        onTermDraft={setTermDraft}
        hits={{ pages: hitPages.length, total: hitTotal, idx: hitIdx }}
        onPrevHit={() => goHit(-1)}
        onNextHit={() => goHit(1)}
        onPrev={prevPage}
        onNext={nextPage}
        onGoTo={setCurrentPage}
        onZoomIn={() => zoomBy(SCALE_STEP)}
        onZoomOut={() => zoomBy(-SCALE_STEP)}
        onFitWidth={() => setFitMode('width')}
        onFitPage={() => setFitMode('page')}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        onFullscreen={toggleFullscreen}
        onDownload={download}
      />

      {error ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<FileUp className="h-7 w-7" />}
            title={error}
            description="请重新上传论文以继续阅读。"
            action={<UploadButton size="md" label="重新上传" />}
          />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            onMouseUp={handleMouseUp}
            onMouseDown={() => setFloatPos(null)}
            className="h-full overflow-auto"
          >
            <div className="flex min-h-full flex-col items-center gap-4 px-4 py-5">
              {proxy &&
                Array.from({ length: paper.totalPages }, (_, i) => i + 1).map((n) => (
                  <PageView
                    key={n}
                    proxy={proxy}
                    pageNumber={n}
                    scale={scale}
                    rotation={rotation}
                    term={searchTerm}
                    rootRef={scrollRef}
                    fallback={base}
                    activeWindow={Math.abs(n - currentPage) <= 3}
                    visEpoch={visEpoch}
                    onRegister={registerPage}
                    onRendered={onPageRendered}
                  />
                ))}
            </div>
          </div>

          {/* 选中浮动工具：发送给 AI / 复制 */}
          {floatPos && (
            <div
              className="absolute z-30 flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-1.5 py-1 shadow-pop"
              style={{ left: floatPos.x, top: floatPos.y }}
            >
              <Button
                size="sm"
                leftIcon={<MessageSquareText className="h-3.5 w-3.5" />}
                onClick={() => {
                  setAiTab('qa');
                  toast(`已引用第 ${floatPos.page} 页选中文本，可在 AI 面板提问`, 'success');
                  setFloatPos(null);
                }}
              >
                问 AI（第 {floatPos.page} 页）
              </Button>
              <Tooltip label="复制">
                <IconButton
                  label="复制选中文字"
                  icon={<Copy className="h-4 w-4" />}
                  onClick={() => {
                    void navigator.clipboard.writeText(floatPos.text).then(() => toast('已复制到剪贴板', 'success'));
                    setFloatPos(null);
                  }}
                />
              </Tooltip>
              <Tooltip label="关闭">
                <IconButton label="关闭" icon={<X className="h-4 w-4" />} onClick={() => setFloatPos(null)} />
              </Tooltip>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-ink-200 bg-white px-4 py-1.5 text-[11px] text-ink-500">
        <span>
          第 {currentPage} / {paper.totalPages} 页 · 进度 {Math.round((currentPage / paper.totalPages) * 100)}%
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">
            {selectionRef ? `已引用第 ${selectionRef.pageNumber} 页选中文本` : '选中文本可浮动引用给 AI · 文本层已启用'}
          </span>
          {renderDone < paper.totalPages && (
            <span className="flex items-center gap-1 text-brand-600">
              <Loader2 className="h-3 w-3 animate-spin" /> 页面渲染 {renderDone}/{paper.totalPages}
            </span>
          )}
          <Badge tone={paper.hasTextLayer ? 'success' : 'warning'} dot>
            {paper.hasTextLayer ? '可提取文本' : '疑似扫描版'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ============ 单页视图：canvas 高清渲染 + TextLayer 真实文本 ============
interface PageViewProps {
  proxy: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  term: string;
  rootRef: React.RefObject<HTMLDivElement>;
  fallback: { w: number; h: number };
  /** 是否处于当前页附近：直接触发渲染，不依赖 IntersectionObserver（后台窗口 IO 不回调） */
  activeWindow: boolean;
  /** 标签页重新可见计数：触发后台期间未完成的页面补渲染 */
  visEpoch: number;
  onRegister: (n: number, el: HTMLDivElement | null) => void;
  onRendered: (n: number) => void;
}

function PageView({
  proxy,
  pageNumber,
  scale,
  rotation,
  term,
  rootRef,
  fallback,
  activeWindow,
  visEpoch,
  onRegister,
  onRendered,
}: PageViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<{ cancel: () => void } | null>(null);
  const drawingRef = useRef(false);
  const queuedRef = useRef(false);
  const cancelTokenRef = useRef(0);
  const doneScaleRef = useRef<string>('');
  const scaleKeyRef = useRef<string>('');
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [status, setStatus] = useState<'pending' | 'rendering' | 'done' | 'error'>('pending');

  useEffect(() => {
    onRegister(pageNumber, wrapRef.current);
    return () => onRegister(pageNumber, null);
  }, [pageNumber, onRegister]);

  const rot = (rotation + 360) % 360;
  const scaleKey = `${scale.toFixed(4)}|${rot}`;

  // 尺寸测量（布局占位稳定，避免滚动跳动）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const page = await proxy.getPage(pageNumber);
        const baseVp = page.getViewport({ scale: 1, rotation: (((page.rotate ?? 0) + rot) % 360 + 360) % 360 });
        if (cancelled) return;
        setDims({ w: Math.floor(baseVp.width * scale), h: Math.floor(baseVp.height * scale) });
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proxy, pageNumber, scale, rot]);

  const drawImpl = useCallback(async () => {
    scaleKeyRef.current = scaleKey;
    if (drawingRef.current) {
      queuedRef.current = true;
      return;
    }
    if (doneScaleRef.current === scaleKey) return;
    drawingRef.current = true;
    setStatus('rendering');
    try {
      const page = await proxy.getPage(pageNumber);
      const viewport = page.getViewport({ scale, rotation: (page.rotate + rot) % 360 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      cancelTokenRef.current += 1;
      taskRef.current?.cancel();
      const task = page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      taskRef.current = task;
      // 隐藏窗口里 pdf.js 的 render promise 依赖 rAF，可能永不 resolve；用定时器轮询兜底
      let settled = false;
      let failed: unknown;
      task.promise.then(
        () => {
          settled = true;
        },
        (e) => {
          settled = true;
          failed = e;
        },
      );
      const token = ++cancelTokenRef.current;
      const deadline = Date.now() + (document.visibilityState === 'hidden' ? 12000 : 800);
      while (!settled && token === cancelTokenRef.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 25));
      }
      if (token !== cancelTokenRef.current) return; // 本页已被更新的重绘取代
      if (failed) throw failed;
      if (!settled) {
        // 后台标签页 rAF 停摆：pdf.js 不 resolve promise，但像素已画到画布缓冲；
        // 抽样检测非白像素（内容），确认后可继续文本层与状态推进
        if (!hasInk(canvas, ctx)) return;
      }

      const textHost = textRef.current;
      if (textHost) {
        textHost.innerHTML = '';
        const content = await page.getTextContent();
        await renderTextLayer(content, textHost, viewport);
      }
      doneScaleRef.current = scaleKey;
      setStatus('done');
      onRendered(pageNumber);
    } catch (err) {
      if ((err as Error)?.name === 'RenderingCancelledException') return;
      setStatus('error');
    } finally {
      drawingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        if (doneScaleRef.current !== scaleKeyRef.current) void drawRef.current?.();
      }
    }
  }, [proxy, pageNumber, scaleKey, scale, rot, onRendered]);

  // 始终调用最新闭包（避免排队重绘使用过期 scaleKey）
  const drawRef = useRef<() => Promise<void>>(drawImpl);
  drawRef.current = drawImpl;
  const draw = useCallback(() => drawRef.current(), []);

  // 进入视口附近时渲染（可见窗口走 IO；后台/隐藏窗口由 activeWindow 兜底触发）
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void draw();
      },
      { root: rootRef.current, rootMargin: '900px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [draw, rootRef]);

  useEffect(() => {
    if (activeWindow) void draw();
  }, [activeWindow, visEpoch, draw]);

  // 缩放/旋转变化：旧的画布作废
  useEffect(() => {
    if (doneScaleRef.current && doneScaleRef.current !== scaleKey) {
      cancelTokenRef.current += 1;
      taskRef.current?.cancel();
      doneScaleRef.current = '';
      setStatus('pending');
      if (textRef.current) textRef.current.innerHTML = '';
    }
  }, [scaleKey]);

  // 搜索词变化：在当前页文本层高亮
  useEffect(() => {
    if (status !== 'done' || !textRef.current) return;
    if (term.trim()) highlightTerm(textRef.current, term);
    else highlightTerm(textRef.current, '');
  }, [term, status, scaleKey]);

  const w = dims?.w ?? Math.floor(fallback.w * scale);
  const h = dims?.h ?? Math.floor(fallback.h * scale);

  return (
    <div
      data-page={pageNumber}
      ref={wrapRef}
      className="relative shrink-0 rounded-sm bg-white shadow-panel"
      style={{ width: w, height: h }}
    >
      <canvas ref={canvasRef} className="block rounded-sm" />
      <div ref={textRef} className="textLayer" />

      {(status === 'pending' || status === 'rendering') && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-50/60">
          <span className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] text-ink-500 shadow-sm">
            <Loader2 className="h-3 w-3 animate-spin text-brand-600" /> 第 {pageNumber} 页
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-red-200 bg-red-50/60 p-4 text-center">
          <p className="text-[12.5px] font-medium text-red-700">第 {pageNumber} 页加载失败</p>
          <p className="text-[11px] text-red-500">该页可能损坏或渲染异常，其余页面不受影响。</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              doneScaleRef.current = '';
              setStatus('pending');
              void draw();
            }}
          >
            重试本页
          </Button>
        </div>
      )}

      <span className={cn('absolute -bottom-5 right-0 text-[10px] tabular-nums text-ink-400')}>{pageNumber}</span>
    </div>
  );
}

// ============ 工具栏 ============
interface ToolbarProps {
  disabled?: boolean;
  page?: number;
  total?: number;
  scale?: number;
  isFirst?: boolean;
  isLast?: boolean;
  fitMode?: FitMode;
  isFs?: boolean;
  termDraft?: string;
  hits?: { pages: number; total: number; idx: number };
  onTermDraft?: (v: string) => void;
  onPrevHit?: () => void;
  onNextHit?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onGoTo?: (n: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onRotate?: () => void;
  onFullscreen?: () => void;
  onDownload?: () => void;
}

function ViewerToolbar({
  disabled,
  page = 1,
  total = 1,
  scale = 1,
  isFirst,
  isLast,
  fitMode,
  isFs,
  termDraft = '',
  hits,
  onTermDraft,
  onPrevHit,
  onNextHit,
  onPrev,
  onNext,
  onGoTo,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onRotate,
  onFullscreen,
  onDownload,
}: ToolbarProps) {
  const [draftPage, setDraftPage] = useState(String(page));
  useEffect(() => setDraftPage(String(page)), [page]);
  const commitPage = () => {
    const n = Number(draftPage);
    if (Number.isFinite(n)) onGoTo?.(clamp(Math.round(n), 1, total));
  };

  return (
    <div className="flex h-11 shrink-0 flex-wrap items-center gap-1 border-b border-ink-200 bg-white px-2">
      <Tooltip label="上一页">
        <IconButton label="上一页" icon={<ChevronLeft className="h-[18px] w-[18px]" />} disabled={disabled || isFirst} onClick={onPrev} />
      </Tooltip>

      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={total}
          value={draftPage}
          disabled={disabled}
          onChange={(e) => setDraftPage(e.target.value)}
          onBlur={commitPage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitPage();
          }}
          aria-label="跳转到页码"
          className="h-8 w-14 rounded-md border border-ink-200 px-2 text-center text-[13px] text-ink-700 focus:border-brand-500 focus:outline-none"
        />
        <span className="px-0.5 text-xs text-ink-400">/ {total}</span>
      </div>

      <Tooltip label="下一页">
        <IconButton label="下一页" icon={<ChevronRight className="h-[18px] w-[18px]" />} disabled={disabled || isLast} onClick={onNext} />
      </Tooltip>

      <Divider />

      <Tooltip label="缩小">
        <IconButton label="缩小" icon={<ChevronDown className="h-[18px] w-[18px]" />} disabled={disabled} onClick={onZoomOut} />
      </Tooltip>
      <span className="w-11 text-center text-[13px] font-medium tabular-nums text-ink-700">{Math.round(scale * 100)}%</span>
      <Tooltip label="放大">
        <IconButton label="放大" icon={<ChevronUp className="h-[18px] w-[18px]" />} disabled={disabled} onClick={onZoomIn} />
      </Tooltip>

      <Tooltip label="适应宽度">
        <IconButton label="适应宽度" icon={<FitWidthIcon />} disabled={disabled} active={fitMode === 'width'} onClick={onFitWidth} />
      </Tooltip>
      <Tooltip label="适应页面">
        <IconButton label="适应页面" icon={<FitPageIcon />} disabled={disabled} active={fitMode === 'page'} onClick={onFitPage} />
      </Tooltip>

      <Divider />

      <Tooltip label="旋转 90°">
        <IconButton label="旋转" icon={<RotateCw className="h-[18px] w-[18px]" />} disabled={disabled} onClick={onRotate} />
      </Tooltip>
      <Tooltip label={isFs ? '退出全屏' : '全屏阅读'}>
        <IconButton label="全屏" icon={isFs ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />} disabled={disabled} onClick={onFullscreen} />
      </Tooltip>
      <Tooltip label="下载原始 PDF">
        <IconButton label="下载" icon={<Download className="h-[18px] w-[18px]" />} disabled={disabled || !onDownload} onClick={onDownload} />
      </Tooltip>

      {/* 页面搜索 */}
      <div className="ml-auto flex items-center gap-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={termDraft}
            disabled={disabled}
            onChange={(e) => onTermDraft?.(e.target.value)}
            placeholder="页内搜索…"
            aria-label="页面搜索"
            className="h-8 w-32 rounded-md border border-ink-200 bg-ink-50 pl-7 pr-6 text-[12.5px] text-ink-700 placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none lg:w-40"
          />
          {termDraft && (
            <button
              aria-label="清除搜索"
              onClick={() => onTermDraft?.('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {termDraft.trim() ? (
          <span className="whitespace-nowrap text-[11px] tabular-nums text-ink-500">
            {hits?.total ? `${(hits.idx ?? 0) + 1}/${hits.pages} 页` : '0 页命中'}
          </span>
        ) : null}
        <Tooltip label="上一处命中">
          <IconButton label="上一处命中" icon={<ChevronUp className="h-4 w-4" />} disabled={disabled || !hits?.pages} onClick={onPrevHit} />
        </Tooltip>
        <Tooltip label="下一处命中">
          <IconButton label="下一处命中" icon={<ChevronDown className="h-4 w-4" />} disabled={disabled || !hits?.pages} onClick={onNextHit} />
        </Tooltip>
      </div>
    </div>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-ink-200" />;

const FitWidthIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="6" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6 12h12M6 12l2-2M6 12l2 2M18 12l-2-2M18 12l-2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FitPageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="5" y="4" width="14" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
