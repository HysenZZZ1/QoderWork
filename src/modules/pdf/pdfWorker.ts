import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// 由 Vite 以 ?url 方式打包 worker，保证纯前端可离线运行、无外部 CDN 依赖。
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };
export type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';