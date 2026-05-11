import type { SanitizerConfig, SanitizeResult, RestoreResult } from './types.js';

const DEFAULT_DETECTION_PROMPT = `You are a privacy protection assistant. Detect all sensitive information in the text that should not be sent to external services.

Sensitive information includes:
- Personal identity: names, phone numbers, emails, ID numbers, addresses
- Financial: bank cards, credit cards, amounts, account info
- Credentials: passwords, API keys, tokens, secrets
- Internal: project names, internal systems, employee info, trade secrets
- Medical: records, diagnoses, medications
- Any content that could leak privacy or violate compliance

Return JSON array format:
[{"type": "PERSON", "value": "original", "start": 0, "end": 2, "context_before": "", "context_after": ""}]

If no sensitive info, return: []

Text:
{input}`;

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export class Sanitizer {
  private config: SanitizerConfig;
  private prompt: string;

  constructor(config: SanitizerConfig) {
    this.config = config;
    this.prompt = config.prompt || DEFAULT_DETECTION_PROMPT;
  }

  /**
   * Sanitize input text by detecting and replacing sensitive content
   */
  async sanitize(input: string): Promise<SanitizeResult> {
    const detection = await this.detect(input);
    const { masked, mapping } = this.transform(input, detection.sensitive);

    return {
      sanitized: masked,
      mapping,
      detection: {
        sensitive: detection.sensitive,
        scene: detection.scene
      }
    };
  }

  /**
   * Restore sanitized text using the provided mapping
   */
  restore(text: string, mapping: Map<string, string>): RestoreResult {
    const missing: string[] = [];
    let restored = text;

    // Pattern matches both simple and random-suffix placeholders
    const pattern = /«NYX_[A-Z]+_\d+(_[a-z0-9]{4})?»/g;

    restored = restored.replace(pattern, (match) => {
      const original = mapping.get(match);
      if (original === undefined) {
        missing.push(match);
        return match; // Keep placeholder if not found
      }
      return original;
    });

    return {
      restored,
      complete: missing.length === 0,
      missing: missing.length > 0 ? missing : undefined
    };
  }

  /**
   * Detect sensitive content using local LLM
   */
  private async detect(input: string): Promise<{ sensitive: Array<{type: string; value: string; start: number; end: number}>; scene: string }> {
    const prompt = this.prompt.replace('{input}', input);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2048
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';

      return this.parseDetectionResult(content);
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Detection timeout');
      }
      throw error;
    }
  }

  /**
   * Parse LLM response to extract sensitive items
   */
  private parseDetectionResult(content: string): { sensitive: Array<{type: string; value: string; start: number; end: number}>; scene: string } {
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '[]';
      const sensitive = JSON.parse(jsonStr);

      // Determine scene type
      const scene = this.determineScene(content);

      return { sensitive, scene };
    } catch {
      return { sensitive: [], scene: 'text' };
    }
  }

  /**
   * Determine the scene type based on content
   */
  private determineScene(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('calculation') || lower.includes('计算')) {
      return 'calculation';
    }
    if (lower.includes('code') || lower.includes('代码')) {
      return 'code';
    }
    return 'text';
  }

  /**
   * Transform text by replacing sensitive content with placeholders
   */
  private transform(text: string, items: Array<{type: string; value: string; start: number; end: number}>): { masked: string; mapping: Map<string, string> } {
    const mapping = new Map<string, string>();
    let result = text;

    // Sort by start position descending to avoid offset issues
    const sorted = [...items].sort((a, b) => b.start - a.start);

    // Check for conflicts
    const conflictPattern = /«NYX_[A-Z]+_\d+»/;
    const hasConflict = conflictPattern.test(text);

    const counters: Record<string, number> = {};

    for (const item of sorted) {
      const type = item.type;
      const index = (counters[type] || 0) + 1;
      counters[type] = index;

      let placeholder: string;
      if (hasConflict) {
        const rand = generateId();
        placeholder = `«NYX_${type}_${index}_${rand}»`;
      } else {
        placeholder = `«NYX_${type}_${index}»`;
      }

      mapping.set(placeholder, item.value);
      result = result.slice(0, item.start) + placeholder + result.slice(item.end);
    }

    return { masked: result, mapping };
  }
}
