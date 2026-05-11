import type { SensitiveItem, PlaceholderMapping } from '../types/index.js';

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class RequestMapper {
  private mapping: PlaceholderMapping = new Map();
  private useRandomSuffix: boolean = false;
  private counter: Record<string, number> = {};
  private prefix: string = '«NYX_';
  private suffix: string = '»';

  constructor(originalText: string) {
    const conflictPattern = /«NYX_[A-Z]+_\d+»/;
    this.useRandomSuffix = conflictPattern.test(originalText);
  }

  transform(value: string, type: string): string {
    const index = (this.counter[type] || 0) + 1;
    this.counter[type] = index;

    let placeholder: string;
    if (this.useRandomSuffix) {
      const rand = randomString(4);
      placeholder = `${this.prefix}${type}_${index}_${rand}${this.suffix}`;
    } else {
      placeholder = `${this.prefix}${type}_${index}${this.suffix}`;
    }

    this.mapping.set(placeholder, value);
    return placeholder;
  }

  transformAll(text: string, items: SensitiveItem[]): string {
    let result = text;
    // Sort by start position descending to avoid offset issues
    const sorted = [...items].sort((a, b) => b.start - a.start);

    for (const item of sorted) {
      const placeholder = this.transform(item.value, item.type);
      result = result.slice(0, item.start) + placeholder + result.slice(item.end);
    }

    return result;
  }

  restore(text: string): string {
    let result = text;
    for (const [placeholder, original] of this.mapping) {
      result = result.replace(placeholder, original);
    }
    return result;
  }

  getMapping(): PlaceholderMapping {
    return this.mapping;
  }
}
