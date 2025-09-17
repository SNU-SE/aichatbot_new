export type AIProvider = 'openai' | 'anthropic';

export interface AIModelOption {
  value: string;
  label: string;
  endpoint: 'openai-chat' | 'anthropic-messages';
}

interface ProviderCatalog {
  defaultModel: string;
  options: AIModelOption[];
}

const OPENAI_OPTIONS: AIModelOption[] = [
  {
    value: 'gpt-5-mini',
    label: 'GPT-5 Mini (최신 경량 플래그십)',
    endpoint: 'openai-chat',
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o (범용 고성능)',
    endpoint: 'openai-chat',
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini (빠른 응답)',
    endpoint: 'openai-chat',
  },
  {
    value: 'gpt-4-turbo',
    label: 'GPT-4 Turbo (구버전 호환)',
    endpoint: 'openai-chat',
  },
];

const ANTHROPIC_OPTIONS: AIModelOption[] = [
  {
    value: 'claude-3-5-sonnet-latest',
    label: 'Claude 3.5 Sonnet (균형형)',
    endpoint: 'anthropic-messages',
  },
  {
    value: 'claude-3-5-haiku-latest',
    label: 'Claude 3.5 Haiku (빠른 응답)',
    endpoint: 'anthropic-messages',
  },
  {
    value: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus (고성능)',
    endpoint: 'anthropic-messages',
  },
  {
    value: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku (경량)',
    endpoint: 'anthropic-messages',
  },
];

export const AI_MODEL_CATALOG: Record<AIProvider, ProviderCatalog> = {
  openai: {
    defaultModel: 'gpt-5-mini',
    options: OPENAI_OPTIONS,
  },
  anthropic: {
    defaultModel: 'claude-3-5-sonnet-latest',
    options: ANTHROPIC_OPTIONS,
  },
};

export const getDefaultModel = (provider: string): string => {
  const safeProvider = (provider as AIProvider) in AI_MODEL_CATALOG
    ? (provider as AIProvider)
    : 'openai';
  return AI_MODEL_CATALOG[safeProvider].defaultModel;
};

export const getModelOptions = (provider: string): AIModelOption[] => {
  const safeProvider = (provider as AIProvider) in AI_MODEL_CATALOG
    ? (provider as AIProvider)
    : 'openai';
  return AI_MODEL_CATALOG[safeProvider].options;
};

export const isValidModelForProvider = (provider: string, model?: string | null): boolean => {
  if (!model) return false;
  return getModelOptions(provider).some(option => option.value === model);
};
