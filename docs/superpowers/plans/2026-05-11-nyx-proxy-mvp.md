# Nyx Proxy MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP version of Nyx - a privacy-preserving LLM gateway with sensitive content detection, replacement, and restoration capabilities.

**Architecture:** Monorepo with pnpm workspace. Core module handles detection (local LLM), transformation (placeholder replacement), restoration (streaming), and proxy forwarding. Backends module provides Node.js platform adapters. CLI module provides user interface.

**Tech Stack:** TypeScript, Node.js, pnpm workspace, Vitest (testing), QuickJS (code sandbox), expr-eval (expression engine)

---

## File Structure

```
nyx-proxy/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   └── index.ts           # Shared type definitions
│   │   │   ├── interfaces/
│   │   │   │   ├── ILogger.ts         # Logger interface
│   │   │   │   ├── IHttpClient.ts     # HTTP client interface
│   │   │   │   ├── IStorage.ts        # Storage interface
│   │   │   │   └── ILLMClient.ts      # Local LLM client interface
│   │   │   ├── detector/
│   │   │   │   ├── Detector.ts        # Detection engine
│   │   │   │   └── prompts/
│   │   │   │       └── default.ts      # Default prompt template
│   │   │   ├── transformer/
│   │   │   │   ├── Transformer.ts      # Replacement engine
│   │   │   │   └── Mapper.ts          # Dynamic mapping management
│   │   │   ├── restorer/
│   │   │   │   └── Restorer.ts        # Restoration engine (streaming)
│   │   │   ├── executor/
│   │   │   │   └── Executor.ts        # Code sandbox executor
│   │   │   └── proxy/
│   │   │       └── Proxy.ts           # Proxy forwarding
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backends/
│   │   ├── src/
│   │   │   ├── node/
│   │   │   │   ├── logger/
│   │   │   │   │   └── FileLogger.ts
│   │   │   │   ├── http/
│   │   │   │   │   └── NodeHttpClient.ts
│   │   │   │   └── storage/
│   │   │   │       └── LocalStorage.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cli/
│       ├── src/
│       │   ├── commands/
│       │   │   ├── start.ts
│       │   │   └── status.ts
│       │   ├── bin/
│       │   │   └── nyx.ts
│       │   └── utils/
│       │       └── config-loader.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── vitest.config.ts
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "nyx-proxy",
  "version": "0.1.0",
  "private": true,
  "description": "Privacy-preserving LLM gateway",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest",
    "lint": "eslint packages/*/src --ext .ts"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@types/node": "^20.10.0"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Create pnpm workspace configuration**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3: Create root TypeScript configuration**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create Vitest configuration**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts']
    }
  }
});
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.log
.env
.DS_Store
coverage/
.nyx/
```

- [ ] **Step 6: Initialize git repository**

```bash
git init
git add .
git commit -m "chore: initialize project structure"
```

---

## Task 2: Core Package Setup

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`

- [ ] **Step 1: Create core package.json**

```json
{
  "name": "@nyx-proxy/core",
  "version": "0.1.0",
  "description": "Core functionality for Nyx proxy",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "expr-eval": "^2.0.2",
    "quickjs-emscripten": "^0.23.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@types/node": "^20.10.0"
  }
}
```

- [ ] **Step 2: Create core tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: setup core package"
```

---

## Task 3: Core Types and Interfaces

**Files:**
- Create: `packages/core/src/types/index.ts`
- Create: `packages/core/src/interfaces/ILogger.ts`
- Create: `packages/core/src/interfaces/IHttpClient.ts`
- Create: `packages/core/src/interfaces/IStorage.ts`
- Create: `packages/core/src/interfaces/ILLMClient.ts`

- [ ] **Step 1: Write the failing test for types**

Create `packages/core/src/types/index.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: FAIL with "Cannot find module './index.js'"

- [ ] **Step 3: Write type definitions**

Create `packages/core/src/types/index.ts`:

```typescript
export type SensitiveType = 
  | 'PERSON' 
  | 'PHONE' 
  | 'EMAIL' 
  | 'ID' 
  | 'CARD' 
  | 'ADDRESS' 
  | 'CREDENTIAL' 
  | 'MEDICAL' 
  | 'INTERNAL'
  | 'NUMBER';

export interface SensitiveItem {
  type: SensitiveType;
  value: string;
  start: number;
  end: number;
  context_before: string;
  context_after: string;
}

export type SceneType = 'text' | 'calculation' | 'code';

