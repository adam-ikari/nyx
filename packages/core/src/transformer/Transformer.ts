import type { SensitiveItem, TransformResult } from '../types/index.js';
import { RequestMapper } from './Mapper.js';

export class Transformer {
  transform(text: string, items: SensitiveItem[]): TransformResult {
    const mapper = new RequestMapper(text);
    const masked = mapper.transformAll(text, items);

    return {
      masked,
      mapping: mapper.getMapping()
    };
  }
}