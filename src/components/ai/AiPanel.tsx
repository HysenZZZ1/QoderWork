import { useState } from 'react';
import {
  Bot,
  KeyRound,
  Lightbulb,
  PanelRightClose,
  Quote,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, EmptyState, IconButton, Tabs } from '@/components/ui';
import type { TabItem } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { usePaperStore } from '@/store/usePaperStore';
import type { AiTab, Evidence } from '@/types';
import { API_STATUS_META } from '@/lib/constants';
import { cn, truncate, uid } from '@/lib/utils';

const EXAMPLE_QUESTIONS = [
  '这篇论文解决了什么问题？',
  '作者为什么提出这种方法？',
  '论文的核心创新在哪里？',
  '实验结果能证明作者的观点吗？',
  '用更简单的方式解释这一段。',
];

const TABS: TabItem<AiTab>[] = [
  { id: 'qa', label: 'AI 问答', icon: <Bot className="h-3.5 w-3.5" /> },
  { id: 'analysis', label: '论文分析', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'flow', label: '技术路线', icon: <Quote className="h-3.5 w-3.5" /> },
];

export function AiPanel() {
  const paper = usePaperStore((s) => s.currentPaper);
  const aiTab = useAppStore((s) => s.aiTab);
  const setAiTab = useAppStore((s) => s.setAiTab);
  const toggleRight = useAppStore((s) => s.toggleRight);
  const runMode = useAppStore((s) => s.runMode);
  const apiStatusCode = useAppStore((s) => s.apiStatus.code);

  const aiReady = (runMode === 'real' && apiStatusCode === 'connected') || runMode === 'demo';

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink-200 px-3">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-700">
          <Sparkles className="h-4 w-4 text-brand-600" />
          AI 助手
        </span>
        <IconButton label="收起 AI 面板" icon={<PanelRightClose className="h-[18px] w-[18px]" />} onClick={toggleRight} />
      </div>

      <StatusStrip paper={!!paper} aiReady={aiReady} runMode={runMode} statusCode={apiStatusCode} />

      <Tabs tabs={TABS} value={aiTab} onChange={setAiTab} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {aiTab === 'qa' && <QaTab paper={paper} aiReady={aiReady} />}
        {aiTab === 'analysis' && <AnalysisTab paper={paper} aiReady={aiReady} />}
        {aiTab === 'flow' && <FlowTab />}
      </div>
    </aside>
  );
}

// ============ 状态条 ============
function StatusStrip({
  paper,
  aiReady,
  runMode,
  statusCode,
}: {
  paper: boolean;
  aiReady: boolean;
  runMode: string;
  statusCode: string;
}) {
  const openSettings = useAppStore((s) => s.openSettings);
  const model = useAppStore((s) => s.apiConfig?.model);
  const api = API_STATUS_META[statusCode as keyof typeof API_STATUS_META];

  return (
    <div className="border-b border-ink-200 bg-ink-50/60 px-3 py-2.5">
      {!paper ? (
        <p className="text-[12px] leading-relaxed text-ink-500">上传论文后，AI 将围绕当前论文提供帮助。</p>
      ) : aiReady ? (
        <div className="flex items-center gap-2">
          <Badge tone={runMode === 'demo' ? 'info' : 'success'} dot>
            {runMode === 'demo' ? '演示模式 · 内置示例数据' : `真实 AI · ${truncate(model || '', 20)}`}
          </Badge>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] leading-relaxed text-ink-500">
            <span className="font-medium text-ink-700">{api.label}</span> · 当前仅可阅读
          </p>
          <Button size="sm" variant="outline" leftIcon={<KeyRound className="h-3.5 w-3.5" />} onClick={openSettings}>
            配置 API
          </Button>
        </div>
      )}
    </div>
  );
}

// ============ AI 问答 ============
type Msg =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string; evidence?: Evidence[] }
  | { id: string; kind: 'gate' };

function QaTab({ paper, aiReady }: { paper: ReturnType<typeof usePaperStore.getState>['currentPaper']; aiReady: boolean }) {
  const openSettings = useAppStore((s) => s.openSettings);
  const openDemoInfo = useAppStore((s) => s.openDemoInfo);
  const selectionRef = usePaperStore((s) => s.selectionRef);
  const selectionText = selectionRef?.text ?? '';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');

  if (!paper) {
    return (
      <div className="h-full">
        <EmptyState
          icon={<Bot className="h-6 w-6" />}
          title="AI 问答"
          description="打开论文后，可基于全文、选中文字或当前章节提问，回答会关联原文页码。"
          className="h-full justify-center"
        />
      </div>
    );
  }

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (!aiReady) {
      setMessages((m) => [...m, { id: uid('m'), kind: 'user', text }, { id: uid('m'), kind: 'gate' }]);
      return;
    }
    // 真实/演示问答由 Phase 3 / Phase 4 接入；此处保留交互占位为诚实提示。
    setMessages((m) => [...m, { id: uid('m'), kind: 'user', text }, { id: uid('m'), kind: 'gate' }]);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {selectionText && (
          <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50/60 p-2.5">
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-brand-700">引用自第 {selectionRef?.pageNumber} 页</p>
              <p className="mt-0.5 text-[12px] leading-snug text-brand-900">{truncate(selectionText, 120)}</p>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-ink-500">你可以基于当前论文提问。以下是一些常见问题：</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.kind === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-br-sm bg-brand-600 px-3 py-2 text-[13px] leading-relaxed text-white">
                  {m.text}
                </div>
              </div>
            ) : m.kind === 'assistant' ? (
              <AssistantBubble key={m.id} msg={m} />
            ) : (
              <GateBubble key={m.id} onConfig={openSettings} onDemo={openDemoInfo} />
            ),
          )
        )}
      </div>

      <Composer value={input} onChange={setInput} onSend={send} disabled={!input.trim()} />
    </div>
  );
}