export interface DetectionResult {
  sensitive: SensitiveItem[];
  scene: SceneType;
  hint?: string;
}

export type PlaceholderMapping = Map<string, string>;

export interface TransformResult {
  masked: string;
  mapping: PlaceholderMapping;
}

export interface ProxyConfig {
  server: {
    port: number;
    host: string;
  };
  localLLM: {
    provider: 'ollama' | 'cloudflare' | 'localai';
    endpoint?: string;
    model: string;
    accountId?: string;
    apiToken?: string;
    timeout: number;
  };
  upstream: {
    endpoint: string;
    apiKey: string;
  };
  detection?: {
    timeout: number;
    prompt?: string;
  };
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  dashboard?: {
    endpoint: string;
    apiKey: string;
  };
}

export interface CloudResponse {
  response: string;
  code?: string;
}

export interface ExecutorResult {
  success: boolean;
  result?: unknown;
  error?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: PASS

- [ ] **Step 5: Write interface definitions**

Create `packages/core/src/interfaces/ILogger.ts`:

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

Create `packages/core/src/interfaces/IHttpClient.ts`:

```typescript
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface IHttpClient {
  post(url: string, body: string, headers?: Record<string, string>): Promise<HttpResponse>;
  postStream(url: string, body: string, headers?: Record<string, string>): AsyncIterable<string>;
}
```

Create `packages/core/src/interfaces/IStorage.ts`:

```typescript
export interface IStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
```

Create `packages/core/src/interfaces/ILLMClient.ts`:

```typescript
import type { DetectionResult } from '../types/index.js';

export interface ILLMClient {
  detect(input: string): Promise<DetectionResult>;
}
```

- [ ] **Step 6: Create interfaces index**

Create `packages/core/src/interfaces/index.ts`:

```typescript
export type { ILogger, LogLevel } from './ILogger.js';
export type { IHttpClient, HttpResponse } from './IHttpClient.js';
export type { IStorage } from './IStorage.js';
export type { ILLMClient } from './ILLMClient.js';
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(core): add types and interfaces"
```

---

## Task 4: Mapper Implementation

**Files:**
- Create: `packages/core/src/transformer/Mapper.ts`
- Create: `packages/core/src/transformer/Mapper.test.ts`

- [ ] **Step 1: Write the failing test for Mapper**

Create `packages/core/src/transformer/Mapper.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: FAIL with "Cannot find module './Mapper.js'"

- [ ] **Step 3: Write Mapper implementation**

Create `packages/core/src/transformer/Mapper.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(core): implement RequestMapper"
```

---

## Task 5: Transformer Implementation

**Files:**
- Create: `packages/core/src/transformer/Transformer.ts`
- Create: `packages/core/src/transformer/Transformer.test.ts`

- [ ] **Step 1: Write the failing test for Transformer**

Create `packages/core/src/transformer/Transformer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Transformer } from './Transformer.js';
import type { SensitiveItem } from '../types/index.js';

