# Research Reader · 统一数据接口契约（API_CONTRACT）

> 本文件是三人协作的 **唯一数据契约**。实现位于 `src/types/index.ts`，两者必须保持一致。
> 任何字段变更需三人同步，并更新本文件。所有模块禁止私自定义互不兼容的格式。

---

## 0. 约定

- 页码 `pageNumber` 一律 **1-based**（与 PDF 显示页码一致）。
- 时间戳一律 **epoch 毫秒**（`number`）。
- `id` 一律 `string`（UUID/随机串）。
- `evidence` 为原文证据数组；**找不到证据时为空数组 `[]`，禁止编造引用或页码**。
- `origin` 区分内容来源：`'author'`（作者原文声明）/ `'ai'`（AI 归纳推断，必须标注）。
- 真实与演示共用下列结构，仅 `mode` / `source` 字段区分数据来源。

---

## 1. 基础类型

```ts
export type RunMode = 'real' | 'demo' | 'reader';   // 真实AI / 演示 / 仅阅读
export type AnalysisMode = 'real' | 'demo';          // 报告与路线的数据来源
export type PaperSource = 'upload' | 'demo';

/** 原文证据：定位到页码与原文片段 */
export interface Evidence {
  pageNumber: number;
  quote: string;
  blockId?: string;
}

/** 单页文本（必须保留页码） */
export interface PageText {
  pageNumber: number;
  text: string;
  blocks?: TextBlock[];
}

/** 文本块/段落（可选，用于证据高亮） */
export interface TextBlock {
  id: string;
  pageNumber: number;
  text: string;
  bbox?: { x: number; y: number; width: number; height: number };
}

/** 目录/书签节点 */
export interface OutlineNode {
  id: string;
  title: string;
  pageNumber: number;
  kind: 'bookmark' | 'section';
  children?: OutlineNode[];
}
```

---

## 2. PaperDocument（成员 A 产出）

```ts
export interface PaperDocument {
  id: string;
  fileName: string;
  title: string;
  totalPages: number;
  text: string;            // 全文拼接（便于检索），但 pages 必须独立保留页码
  pages: PageText[];       // ★ 必须保留 pageNumber + text
  createdAt: number;
  source: PaperSource;
  hasTextLayer: boolean;   // false => 扫描版，文本提取失败
  authors?: string[];
  fileSize?: number;
  outline?: OutlineNode[];
  outlineInferred?: boolean; // true => 目录来自字号启发式识别(section)，非书签，UI 须标注"推测"
}
```

**约束**：`pages.length === totalPages`；扫描版 `hasTextLayer=false` 时不得进入真实 AI 分析。

---

## 3. AnalysisReport（成员 B 产出）

```ts
export type AnalysisStatus = 'idle' | 'running' | 'partial' | 'complete' | 'error';

/** 通用分析要点：带来源与证据 */
export interface AnalyzedPoint {
  id: string;
  text: string;
  origin: 'author' | 'ai';
  evidence: Evidence[];    // 可为空 => 未找到直接证据
  pageNumber?: number;     // 主证据页码（便于跳转）
}

export interface SummarySection {
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  field: string;           // 研究领域
  task: string;            // 研究任务
  evidence: Evidence[];
}

export interface BackgroundSection {
  problem: string;         // 研究问题
  motivation: string;      // 研究动机
  existingMethods: AnalyzedPoint[];
  gaps: AnalyzedPoint[];   // 现有方法不足
  rationale: string;       // 作者提出该方法的原因
}

export interface MethodModule {
  id: string;
  name: string;
  role: string;            // 模块功能
  relations: string[];     // 关联模块 id
  evidence: Evidence[];
  pageNumber?: number;
}

export interface MethodologySection {
  overview: string;        // 整体方法
  coreAlgorithm: string;   // 核心算法
  architecture: string;    // 网络结构
  modules: MethodModule[];
  input: string;
  output: string;
  dataFlow: string;        // 数据处理流程
}

export interface InnovationSection {
  authorClaimed: AnalyzedPoint[];  // origin='author'
  aiInferred: AnalyzedPoint[];     // origin='ai'（必须标注）
}

export interface ExperimentSection {
  datasets: AnalyzedPoint[];
  setup: string;
  metrics: AnalyzedPoint[];
  baselines: AnalyzedPoint[];      // 对比方法
  results: AnalyzedPoint[];
  ablations: AnalyzedPoint[];
  interpretation: string;          // 作者对结果的解释
  tableExtractionFailed: boolean;  // 表格提取失败 => true，禁止编造数据
}

export interface LimitationSection {
  authorStated: AnalyzedPoint[];   // 作者明确承认
  inferred: AnalyzedPoint[];       // 证据推断（必须标注）
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
```