function AssistantBubble({ msg }: { msg: Extract<Msg, { kind: 'assistant' }> }) {
  const setCurrentPage = usePaperStore((s) => s.setCurrentPage);
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-ink-200 bg-white px-3 py-2">
        <p className="text-[13px] leading-relaxed text-ink-700">{msg.text}</p>
        {msg.evidence?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.evidence.map((e, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(e.pageNumber)}
                className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
              >
                <Quote className="h-3 w-3" /> 第 {e.pageNumber} 页
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-ink-400">未找到直接原文证据</p>
        )}
      </div>
    </div>
  );
}

function GateBubble({ onConfig, onDemo }: { onConfig: () => void; onDemo: () => void }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-2 rounded-xl rounded-bl-sm border border-amber-200 bg-amber-50/70 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-amber-800">
          真实问答需要连接你的 API（Phase 3）；演示模式提供内置示例问答（Phase 4）。当前仍可正常阅读论文。
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onConfig} leftIcon={<KeyRound className="h-3.5 w-3.5" />}>
            配置 API
          </Button>
          <Button size="sm" variant="outline" onClick={onDemo}>
            了解演示模式
          </Button>
        </div>
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border-t border-ink-200 p-2.5">
      <div className="flex items-end gap-2 rounded-lg border border-ink-200 bg-white p-1.5 focus-within:border-brand-400">
        <textarea
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="就当前论文提问…（Enter 发送 / Shift+Enter 换行）"
          className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-1.5 py-2 text-[13px] text-ink-800 placeholder:text-ink-400 focus:outline-none"
        />
        <Button size="sm" className="h-8 w-8 p-0" disabled={disabled} onClick={onSend} aria-label="发送">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============ 论文分析 ============
const ANALYSIS_SECTIONS = [
  { key: 'summary', label: '论文概述', icon: <FileIcon /> },
  { key: 'background', label: '研究背景', icon: <FileIcon /> },
  { key: 'methodology', label: '方法分析', icon: <FileIcon /> },
  { key: 'innovations', label: '创新点', icon: <Lightbulb className="h-4 w-4" /> },
  { key: 'experiments', label: '实验分析', icon: <FileIcon /> },
  { key: 'limitations', label: '局限性', icon: <FileIcon /> },
];

function FileIcon() {
  return <Sparkles className="h-4 w-4" />;
}

function AnalysisTab({ paper, aiReady }: { paper: ReturnType<typeof usePaperStore.getState>['currentPaper']; aiReady: boolean }) {
  const openSettings = useAppStore((s) => s.openSettings);
  const openDemoInfo = useAppStore((s) => s.openDemoInfo);

  if (!paper) {
    return (
      <div className="h-full">
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="论文分析"
          description="打开论文后，AI 将拆分为概述、背景、方法、创新点、实验与局限六个模块，并关联原文页码。"
          className="h-full justify-center"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-white p-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink-800">{truncate(paper.title, 30)}</p>
          <p className="text-[11px] text-ink-400">{paper.totalPages} 页 · 六模块分析</p>
        </div>
        {aiReady ? (
          <Button size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            开始分析
          </Button>
        ) : (
          <Button size="sm" variant="outline" leftIcon={<KeyRound className="h-3.5 w-3.5" />} onClick={openSettings}>
            配置 API
          </Button>
        )}
      </div>

      {!aiReady && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
          <p className="text-[12px] leading-relaxed text-amber-800">
            分析结果依赖真实 AI（Phase 3）或演示数据（Phase 4）。下面是将生成的六个模块结构预览，均为"待分析"，不会伪造结果。
          </p>
          <button onClick={openDemoInfo} className="text-[12px] font-medium text-brand-700 hover:text-brand-800">
            了解演示模式会如何展示完整报告 →
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {ANALYSIS_SECTIONS.map((s) => (
          <div key={s.key} className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-100 text-ink-500">{s.icon}</span>
            <span className="flex-1 text-[13px] text-ink-700">{s.label}</span>
            <Badge tone="neutral">待分析</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 技术路线 ============
function FlowTab() {
  return (
    <div className="h-full p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] leading-relaxed text-ink-500">将论文方法与技术流程转为交互式节点图。</p>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-ink-200 bg-[radial-gradient(circle_at_1px_1px,theme(colors.ink.200)_1px,transparent_0)] [background-size:16px_16px] p-4">
        <div className="flex items-center justify-between gap-2">
          <Node label="输入" tone="ink" />
          <Connector />
          <Node label="模块 A" tone="brand" />
          <Connector />
          <Node label="模块 B" tone="brand" />
          <Connector />
          <Node label="输出" tone="emerald" />
        </div>
        <p className="mt-4 text-center text-[11px] text-ink-400">示意图 · 真实节点图将在 Phase 5 由当前论文生成</p>
      </div>

      <div className="mt-3 space-y-1.5">
        {[
          '根据分析结果生成结构化节点',
          '自动识别方法模块与模块关系',
          '点击节点查看解释并跳转原文页码',
          '支持缩放、平移、重新生成与导出图片',
        ].map((t) => (
          <div key={t} className="flex items-start gap-2 text-[12px] text-ink-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function Node({ label, tone }: { label: string; tone: 'ink' | 'brand' | 'emerald' }) {
  const map = {
    ink: 'border-ink-300 bg-white text-ink-600',
    brand: 'border-brand-300 bg-brand-50 text-brand-700',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  };
  return <div className={cn('rounded-md border px-2.5 py-2 text-[11px] font-medium shadow-sm', map[tone])}>{label}</div>;
}

function Connector() {
  return <span className="h-px flex-1 bg-gradient-to-r from-ink-300 to-brand-300" />;
}