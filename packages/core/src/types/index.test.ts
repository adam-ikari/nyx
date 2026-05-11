import { describe, it, expect } from 'vitest';
import type { DetectionResult, SensitiveItem, PlaceholderMapping, ProxyConfig } from './index.js';

describe('Types', () => {
  it('should accept valid DetectionResult', () => {
    const result: DetectionResult = {
      sensitive: [],
      scene: 'text'
    };
    expect(result).toBeDefined();
  });

  it('should accept valid SensitiveItem', () => {
    const item: SensitiveItem = {
      type: 'PERSON',
      value: '张三',
      start: 0,
      end: 2,
      context_before: '',
      context_after: '你好'
    };
    expect(item.type).toBe('PERSON');
  });

  it('should accept valid PlaceholderMapping', () => {
    const mapping: PlaceholderMapping = new Map();
    mapping.set('«NYX_PERSON_1»', '张三');
    expect(mapping.get('«NYX_PERSON_1»')).toBe('张三');
  });
});