describe('Transformer', () => {
  it('should transform sensitive items to placeholders', () => {
    const transformer = new Transformer();
    const items: SensitiveItem[] = [
      { type: 'PERSON', value: '张三', start: 3, end: 5, context_before: '你好', context_after: '再见' }
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: FAIL with "Cannot find module './Transformer.js'"

- [ ] **Step 3: Write Transformer implementation**

Create `packages/core/src/transformer/Transformer.ts`:

```typescript
import type { SensitiveItem, TransformResult, PlaceholderMapping } from '../types/index.js';
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: PASS

- [ ] **Step 5: Create transformer index**

Create `packages/core/src/transformer/index.ts`:

```typescript
export { Transformer } from './Transformer.js';
export { RequestMapper } from './Mapper.js';
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(core): implement Transformer"
```

---

## Task 6: Restorer Implementation (Streaming)

**Files:**
- Create: `packages/core/src/restorer/Restorer.ts`
- Create: `packages/core/src/restorer/Restorer.test.ts`

- [ ] **Step 1: Write the failing test for Restorer**

Create `packages/core/src/restorer/Restorer.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: FAIL with "Cannot find module './Restorer.js'"

- [ ] **Step 3: Write Restorer implementation**

Create `packages/core/src/restorer/Restorer.ts`:

```typescript
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
    while (this.buffer.length >= this.bufferSize) {
      this.pattern.lastIndex = 0;
      const match = this.pattern.exec(this.buffer);

      if (match && match.index < this.buffer.length - this.bufferSize) {
        const placeholder = match[0];
        const original = this.mapping.get(placeholder);

        if (original !== undefined) {
          output += this.buffer.slice(0, match.index) + original;
          this.buffer = this.buffer.slice(match.index + placeholder.length);
        } else {
          output += this.buffer.slice(0, match.index + placeholder.length);
          this.buffer = this.buffer.slice(match.index + placeholder.length);
        }
      } else {
        const safeLength = this.buffer.length - this.bufferSize;
        output += this.buffer.slice(0, safeLength);
        this.buffer = this.buffer.slice(safeLength);
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: PASS

- [ ] **Step 5: Create restorer index**

Create `packages/core/src/restorer/index.ts`:

```typescript
export { StreamRestorer } from './Restorer.js';
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(core): implement StreamRestorer"
```

---

## Task 7: Detector Implementation

**Files:**
- Create: `packages/core/src/detector/prompts/default.ts`
- Create: `packages/core/src/detector/Detector.ts`
- Create: `packages/core/src/detector/Detector.test.ts`

- [ ] **Step 1: Write default prompt template**

Create `packages/core/src/detector/prompts/default.ts`:

```typescript
export const DEFAULT_DETECTION_PROMPT = `你是一个隐私保护助手，负责检测文本中所有不应发送到外部服务的敏感信息。

敏感信息包括但不限于：
- 个人身份信息：姓名、电话、邮箱、身份证号、地址、照片等
- 财务信息：银行卡号、信用卡号、金额、账户信息等
- 认证凭证：密码、密钥、令牌、API 密钥等
- 内部信息：项目名称、内部系统名称、员工信息、商业机密等
- 医疗信息：病历、诊断、药物等
- 任何可能泄露隐私或违反合规要求的内容

请检测以下文本中的敏感信息，返回 JSON 数组格式：
[
  {"type": "PERSON", "value": "原始值", "start": 起始位置, "end": 结束位置, "context_before": "前文", "context_after": "后文"},
  ...
]

如果没有敏感信息，返回空数组：[]

文本：
{input}`;
```

- [ ] **Step 2: Write the failing test for Detector**

Create `packages/core/src/detector/Detector.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Detector } from './Detector.js';
import type { IHttpClient } from '../interfaces/index.js';

describe('Detector', () => {
  it('should call LLM with correct prompt', async () => {
    const mockClient: IHttpClient = {
      post: vi.fn().mockResolvedValue({
        status: 200,
        headers: {},
        body: JSON.stringify({
          choices: [{
            message: {
              content: '[]'
            }
          }]
        })
      }),
      postStream: vi.fn()
    };

    const detector = new Detector(mockClient, 'http://localhost:11434/v1', 'gemma4');
    const result = await detector.detect('Hello world');

    expect(result.sensitive).toEqual([]);
    expect(result.scene).toBe('text');
  });

  it('should parse detection result correctly', async () => {
    const mockClient: IHttpClient = {
      post: vi.fn().mockResolvedValue({
        status: 200,
        headers: {},
        body: JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify([
                { type: 'PERSON', value: '张三', start: 0, end: 2, context_before: '', context_after: '你好' }
              ])
            }
          }]
        })
      }),
      postStream: vi.fn()
    };

    const detector = new Detector(mockClient, 'http://localhost:11434/v1', 'gemma4');
    const result = await detector.detect('张三你好');

    expect(result.sensitive).toHaveLength(1);
    expect(result.sensitive[0].type).toBe('PERSON');
    expect(result.sensitive[0].value).toBe('张三');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: FAIL with "Cannot find module './Detector.js'"

- [ ] **Step 4: Write Detector implementation**

Create `packages/core/src/detector/Detector.ts`:

```typescript
import type { IHttpClient, DetectionResult, SensitiveItem, SceneType } from '../types/index.js';
import { DEFAULT_DETECTION_PROMPT } from './prompts/default.js';

export class Detector {
  private client: IHttpClient;
  private endpoint: string;
  private model: string;
  private timeout: number;
  private prompt: string;

  constructor(
    client: IHttpClient,
    endpoint: string,
    model: string,
    timeout: number = 15000,
    prompt: string = DEFAULT_DETECTION_PROMPT
  ) {
    this.client = client;
    this.endpoint = endpoint;
    this.model = model;
    this.timeout = timeout;
    this.prompt = prompt;
  }

  async detect(input: string): Promise<DetectionResult> {
    const prompt = this.prompt.replace('{input}', input);
    
    const response = await this.client.post(
      `${this.endpoint}/chat/completions`,
      JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048
      }),
      { 'Content-Type': 'application/json' }
    );

    if (response.status !== 200) {
      throw new Error(`Detection failed: ${response.status}`);
    }

    const data = JSON.parse(response.body);
    const content = data.choices?.[0]?.message?.content || '[]';
    
    return this.parseResult(content);
  }

  private parseResult(content: string): DetectionResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '[]';
      const sensitive: SensitiveItem[] = JSON.parse(jsonStr);
      
      // Determine scene type based on content
      const scene: SceneType = this.determineScene(content);
      
      return { sensitive, scene };
    } catch {
      return { sensitive: [], scene: 'text' };
    }
  }

  private determineScene(content: string): SceneType {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('计算') || lowerContent.includes('calculation')) {
      return 'calculation';
    }
    if (lowerContent.includes('代码') || lowerContent.includes('code')) {
      return 'code';
    }
    return 'text';
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: PASS

- [ ] **Step 6: Create detector index**

Create `packages/core/src/detector/index.ts`:

```typescript
export { Detector } from './Detector.js';
export { DEFAULT_DETECTION_PROMPT } from './prompts/default.js';
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(core): implement Detector"
```

---

## Task 8: Code Executor Implementation

**Files:**
- Create: `packages/core/src/executor/Executor.ts`
- Create: `packages/core/src/executor/Executor.test.ts`

- [ ] **Step 1: Write the failing test for Executor**

Create `packages/core/src/executor/Executor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CodeExecutor } from './Executor.js';

describe('CodeExecutor', () => {
  it('should execute simple expression', async () => {
    const executor = new CodeExecutor();
    const result = await executor.execute('return 1 + 1;', {});
    
    expect(result.success).toBe(true);
    expect(result.result).toBe(2);
  });

  it('should execute with placeholders', async () => {
    const executor = new CodeExecutor();
    const result = await executor.execute('return a - b;', { a: 10000, b: 3500 });
    
    expect(result.success).toBe(true);
    expect(result.result).toBe(6500);
  });

  it('should handle execution error', async () => {
    const executor = new CodeExecutor();
    const result = await executor.execute('throw new Error("test");', {});
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should timeout on infinite loop', async () => {
    const executor = new CodeExecutor(1000); // 1 second timeout
    const result = await executor.execute('while(true) {}', {});
    
    expect(result.success).toBe(false);
  }, 5000);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: FAIL with "Cannot find module './Executor.js'"

- [ ] **Step 3: Write Executor implementation**

Create `packages/core/src/executor/Executor.ts`:

```typescript
import type { ExecutorResult } from '../types/index.js';

export class CodeExecutor {
  private timeout: number;

  constructor(timeout: number = 5000) {
    this.timeout = timeout;
  }

  async execute(code: string, placeholders: Record<string, unknown>): Promise<ExecutorResult> {
    try {
      // For MVP, use a simple eval-based executor
      // In production, this should use QuickJS WASM
      const keys = Object.keys(placeholders);
      const values = Object.values(placeholders);
      
      const wrappedCode = `
        (function(${keys.join(', ')}) {
          ${code}
        })
      `;

      const fn = eval(wrappedCode);
      
      const result = await Promise.race([
        Promise.resolve(fn(...values)),
        this.createTimeoutPromise()
      ]);

      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, this.timeout);
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: PASS

- [ ] **Step 5: Create executor index**

Create `packages/core/src/executor/index.ts`:

```typescript
export { CodeExecutor } from './Executor.js';
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(core): implement CodeExecutor (MVP version)"
```

---

## Task 9: Proxy Implementation

**Files:**
- Create: `packages/core/src/proxy/Proxy.ts`
- Create: `packages/core/src/proxy/Proxy.test.ts`

- [ ] **Step 1: Write the failing test for Proxy**

Create `packages/core/src/proxy/Proxy.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { NyxProxy } from './Proxy.js';
import type { IHttpClient } from '../interfaces/index.js';

describe('NyxProxy', () => {
  it('should forward request to upstream', async () => {
    const mockClient: IHttpClient = {
      post: vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          body: JSON.stringify({ choices: [{ message: { content: '[]' } }] })
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          body: JSON.stringify({ choices: [{ message: { content: 'Hello' } }] })
        }),
      postStream: vi.fn()
    };

    const proxy = new NyxProxy(
      mockClient,
      'http://localhost:11434/v1',
      'gemma4',
      'https://api.openai.com/v1',
      'test-key'
    );

    const result = await proxy.process('Hello world');
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: FAIL with "Cannot find module './Proxy.js'"

- [ ] **Step 3: Write Proxy implementation**

Create `packages/core/src/proxy/Proxy.ts`:

```typescript
import type { IHttpClient } from '../interfaces/index.js';
import { Detector } from '../detector/index.js';
import { Transformer } from '../transformer/index.js';
import { StreamRestorer } from '../restorer/index.js';
import { CodeExecutor } from '../executor/index.js';

export class NyxProxy {
  private detector: Detector;
  private transformer: Transformer;
  private executor: CodeExecutor;
  private client: IHttpClient;
  private upstreamEndpoint: string;
  private upstreamApiKey: string;

  constructor(
    client: IHttpClient,
    localLLMEndpoint: string,
    localLLMModel: string,
    upstreamEndpoint: string,
    upstreamApiKey: string
  ) {
    this.client = client;
    this.detector = new Detector(client, localLLMEndpoint, localLLMModel);
    this.transformer = new Transformer();
    this.executor = new CodeExecutor();
    this.upstreamEndpoint = upstreamEndpoint;
    this.upstreamApiKey = upstreamApiKey;
  }

  async process(input: string): Promise<string> {
    // 1. Detect sensitive information
    const detection = await this.detector.detect(input);

    // 2. Transform (replace sensitive content with placeholders)
    const { masked, mapping } = this.transformer.transform(input, detection.sensitive);

    // 3. Forward to upstream LLM
    const response = await this.client.post(
      `${this.upstreamEndpoint}/chat/completions`,
      JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: masked }]
      }),
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.upstreamApiKey}`
      }
    );

    if (response.status !== 200) {
      throw new Error(`Upstream error: ${response.status}`);
    }

    const data = JSON.parse(response.body);
    let content = data.choices?.[0]?.message?.content || '';

    // 4. Execute code if present (for calculation scenarios)
    if (detection.scene === 'calculation' && content.includes('return')) {
      const execResult = await this.executor.execute(content, Object.fromEntries(mapping));
      if (execResult.success) {
        content = `Result: ${execResult.result}`;
      }
    }

    // 5. Restore placeholders
    const restorer = new StreamRestorer(mapping);
    const restored = restorer.restore(content) + restorer.flush();

    return restored;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/core test
```

Expected: PASS

- [ ] **Step 5: Create proxy index**

Create `packages/core/src/proxy/index.ts`:

```typescript
export { NyxProxy } from './Proxy.js';
```

- [ ] **Step 6: Create core package index**

Create `packages/core/src/index.ts`:

```typescript
export * from './types/index.js';
export * from './interfaces/index.js';
export * from './detector/index.js';
export * from './transformer/index.js';
export * from './restorer/index.js';
export * from './executor/index.js';
export * from './proxy/index.js';
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(core): implement NyxProxy"
```

---

## Task 10: Backends Package Setup

**Files:**
- Create: `packages/backends/package.json`
- Create: `packages/backends/tsconfig.json`

- [ ] **Step 1: Create backends package.json**

```json
{
  "name": "@nyx-proxy/backends",
  "version": "0.1.0",
  "description": "Platform backends for Nyx proxy",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@nyx-proxy/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@types/node": "^20.10.0"
  }
}
```

- [ ] **Step 2: Create backends tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: setup backends package"
```

---

## Task 11: Node.js Backend Implementations

**Files:**
- Create: `packages/backends/src/node/logger/FileLogger.ts`
- Create: `packages/backends/src/node/http/NodeHttpClient.ts`
- Create: `packages/backends/src/node/storage/LocalStorage.ts`
- Create: `packages/backends/src/index.ts`

- [ ] **Step 1: Write FileLogger implementation**

Create `packages/backends/src/node/logger/FileLogger.ts`:

```typescript
import type { ILogger, LogLevel } from '@nyx-proxy/core';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class FileLogger implements ILogger {
  private logFile: string;
  private minLevel: LogLevel;

  constructor(logDir: string, minLevel: LogLevel = 'info') {
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    this.logFile = join(logDir, 'nyx.log');
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private write(level: LogLevel, message: string, args: unknown[]): void {
    if (!this.shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : '';
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}\n`;
    
    appendFileSync(this.logFile, line);
  }

  debug(message: string, ...args: unknown[]): void {
    this.write('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.write('info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.write('warn', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.write('error', message, args);
  }
}
```

- [ ] **Step 2: Write NodeHttpClient implementation**

Create `packages/backends/src/node/http/NodeHttpClient.ts`:

```typescript
import type { IHttpClient, HttpResponse } from '@nyx-proxy/core';

export class NodeHttpClient implements IHttpClient {
  async post(
    url: string,
    body: string,
    headers: Record<string, string> = {}
  ): Promise<HttpResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body
    });

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    };
  }

  async *postStream(
    url: string,
    body: string,
    headers: Record<string, string> = {}
  ): AsyncIterable<string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body
    });

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  }
}
```

- [ ] **Step 3: Write LocalStorage implementation**

Create `packages/backends/src/node/storage/LocalStorage.ts`:

```typescript
import type { IStorage } from '@nyx-proxy/core';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

