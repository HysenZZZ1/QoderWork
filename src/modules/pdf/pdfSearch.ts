import type { PaperDocument } from '@/types';

/** 单个命中：页码 + 页内文本偏移（用于文本层高亮定位） */
export interface Match {
  pageNumber: number;
  start: number;
  end: number;
}

export interface PageMatches {
  pageNumber: number;
  matches: Match[]; // 相对 page.text 的偏移
  snippet: string; // 首个命中上下文
}

/** 全文搜索：返回每页命中位置（大小写不敏感），供侧栏结果与文本层高亮共用。 */
export function searchPaper(paper: PaperDocument | null, term: string): PageMatches[] {
  if (!paper || !term.trim()) return [];
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const out: PageMatches[] = [];
  for (const pg of paper.pages) {
    if (!pg.text) continue;
    const hay = pg.text.toLowerCase();
    const matches: Match[] = [];
    let idx = hay.indexOf(q);
    while (idx !== -1 && matches.length < 500) {
      matches.push({ pageNumber: pg.pageNumber, start: idx, end: idx + q.length });
      idx = hay.indexOf(q, idx + q.length);
    }
    if (!matches.length) continue;
    const first = matches[0];
    const start = Math.max(0, first.start - 24);
    out.push({
      pageNumber: pg.pageNumber,
      matches,
      snippet: pg.text.slice(start, first.end + 60).trim(),
    });
  }
  return out;
}

export function totalMatches(pages: PageMatches[]): number {
  return pages.reduce((n, p) => n + p.matches.length, 0);
}
