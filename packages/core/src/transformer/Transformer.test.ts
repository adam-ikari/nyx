import { describe, it, expect } from 'vitest';
import { Transformer } from './Transformer.js';
import type { SensitiveItem } from '../types/index.js';

describe('Transformer', () => {
  it('should transform sensitive items to placeholders', () => {
    const transformer = new Transformer();
    const items: SensitiveItem[] = [
      { type: 'PERSON', value: '张三', start: 2, end: 4, context_before: '你好', context_after: '再见' }
    ];

    const result = transformer.transform('你好张三再见', items);

    expect(result.masked).toBe('你好«NYX_PERSON_1»再见');
    expect(result.mapping.get('«NYX_PERSON_1»')).toBe('张三');
  });

  it('should handle multiple items', () => {
    const transformer = new Transformer();
    const items: SensitiveItem[] = [
      { type: 'PERSON', value: '张三', start: 0, end: 2, context_before: '', context_after: '电话' },
      { type: 'PHONE', value: '13800138000', start: 4, end: 15, context_before: '电话', context_after: '' }
    ];

    const result = transformer.transform('张三电话13800138000', items);

    expect(result.masked).toBe('«NYX_PERSON_1»电话«NYX_PHONE_1»');
  });
});