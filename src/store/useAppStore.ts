import { create } from 'zustand';
import type { AiTab, ApiConfig, ApiStatus, RunMode } from '@/types';
import { uid } from '@/lib/utils';

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

interface AppState {
  // 运行模式与 API
  runMode: RunMode;
  apiStatus: ApiStatus;
  apiConfig: ApiConfig | null;
  /** ★ 仅内存：刷新即丢失，绝不持久化 / 打日志 */
  apiKey: string;

  // UI 状态
  leftOpen: boolean;
  rightOpen: boolean;
  aiTab: AiTab;
  settingsOpen: boolean;
  demoInfoOpen: boolean;
  toasts: Toast[];

  // actions
  setRunMode: (mode: RunMode) => void;
  setApiStatus: (status: ApiStatus) => void;
  saveApiConfig: (config: ApiConfig, key: string) => void;
  clearApiConfig: () => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeft: (open: boolean) => void;
  setRight: (open: boolean) => void;
  setAiTab: (tab: AiTab) => void;
  openSettings: () => void;
  closeSettings: () => void;
  openDemoInfo: () => void;
  closeDemoInfo: () => void;
  toast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  runMode: 'reader',
  apiStatus: { code: 'not_configured' },
  apiConfig: null,
  apiKey: '',

  leftOpen: true,
  rightOpen: true,
  aiTab: 'qa',
  settingsOpen: false,
  demoInfoOpen: false,
  toasts: [],

  setRunMode: (mode) => set({ runMode: mode }),
  setApiStatus: (status) => set({ apiStatus: status }),

  saveApiConfig: (config, key) =>
    set({
      apiConfig: config,
      apiKey: key,
      // 未做真实连接检测前，保持诚实状态（Phase 3 接入检测后置为 connected）
      apiStatus: { code: 'not_configured', message: '配置已保存，连接检测将在 Phase 3 提供' },
    }),

  clearApiConfig: () =>
    set({
      apiConfig: null,
      apiKey: '',
      apiStatus: { code: 'not_configured' },
      runMode: 'reader',
    }),

  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  setLeft: (open) => set({ leftOpen: open }),
  setRight: (open) => set({ rightOpen: open }),
  setAiTab: (tab) => set({ aiTab: tab, rightOpen: true }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openDemoInfo: () => set({ demoInfoOpen: true }),
  closeDemoInfo: () => set({ demoInfoOpen: false }),

  toast: (message, tone = 'info') => {
    const id = uid('toast');
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 是否可使用真实 AI（统一判断入口） */
export const selectCanUseRealAi = (s: AppState): boolean => s.apiStatus.code === 'connected';