import { describe, it, expect } from 'vitest';
import { StreamRestorer } from './Restorer.js';
import type { PlaceholderMapping } from '../types/index.js';

describe('StreamRestorer', () => {
  it('should restore complete placeholder', () => {
    const mapping: PlaceholderMapping = new Map();
    mapping.set('«NYX_PERSON_1»', '张三');

    const restorer = new StreamRestorer(mapping);
    const result = restorer.restore('Hello «NYX_PERSON_1»');

    expect(result).toBe('Hello 张三');
  });

  it('should buffer incomplete placeholder', () => {
    const mapping: PlaceholderMapping = new Map();
    mapping.set('«NYX_PERSON_1»', '张三');

    const restorer = new StreamRestorer(mapping);

    // First chunk has incomplete placeholder
    const result1 = restorer.restore('Hello «NYX_PERS');
    expect(result1).toBe('Hello ');

    // Second chunk completes placeholder
    const result2 = restorer.restore('ON_1» world');
    expect(result2).toBe('张三 world');
  });

  it('should flush remaining buffer', () => {
    const mapping: PlaceholderMapping = new Map();
    mapping.set('«NYX_PERSON_1»', '张三');

    const restorer = new StreamRestorer(mapping);
    restorer.restore('Hello «NYX_PERSON_1»');

    const flushed = restorer.flush();
    expect(flushed).toBe('');
  });

  it('should handle multiple placeholders in stream', () => {
    const mapping: PlaceholderMapping = new Map();
    mapping.set('«NYX_PERSON_1»', '张三');
    mapping.set('«NYX_PHONE_1»', '13800138000');

    const restorer = new StreamRestorer(mapping);

    const result1 = restorer.restore('Contact «NYX_PERSON_1»');
    expect(result1).toBe('Contact 张三');

    const result2 = restorer.restore(' at «NYX_PHONE_1»');
    expect(result2).toBe(' at 13800138000');
  });
});
