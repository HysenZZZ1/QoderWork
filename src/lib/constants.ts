import type { ApiStatusCode, RunMode } from '@/types';

// ===== 布局尺寸（px）=====
export const TOPNAV_HEIGHT = 56;
export const LEFT_SIDEBAR_WIDTH = 224;
export const RIGHT_PANEL_WIDTH = 360;

// ===== PDF 限制 =====
export const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100 MB
export const ACCEPTED_MIME = 'application/pdf';

// ===== 缩放 =====
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;
export const SCALE_STEP = 0.15;
export const DEFAULT_SCALE = 1.1;

// ===== 运行模式展示 =====
export const RUN_MODE_META: Record<RunMode, { label: string; short: string }> = {
  real: { label: '真实 AI 模式', short: '真实 AI' },
  demo: { label: '演示模式', short: '演示' },
  reader: { label: '仅阅读模式', short: '仅阅读' },
};

// ===== API 状态展示（诚实、可读）=====
export const API_STATUS_META: Record<
  ApiStatusCode,
  { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  not_configured: { label: '未配置 API', tone: 'neutral' },
  checking: { label: '连接中…', tone: 'info' },
  connected: { label: 'API 已连接', tone: 'success' },
  unauthorized: { label: '身份验证失败', tone: 'danger' },
  network_error: { label: '网络错误', tone: 'danger' },
  cors_error: { label: 'CORS 跨域限制', tone: 'warning' },
  timeout: { label: '请求超时', tone: 'warning' },
  model_error: { label: '模型不可用', tone: 'danger' },
  quota_exceeded: { label: '配额不足', tone: 'warning' },
  unknown_error: { label: '未知错误', tone: 'danger' },
};

// ===== 路由 =====
export const ROUTES = {
  home: '/',
  reader: '/reader',
} as const;