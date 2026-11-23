import { pdfjsLib, type PDFDocumentProxy } from './pdfWorker';
import type { OutlineNode, PageText, PaperDocument, ParseProgress, TextBlock } from '@/types';
import { uid } from '@/lib/utils';

export type PdfParseErrorKind = 'invalid' | 'password_wrong' | 'missing' | 'empty' | 'unknown';

/** 带类别的解析错误，UI 依据 kind 给出诚实提示。 */
export class PdfParseError extends Error {
  constructor(readonly kind: PdfParseErrorKind, message: string) {
    super(message);
    this.name = 'PdfParseError';
  }
}

/** 需要密码的异常（pdfjs PasswordException code=1），由上传流程弹窗收集密码。 */
export class PdfPasswordNeededError extends Error {
  constructor(readonly fileName: string) {
    super('该 PDF 已加密，需要密码');
    this.name = 'PdfPasswordNeededError';
  }
}

/**
 * 渲染所需的 PDFDocumentProxy 缓存。
 * parsePdf 加载一次后缓存，PdfViewer 复用，避免重复加载与 StrictMode 双挂载开销。
 */
const renderDocs = new Map<string, PDFDocumentProxy>();

/** 供 PdfViewer 复用已加载的 proxy（按论文 id）。 */
export function getRenderDoc(id: string): PDFDocumentProxy | null {
  return renderDocs.get(id) ?? null;
}

/** 释放除 keepId 外的全部缓存 proxy，避免多次上传累积内存。 */
export async function releaseRenderDocs(keepId?: string): Promise<void> {
  const stale: PDFDocumentProxy[] = [];
  for (const [id, doc] of renderDocs) {
    if (id !== keepId) {
      renderDocs.delete(id);
      stale.push(doc);
    }
  }
  await Promise.all(stale.map((d) => d.destroy().catch(() => undefined)));
}

