import * as webllm from '@mlc-ai/web-llm';

export interface BrowserLLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DetectionResult {
  sensitive: Array<{
    type: string;
    value: string;
    start: number;
    end: number;
    description?: string;
  }>;
  scene: string;
}

const DETECTION_PROMPT = `You are a sensitive information detector. Analyze the following text and identify ALL sensitive information that should be masked before sending to an AI service.

Types of sensitive information to detect:
1. Personal names (Chinese or English names)
2. Phone numbers (any format)
3. Email addresses
4. ID card numbers (身份证号)
5. Bank card numbers
6. Addresses (home, office, etc.)
7. IP addresses
8. Passwords or API keys
9. Company names (if specific)
10. Any other personally identifiable information

Return a JSON array of detected items. Each item should have:
- type: the category (name, phone, email, id_card, bank_card, address, ip, password, company, other)
- value: the exact text that is sensitive
- description: brief explanation why it's sensitive

If no sensitive information found, return empty array: []

Text to analyze:
`;

// Model library file mapping
const MODEL_LIB_FILES: Record<string, string> = {
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': 'Llama-3_2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': 'Qwen2_5-1_5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',
  'gemma-2-2b-it-q4f16_1-MLC': 'gemma-2-2b-it-q4f16_1-ctx4k_cs1k-webgpu.wasm',
  'Phi-3.5-mini-instruct-q4f16_1-MLC': 'Phi-3_5-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',
};

export class BrowserLLMDetector {
  private engine: webllm.MLCEngine | null = null;
  private modelId: string;
  private temperature: number;
  private maxTokens: number;
  private loadingCallback?: (progress: number, text: string) => void;

  constructor(config: BrowserLLMConfig) {
    this.modelId = config.model;
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  onLoading(callback: (progress: number, text: string) => void) {
    this.loadingCallback = callback;
  }

  async initialize(): Promise<void> {
    if (this.engine) return;

    const modelLibFile = MODEL_LIB_FILES[this.modelId];
    if (!modelLibFile) {
      throw new Error(`Unknown model: ${this.modelId}`);
    }

    const appConfig: webllm.AppConfig = {
      model_list: [
        {
          model: `/models/${this.modelId}`,
          model_id: this.modelId,
          model_lib: `/models/${this.modelId}/${modelLibFile}`,
        }
      ],
    };

    this.engine = await webllm.CreateMLCEngine(
      this.modelId,
      {
        appConfig,
        initProgressCallback: (report: webllm.InitProgressReport) => {
          if (this.loadingCallback) {
            this.loadingCallback(report.progress, report.text);
          }
        }
      }
    );
  }

  async detect(text: string): Promise<DetectionResult> {
    if (!this.engine) {
      await this.initialize();
    }

    const prompt = `${DETECTION_PROMPT}\n\`\`\`\n${text}\n\`\`\`\n\nReturn ONLY the JSON array, no other text:`;

    const response = await this.engine!.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    const content = response.choices[0]?.message?.content || '[]';

    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
      }

      const items = JSON.parse(jsonStr);

      const sensitive = items.map((item: { type: string; value: string; description?: string }) => {
        const start = text.indexOf(item.value);
        return {
          type: item.type,
          value: item.value,
          start: start >= 0 ? start : 0,
          end: start >= 0 ? start + item.value.length : 0,
          description: item.description,
        };
      }).filter((item: { type: string; value: string; start: number; end: number; description?: string }) => item.start >= 0);

      return { sensitive, scene: 'llm_detection' };
    } catch (e) {
      console.error('Failed to parse LLM response:', content, e);
      return { sensitive: [], scene: 'llm_detection' };
    }
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
  }
}

// Available models (must be deployed to public/models/)
export const AVAILABLE_BROWSER_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', size: '~700MB', recommended: true },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 1.5B', size: '~1GB' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', size: '~1.4GB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi-3.5 Mini', size: '~2GB' },
];
