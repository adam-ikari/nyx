/**
 * Configuration for OpenAI-compatible API
 * Supports Ollama, LocalAI, vLLM, and any OpenAI-compatible service
 */
export interface SanitizerConfig {
  /** OpenAI-compatible API endpoint (e.g., http://localhost:11434/v1 for Ollama) */
  endpoint: string;
  /** Model name to use for detection */
  model: string;
  /** API key (optional for local services) */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom detection prompt template (optional) */
  prompt?: string;
}

export interface SanitizeResult {
  /** Sanitized text with placeholders */
  sanitized: string;
  /** Mapping from placeholders to original values */
  mapping: Map<string, string>;
  /** Detection details */
  detection: {
    sensitive: Array<{
      type: string;
      value: string;
      start: number;
      end: number;
    }>;
    scene: string;
  };
}

export interface RestoreResult {
  /** Restored text with original values */
  restored: string;
  /** Whether all placeholders were found in mapping */
  complete: boolean;
  /** Placeholders that were not found (if any) */
  missing?: string[];
}

export interface Session {
  /** Unique session identifier */
  id: string;
  /** Mapping from placeholders to original values */
  mapping: Map<string, string>;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
}
