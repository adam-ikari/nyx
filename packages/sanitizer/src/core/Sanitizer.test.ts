import { describe, it, expect, vi } from 'vitest';
import { Sanitizer } from './Sanitizer.js';

describe('Sanitizer', () => {
  const mockConfig = {
    endpoint: 'http://localhost:11434/v1',
    model: 'gemma4'
  };

  describe('restore', () => {
    it('should restore placeholders to original values', () => {
      const sanitizer = new Sanitizer(mockConfig);
      const mapping = new Map();
      mapping.set('«NYX_PERSON_1»', '张三');
      mapping.set('«NYX_PHONE_1»', '13800138000');

      const result = sanitizer.restore('Contact «NYX_PERSON_1» at «NYX_PHONE_1»', mapping);

      expect(result.restored).toBe('Contact 张三 at 13800138000');
      expect(result.complete).toBe(true);
    });

    it('should handle missing placeholders', () => {
      const sanitizer = new Sanitizer(mockConfig);
      const mapping = new Map();
      mapping.set('«NYX_PERSON_1»', '张三');

      const result = sanitizer.restore('Contact «NYX_PERSON_1» and «NYX_PHONE_1»', mapping);

      expect(result.restored).toBe('Contact 张三 and «NYX_PHONE_1»');
      expect(result.complete).toBe(false);
      expect(result.missing).toContain('«NYX_PHONE_1»');
    });

    it('should handle text without placeholders', () => {
      const sanitizer = new Sanitizer(mockConfig);
      const mapping = new Map();

      const result = sanitizer.restore('Hello world', mapping);

      expect(result.restored).toBe('Hello world');
      expect(result.complete).toBe(true);
    });
  });

  describe('sanitize', () => {
    it('should sanitize text with detected sensitive content', async () => {
      // Mock fetch for detection
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify([
                { type: 'PERSON', value: '张三', start: 0, end: 2 }
              ])
            }
          }]
        })
      });

      const sanitizer = new Sanitizer(mockConfig);
      const result = await sanitizer.sanitize('张三你好');

      expect(result.sanitized).toBe('«NYX_PERSON_1»你好');
      expect(result.mapping.get('«NYX_PERSON_1»')).toBe('张三');
    });

    it('should return original text when no sensitive content', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: '[]' }
          }]
        })
      });

      const sanitizer = new Sanitizer(mockConfig);
      const result = await sanitizer.sanitize('Hello world');

      expect(result.sanitized).toBe('Hello world');
      expect(result.mapping.size).toBe(0);
    });
  });
});
