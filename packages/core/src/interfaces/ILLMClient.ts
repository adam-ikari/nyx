import type { DetectionResult } from '../types/index.js';

export interface ILLMClient {
  detect(input: string): Promise<DetectionResult>;
}
