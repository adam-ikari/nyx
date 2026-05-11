import type { PlaceholderMapping } from '../types/index.js';

export class StreamRestorer {
  private buffer = '';
  private readonly bufferSize = 28;
  private mapping: PlaceholderMapping;
  private pattern: RegExp;

  constructor(mapping: PlaceholderMapping) {
    this.mapping = mapping;
    this.pattern = /«NYX_[A-Z]+_\d+(_[a-z0-9]{4})?»/g;
  }

  restore(chunk: string): string {
    this.buffer += chunk;

    let output = '';

    // Keep processing while we have enough buffered content
    while (this.buffer.length > 0) {
      this.pattern.lastIndex = 0;
      const match = this.pattern.exec(this.buffer);

      if (match) {
        // Found a placeholder match
        const placeholder = match[0];
        const matchStart = match.index;
        const matchEnd = matchStart + placeholder.length;

        // Output everything before the match
        output += this.buffer.slice(0, matchStart);

        // Output the replacement (or original if not found)
        const original = this.mapping.get(placeholder);
        output += original !== undefined ? original : placeholder;

        // Remove processed content from buffer
        this.buffer = this.buffer.slice(matchEnd);
      } else {
        // No match found - check for potential incomplete placeholder
        const placeholderStart = this.buffer.lastIndexOf('«');

        if (placeholderStart === -1) {
          // No potential placeholder - output everything
          output += this.buffer;
          this.buffer = '';
        } else if (this.buffer.length - placeholderStart < this.bufferSize) {
          // Potential incomplete placeholder near the end - buffer it
          output += this.buffer.slice(0, placeholderStart);
          this.buffer = this.buffer.slice(placeholderStart);
          break;
        } else {
          // « found but no valid placeholder after bufferSize chars
          // It's not a valid placeholder - output everything including the «
          output += this.buffer;
          this.buffer = '';
        }
      }
    }

    return output;
  }

  flush(): string {
    this.pattern.lastIndex = 0;
    const result = this.buffer.replace(this.pattern, (match) => {
      return this.mapping.get(match) || match;
    });
    this.buffer = '';
    return result;
  }
}