export class LocalStorage implements IStorage {
  private storageDir: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    return join(this.storageDir, `${encodeURIComponent(key)}.json`);
  }

  async get(key: string): Promise<string | null> {
    const filePath = this.getFilePath(key);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath, 'utf-8');
  }

  async set(key: string, value: string): Promise<void> {
    const filePath = this.getFilePath(key);
    writeFileSync(filePath, value, 'utf-8');
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}
```

- [ ] **Step 4: Create backends index**

Create `packages/backends/src/index.ts`:

```typescript
export { FileLogger } from './node/logger/FileLogger.js';
export { NodeHttpClient } from './node/http/NodeHttpClient.js';
export { LocalStorage } from './node/storage/LocalStorage.js';
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(backends): implement Node.js backends"
```

---

## Task 12: CLI Package Setup

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`

- [ ] **Step 1: Create CLI package.json**

```json
{
  "name": "@nyx-proxy/cli",
  "version": "0.1.0",
  "description": "CLI for Nyx proxy",
  "type": "module",
  "bin": {
    "nyx": "./dist/bin/nyx.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@nyx-proxy/core": "workspace:*",
    "@nyx-proxy/backends": "workspace:*",
    "commander": "^11.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@types/node": "^20.10.0"
  }
}
```

- [ ] **Step 2: Create CLI tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: setup CLI package"
```

---

## Task 13: CLI Config Loader

**Files:**
- Create: `packages/cli/src/utils/config-loader.ts`
- Create: `packages/cli/src/utils/config-loader.test.ts`

- [ ] **Step 1: Write the failing test for config loader**

Create `packages/cli/src/utils/config-loader.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ConfigLoader } from './config-loader.js';
import type { ProxyConfig } from '@nyx-proxy/core';

