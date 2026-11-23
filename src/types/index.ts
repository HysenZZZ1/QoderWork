/**
 * Research Reader — 统一类型契约
 * 与 API_CONTRACT.md 保持一致；三人共享，修改需同步。
 * 页码 1-based；时间戳 epoch 毫秒；证据缺失用空数组，禁止编造。
 */

// ===== 基础 =====
export type RunMode = 'real' | 'demo' | 'reader';
export type AnalysisMode = 'real' | 'demo';
export type PaperSource = 'upload' | 'demo';

export interface Evidence {
  pageNumber: number;
  quote: string;
  blockId?: string;
}

export interface TextBlock {
  id: string;
  pageNumber: number;
  text: string;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface PageText {
  pageNumber: number;
  text: string;
  blocks?: TextBlock[];
}

export interface OutlineNode {
  id: string;
  title: string;
  pageNumber: number;
  kind: 'bookmark' | 'section';
  children?: OutlineNode[];
}

// ===== PaperDocument（成员 A 产出）=====
export interface PaperDocument {
  id: string;
  fileName: string;
  title: string;
  totalPages: number;
  text: string;
  pages: PageText[];
  createdAt: number;
  source: PaperSource;
  hasTextLayer: boolean;
  authors?: string[];
  fileSize?: number;
  outline?: OutlineNode[];
  /** true => outline 来自字号启发式识别（kind='section'），非 PDF 书签，UI 须标注推测 */
  outlineInferred?: boolean;
}

export interface ParseProgress {
  phase: 'loading' | 'parsing' | 'extracting' | 'rendering';
  percent: number;
}

// ===== AnalysisReport（成员 B 产出）=====
export type AnalysisStatus = 'idle' | 'running' | 'partial' | 'complete' | 'error';

export interface AnalyzedPoint {
  id: string;
  text: string;
  origin: 'author' | 'ai';
  evidence: Evidence[];
  pageNumber?: number;
}

export interface SummarySection {
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  field: string;
  task: string;
  evidence: Evidence[];
}

export interface BackgroundSection {
  problem: string;
  motivation: string;
  existingMethods: AnalyzedPoint[];
  gaps: AnalyzedPoint[];
  rationale: string;
}

export interface MethodModule {
  id: string;
  name: string;
  role: string;
  relations: string[];
  evidence: Evidence[];
  pageNumber?: number;
}

export interface MethodologySection {
  overview: string;
  coreAlgorithm: string;
  architecture: string;
  modules: MethodModule[];
  input: string;
  output: string;
  dataFlow: string;
}

export interface InnovationSection {
  authorClaimed: AnalyzedPoint[];
  aiInferred: AnalyzedPoint[];
}

export interface ExperimentSection {
  datasets: AnalyzedPoint[];
  setup: string;
  metrics: AnalyzedPoint[];
  baselines: AnalyzedPoint[];
  results: AnalyzedPoint[];
  ablations: AnalyzedPoint[];
  interpretation: string;
  tableExtractionFailed: boolean;
}

export interface LimitationSection {
  authorStated: AnalyzedPoint[];
  inferred: AnalyzedPoint[];
}

export interface AnalysisReport {
  paperId: string;
  mode: AnalysisMode;
  generatedAt: number;
  status: AnalysisStatus;
  summary: SummarySection;
  background: BackgroundSection;
  methodology: MethodologySection;
  innovations: InnovationSection;
  experiments: ExperimentSection;
  limitations: LimitationSection;
  error?: string;
}

// ===== ResearchFlow（成员 B 产出 / 成员 C 渲染）=====
export interface FlowNode {
  id: string;
  title: string;
  description: string;
  evidence: Evidence[];
  pageNumber?: number;
  kind?: 'input' | 'process' | 'module' | 'output';
  position?: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ResearchFlow {
  paperId: string;
  mode: AnalysisMode;
  generatedAt: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ===== API（成员 B）=====
export type ApiStatusCode =
  | 'not_configured'
  | 'checking'
  | 'connected'
  | 'unauthorized'
  | 'network_error'
  | 'cors_error'
  | 'timeout'
  | 'model_error'
  | 'quota_exceeded'
  | 'unknown_error';

export interface ApiStatus {
  code: ApiStatusCode;
  message?: string;
  checkedAt?: number;
  latencyMs?: number;
}

export type ApiProtocol = 'openai-chat' | 'custom';

/** 可持久化配置，绝不包含 apiKey */
export interface ApiConfig {
  provider: string;
  baseUrl: string;
  protocol: ApiProtocol;
  model: string;
}

export interface AiCallContext {
  config: ApiConfig;
  apiKey: string;
  signal?: AbortSignal;
}

// ===== 问答与阅读记录 =====
export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatScope = 'full' | 'selection' | 'section';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  scope?: ChatScope;
  selectionText?: string;
  evidence?: Evidence[];
  status?: 'pending' | 'streaming' | 'done' | 'error';
  error?: string;
}

export interface ReadingProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
}

export interface PaperRecord {
  id: string;
  fileName: string;
  title: string;
  totalPages: number;
  source: PaperSource;
  createdAt: number;
  lastOpenedAt: number;
  progress: ReadingProgress;
  favorite: boolean;
  hasReport: boolean;
}

// ===== DemoData（成员 C）=====
export interface DemoStep {
  id: string;
  label: string;
  description: string;
  durationMs: number;
}

export interface DemoQAPair {
  id: string;
  question: string;
  answer: string;
  evidence: Evidence[];
}

export interface DemoData {
  paper: PaperDocument;
  report: AnalysisReport;
  flow: ResearchFlow;
  qa: DemoQAPair[];
  steps: DemoStep[];
  pdfAssetPath: string;
}

// ===== AI 面板标签 =====
export type AiTab = 'qa' | 'analysis' | 'flow';