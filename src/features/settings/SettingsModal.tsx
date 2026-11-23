import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Eye, EyeOff, Info, KeyRound, ShieldAlert } from 'lucide-react';
import { Badge, Button, Modal, Tooltip } from '@/components/ui';
import { useAppStore, selectCanUseRealAi } from '@/store/useAppStore';
import type { ApiProtocol } from '@/types';
import { CUSTOM_PROVIDER_ID, PROVIDERS, getPreset } from './providers';

const inputCls =
  'h-9 w-full rounded-md border border-ink-300 bg-white px-3 text-sm text-ink-800 placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-700">{label}</span>
        {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function SettingsModal() {
  const open = useAppStore((s) => s.settingsOpen);
  const close = useAppStore((s) => s.closeSettings);
  const apiConfig = useAppStore((s) => s.apiConfig);
  const savedKey = useAppStore((s) => s.apiKey);
  const saveApiConfig = useAppStore((s) => s.saveApiConfig);
  const clearApiConfig = useAppStore((s) => s.clearApiConfig);
  const connected = useAppStore(selectCanUseRealAi);
  const toast = useAppStore((s) => s.toast);

  const [providerId, setProviderId] = useState('openai');
  const [baseUrl, setBaseUrl] = useState(PROVIDERS[0].baseUrl);
  const [protocol, setProtocol] = useState<ApiProtocol>('openai-chat');
  const [model, setModel] = useState(PROVIDERS[0].model);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (apiConfig) {
      setProviderId(apiConfig.provider);
      setBaseUrl(apiConfig.baseUrl);
      setProtocol(apiConfig.protocol);
      setModel(apiConfig.model);
    } else {
      setProviderId('openai');
      setBaseUrl(PROVIDERS[0].baseUrl);
      setProtocol('openai-chat');
      setModel(PROVIDERS[0].model);
    }
    setApiKey(savedKey);
    setShowKey(false);
  }, [open, apiConfig, savedKey]);

  const applyPreset = (id: string) => {
    setProviderId(id);
    if (id === CUSTOM_PROVIDER_ID) return;
    const preset = getPreset(id);
    setBaseUrl(preset.baseUrl);
    setProtocol(preset.protocol);
    setModel(preset.model);
  };

  const canSave = baseUrl.trim().length > 3 && model.trim().length > 0;

  const handleSave = () => {
    if (!canSave) {
      toast('请填写有效的 Base URL 与 Model', 'warning');
      return;
    }
    saveApiConfig(
      { provider: providerId, baseUrl: baseUrl.trim(), protocol, model: model.trim() },
      apiKey,
    );
    toast('配置已保存 · 密钥仅存于当前会话内存', 'success');
    close();
  };

  const handleClear = () => {
    clearApiConfig();
    setApiKey('');
    toast('已清除配置与会话密钥', 'info');
  };

  const preset = getPreset(providerId);

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="API 配置"
      description="连接你自己的 AI 服务商。核心阅读功能不依赖 API。"
      footer={
        <>
          <Button variant="ghost" onClick={handleClear}>
            清除配置
          </Button>
          <Tooltip label="真实连接检测将在 Phase 3 接入">
            <span className="inline-flex">
              <Button variant="outline" disabled leftIcon={<Info className="h-4 w-4" />}>
                测试连接
              </Button>
            </span>
          </Tooltip>
          <Button onClick={handleSave} disabled={!canSave}>
            保存配置
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Badge tone={connected ? 'success' : 'neutral'} dot>
            {connected ? '已连接' : '未连接（仅内存配置）'}
          </Badge>
          <span className="text-xs text-ink-400">{preset.note}</span>
        </div>

        <Field label="服务商">
          <select
            className={inputCls}
            value={providerId}
            onChange={(e) => applyPreset(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="API Base URL" hint="浏览器将直接请求此地址">
          <input
            className={inputCls}
            value={baseUrl}
            placeholder="https://api.example.com/v1"
            onChange={(e) => setBaseUrl(e.target.value)}
            spellCheck={false}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="API 协议">
            <select
              className={inputCls}
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as ApiProtocol)}
            >
              <option value="openai-chat">OpenAI Chat Completions 兼容</option>
              <option value="custom">自定义协议（需适配）</option>
            </select>
          </Field>
          <Field label="Model 名称">
            <input
              className={inputCls}
              value={model}
              placeholder="gpt-4o-mini"
              onChange={(e) => setModel(e.target.value)}
              spellCheck={false}
            />
          </Field>
        </div>

        <Field label="API Key" hint="仅存于当前会话内存，不写入本地存储">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className={`${inputCls} pl-9 pr-10`}
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              placeholder="sk-..."
              autoComplete="off"
              onChange={(e) => setApiKey(e.target.value)}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"
              aria-label={showKey ? '隐藏密钥' : '显示密钥'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5">
          <div className="flex gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <ul className="space-y-1 text-[12px] leading-relaxed text-amber-800">
              <li>纯前端无法完全隐藏密钥：请求由浏览器直接发往服务商，请勿使用高额度密钥。</li>
              <li>刷新页面后密钥自动丢失，需要重新填写；密钥不会写入 IndexedDB / localStorage / 源码 / 日志。</li>
              <li>分析时，你论文的文本会发送给你所配置的第三方服务商，请先了解其隐私政策。</li>
              <li className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                若服务商禁止浏览器跨域（CORS），将无法直连，会如实提示而非伪造成功。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}