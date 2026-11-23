# Research Reader · 技术架构说明（ARCHITECTURE）

> 配套文档：`PRD.md`（需求）、`API_CONTRACT.md`（数据接口）、`TASKS.md`（分工）
> 适用阶段：Phase 1 起，贯穿全项目。

---

## 1. 架构总览

Research Reader 是一个 **纯前端单页应用（SPA）**，无自建后端、无用户系统。所有核心能力在浏览器内完成；AI 能力由用户自行配置的第三方服务商提供，浏览器 **直接** 请求服务商 API。

```
┌──────────────────────────────────────────────────────────────┐
│                        浏览器 (Client)                          │
│                                                                │
│  ┌────────────┐   ┌──────────────┐   ┌─────────────────────┐   │
│  │  UI 层      │   │  状态层       │   │  能力层 (Modules)    │   │
│  │ React +    │◄─►│ Zustand      │◄─►│ A: PDF (pdf.js)      │   │
│  │ Router +   │   │ (内存态)      │   │ B: AI  (Adapters)    │   │
│  │ Tailwind   │   └──────┬───────┘   │ C: Demo / 整合        │   │
│  └────────────┘          │           └──────────┬──────────┘   │
│                          ▼                      │              │
│                 ┌─────────────────┐             │              │
│                 │ 持久化 IndexedDB │             │              │
│                 │ 论文/进度/报告/收藏│            │              │
│                 └─────────────────┘             │              │
└─────────────────────────────────────────────────┼──────────────┘
                                                   │ 用户配置后直连
                                                   ▼
                                     ┌──────────────────────────┐
                                     │ 第三方 AI 服务商 (用户自有) │
                                     │ OpenAI 兼容 / 自定义协议    │
                                     └──────────────────────────┘
```

**关键原则**：UI 与能力层解耦；真实 AI 与演示模式共用同一套数据结构与组件，仅数据来源不同。

---

## 2. 技术栈与选型理由

| 领域 | 选型 | 理由 |
| --- | --- | --- |
| 框架 | React 18 + TypeScript | 组件化、类型安全，三人协作的统一契约基础 |
| 构建 | Vite 5 | 快速 HMR、原生 ESM、静态产物便于 Qoder Sites 部署 |
| 样式 | Tailwind CSS 3 | 统一设计令牌、克制视觉、避免模板化堆卡片 |
| 路由 | React Router 6 | 首页 / 阅读器多页导航，纯前端 hash-less SPA |
| 状态 | Zustand 4 | 轻量、无 Provider 包裹、适合内存态（含 API Key） |
| PDF | pdfjs-dist 4 | 浏览器本地渲染 + 文本层 + 文本提取，保留页码 |
| 校验 | Zod 3 | 校验外部 AI 返回的 JSON，防止脏数据进入统一结构 |
| 持久化 | IndexedDB（原生封装） | 存储 PDF 二进制与报告，容量远大于 localStorage |
| 图标 | lucide-react | 线性、专业、树摇友好，契合科研 SaaS 观感 |
| 图可视化 | React Flow（Phase 5 引入） | 交互式节点/连线、缩放平移、导出图片 |

### 选型调整说明（相对 PRD 推荐）

- **IndexedDB 封装**：Phase 1 暂不引入 `idb` 等第三方库，先用原生 IndexedDB 薄封装（`src/lib/db.ts`，Phase 5 落地），减少早期依赖；如封装复杂度上升再评估引入 `idb`。
- **React Flow 延后安装**：技术路线可视化属 Phase 5，Phase 1 不安装，避免无用依赖与包体膨胀。类型契约（`ResearchFlow`）已提前定义，保证 B/C 模块对齐。
- **React 18 而非 19**：优先生态兼容性（pdf.js / 路由 / 状态库均稳定支持），降低比赛周期内的集成风险。

---

## 3. 目录结构（按三人模块职责划分）

