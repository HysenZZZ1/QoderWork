import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, ListTree, PanelLeftClose, Search, Sparkles, X } from 'lucide-react';
import { IconButton, Tooltip } from '@/components/ui';
import { usePaperStore } from '@/store/usePaperStore';
import { useAppStore } from '@/store/useAppStore';
import type { OutlineNode } from '@/types';
import { searchPaper } from './pdfSearch';
import { cn, truncate } from '@/lib/utils';

export function OutlineSidebar() {
  const paper = usePaperStore((s) => s.currentPaper);
  const currentPage = usePaperStore((s) => s.currentPage);
  const setCurrentPage = usePaperStore((s) => s.setCurrentPage);
  const searchTerm = usePaperStore((s) => s.searchTerm);
  const setSearchTerm = usePaperStore((s) => s.setSearchTerm);
  const toggleLeft = useAppStore((s) => s.toggleLeft);

  const [focusedHit, setFocusedHit] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => searchPaper(paper, searchTerm), [paper, searchTerm]);
  const searching = !!searchTerm.trim();

  // 当前阅读章节高亮：取页码 <= 当前页的最后一个目录节点
  const activeTrail = useMemo(() => {
    if (!paper?.outline?.length) return new Set<string>();
    let best: { id: string; pageNumber: number } | null = null;
    const walk = (nodes: OutlineNode[]) => {
      for (const n of nodes) {
        if (n.pageNumber <= currentPage && (!best || n.pageNumber >= best.pageNumber)) best = { id: n.id, pageNumber: n.pageNumber };
        if (n.children?.length) walk(n.children);
      }
    };
    walk(paper.outline);
    return new Set(best ? [(best as { id: string }).id] : []);
  }, [paper, currentPage]);

  // 让当前页在页面导航中可见
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-page="${currentPage}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  const go = (n: number, hitIndex = -1) => {
    setCurrentPage(n);
    setFocusedHit(hitIndex);
  };

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink-200 px-3">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-700">
          <ListTree className="h-4 w-4 text-ink-400" />
          论文目录
        </span>
        <IconButton label="收起目录" tooltipSide="bottom" icon={<PanelLeftClose className="h-[18px] w-[18px]" />} onClick={toggleLeft} />
      </div>

      {/* 全文搜索（与阅读器工具栏共享状态） */}
      <div className="border-b border-ink-200 p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="在全文搜索…"
            className="h-8 w-full rounded-md border border-ink-200 bg-ink-50 pl-8 pr-8 text-[13px] text-ink-700 placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none"
          />
          {searchTerm && (
            <button
              aria-label="清除搜索"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {searching && (
          <p className="mt-1.5 px-0.5 text-[11px] text-ink-400">
            {matches.length
              ? `命中 ${matches.reduce((n, m) => n + m.matches.length, 0)} 处 · ${matches.length} 页 · 点击跳转并高亮`
              : paper?.hasTextLayer
                ? '全文未匹配到该内容'
                : '该 PDF 无文本层，无法全文搜索'}
          </p>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {!paper ? (
          <div className="p-6 text-center text-[13px] text-ink-400">上传论文后显示目录</div>
        ) : searching ? (
          <SearchResults matches={matches} focused={focusedHit} onGo={go} />
        ) : (
          <>
            {paper.outline?.length ? (
              <div className="border-b border-ink-100 p-2">
                <div className="flex items-center justify-between px-1 pb-1 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">章节导航</p>
                  {paper.outlineInferred ? (
                    <Tooltip label="本 PDF 无内嵌书签，此目录由字号启发式识别生成，可能存在误差">
                      <span className="flex cursor-default items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                        <Sparkles className="h-3 w-3" /> 识别推测
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="text-[10px] text-ink-400">PDF 书签</span>
                  )}
                </div>
                {paper.outline.map((n) => (
                  <OutlineItem
                    key={n.id}
                    node={n}
                    active={activeTrail.has(n.id) || n.pageNumber === currentPage}
                    inferred={paper.outlineInferred}
                    onGo={setCurrentPage}
                    depth={0}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3">
                <Tooltip label="未发现内嵌书签，且未能可靠识别标题；使用下方页面导航浏览">
                  <span className="flex items-center gap-1.5 text-[11px] text-ink-400">
                    <FileText className="h-3.5 w-3.5" /> 本文件无可信目录，使用页面导航
                  </span>
                </Tooltip>
              </div>
            )}

            <div className="p-2">
              <p className="px-1 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">页面导航</p>
              <div className="space-y-0.5">
                {paper.pages.map((pg) => (
                  <PageRow key={pg.pageNumber} pg={pg} active={pg.pageNumber === currentPage} onGo={setCurrentPage} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function SearchResults({
  matches,
  focused,
  onGo,
}: {
  matches: ReturnType<typeof searchPaper>;
  focused: number;
  onGo: (page: number, hit: number) => void;
}) {
  if (!matches.length) return <div className="p-6 text-center text-[13px] text-ink-400">未找到匹配内容</div>;
  return (
    <div className="p-2">
      {matches.map((m, i) => (
        <button
          key={m.pageNumber}
          onClick={() => onGo(m.pageNumber, i)}
          className={cn(
            'w-full rounded-md p-2 text-left transition-colors hover:bg-ink-50',
            focused === i && 'bg-brand-50 ring-1 ring-brand-200',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-brand-700">第 {m.pageNumber} 页</span>
            {m.matches.length > 1 && <span className="text-[10px] tabular-nums text-ink-400">{m.matches.length} 处</span>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-500">{truncate(m.snippet, 96)}</p>
        </button>
      ))}
    </div>
  );
}

function PageRow({
  pg,
  active,
  onGo,
}: {
  pg: { pageNumber: number; text: string };
  active: boolean;
  onGo: (n: number) => void;
}) {
  return (
    <button
      data-page={pg.pageNumber}
      onClick={() => onGo(pg.pageNumber)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        active ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold',
          active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500',
        )}
      >
        {pg.pageNumber}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px]">
        {pg.text.trim() ? truncate(pg.text.trim(), 34) : '（无文本 · 图片页）'}
      </span>
    </button>
  );
}

function OutlineItem({
  node,
  active,
  inferred,
  onGo,
  depth,
}: {
  node: OutlineNode;
  active: boolean;
  inferred?: boolean;
  onGo: (n: number) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!node.children?.length;

  return (
    <div>
      <div
        className={cn('flex items-center gap-1 rounded-md pr-2 transition-colors', active ? 'bg-brand-50' : 'hover:bg-ink-50')}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {hasChildren ? (
          <button
            aria-label={open ? '收起' : '展开'}
            onClick={() => setOpen((o) => !o)}
            className="flex h-5 w-5 items-center justify-center rounded text-ink-400 hover:bg-ink-100"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}
        <button
          onClick={() => onGo(node.pageNumber)}
          className={cn('min-w-0 flex-1 py-1.5 text-left text-[12.5px]', active ? 'font-medium text-brand-800' : 'text-ink-600')}
        >
          <span className="line-clamp-1">
            {node.title}
            {inferred && node.kind === 'section' && <span className="ml-1 text-[9px] text-amber-600">?</span>}
          </span>
        </button>
        <span className="shrink-0 text-[10px] tabular-nums text-ink-400">{node.pageNumber}</span>
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((c) => (
            <OutlineItem key={c.id} node={c} active={active && false} inferred={inferred} onGo={onGo} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