---

## 4. ResearchFlow（成员 B 产出 / 成员 C 渲染）

```ts
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
  source: string;   // FlowNode.id
  target: string;   // FlowNode.id
  label?: string;
}

export interface ResearchFlow {
  paperId: string;
  mode: AnalysisMode;
  generatedAt: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
```

**约束**：节点内容必须来自当前论文分析结果；结构无法识别时返回空 `nodes` 并由 UI 提示，不得用固定示例冒充。

---

## 5. ApiStatus / ApiConfig（成员 B）

```ts
export type ApiStatusCode =
  | 'not_configured' | 'checking' | 'connected' | 'unauthorized'
  | 'network_error' | 'cors_error' | 'timeout' | 'model_error'
  | 'quota_exceeded' | 'unknown_error';

export interface ApiStatus {
  code: ApiStatusCode;
  message?: string;     // 诚实、可读的错误说明
  checkedAt?: number;
  latencyMs?: number;
}

export type ApiProtocol = 'openai-chat' | 'custom';

/** 可持久化的配置（★ 不含 apiKey） */
export interface ApiConfig {
  provider: string;     // 预设 id 或 'custom'
  baseUrl: string;
  protocol: ApiProtocol;
  model: string;
}
```

**约束**：`apiKey` 仅存于内存（`useAppStore.apiKey`），绝不进入 `ApiConfig`、持久化层、源码或日志。只有 `code==='connected'` 才允许真实 AI。

---

## 6. 问答与阅读记录

```ts
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
  percent: number;      // 0~100
}

/** 本地论文管理条目（IndexedDB，Phase 5） */
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
```

---

## 7. DemoData（成员 C）

```ts
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
  paper: PaperDocument;      // source='demo'
  report: AnalysisReport;    // mode='demo'
  flow: ResearchFlow;        // mode='demo'
  qa: DemoQAPair[];
  steps: DemoStep[];         // 9 步演示流程
  pdfAssetPath: string;      // 随站点打包的本地 PDF 路径
}
```

---

## 8. 模块接口契约（函数签名）

### 成员 A · `modules/pdf`
```ts
// 上传 → 解析 → 标准化 PaperDocument（保留页码文本）
parsePdf(file: File, onProgress?: (p: ParseProgress) => void): Promise<PaperDocument>;
// 从已解析文档提取目录/书签
getOutline(doc: PDFDocumentProxy): Promise<OutlineNode[]>;

interface ParseProgress { phase: 'loading' | 'parsing' | 'extracting' | 'rendering'; percent: number; }
```
组件契约：`<PdfViewer paper={PaperDocument} currentPage scale onPageChange onScaleChange onTextSelect />`；
`<OutlineSidebar outline currentPage onNavigate />`。

### 成员 B · `modules/ai`
```ts
// 真实轻量请求测试连接 → 统一 ApiStatus
testConnection(config: ApiConfig, apiKey: string): Promise<ApiStatus>;
// 标准化论文文本 → 标准化分析（分块+分阶段）
analyzePaper(paper: PaperDocument, cfg: AiCallContext, onProgress?): Promise<AnalysisReport>;
// 问答（全文/选中/章节）→ ChatMessage（带证据页码）
answerQuestion(paper: PaperDocument, question: string, scope: ChatScope, history: ChatMessage[], cfg): Promise<ChatMessage>;
// 分析结果 → 技术路线
buildResearchFlow(report: AnalysisReport, cfg): Promise<ResearchFlow>;

interface AiCallContext { config: ApiConfig; apiKey: string; signal?: AbortSignal; }
```
**输入**：标准化 `PaperDocument`；**输出**：标准化 `AnalysisReport` / `ChatMessage` / `ResearchFlow` / `ApiStatus`。所有外部 JSON 经 Zod 校验后落库。

### 成员 C · `modules/demo` + `features` + `pages`
```ts
getDemoData(): DemoData;                       // 内置本地演示数据
runDemo(steps, handlers): DemoController;      // 播放/跳过/重播
// 持久化（Phase 5）
savePaper(doc, blob): Promise<void>;
listRecords(): Promise<PaperRecord[]>;
saveReport(report): Promise<void>;
exportMarkdown(report, flow?): string;         // 导出 Markdown
```

---

## 9. 统一错误与空状态原则

- 任何"未找到证据/无法识别/提取失败"都必须 **显式表达**（空数组 + 标志位 + UI 提示），禁止编造。
- 演示数据在 UI 上 **全程标注"演示"**；用户自有论文在无 API 时仅可阅读，不得套用演示分析结果。
- 后续阶段新增字段：先改本文件与 `src/types/index.ts`，再改实现。