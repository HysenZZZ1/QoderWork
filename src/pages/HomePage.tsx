import { useNavigate } from 'react-router-dom';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Boxes,
  GitBranch,
  KeyRound,
  Lock,
  MousePointerClick,
  Presentation,
  Quote,
  ScanText,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { UploadButton, PdfDropzone, LoadSampleButton } from '@/modules/pdf/PdfUpload';
import { RecentReads } from '@/modules/pdf/RecentReads';
import { useAppStore } from '@/store/useAppStore';

export function HomePage() {
  const navigate = useNavigate();
  const openSettings = useAppStore((s) => s.openSettings);
  const openDemoInfo = useAppStore((s) => s.openDemoInfo);
  const hasApi = useAppStore((s) => s.apiConfig !== null);

  const scrollTo = (id: string) => (e: ReactMouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-full bg-canvas">
      <SiteHeader onSettings={openSettings} onNav={scrollTo} />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge tone="info" icon={<Sparkles className="h-3 w-3" />}>
                纯前端 · 无需注册登录
              </Badge>
              <Badge tone="neutral">2026 Qoder 高校创造力大赛</Badge>
            </div>

            <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-ink-900 sm:text-[3rem]">
              Research Reader
            </h1>
            <p className="mt-2 text-lg font-medium text-brand-700">AI 科研文献阅读器</p>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-600">
              以 PDF 阅读为核心、AI 分析为增强的科研工作台。在阅读论文的同时，
              随时调用摘要、方法分析、创新点提取、实验解读与内容问答，
              并让每一条 AI 结论都能关联回原文与页码。
            </p>

            <div className="mt-7 max-w-xl">
              <PdfDropzone />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="outline"
                leftIcon={<Presentation className="h-4 w-4" />}
                onClick={openDemoInfo}
              >
                快速进入演示模式
              </Button>
              <Button
                variant="ghost"
                leftIcon={<KeyRound className="h-4 w-4" />}
                onClick={openSettings}
              >
                {hasApi ? '已保存 API 配置' : '配置 API'}
              </Button>
              <LoadSampleButton variant="ghost" label="先读示例论文" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
              <Trust icon={<Lock className="h-3.5 w-3.5" />} text="论文文本仅本地提取" />
              <Trust icon={<KeyRound className="h-3.5 w-3.5" />} text="密钥不入本地存储" />
              <Trust icon={<MousePointerClick className="h-3.5 w-3.5" />} text="直连你自己的服务商" />
            </div>
          </div>

          <div className="lg:pl-4">
            <ReaderPreview />
          </div>
        </div>
      </section>

      {/* ===== 核心功能 ===== */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <SectionHeading
          eyebrow="核心能力"
          title="阅读优先，AI 辅助"
          desc="围绕当前论文提供帮助，而不是取代阅读器。信息可追溯、交互可理解。"
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureTile
            className="sm:col-span-2"
            accent
            icon={<BookOpenCheck className="h-5 w-5" />}
            title="阅读器优先的三栏工作台"
            desc="左目录 / 中 PDF / 右 AI 助手，三区独立滚动，可折叠，适配平板与移动端。基于 PDF.js 本地渲染与缩放。"
            cta="打开阅读器"
            onCta={() => navigate('/reader')}
          />
          <FeatureTile
            className="sm:col-span-2"
            accent
            icon={<Sparkles className="h-5 w-5" />}
            title="分模块论文分析"
            desc="概述 · 研究背景 · 方法 · 创新点 · 实验 · 局限，逐一展开，区分作者原文声明与 AI 归纳推断。"
          />
          <FeatureTile
            icon={<Quote className="h-5 w-5" />}
            title="原文与页码关联"
            desc="每条 AI 结论携带证据与页码，点击即跳转对应 PDF 页面。找不到证据会如实说明。"
          />
          <FeatureTile
            icon={<GitBranch className="h-5 w-5" />}
            title="技术路线可视化"
            desc="将方法与技术流程转为可缩放交互图（React Flow），节点可回到原文。"
          />
          <FeatureTile
            icon={<Settings2 className="h-5 w-5" />}
            title="多服务商 API 接入"
            desc="OpenAI 兼容优先，支持自定义地址与模型；统一连接状态与诚实的错误提示。"
          />
          <FeatureTile
            icon={<Presentation className="h-5 w-5" />}
            title="交互式演示模式"
            desc="无 API 也能完整体验；内置示例论文与预设结果，全程标注为演示数据。"
            onCta={openDemoInfo}
            cta="了解演示模式"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MiniTile icon={<ScanText className="h-4 w-4" />} title="扫描版诚实提示" desc="无法提取文本时不伪造分析。" />
          <MiniTile icon={<Boxes className="h-4 w-4" />} title="统一数据契约" desc="真实与演示共用同一结构。" />
          <MiniTile icon={<Lock className="h-4 w-4" />} title="本地数据管理" desc="阅读记录与报告存于浏览器。" />
        </div>
      </section>

      {/* ===== 最近阅读 ===== */}
      <section id="recent" className="mx-auto max-w-6xl px-5 pb-16">
        <SectionHeading eyebrow="你的书架" title="最近阅读" desc="记录仅保存在当前浏览器，不上传任何服务器。" />
        <RecentReads />
      </section>

      <SiteFooter />
    </div>
  );
}

// ============ 子组件 ============

function SiteHeader({ onSettings, onNav }: { onSettings: () => void; onNav: (id: string) => (e: ReactMouseEvent) => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
        <a href="/" className="flex shrink-0 items-center gap-2" onClick={onNav('top')}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <BookGlyph />
          </span>
          <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-ink-900">
            Research Reader
          </span>
        </a>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button className="hidden rounded-md px-3 py-1.5 text-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 md:block" onClick={onNav('features')}>
            核心能力
          </button>
          <button className="hidden rounded-md px-3 py-1.5 text-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 md:block" onClick={onNav('recent')}>
            最近阅读
          </button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="API 配置"
            leftIcon={<Settings2 className="h-4 w-4" />}
            onClick={onSettings}
          >
            <span className="hidden sm:inline">API 配置</span>
          </Button>
          <UploadButton size="sm" compact />
        </nav>
      </div>
    </header>
  );
}

function ReaderPreview() {
  return (
    <div className="relative rounded-2xl border border-ink-200 bg-white p-2 shadow-panel">
      <div className="overflow-hidden rounded-xl border border-ink-200">
        {/* 迷你顶栏 */}
        <div className="flex h-8 items-center gap-2 border-b border-ink-200 bg-ink-50 px-3">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-ink-300" />
            <span className="h-2 w-2 rounded-full bg-ink-300" />
            <span className="h-2 w-2 rounded-full bg-ink-300" />
          </span>
          <span className="ml-1 text-[10px] font-medium text-ink-500">Attention Is All You Need.pdf</span>
          <span className="ml-auto flex h-4 w-14 items-center justify-center rounded bg-brand-600 text-[9px] font-medium text-white">
            PDF · 15p
          </span>
        </div>

        <div className="grid grid-cols-[46px_1fr_70px] bg-canvas">
          {/* 左：目录 */}
          <div className="space-y-1.5 border-r border-ink-200 bg-white p-2">
            {[70, 46, 60, 40, 66, 52].map((w, i) => (
              <div key={i} className="h-1.5 rounded bg-ink-200" style={{ width: `${w}%` }} />
            ))}
          </div>

          {/* 中：PDF */}
          <div className="space-y-2 bg-white p-3">
            <div className="h-2 w-2/3 rounded bg-ink-800/80" />
            <div className="h-1.5 w-1/3 rounded bg-ink-300" />
            <div className="mt-2 space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-1 rounded bg-ink-200" style={{ width: `${100 - (i % 3) * 8}%` }} />
              ))}
            </div>
            {/* 选中高亮 */}
            <div className="mt-1 flex items-center">
              <div className="h-2 animate-pulse rounded bg-brand-300/70" style={{ width: '62%' }} />
            </div>
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-1 rounded bg-ink-200" style={{ width: `${90 - i * 6}%` }} />
              ))}
            </div>
          </div>

          {/* 右：AI */}
          <div className="space-y-1.5 border-l border-ink-200 bg-white p-2">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-brand-600" />
              <span className="text-[8px] font-semibold text-ink-600">AI 助手</span>
            </div>
            <div className="rounded bg-brand-50 p-1">
              <div className="h-1 w-full rounded bg-brand-300" />
              <div className="mt-1 h-1 w-3/4 rounded bg-brand-200" />
            </div>
            <div className="h-1 w-full rounded bg-ink-200" />
            <div className="h-1 w-5/6 rounded bg-ink-200" />
            <div className="mt-1 flex items-center justify-between rounded border border-ink-200 px-1 py-0.5">
              <span className="text-[7px] text-ink-400">第 3 页</span>
              <ArrowRight className="h-2 w-2 text-brand-500" />
            </div>
          </div>
        </div>
      </div>

      <span className="absolute -left-3 -top-3 hidden rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-ink-600 shadow-card sm:block">
        📄 阅读优先
      </span>
      <span className="absolute -bottom-3 -right-2 hidden items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-brand-700 shadow-card sm:flex">
        <Quote className="h-3 w-3" /> 结论可回到原文页码
      </span>
    </div>
  );
}

