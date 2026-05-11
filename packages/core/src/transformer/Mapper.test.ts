import { describe, it, expect } from 'vitest';
import { RequestMapper } from './Mapper.js';

describe('RequestMapper', () => {
  it('should create placeholder for sensitive value', () => {
    const mapper = new RequestMapper('Hello world');
    const placeholder = mapper.transform('张三', 'PERSON');
    expect(placeholder).toBe('«NYX_PERSON_1»');
  });

  it('should increment index for same type', () => {
    const mapper = new RequestMapper('Hello world');
    mapper.transform('张三', 'PERSON');
    const placeholder = mapper.transform('李四', 'PERSON');
    expect(placeholder).toBe('«NYX_PERSON_2»');
  });

  it('should restore placeholder to original value', () => {
    const mapper = new RequestMapper('Hello world');
    const placeholder = mapper.transform('张三', 'PERSON');
    const restored = mapper.restore(`Hello ${placeholder}`);
    expect(restored).toBe('Hello 张三');
  });

  it('should detect conflict and add random suffix', () => {
    const mapper = new RequestMapper('This has «NYX_PERSON_1» already');
    const placeholder = mapper.transform('张三', 'PERSON');
    expect(placeholder).toMatch(/«NYX_PERSON_1_[a-z0-9]{4}»/);
  });

  it('should restore multiple placeholders', () => {
    const mapper = new RequestMapper('Hello world');
    const p1 = mapper.transform('张三', 'PERSON');
    const p2 = mapper.transform('13800138000', 'PHONE');
    const restored = mapper.restore(`Contact ${p1} at ${p2}`);
    expect(restored).toBe('Contact 张三 at 13800138000');
  });
});
