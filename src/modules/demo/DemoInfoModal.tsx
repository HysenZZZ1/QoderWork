import type { ReactNode } from 'react';
import { PlayCircle, SkipForward, RotateCcw } from 'lucide-react';
import { Badge, Button, Modal } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { UploadButton } from '@/modules/pdf/PdfUpload';

const STEPS = [
  '展示内置示例论文',
  '模拟 PDF 上传',
  '模拟解析进度',
  '模拟论文结构识别',
  '模拟 AI 提取摘要',
  '模拟研究方法分析',
  '模拟创新点提取',
  '模拟实验结果分析',
  '展示完整分析报告',
];

export function DemoInfoModal() {
  const open = useAppStore((s) => s.demoInfoOpen);
  const close = useAppStore((s) => s.closeDemoInfo);

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      title="演示模式"
      description="无需 API，即可完整体验 AI 分析流程。内置示例论文与预设结果随网站本地部署。"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            稍后再说
          </Button>
          <UploadButton label="上传论文，先体验阅读器" />
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge tone="info">Phase 4 · 即将上线</Badge>
          <span className="text-xs text-ink-400">演示结果将全程标注为"演示数据"</span>
        </div>

        <div className="grid grid-cols-1 gap-2 rounded-lg border border-ink-200 bg-ink-50/60 p-3.5 sm:grid-cols-3">
          <Feature icon={<PlayCircle className="h-4 w-4" />} title="自动播放" desc="9 步交互动画" />
          <Feature icon={<SkipForward className="h-4 w-4" />} title="可跳过" desc="直达完整报告" />
          <Feature icon={<RotateCcw className="h-4 w-4" />} title="可重播" desc="反复演示讲解" />
        </div>

        <ol className="space-y-0">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                {i + 1}
              </span>
              <span className="text-sm text-ink-700">{s}</span>
              <span className="ml-auto h-px flex-1 bg-ink-100" />
            </li>
          ))}
        </ol>

        <p className="text-[12px] leading-relaxed text-ink-500">
          演示模式与真实 AI 共用同一套阅读器、分析报告、AI 面板与技术路线组件，仅数据来源不同。
          上传你自己的论文但未配置 API 时，仍可正常阅读，但不会套用示例论文的分析结果。
        </p>
      </div>
    </Modal>
  );
}

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-brand-600 shadow-sm">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-800">{title}</p>
        <p className="truncate text-[11px] text-ink-500">{desc}</p>
      </div>
    </div>
  );
}