function Trust({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-ink-400">{icon}</span>
      {text}
    </span>
  );
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{desc}</p>
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  desc,
  className,
  accent,
  cta,
  onCta,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  className?: string;
  accent?: boolean;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div
      className={`group relative flex flex-col rounded-xl border p-5 transition-all duration-200 ${
        accent
          ? 'border-brand-100 bg-gradient-to-br from-white to-brand-50/50 hover:border-brand-200 hover:shadow-panel'
          : 'border-ink-200 bg-white hover:border-ink-300 hover:shadow-card'
      } ${className ?? ''}`}
    >
      <span
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
          accent ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-100'
        }`}
      >
        {icon}
      </span>
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{desc}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="mt-3 inline-flex items-center gap-1 self-start text-[13px] font-medium text-brand-700 transition-colors hover:text-brand-800"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

function MiniTile({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-100 text-ink-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-800">{title}</p>
        <p className="truncate text-[11px] text-ink-500">{desc}</p>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
            <BookGlyph />
          </span>
          <span className="text-sm font-semibold text-ink-800">Research Reader</span>
          <span className="text-xs text-ink-400">· AI 科研文献阅读器</span>
        </div>
        <p className="text-xs text-ink-500">纯前端应用，不收集或上传你的论文与数据。</p>
      </div>
    </footer>
  );
}

function BookGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 7.5h7M9 11h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}