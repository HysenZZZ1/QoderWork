import type { PaperDocument } from '@/types';

/**
 * 阅读记录（IndexedDB）：最近阅读的论文、PDF 二进制、当前页码、进度与最近打开时间。
 * 仅保存在浏览器本地，不上传任何服务器。存储失败不影响阅读功能。
 */

export interface StoredPaper {
  paperId: string;
  fingerprint: string; // fileName|size|lastModified，用于再次打开同一文件时恢复进度
  fileName: string;
  title: string;
  totalPages: number;
  source: 'upload' | 'demo';
  createdAt: number;
  lastOpenedAt: number;
  currentPage: number;
  percent: number; // 0~100
  blob: Blob;
}

const DB_NAME = 'research-reader';
const DB_VERSION = 1;
const STORE = 'papers';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'paperId' });
        os.createIndex('lastOpenedAt', 'lastOpenedAt');
        os.createIndex('fingerprint', 'fingerprint');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

/** 文件指纹：同名、同大小、同修改时间视为同一篇论文（示例论文每次载入时间不同，故额外用 fileName+size 兜底匹配）。 */
export function fileFingerprint(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export function looseFingerprint(fileName: string, size?: number): string {
  return `${fileName}|${size ?? 0}`;
}

const MAX_RECORDS = 20;

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** 打开/解析成功后登记或刷新记录（保留已有进度）。 */
export async function upsertRecord(doc: PaperDocument, blob: Blob): Promise<void> {
  const paperFp = looseFingerprint(doc.fileName, doc.fileSize);
  const existing = (await listRecords().catch(() => [] as StoredPaper[])).find(
    (r) => r.fingerprint.startsWith(paperFp),
  );
  const record: StoredPaper = {
    paperId: doc.id,
    fingerprint: `${paperFp}|${existing?.fingerprint.split('|')[2] ?? Date.now()}`,
    fileName: doc.fileName,
    title: doc.title,
    totalPages: doc.totalPages,
    source: doc.source,
    createdAt: existing?.createdAt ?? doc.createdAt,
    lastOpenedAt: Date.now(),
    currentPage: existing?.currentPage ?? 1,
    percent: existing?.percent ?? 0,
    blob,
  };
  await tx('readwrite', (s) => s.put(record) as IDBRequest<IDBValidKey>);
  // 同一文件（名+大小）的旧记录并入新记录，避免重复条目与多份 blob
  if (existing && existing.paperId !== record.paperId) {
    await tx('readwrite', (s) => s.delete(existing.paperId) as IDBRequest<undefined>).catch(() => undefined);
  }
  // 超出上限时淘汰最旧打开的记录
  const all = await listRecords().catch(() => []);
  if (all.length > MAX_RECORDS) {
    for (const stale of all.slice(MAX_RECORDS)) {
      await tx('readwrite', (s) => s.delete(stale.paperId) as IDBRequest<undefined>).catch(() => undefined);
    }
  }
}

/** 保存阅读位置（当前页 + 百分比 + 最近打开时间）。 */
export async function saveProgress(paperId: string, currentPage: number, totalPages: number): Promise<void> {
  const rec = await tx<StoredPaper | undefined>('readonly', (s) => s.get(paperId) as IDBRequest<StoredPaper | undefined>).catch(() => undefined);
  if (!rec) return;
  rec.currentPage = currentPage;
  rec.percent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  rec.lastOpenedAt = Date.now();
  await tx('readwrite', (s) => s.put(rec) as IDBRequest<IDBValidKey>).catch(() => undefined);
}

/** 按文件名+大小查找历史记录（重开同一文件恢复进度用；不匹配 lastModified）。 */
export async function findRecordByFile(fileName: string, size: number): Promise<StoredPaper | undefined> {
  const prefix = looseFingerprint(fileName, size);
  const all = await listRecords().catch(() => [] as StoredPaper[]);
  return all.find((r) => r.fingerprint.startsWith(prefix));
}

/** 最近阅读列表（按最近打开时间倒序）。 */
export async function listRecords(): Promise<StoredPaper[]> {
  const all = await tx<StoredPaper[]>('readonly', (s) => s.getAll() as IDBRequest<StoredPaper[]>).catch(() => []);
  return all.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}
