import { create } from 'zustand';
import type { PaperDocument, ParseProgress } from '@/types';
import { clamp } from '@/lib/utils';

/** 选中文字与来源定位（发送给 AI 问答模块的接口数据） */
export interface SelectionRef {
  paperId: string;
  pageNumber: number;
  text: string;
}

interface PaperState {
  currentPaper: PaperDocument | null;
  /** 原始文件，供渲染与下载 */
  currentFile: File | null;
  currentPage: number;
  /** 兼容字段：AiPanel 读取 */
  selectionText: string;
  /** 完整选中引用：论文 id + 页码 + 文本 */
  selectionRef: SelectionRef | null;
  /** 全文搜索词（阅读器文本层高亮使用） */
  searchTerm: string;
  isLoading: boolean;
  parseProgress: ParseProgress | null;
  parseError: string | null;
  /** 非 null => 该文件需要密码，UI 弹出输入框 */
  passwordPending: string | null;

  setPaper: (paper: PaperDocument, file: File | null, startPage?: number) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setSelection: (text: string, pageNumber: number) => void;
  clearSelection: () => void;
  setSearchTerm: (term: string) => void;
  setLoading: (loading: boolean) => void;
  setParseProgress: (p: ParseProgress | null) => void;
  setParseError: (e: string | null) => void;
  setPasswordPending: (fileName: string | null) => void;
  reset: () => void;
}

export const usePaperStore = create<PaperState>((set, get) => ({
  currentPaper: null,
  currentFile: null,
  currentPage: 1,
  selectionText: '',
  selectionRef: null,
  searchTerm: '',
  isLoading: false,
  parseProgress: null,
  parseError: null,
  passwordPending: null,

  setPaper: (paper, file, startPage = 1) =>
    set({
      currentPaper: paper,
      currentFile: file,
      currentPage: clamp(Math.round(startPage), 1, paper.totalPages),
      selectionText: '',
      selectionRef: null,
      searchTerm: '',
      parseError: null,
      parseProgress: null,
      isLoading: false,
    }),

  setCurrentPage: (page) => {
    const total = get().currentPaper?.totalPages ?? 1;
    set({ currentPage: clamp(Math.round(page), 1, total) });
  },
  nextPage: () => {
    const { currentPage, currentPaper } = get();
    const total = currentPaper?.totalPages ?? 1;
    set({ currentPage: clamp(currentPage + 1, 1, total) });
  },
  prevPage: () => {
    const { currentPage } = get();
    set({ currentPage: clamp(currentPage - 1, 1, 999999) });
  },
  setSelection: (text, pageNumber) =>
    set((s) => ({
      selectionText: text,
      selectionRef: text && s.currentPaper ? { paperId: s.currentPaper.id, pageNumber, text } : null,
    })),
  clearSelection: () => set({ selectionText: '', selectionRef: null }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setLoading: (loading) => set({ isLoading: loading }),
  setParseProgress: (p) => set({ parseProgress: p }),
  setParseError: (e) => set({ parseError: e, isLoading: false }),
  setPasswordPending: (fileName) => set({ passwordPending: fileName, isLoading: fileName ? true : false }),
  reset: () =>
    set({
      currentPaper: null,
      currentFile: null,
      currentPage: 1,
      selectionText: '',
      selectionRef: null,
      searchTerm: '',
      isLoading: false,
      parseProgress: null,
      parseError: null,
      passwordPending: null,
    }),
}));
