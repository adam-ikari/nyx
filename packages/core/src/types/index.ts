export type SensitiveType =
  | 'PERSON'
  | 'PHONE'
  | 'EMAIL'
  | 'ID'
  | 'CARD'
  | 'ADDRESS'
  | 'CREDENTIAL'
  | 'MEDICAL'
  | 'INTERNAL'
  | 'NUMBER';

export interface SensitiveItem {
  type: SensitiveType;
  value: string;
  start: number;
  end: number;
  context_before: string;
  context_after: string;
}

export type SceneType = 'text' | 'calculation' | 'code';

export interface DetectionResult {
  sensitive: SensitiveItem[];
  scene: SceneType;
  hint?: string;
}

export type PlaceholderMapping = Map<string, string>;

export interface TransformResult {
  masked: string;
  mapping: PlaceholderMapping;
}

export interface ProxyConfig {
  server: {
    port: number;
    host: string;
  };
  localLLM: {
    provider: 'ollama' | 'cloudflare' | 'localai';
    endpoint?: string;
    model: string;
    accountId?: string;
    apiToken?: string;
    timeout: number;
  };
  upstream: {
    endpoint: string;
    apiKey: string;
  };
  detection?: {
    timeout: number;
    prompt?: string;
  };
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  dashboard?: {
    endpoint: string;
    apiKey: string;
  };
}

export interface CloudResponse {
  response: string;
  code?: string;
}

export interface ExecutorResult {
  success: boolean;
  result?: unknown;
  error?: string;
}