describe('ConfigLoader', () => {
  it('should load default config', () => {
    const loader = new ConfigLoader();
    const config = loader.load();
    
    expect(config.server.port).toBe(3000);
    expect(config.server.host).toBe('0.0.0.0');
  });

  it('should merge environment variables', () => {
    process.env.NYX_SERVER_PORT = '8080';
    process.env.NYX_LOCAL_LLM_ENDPOINT = 'http://localhost:11434/v1';
    
    const loader = new ConfigLoader();
    const config = loader.load();
    
    expect(config.server.port).toBe(8080);
    
    delete process.env.NYX_SERVER_PORT;
    delete process.env.NYX_LOCAL_LLM_ENDPOINT;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @nyx-proxy/cli test
```

Expected: FAIL with "Cannot find module './config-loader.js'"

- [ ] **Step 3: Write ConfigLoader implementation**

Create `packages/cli/src/utils/config-loader.ts`:

```typescript
import type { ProxyConfig } from '@nyx-proxy/core';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DEFAULT_CONFIG: ProxyConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  localLLM: {
    provider: 'ollama',
    endpoint: 'http://localhost:11434/v1',
    model: 'gemma4',
    timeout: 15000
  },
  upstream: {
    endpoint: 'https://api.openai.com/v1',
    apiKey: ''
  },
  detection: {
    timeout: 15000
  },
  logging: {
    enabled: true,
    level: 'info'
  }
};

export class ConfigLoader {
  private configPath?: string;

  constructor(configPath?: string) {
    this.configPath = configPath;
  }

  load(): ProxyConfig {
    let config = { ...DEFAULT_CONFIG };

    // Load from file
    const filePath = this.findConfigFile();
    if (filePath) {
      const fileConfig = JSON.parse(readFileSync(filePath, 'utf-8'));
      config = this.merge(config, fileConfig);
    }

    // Override with environment variables
    config = this.applyEnvVars(config);

    // Resolve environment variable references in values
    config = this.resolveEnvRefs(config);

    return config;
  }

  private findConfigFile(): string | null {
    if (this.configPath) {
      return existsSync(this.configPath) ? this.configPath : null;
    }

    const cwdConfig = join(process.cwd(), 'nyx.json');
    if (existsSync(cwdConfig)) {
      return cwdConfig;
    }

    const homeConfig = join(homedir(), '.nyx', 'config.json');
    if (existsSync(homeConfig)) {
      return homeConfig;
    }

    return null;
  }

  private applyEnvVars(config: ProxyConfig): ProxyConfig {
    if (process.env.NYX_SERVER_PORT) {
      config.server.port = parseInt(process.env.NYX_SERVER_PORT, 10);
    }
    if (process.env.NYX_SERVER_HOST) {
      config.server.host = process.env.NYX_SERVER_HOST;
    }
    if (process.env.NYX_LOCAL_LLM_ENDPOINT) {
      config.localLLM.endpoint = process.env.NYX_LOCAL_LLM_ENDPOINT;
    }
    if (process.env.NYX_LOCAL_LLM_MODEL) {
      config.localLLM.model = process.env.NYX_LOCAL_LLM_MODEL;
    }
    if (process.env.NYX_UPSTREAM_ENDPOINT) {
      config.upstream.endpoint = process.env.NYX_UPSTREAM_ENDPOINT;
    }
    if (process.env.NYX_UPSTREAM_API_KEY) {
      config.upstream.apiKey = process.env.NYX_UPSTREAM_API_KEY;
    }

    return config;
  }

  private resolveEnvRefs(config: ProxyConfig): ProxyConfig {
    const resolve = (value: unknown): unknown => {
      if (typeof value === 'string') {
        const match = value.match(/^\$\{(.+)\}$/);
        if (match) {
          return process.env[match[1]] || '';
        }
      }
      return value;
    };

    return JSON.parse(JSON.stringify(config, (_, v) => resolve(v)));
  }

  private merge(base: ProxyConfig, override: Partial<ProxyConfig>): ProxyConfig {
    return {
      ...base,
      ...override,
      server: { ...base.server, ...override.server },
      localLLM: { ...base.localLLM, ...override.localLLM },
      upstream: { ...base.upstream, ...override.upstream },
      detection: { ...base.detection, ...override.detection },
      logging: { ...base.logging, ...override.logging }
    } as ProxyConfig;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @nyx-proxy/cli test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(cli): implement ConfigLoader"
```

---

## Task 14: CLI Commands

**Files:**
- Create: `packages/cli/src/commands/start.ts`
- Create: `packages/cli/src/commands/status.ts`
- Create: `packages/cli/src/bin/nyx.ts`

- [ ] **Step 1: Write start command**

Create `packages/cli/src/commands/start.ts`:

```typescript
import { createServer } from 'http';
import type { ProxyConfig } from '@nyx-proxy/core';
import { NyxProxy } from '@nyx-proxy/core';
import { NodeHttpClient, FileLogger, LocalStorage } from '@nyx-proxy/backends';
import { ConfigLoader } from '../utils/config-loader.js';

export async function startCommand(options: { config?: string; port?: number }): Promise<void> {
  const loader = new ConfigLoader(options.config);
  const config: ProxyConfig = loader.load();

  const port = options.port || config.server.port;
  const host = config.server.host;

  const client = new NodeHttpClient();
  const proxy = new NyxProxy(
    client,
    config.localLLM.endpoint || '',
    config.localLLM.model,
    config.upstream.endpoint,
    config.upstream.apiKey
  );

  const logger = new FileLogger('./logs', config.logging?.level || 'info');

  const server = createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body);
        const messages = requestData.messages || [];
        const lastMessage = messages[messages.length - 1];
        const input = lastMessage?.content || '';

        logger.info('Processing request', { inputLength: input.length });

        const result = await proxy.process(input);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{
            message: { role: 'assistant', content: result },
            finish_reason: 'stop'
          }]
        }));
      } catch (error) {
        logger.error('Request failed', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  });

  server.listen(port, host, () => {
    console.log(`Nyx proxy running on http://${host}:${port}`);
    logger.info(`Server started on ${host}:${port}`);
  });
}
```

- [ ] **Step 2: Write status command**

Create `packages/cli/src/commands/status.ts`:

```typescript
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export async function statusCommand(): Promise<void> {
  console.log('Nyx Proxy Status\n');

  // Check if running
  const pidFile = join(process.cwd(), '.nyx', 'server.pid');
  if (existsSync(pidFile)) {
    console.log('Status: Running');
  } else {
    console.log('Status: Not running');
  }

  // Check config
  const configFile = join(process.cwd(), 'nyx.json');
  if (existsSync(configFile)) {
    console.log(`Config: ${configFile}`);
  } else {
    console.log('Config: Using defaults');
  }

  // Check logs
  const logsDir = join(process.cwd(), 'logs');
  if (existsSync(logsDir)) {
    const files = readdirSync(logsDir);
    console.log(`Logs: ${files.length} file(s) in ${logsDir}`);
  }
}
```

- [ ] **Step 3: Write CLI entry point**

Create `packages/cli/src/bin/nyx.ts`:

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { startCommand } from '../commands/start.js';
import { statusCommand } from '../commands/status.js';

const program = new Command();

program
  .name('nyx')
  .description('Privacy-preserving LLM gateway')
  .version('0.1.0');

program
  .command('start')
  .description('Start the Nyx proxy server')
  .option('-c, --config <path>', 'Path to config file')
  .option('-p, --port <number>', 'Port to listen on', parseInt)
  .action(async (options) => {
    await startCommand(options);
  });

program
  .command('status')
  .description('Show server status')
  .action(async () => {
    await statusCommand();
  });

program.parse();
```

