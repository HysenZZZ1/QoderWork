import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, FileText, History } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { listRecords, type StoredPaper } from '@/lib/idb';
import { UploadButton } from './PdfUpload';
import { usePdfUpload } from './usePdfUpload';
import { formatRelativeTime, truncate } from '@/lib/utils';

/**
 * 首页「最近阅读」：来自 IndexedDB 的真实阅读记录（本浏览器私有），
 * 点击可重新载入该论文并恢复上次阅读页码。
 */
export function RecentReads() {
  const [records, setRecords] = useState<StoredPaper[] | null>(null);
  const upload = usePdfUpload();

  const refresh = useCallback(() => {
    void listRecords()
      .then((r) => setRecords(r.slice(0, 6)))
      .catch(() => setRecords([]));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const open = async (rec: StoredPaper) => {
    const file = new File([rec.blob], rec.fileName, { type: 'application/pdf' });
    upload(file);
  };

  if (records && records.length > 0) {
    return (
      <div className="surface mt-6 divide-y divide-ink-100">
        {records.map((rec) => (
          <button
            key={rec.paperId}
            onClick={() => void open(rec)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <FileText className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-ink-800">{truncate(rec.title, 46)}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-ink-400">
                <span>{truncate(rec.fileName, 26)}</span>
                <span>{rec.totalPages} 页</span>
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" /> {formatRelativeTime(rec.lastOpenedAt)}
                </span>
                <span>第 {rec.currentPage}/{rec.totalPages} 页 · {rec.percent}%</span>
              </span>
              <span className="mt-1.5 block h-1 w-full max-w-[240px] overflow-hidden rounded-full bg-ink-100">
                <span className="block h-full rounded-full bg-brand-500" style={{ width: `${rec.percent}%` }} />
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand-700">
              继续阅读
            </span>
          </button>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-ink-400">
          <span>记录仅保存在此浏览器（IndexedDB），不上传任何服务器；收藏与删除管理在 Phase 5 提供</span>
        </div>
      </div>
    );
  }

  return (
    <div className="surface mt-6 p-4">
      {records === null ? (
        <p className="py-6 text-center text-[13px] text-ink-400">正在读取本地记录…</p>
      ) : (
        <EmptyState
          compact
          icon={<BookOpenCheck className="h-6 w-6" />}
          title="还没有阅读记录"
          description="上传并阅读论文后，这里会显示最近打开的论文与阅读进度，点击即可从上次位置继续。"
          action={<UploadButton size="sm" label="上传第一篇论文" />}
        />
      )}
    </div>
  );
}