```
D:\Tianchi\
├─ PRD.md / ARCHITECTURE.md / API_CONTRACT.md / TASKS.md
├─ index.html
├─ package.json / vite.config.ts / tsconfig*.json
├─ tailwind.config.js / postcss.config.js / .gitignore
├─ public/                      # 静态资源（Phase 4 内置演示 PDF 等）
└─ src/
   ├─ main.tsx                  # 应用入口
   ├─ App.tsx                   # 路由与全局布局
   ├─ index.css                 # Tailwind + 全局基础样式
   │
   ├─ types/                    # ★ 统一类型契约（全员共享，只读约定）
   │   └─ index.ts              # PaperDocument / AnalysisReport / ResearchFlow / ApiStatus / DemoData ...
   │
   ├─ store/                    # ★ 全局状态（Zustand）
   │   ├─ useAppStore.ts        # 运行模式、API 状态、UI 折叠态、设置入口
   │   └─ usePaperStore.ts      # 当前论文、阅读进度、选中文本
   │
   ├─ components/
   │   ├─ ui/                   # 设计系统原子组件（Button/IconButton/Badge/Tabs/Tooltip...）
   │   └─ layout/               # TopNav 等跨页布局
   │
   ├─ pages/
   │   ├─ HomePage.tsx          # 首页（成员 C）
   │   └─ ReaderPage.tsx        # 阅读器三栏（成员 C 整合 A/B）
   │
   ├─ modules/
   │   ├─ pdf/                  # ★ 成员 A：PDF 阅读与文档处理
   │   │   ├─ pdfWorker.ts      # pdf.js worker 配置
   │   │   ├─ parsePdf.ts       # 上传→解析→PaperDocument（含页码文本）
   │   │   ├─ PdfViewer.tsx     # 中央渲染组件（渲染/翻页/缩放/文本层）
   │   │   ├─ OutlineSidebar.tsx# 左侧目录/书签/页导航
   │   │   └─ ...               # 搜索、选中、进度（Phase 2）
   │   │
   │   ├─ ai/                   # ★ 成员 B：AI 服务与论文分析
   │   │   ├─ adapters/         # openai-chat 适配器 + 自定义协议适配器
   │   │   ├─ apiClient.ts      # 请求/响应/错误→ApiStatus 统一转换
   │   │   ├─ analyze.ts        # 分块→分阶段总结→AnalysisReport
   │   │   ├─ qa.ts             # 问答上下文选择→ChatMessage
   │   │   ├─ flow.ts           # 分析结果→ResearchFlow
   │   │   └─ schemas.ts        # Zod 校验外部返回
   │   │
   │   └─ demo/                 # ★ 成员 C：演示模式
   │       ├─ demoData.ts       # 内置示例论文 + 预设报告/问答/路线
   │       └─ DemoRunner.tsx    # 9 步演示动画编排（可跳过/重播）
   │
   ├─ features/                 # 跨模块产品功能（成员 C）
   │   ├─ settings/             # API 配置界面（Phase 3）
   │   ├─ library/              # 本地论文管理（Phase 5）
   │   └─ export/               # Markdown 导出（Phase 5）
   │
   └─ lib/
       ├─ utils.ts              # cn() 类名合并、格式化等
       ├─ db.ts                 # IndexedDB 薄封装（Phase 5）
       └─ constants.ts          # 视觉/尺寸/限制常量
```

**协作边界**：`types/` 与 `store/` 为共享契约，修改需三人同步；`modules/pdf`（A）、`modules/ai`（B）、`modules/demo` + `features` + `pages`（C）各自负责，不随意改他人核心代码。组件输入输出以 `API_CONTRACT.md` 为准。

---

## 4. 数据流

### 4.1 阅读流（不依赖 API）
```
File → modules/pdf.parsePdf → PaperDocument(pages[].pageNumber/text)
     → usePaperStore.setCurrentPaper
     → PdfViewer 渲染 + OutlineSidebar 目录 + 阅读进度
     → (Phase 5) IndexedDB 持久化论文二进制与进度
```