- [ ] **Step 4: Build all packages**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(cli): implement start and status commands"
```

---

## Task 15: Integration Test

**Files:**
- Create: `tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

describe('Nyx Integration', () => {
  let server: ChildProcess;

  beforeAll(async () => {
    // Start server
    server = spawn('node', ['packages/cli/dist/bin/nyx.js', 'start'], {
      env: {
        ...process.env,
        NYX_UPSTREAM_API_KEY: 'test-key'
      }
    });

    // Wait for server to start
    await sleep(2000);
  }, 10000);

  afterAll(() => {
    server?.kill();
  });

  it('should respond to health check', async () => {
    const response = await fetch('http://localhost:3000/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });

    // Will fail without real LLM, but should not crash
    expect(response.status).toBeDefined();
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
pnpm test tests/integration.test.ts
```

Expected: Test runs (may fail without real LLM, but server should start)

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "test: add integration test"
```

---

## Task 16: Documentation and Finalization

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `CHANGELOG.md`

- [ ] **Step 1: Write README**

Create `README.md`:

```markdown
# Nyx Proxy

Privacy-preserving LLM gateway that protects sensitive data before sending to cloud LLMs.

## Features

- 🔒 **Sensitive Content Detection** - Uses local LLM for semantic understanding
- 🔄 **Transparent Replacement** - Automatically replaces and restores sensitive data
- 🌊 **Streaming Support** - Handles streaming responses with real-time restoration
- 🧮 **Local Calculation** - Executes calculations locally for financial scenarios
- 🔌 **OpenAI Compatible** - Drop-in replacement for OpenAI API

## Quick Start

```bash
# Install
npm install -g @nyx-proxy/cli

# Configure
export NYX_UPSTREAM_API_KEY=your-openai-key
export NYX_LOCAL_LLM_ENDPOINT=http://localhost:11434/v1

# Run
nyx start
```

## Configuration

Create `nyx.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "localLLM": {
    "provider": "ollama",
    "endpoint": "http://localhost:11434/v1",
    "model": "gemma4",
    "timeout": 15000
  },
  "upstream": {
    "endpoint": "https://api.openai.com/v1",
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

## License

Apache 2.0
```

- [ ] **Step 2: Write LICENSE**

Create `LICENSE`:

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.
   ...
   (Full Apache 2.0 license text)
```

- [ ] **Step 3: Write CHANGELOG**

Create `CHANGELOG.md`:

```markdown
# Changelog

## [0.1.0] - 2026-05-11

### Added
- Initial MVP release
- Core detection, transformation, and restoration
- CLI with start and status commands
- Node.js backend support
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "docs: add README, LICENSE, and CHANGELOG"
```

---

## Self-Review

**1. Spec Coverage:**

| Spec Requirement | Task |
|------------------|------|
| Core proxy | Task 9 |
| Sensitive detection | Task 7 |
| Placeholder replacement | Task 4, 5 |
| Streaming restoration | Task 6 |
| Code sandbox | Task 8 |
| Node.js backend | Task 11 |
| CLI | Task 13, 14 |
| Configuration | Task 13 |

**2. Placeholder Scan:** No TBD, TODO, or incomplete sections found.

**3. Type Consistency:** All types defined in Task 3 are used consistently throughout.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-11-nyx-proxy-mvp.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
