export type ProviderKey = 'openai' | 'anthropic';
export type EndpointKey = 'openai-chat' | 'anthropic-messages';

export interface ModelConfig {
  apiModel: string;
  endpoint: EndpointKey;
}

interface ProviderConfig {
  defaultModel: string;
  models: Record<string, ModelConfig>;
}

const OPENAI_MODELS: Record<string, ModelConfig> = {
  'gpt-5-mini': { apiModel: 'gpt-5-mini', endpoint: 'openai-chat' },
  'gpt-4o': { apiModel: 'gpt-4o', endpoint: 'openai-chat' },
  'gpt-4o-mini': { apiModel: 'gpt-4o-mini', endpoint: 'openai-chat' },
  'gpt-4-turbo': { apiModel: 'gpt-4-turbo', endpoint: 'openai-chat' },
  // Legacy aliases kept for backward compatibility with previously saved settings
  'gpt-4o-mini-2024-07-18': { apiModel: 'gpt-4o-mini', endpoint: 'openai-chat' },
};

const ANTHROPIC_MODELS: Record<string, ModelConfig> = {
  'claude-3-5-sonnet-latest': { apiModel: 'claude-3-5-sonnet-latest', endpoint: 'anthropic-messages' },
  'claude-3-5-haiku-latest': { apiModel: 'claude-3-5-haiku-latest', endpoint: 'anthropic-messages' },
  'claude-3-opus-20240229': { apiModel: 'claude-3-opus-20240229', endpoint: 'anthropic-messages' },
  'claude-3-haiku-20240307': { apiModel: 'claude-3-haiku-20240307', endpoint: 'anthropic-messages' },
  // Legacy aliases
  'claude-sonnet-4-20250514': { apiModel: 'claude-3-5-sonnet-latest', endpoint: 'anthropic-messages' },
  'claude-3-5-sonnet-20241022': { apiModel: 'claude-3-5-sonnet-latest', endpoint: 'anthropic-messages' },
  'claude-3-5-haiku-20241022': { apiModel: 'claude-3-5-haiku-latest', endpoint: 'anthropic-messages' },
};

const PROVIDER_REGISTRY: Record<ProviderKey, ProviderConfig> = {
  openai: {
    defaultModel: 'gpt-5-mini',
    models: OPENAI_MODELS,
  },
  anthropic: {
    defaultModel: 'claude-3-5-sonnet-latest',
    models: ANTHROPIC_MODELS,
  },
};

export interface ResolvedModelConfig {
  provider: ProviderKey;
  modelKey: string;
  config: ModelConfig;
  isFallback: boolean;
}

export const resolveModelConfig = (provider?: string | null, model?: string | null): ResolvedModelConfig => {
  const normalizedProvider: ProviderKey = provider === 'anthropic' ? 'anthropic' : 'openai';
  const providerConfig = PROVIDER_REGISTRY[normalizedProvider];

  const isValidModel = !!(model && providerConfig.models[model]);
  const modelKey = isValidModel ? (model as string) : providerConfig.defaultModel;
  const config = providerConfig.models[modelKey] ?? providerConfig.models[providerConfig.defaultModel];

  return {
    provider: normalizedProvider,
    modelKey,
    config,
    isFallback: !isValidModel,
  };
};