### 4.2 真实 AI 分析流
```
PaperDocument → 用户确认分析 → modules/ai.analyze
   → 本地分块(按页/段) → 分阶段调用适配器 → Zod 校验
   → AnalysisReport(evidence + pageNumber) → useAppStore/report
   → AI 面板展示 → 点击页码引用 → PdfViewer 跳转
```

### 4.3 演示流（无 API）
```
进入演示模式 → 明确加载内置示例 PaperDocument(source:'demo')
   → DemoRunner 播放 9 步 → 预设 AnalysisReport(mode:'demo')
   → 复用同一套 AI 面板 / 报告 / 技术路线组件（全部标注"演示数据"）
```

> 真实与演示 **共用组件与类型**，仅 `mode` 与数据来源不同。严禁把演示结果冒充用户论文的真实分析。

---

## 5. 状态管理（Zustand）

- **useAppStore**：`runMode`（real/demo/reader）、`apiStatus`、`apiConfig`（不含 Key）、`apiKey`（**仅内存**）、UI 折叠态（左栏/右栏）、设置弹窗开关、当前 AI 标签。
- **usePaperStore**：`currentPaper`、`currentPage`、`scale`、`selectionText`、`outline`、阅读进度。

**API Key 处理**：只存于 `useAppStore` 内存字段；刷新即丢失；不写入任何持久化层、源码或日志；持久化的 `apiConfig` 仅含 baseUrl/protocol/model/provider。

---

## 6. API 适配器架构（成员 B）

```
ApiConfig + apiKey(内存)
        │
        ▼
  ┌───────────────┐    统一接口 ApiAdapter
  │  Adapter 注册表 │───► openai-chat 适配器（首版）
  └───────────────┘───► custom 协议适配器（按需扩展）
        │  testConnection() / chat()
        ▼
  apiClient：fetch + 超时 + 错误归一化
        │
        ▼
  ApiStatus（10 态） + 统一 ChatMessage / AnalysisReport
```

- **连接测试** 发送真实轻量请求（如极短 chat），据 HTTP 状态与错误类型映射到统一 `ApiStatusCode`。
- **CORS/网络不可区分** 时返回诚实综合提示（`network_error` / `cors_error` 附说明），不假装成功。
- **长文分块**：按页/段切分，分阶段总结再汇总，避免一次性超长请求。

---

## 7. 安全与隐私

- 无硬编码 Key；`.gitignore` 排除 `.env*`；Key 仅内存。
- 不默认上传原始 PDF；仅发送本地提取的必要文本。
- 明确告知：浏览器直连无法完全隐藏密钥；论文文本会发送给用户配置的第三方服务商。
- 尊重服务商 CORS，不绕过、不伪造成功。

---

## 8. 部署（Qoder Sites）

- 产物为 `dist/` 纯静态资源，无服务端运行时依赖。
- 演示资源（示例 PDF + 预设数据）随站点打包，**不依赖外部网络**。
- 通过 Qoder Sites 发布公开访问；不依赖团队服务器与本地开发环境。
- 部署前确认：公开代码与产物中 **不含任何 API Key**。

---

## 9. 阶段落地映射

| 阶段 | 主要落地目录 | 状态 |
| --- | --- | --- |
| Phase 1 框架 | `types/` `store/` `components/ui` `pages/` `modules/pdf`(基础渲染) | ✅ 本次交付 |
| Phase 2 PDF | `modules/pdf/*`（提取/目录/搜索/进度） | ⏳ |
| Phase 3 API/AI | `modules/ai/*` `features/settings/*` | ⏳ |
| Phase 4 演示 | `modules/demo/*` `public/` | ⏳ |
| Phase 5 可视化整合 | React Flow `features/library` `features/export` `lib/db` | ⏳ |
| Phase 6 测试部署 | 全量测试 + Qoder Sites | ⏳ |

> Phase 1 说明：为使"阅读器三栏 UI"真实可用（避免假按钮），已提前接入 **基础 PDF.js 渲染 + 翻页 + 缩放**；文本提取、目录解析、搜索、进度持久化仍属 Phase 2。AI/演示/技术路线在 Phase 1 以 **诚实的空状态/禁用态** 呈现，不伪造功能。