export async function loadPdf(data: ArrayBuffer, password?: string): Promise<PDFDocumentProxy> {
  const task = pdfjsLib.getDocument({
    data,
    password,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  return task.promise;
}

function classifyLoadError(err: unknown, fileName: string): Error {
  const e = err as { name?: string; code?: number; message?: string };
  if (e?.name === 'PasswordException') {
    // code=1 需要密码；code=2 密码错误
    if (e.code === 2) return new PdfParseError('password_wrong', '密码错误，无法打开该加密 PDF');
    return new PdfPasswordNeededError(fileName);
  }
  if (e?.name === 'InvalidPDFException') return new PdfParseError('invalid', '文件已损坏或不是有效的 PDF，无法解析');
  if (e?.name === 'MissingPDFException') return new PdfParseError('missing', '文件缺失或读取失败，请重新选择文件');
  return new PdfParseError('unknown', `PDF 加载失败：${e?.message || '未知原因'}`);
}

/** 逐页提取文本与文本块（含页码与定位信息）；按页上报进度。扫描版无文本层时 hasTextLayer=false。 */
export async function extractPages(
  proxy: PDFDocumentProxy,
  onProgress?: (done: number, total: number) => void,
): Promise<{ pages: PageText[]; hasTextLayer: boolean }> {
  const pages: PageText[] = [];
  let totalChars = 0;

  for (let p = 1; p <= proxy.numPages; p++) {
    const page = await proxy.getPage(p);
    const content = await page.getTextContent();

    const blocks: TextBlock[] = [];
    let text = '';
    for (const raw of content.items) {
      const item = raw as { str?: string; transform?: number[]; width?: number; height?: number };
      if (typeof item.str !== 'string' || !item.str) continue;
      const [, , , , x = 0, y = 0] = item.transform ?? [];
      blocks.push({
        id: uid('blk'),
        pageNumber: p,
        text: item.str,
        bbox: { x, y, width: item.width ?? 0, height: item.height ?? 0 },
      });
      text += item.str + ' ';
    }
    text = text.replace(/[ \t]+/g, ' ').trim();
    totalChars += text.replace(/\s/g, '').length;
    pages.push({ pageNumber: p, text, blocks });
    page.cleanup();
    onProgress?.(p, proxy.numPages);
  }

  return { pages, hasTextLayer: totalChars > 40 };
}

/** 解析 PDF 书签；无法解析命名目标时安全降级为空数组。 */
export async function getOutline(proxy: PDFDocumentProxy): Promise<OutlineNode[]> {
  let raw: Awaited<ReturnType<PDFDocumentProxy['getOutline']>> | null = null;
  try {
    raw = await proxy.getOutline();
  } catch {
    return [];
  }
  if (!raw || !raw.length) return [];

  async function resolvePage(dest: unknown): Promise<number | null> {
    try {
      let d = dest;
      if (typeof d === 'string') d = await proxy.getDestination(d);
      if (Array.isArray(d) && d[0]) {
        const idx = await proxy.getPageIndex(d[0] as never);
        return idx + 1;
      }
    } catch {
      return null;
    }
    return null;
  }

  async function walk(nodes: NonNullable<typeof raw>): Promise<OutlineNode[]> {
    const out: OutlineNode[] = [];
    for (const node of nodes) {
      const pageNumber = await resolvePage(node.dest);
      const children = node.items && node.items.length ? await walk(node.items) : undefined;
      if (pageNumber != null) {
        out.push({
          id: uid('bm'),
          title: node.title?.trim() || `第 ${pageNumber} 页`,
          pageNumber,
          kind: 'bookmark',
          children,
        });
      } else if (children?.length) {
        out.push(...children);
      }
    }
    return out;
  }

  return walk(raw);
}

// ===== 无书签时的可选方案：基于字号的标题启发式识别 =====

const HEADING_PATTERNS = [
  /^(abstract|introduction|related work|conclusion|references|acknowledge?ments?)\b/i,
  /^(\d+(\.\d+)*)\.?\s+\S/,               // 3. Method / 3.1 Overview
  /^[A-Z][A-Za-z]+(\s+[A-Za-z]+){0,6}$/,  // Title Case 短语
];

/**
 * 按字号对比从文本项识别疑似章节标题（纯本地启发式，非 PDF 书签）。
 * 结果 kind='section'，UI 必须标注为“推测目录”；识别质量低时返回空数组，宁缺毋滥。
 */
export async function detectHeadings(proxy: PDFDocumentProxy): Promise<OutlineNode[]> {
  const perPage: { pageNumber: number; items: { str: string; h: number }[] }[] = [];
  let heightSum = 0;
  let heightCount = 0;

  for (let p = 1; p <= proxy.numPages; p++) {
    const page = await proxy.getPage(p);
    const content = await page.getTextContent();
    const items: { str: string; h: number }[] = [];
    for (const raw of content.items) {
      const item = raw as { str?: string; height?: number; transform?: number[] };
      if (typeof item.str !== 'string' || !item.str.trim()) continue;
      const t = item.str.trim();
      const h =
        Math.abs(item.height ?? 0) ||
        Math.hypot(item.transform?.[2] ?? 0, item.transform?.[3] ?? 0);
      items.push({ str: t, h });
      if (h > 0 && t.length > 2) {
        heightSum += h;
        heightCount++;
      }
    }
    perPage.push({ pageNumber: p, items });
    page.cleanup();
  }
  if (!heightCount) return [];
  const median = heightSum / heightCount;
  if (median <= 0) return [];

  const candidates: { pageNumber: number; title: string }[] = [];
  for (const pg of perPage) {
    for (const it of pg.items) {
      const t = it.str;
      if (t.length < 3 || t.length > 70) continue;
      if (/[.,;:]$/.test(t)) continue;
      if (it.h < median * 1.22) continue;
      if (!HEADING_PATTERNS.some((re) => re.test(t))) continue;
      candidates.push({ pageNumber: pg.pageNumber, title: t });
    }
  }

  // 去重：同页重复只留一次；相邻页重复（页眉/页脚）剔除
  const seen = new Set<string>();
  const uniq: typeof candidates = [];
  for (const c of candidates) {
    const key = `${c.pageNumber}:${c.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (
      uniq.some(
        (u) => u.title.toLowerCase() === c.title.toLowerCase() && Math.abs(u.pageNumber - c.pageNumber) <= 1,
      )
    )
      continue;
    uniq.push(c);
  }

  if (uniq.length < 2 || uniq.length > 80) return [];
  return uniq.map((c) => ({
    id: uid('sec'),
    title: c.title,
    pageNumber: c.pageNumber,
    kind: 'section' as const,
  }));
}

/** 上传文件 → 标准化 PaperDocument（保留每页文本、块信息与页码）。 */
export async function parsePdf(
  file: File,
  onProgress?: (p: ParseProgress) => void,
  password?: string,
): Promise<PaperDocument> {
  onProgress?.({ phase: 'loading', percent: 8 });
  const buffer = await file.arrayBuffer();

  const paperId = uid('paper');
  onProgress?.({ phase: 'parsing', percent: 20 });
  let proxy: PDFDocumentProxy;
  try {
    proxy = await loadPdf(buffer, password);
  } catch (err) {
    throw classifyLoadError(err, file.name);
  }

  if (proxy.numPages === 0) {
    await proxy.destroy().catch(() => undefined);
    throw new PdfParseError('empty', '该 PDF 不包含任何页面（空白文档）');
  }

  renderDocs.set(paperId, proxy);

  const { pages, hasTextLayer } = await extractPages(proxy, (done, total) => {
    onProgress?.({ phase: 'extracting', percent: Math.round(30 + (done / total) * 55) });
  });

  onProgress?.({ phase: 'extracting', percent: 90 });
  let outline = await getOutline(proxy);
  let outlineInferred = false;
  if (!outline.length) {
    outline = await detectHeadings(proxy).catch(() => [] as OutlineNode[]);
    outlineInferred = outline.length > 0;
  }

  const info = (await proxy.getMetadata().catch(() => null))?.info as
    | { Title?: string; Author?: string }
    | undefined;
  const rawTitle = info?.Title?.trim();
  // 元数据 Title 常为内部生成物名（如 xxx.eps），此类值不作为论文标题
  const metaUsable = rawTitle && rawTitle.length > 3 && !/\.(eps|ai|ps)$/i.test(rawTitle);
  const title = metaUsable ? rawTitle : file.name.replace(/\.pdf$/i, '');

  onProgress?.({ phase: 'extracting', percent: 100 });

  return {
    id: paperId,
    fileName: file.name,
    title,
    totalPages: proxy.numPages,
    text: pages.map((pg) => pg.text).join('\n\n'),
    pages,
    createdAt: Date.now(),
    source: 'upload',
    hasTextLayer,
    fileSize: file.size,
    authors: info?.Author?.trim() ? [info.Author.trim()] : undefined,
    outline: outline.length ? outline : undefined,
    outlineInferred: outlineInferred || undefined,
  };
}
