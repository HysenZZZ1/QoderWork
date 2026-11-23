import { pdfjsLib } from './pdfWorker';
import type { PageViewport } from 'pdfjs-dist';

type TextContent = Awaited<ReturnType<import('./pdfWorker').PDFPageProxy['getTextContent']>>;

/**
 * 用 PDF.js TextLayer 渲染真实可选中的透明文本层（配合 canvas 高清渲染，非截图方案）。
 * 用法与官方 viewer 的 TextLayerBuilder 一致：传入 CSS viewport 并设置 --scale-factor。
 */
export async function renderTextLayer(
  textContent: TextContent,
  container: HTMLElement,
  viewport: PageViewport,
): Promise<void> {
  container.style.setProperty('--scale-factor', String(viewport.scale));
  const layer = new pdfjsLib.TextLayer({
    textContentSource: textContent,
    container,
    viewport,
  });
  await layer.render();
  const endOfContent = document.createElement('div');
  endOfContent.className = 'endOfContent';
  container.appendChild(endOfContent);
}

/** 清除旧的 <em> 高亮并 normalize 文本节点。 */
export function clearHighlights(container: HTMLElement) {
  container.querySelectorAll('em.pdf-hit').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  container.querySelectorAll('span').forEach((s) => s.normalize());
}

/**
 * 在已渲染文本层上高亮搜索词（大小写不敏感）。
 * 与 pdf.js 官方查找一致：把各 span 文本拼成字符流，按流内偏移用 Range 包裹命中区间，
 * 天然支持跨 span（词被拆到多个文本项）的场景。
 */
export function highlightTerm(container: HTMLElement, term: string): number {
  clearHighlights(container);
  const q = term.trim().toLowerCase();
  if (!q) return 0;

  const spans = Array.from(container.querySelectorAll<HTMLElement>('span'));
  let stream = '';
  const segments: { el: HTMLElement; start: number; text: string }[] = [];
  for (const el of spans) {
    if (el.classList.contains('markedContent')) continue;
    const text = el.textContent ?? '';
    if (!text) continue;
    segments.push({ el, start: stream.length, text });
    stream += text;
  }
  const hay = stream.toLowerCase();

  let count = 0;
  let idx = hay.indexOf(q);
  while (idx !== -1 && count < 300) {
    const end = idx + q.length;
    for (const seg of segments) {
      const segEnd = seg.start + seg.text.length;
      if (segEnd <= idx || seg.start >= end) continue;
      const s = Math.max(0, idx - seg.start);
      const e = Math.min(seg.text.length, end - seg.start);
      try {
        const node = firstTextNode(seg.el);
        if (!node || node.length < e) continue;
        const range = document.createRange();
        range.setStart(node, s);
        range.setEnd(node, e);
        const mark = document.createElement('em');
        mark.className = 'pdf-hit';
        range.surroundContents(mark);
      } catch {
        /* 结构边界异常：跳过该段 */
      }
    }
    count++;
    idx = hay.indexOf(q, end);
  }
  return count;
}

function firstTextNode(el: Node): Text | null {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) return child as Text;
    const inner = firstTextNode(child);
    if (inner) return inner;
  }
  return null;
}
