import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parsePdf, releaseRenderDocs, PdfParseError, PdfPasswordNeededError } from './pdfEngine';
import { usePaperStore } from '@/store/usePaperStore';
import { useAppStore } from '@/store/useAppStore';
import { findRecordByFile, upsertRecord } from '@/lib/idb';
import { MAX_PDF_BYTES, ROUTES } from '@/lib/constants';
import { formatBytes, truncate } from '@/lib/utils';

/**
 * 上传流水线（单例）：校验 → 解析（分阶段进度）→ 恢复阅读位置 → 写入 IndexedDB 记录 → 进入阅读器。
 * 加密 PDF 触发密码弹窗（PdfUploadFeedback），提交后经 retryWithPassword 继续。
 */

let navRef: ((to: string) => void) | null = null;
let pendingFile: File | null = null;

const store = () => usePaperStore.getState();

async function run(file: File, password?: string) {
  const { setPaper, setLoading, setParseProgress, setParseError, setPasswordPending } = store();
  const toast = useAppStore.getState().toast;

  setLoading(true);
  setParseError(null);
  setPasswordPending(null);

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    setParseError('文件类型不支持：仅支持 PDF 文件');
    toast('仅支持 PDF 文件', 'danger');
    return;
  }
  if (file.size === 0) {
    setParseError('文件为空（0 字节），无法解析');
    toast('文件为空，无法解析', 'danger');
    return;
  }
  if (file.size > MAX_PDF_BYTES) {
    const msg = `文件超过 ${formatBytes(MAX_PDF_BYTES)} 上限，请拆分或压缩后重试`;
    setParseError(msg);
    toast(msg, 'danger');
    return;
  }

  try {
    const paper = await parsePdf(file, setParseProgress, password);

    // 恢复上次阅读位置（同一文件：名称+大小匹配历史记录）
    let resumePage = 1;
    if (paper.source === 'upload') {
      const rec = await findRecordByFile(file.name, file.size).catch(() => undefined);
      if (rec && rec.currentPage > 1 && rec.currentPage <= paper.totalPages) resumePage = rec.currentPage;
    }

    setPaper(paper, file, resumePage);
    void releaseRenderDocs(paper.id).catch(() => undefined);
    void upsertRecord(paper, file).catch(() => undefined);

    if (!paper.hasTextLayer) {
      toast('文本提取失败：该 PDF 可能是扫描版（图片型），可正常阅读但暂不支持 AI 分析', 'warning');
    } else if (resumePage > 1) {
      toast(`已载入《${truncate(paper.title, 24)}》，恢复到第 ${resumePage} 页`, 'success');
    } else {
      toast(`已载入《${truncate(paper.title, 28)}》`, 'success');
    }
    (navRef ?? ((to: string) => (window.location.pathname = to)))(ROUTES.reader);
  } catch (err) {
    if (err instanceof PdfPasswordNeededError) {
      pendingFile = file;
      setPasswordPending(err.fileName);
      return;
    }
    const msg =
      err instanceof PdfParseError
        ? err.message
        : `PDF 解析失败：${(err as Error)?.message || '文件可能已损坏'}`;
    setParseError(msg);
    toast(msg, 'danger');
  }
}

/** 密码弹窗提交：带上密码重跑流水线。 */
export async function retryWithPassword(password: string) {
  const file = pendingFile;
  pendingFile = null;
  if (!file) return;
  await run(file, password);
}

export function cancelPasswordPrompt() {
  pendingFile = null;
  store().setPasswordPending(null);
  store().setParseError('已取消：该 PDF 需要密码才能打开');
}

/** 组件侧钩子：绑定路由导航并返回上传函数。 */
export function usePdfUpload() {
  const navigate = useNavigate();
  useEffect(() => {
    navRef = navigate;
  }, [navigate]);
  return useCallback((file: File | null | undefined) => {
    if (file) void run(file);
  }, []);
}
