import type { ApiProtocol } from '@/types';

export interface ProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  protocol: ApiProtocol;
  model: string;
  note: string;
}

/** 常见 OpenAI 兼容服务商预设模板；均可在表单中修改。 */
export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    protocol: 'openai-chat',
    model: 'gpt-4o-mini',
    note: 'OpenAI Chat Completions 兼容接口',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    protocol: 'openai-chat',
    model: 'deepseek-chat',
    note: 'OpenAI 兼容接口',
  },
  {
    id: 'moonshot',
    label: 'Moonshot · Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    protocol: 'openai-chat',
    model: 'moonshot-v1-8k',
    note: 'OpenAI 兼容接口',
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    protocol: 'openai-chat',
    model: 'glm-4-flash',
    note: 'OpenAI 兼容接口',
  },
  {
    id: 'custom',
    label: '自定义服务商',
    baseUrl: '',
    protocol: 'openai-chat',
    model: '',
    note: '手动填写 Base URL / 协议 / Model',
  },
];

export const CUSTOM_PROVIDER_ID = 'custom';

export function getPreset(id: string): ProviderPreset {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1];
}