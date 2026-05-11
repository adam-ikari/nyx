# Nyx Proxy - 隐私保护 LLM 网关设计文档

## 概述

Nyx 是一个隐私保护的 LLM 网关，利用本地模型在请求发送到云端 LLM 之前检测并替换敏感内容，在响应返回后透明地还原原始信息——无需改变应用行为。

## 解决的核心问题

1. **合规需求** — 防止敏感数据（PII、财务信息、凭证等）发送到第三方云服务
2. **隐私保护** — 在使用云端 LLM 时保持对数据的控制
3. **安全审计** — 记录和审计所有发送到 LLM 的内容

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    管理中台                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │配置管理  │ │实例管理  │ │日志审计  │ │权限控制  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  技术栈: Hono + React + KV/D1                           │
└─────────────────────────────────────────────────────────┘
                         │
                    HTTP API (共享密钥)
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼───┐           ┌───▼───┐           ┌───▼───┐
│Nyx #1 │           │Nyx #2 │           │Nyx #N │
└───────┘           └───────┘           └───────┘
```

### 请求处理流程

```
请求 → 检测 → 替换 → 转发 → 还原 → 响应
         │       │       │       │
      本地LLM  映射替换  上游LLM  映射还原
```

## 模块设计

### 包结构（Monorepo）

```
nyx-proxy/
├── packages/
│   ├── core/                    # @nyx-proxy/core
│   │   ├── src/
│   │   │   ├── detector/        # 检测引擎
│   │   │   ├── transformer/     # 替换引擎
│   │   │   ├── restorer/        # 还原引擎
│   │   │   ├── proxy/           # 代理转发
│   │   │   ├── types/           # 类型定义
│   │   │   └── interfaces/      # 接口定义
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backends/                # @nyx-proxy/backends
│   │   ├── src/
│   │   │   ├── node/            # Node.js 实现
│   │   │   ├── worker/          # Cloudflare Worker 实现
│   │   │   └── index.ts         # 条件编译入口
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     # @nyx-proxy/cli
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   ├── bin/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── dashboard/               # @nyx-proxy/dashboard（后续版本）
│       ├── src/
│       │   ├── client/          # React 前端
│       │   └── shared/          # 共享类型
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

### 核心模块（`@nyx-proxy/core`）

```
@nyx-proxy/core
├── detector/
│   ├── Detector.ts              # 检测引擎
│   └── prompts/                 # 提示词模板
├── transformer/
│   ├── Transformer.ts           # 替换引擎
│   └── Mapper.ts                # 动态映射管理
├── restorer/
│   └── Restorer.ts              # 还原引擎（流式处理）
├── proxy/
│   └── Proxy.ts                 # 代理转发
├── types/
│   └── index.ts                 # 共享类型定义
└── interfaces/
    ├── ILogger.ts               # 日志接口
    ├── IHttpClient.ts           # HTTP 客户端接口
    ├── IStorage.ts              # 存储接口
    └── ILLMClient.ts            # 本地 LLM 客户端接口
```

### 后端模块（`@nyx-proxy/backends`）

```
@nyx-proxy/backends
├── interfaces/                  # 继承 core/interfaces
├── node/                        # Node.js 实现
│   ├── logger/
│   │   └── FileLogger.ts
│   ├── http/
│   │   └── NodeHttpClient.ts
│   └── storage/
│       └── LocalStorage.ts
├── worker/                      # Cloudflare Worker 实现（后续版本）
│   ├── logger/
│   │   └── KVLogger.ts
│   ├── http/
│   │   └── FetchClient.ts
│   └── storage/
│       ├── KVStorage.ts
│       └── R2Storage.ts
└── index.ts                     # 条件编译入口
```

### CLI 模块（`@nyx-proxy/cli`）

```
@nyx-proxy/cli
├── commands/
│   ├── start.ts                 # 启动服务（默认命令）
│   ├── status.ts                # 查看状态
│   └── config.ts                # 配置管理
├── bin/
│   └── nyx.ts                   # CLI 入口
└── utils/
    └── config-loader.ts         # 配置加载
```

**CLI 命令：**

```bash
nyx                            # 启动服务（默认 localhost:3000）
nyx --port 8080                # 指定端口
nyx --config ./nyx.json        # 指定配置文件
nyx status                     # 查看运行状态
nyx config init                # 生成默认配置
nyx config show                # 显示当前配置
nyx connect <dashboard-url>    # 连接管理中台
```

### 管理中台模块（`@nyx-proxy/dashboard`）

**前端（TypeScript/React）：**

```
@nyx-proxy/dashboard
├── client/                     # React 前端
│   ├── pages/
│   │   ├── dashboard/          # 仪表盘
│   │   ├── instances/          # 实例管理
│   │   ├── config/             # 配置管理
│   │   ├── logs/               # 日志审计
│   │   └── settings/           # 系统设置
│   └── components/
├── shared/
│   └── types.ts                # 前后端共享类型
└── package.json
```

**后端（Go，独立仓库）：**

社区版和企业版中台后端使用 Go 开发，详见商业化设计章节。

**功能分层：**

| 层级 | 功能 | 个人 | 团队 | 企业 |
|------|------|------|------|------|
| 基础 | 配置管理、日志查看 | ✅ | ✅ | ✅ |
| 协作 | 多用户、角色 | ❌ | ✅ | ✅ |
| 运维 | 多实例、监控告警 | ❌ | ❌ | ✅ |
| 企业 | 多租户、审计报表 | ❌ | ❌ | ✅ |

## 敏感内容检测

### 检测方式

使用本地 LLM 进行语义理解来检测敏感内容。无需预定义类别——LLM 根据上下文自动识别所有敏感信息。

### 提示词模板

```
你是一个隐私保护助手，负责检测文本中所有不应发送到外部服务的敏感信息。

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
{input}
```

### 本地 LLM 配置

- 使用 OpenAI 兼容 API 格式
- 支持多种检测方案：

| 方案 | 说明 | 适用场景 |
|------|------|----------|
| Ollama | 本地部署，完全私有 | 企业内网、高安全需求 |
| LocalAI | 本地部署，OpenAI 兼容 | 企业内网 |
| Cloudflare AI | 无需部署，边缘低延迟 | 个人、小团队 |

**Cloudflare AI 配置：**

```json
{
  "localLLM": {
    "provider": "cloudflare",
    "model": "@cf/google/gemma-7b-it",
    "accountId": "${CF_ACCOUNT_ID}",
    "apiToken": "${CF_API_TOKEN}",
    "timeout": 15000
  }
}
```

**Ollama 配置：**

```json
{
  "localLLM": {
    "provider": "ollama",
    "endpoint": "http://localhost:11434/v1",
    "model": "gemma4",
    "timeout": 15000
  }
}
```

- 针对 Gemma 4 / Llama 3 8B 级别模型优化（小参数量、快速推理）
- 单次调用、结构化 JSON 输出

## 占位符设计

### 占位符格式

使用唯一前缀确保不与编程场景冲突：

```
格式：«NYX_PERSON_1»、«NYX_PHONE_1»

示例：
原文：请联系张三，电话13800138000
替换：请联系 «NYX_PERSON_1»，电话 «NYX_PHONE_1»
```

**优点：**

- `«»`（guillemets）在编程中极少使用，冲突风险极低
- `NYX_` 前缀确保唯一性
- 云端 LLM 能理解语义（PERSON、PHONE）
- 广泛支持的 Unicode 字符

### 防冲突机制

检测用户文本是否包含类似格式，如有冲突则添加随机后缀：

```typescript
class RequestMapper {
  private mapping: Map<string, string> = new Map();
  private useRandomSuffix: boolean = false;
  private counter: Record<string, number> = {};

  constructor(originalText: string) {
    // 检测用户文本是否包含类似格式
    const conflictPattern = /«NYX_[A-Z]+_\d+»/;
    this.useRandomSuffix = conflictPattern.test(originalText);
  }

  transform(value: string, type: string): string {
    const index = (this.counter[type] || 0) + 1;
    this.counter[type] = index;

    let placeholder: string;
    if (this.useRandomSuffix) {
      // 有冲突时添加随机后缀
      const rand = randomString(4);
      placeholder = `«NYX_${type}_${index}_${rand}»`;
    } else {
      // 无冲突使用简单格式
      placeholder = `«NYX_${type}_${index}»`;
    }

    this.mapping.set(placeholder, value);
    return placeholder;
  }

  restore(text: string): string {
    let result = text;
    for (const [placeholder, original] of this.mapping) {
      result = result.replace(placeholder, original);
    }
    return result;
  }
}
```

### 类型语义

| 类型 | 含义 | 示例 |
|------|------|------|
| PERSON | 人名 | «NYX_PERSON_1» |
| PHONE | 电话号码 | «NYX_PHONE_1» |
| EMAIL | 电子邮箱 | «NYX_EMAIL_1» |
| ID | 身份证件 | «NYX_ID_1» |
| CARD | 银行卡号 | «NYX_CARD_1» |
| ADDRESS | 地址 | «NYX_ADDRESS_1» |
| CREDENTIAL | 凭证/密钥 | «NYX_CREDENTIAL_1» |
| MEDICAL | 医疗信息 | «NYX_MEDICAL_1» |
| INTERNAL | 内部信息 | «NYX_INTERNAL_1» |

## 流式响应还原

### 缓冲替换策略

```
LLM 输出流：
"...请联系 «NYX_PERSON_1»，电话是 «NYX_PHONE_1»..."

缓冲窗口：
"...请联系 «NYX_PERS" → 不完整，继续缓冲
"...请联系 «NYX_PERSON_1»" → 完整匹配，替换为"张三"，输出
"，电话是 «NYX_PHON" → 不完整，继续缓冲
"，电话是 «NYX_PHONE_1»" → 完整匹配，替换为"13800138000"，输出
```

### 动态缓冲大小

- 占位符格式：`«NYX_TYPE_N»` 或 `«NYX_TYPE_N_rand»`
- 最大预估长度：`«NYX_CREDENTIAL_99_xk9m»` = 24 字符
- 缓冲窗口：28 字符（略大于最大占位符长度）

### 实现代码

```typescript
class StreamRestorer {
  private buffer = '';
  private readonly bufferSize = 28;
  private pattern: RegExp;
  private mapping: Map<string, string>;

  constructor(pattern: RegExp, mapping: Map<string, string>) {
    this.pattern = pattern;
    this.mapping = mapping;
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
          // 找到映射，替换并输出
          output += this.buffer.slice(0, match.index) + original;
          this.buffer = this.buffer.slice(match.index + placeholder.length);
        } else {
          // 未找到映射，输出占位符原文
          output += this.buffer.slice(0, match.index + placeholder.length);
          this.buffer = this.buffer.slice(match.index + placeholder.length);
        }
      } else {
        // 输出安全部分，保留可能的不完整占位符
        const safeLength = this.buffer.length - this.bufferSize;
        output += this.buffer.slice(0, safeLength);
        this.buffer = this.buffer.slice(safeLength);
      }
    }

    return output;
  }

  flush(): string {
    // 流结束，处理剩余缓冲
    this.pattern.lastIndex = 0;
    const result = this.buffer.replace(this.pattern, (match) => {
      return this.mapping.get(match) || match;
    });
    this.buffer = '';
    return result;
  }
}
```

## 场景扩展设计

### 场景识别

本地 LLM 在检测敏感信息时，同时识别场景类型：

```json
{
  "sensitive": [
    {"type": "PERSON", "value": "张三", "start": 3, "end": 5},
    {"type": "NUMBER", "value": "10000", "start": 8, "end": 13}
  ],
  "scene": "calculation",
  "hint": "用户需要进行数值计算"
}
```

### 场景类型

| 场景 | 说明 | 本地处理 |
|------|------|----------|
| text | 普通文本对话 | 无 |
| calculation | 数值计算 | 执行表达式 |
| code | 代码生成/执行 | 沙盒执行 |

### 云端响应格式

云端 LLM 返回图灵完备的代码，本地在沙盒中安全执行：

```json
{
  "response": "计算结果是 {{result}}",
  "code": "return placeholder_1 - placeholder_2;"
}
```

### 代码执行沙盒

使用 QuickJS (WASM) 作为安全沙盒：

```typescript
import { QuickJS } from 'quickjs-emscripten';

class CodeExecutor {
  private vm: QuickJS;

  async execute(
    code: string,
    placeholders: Record<string, unknown>
  ): Promise<unknown> {
    const vm = new QuickJS();

    try {
      // 注入占位符变量
      for (const [key, value] of Object.entries(placeholders)) {
        vm.setGlobal(key, value);
      }

      // 安全执行代码
      const result = await vm.evalCode(code);
      return result;
    } finally {
      vm.dispose();
    }
  }
}
```

### 安全性保证

| 措施 | 说明 |
|------|------|
| WASM 隔离 | 天然沙盒，无法访问宿主环境 |
| 无 I/O | 无法访问文件、网络 |
| 无外部调用 | 无法调用宿主函数 |
| 资源限制 | 可限制执行时间和内存 |

### 统一处理流程

```typescript
async function process(input: string): Promise<string> {
  // 1. 本地 LLM 检测
  const detection = await localLLM.detect(input);

  // 2. 替换敏感信息
  const { masked, mapping } = transformer.transform(input, detection.sensitive);

  // 3. 发送云端
  const cloudResponse = await upstream.send(masked);

  // 4. 执行云端返回的代码（如有）
  let result = cloudResponse.response;
  if (cloudResponse.code) {
    const output = await executor.execute(cloudResponse.code, mapping);
    result = result.replace('{{result}}', String(output));
  }

  // 5. 还原敏感信息
  return restorer.restore(result, mapping);
}
```

### 扩展能力

云端可返回任意图灵完备代码，本地沙盒执行：

- 数学运算
- 字符串处理
- 条件判断
- 循环迭代
- 数据聚合

无需预定义动作类型，模型自扩展处理方式。

## 错误处理

### 错误类型与响应

| 错误场景 | 处理策略 | 响应 |
|---------|---------|------|
| 本地 LLM 超时 | 拒绝请求 | 503 Service Unavailable |
| 本地 LLM 不可用 | 拒绝请求 | 503 Service Unavailable |
| 上游 LLM 错误 | 透传错误 | 上游返回的错误码和消息 |
| 认证失败 | 拒绝请求 | 401 Unauthorized |
| 配置错误 | 启动失败 | 日志记录，进程退出 |

### 错误响应格式

```json
{
  "error": {
    "type": "detection_timeout",
    "message": "本地 LLM 检测超时",
    "request_id": "req_abc123"
  }
}
```

## 配置设计

### 配置结构

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "localLLM": {
    "endpoint": "http://localhost:11434/v1",
    "model": "gemma4",
    "timeout": 15000
  },
  "upstream": {
    "endpoint": "https://api.openai.com/v1",
    "apiKey": "${OPENAI_API_KEY}"
  },
  "detection": {
    "timeout": 15000,
    "prompt": "可选：自定义提示词模板"
  },
  "placeholder": {
    "language": "en"
  },
  "logging": {
    "enabled": true,
    "level": "info"
  },
  "dashboard": {
    "endpoint": "https://dashboard.nyx.example.com",
    "apiKey": "${NYX_DASHBOARD_KEY}"
  }
}
```

### 配置优先级

1. 命令行参数
2. 环境变量
3. 配置文件（`./nyx.json` 或 `~/.nyx/config.json`）
4. 默认值

## 认证设计

### 用户 → 中台

- JWT Token，包含角色权限
- 标准认证流程

### 中台 ↔ Nyx 实例

- 共享密钥
- 中台调用 Nyx 管理 API 时在 Header 中携带共享密钥
- Nyx 上报状态到中台时携带共享密钥验证身份

## 部署方案

### 部署目标

| 规模 | Nyx 实例 | 管理中台 |
|------|----------|----------|
| 个人 | Docker/Worker | Docker 或 Worker（免费计划） |
| 小团队 | Docker | Docker |
| 中型组织 | Docker/K8s | Docker/K8s |
| 大型企业 | K8s/网关集成 | K8s 高可用 |

### Cloudflare Worker 存储

| 存储 | 免费计划 | 用途 |
|------|----------|------|
| KV | ✅ 自动包含 | 元数据、实例状态 |
| R2 | ✅ 需开通 | 完整请求响应日志（可选） |
| D1 | ✅ 需开通 | 中台数据库（可选） |

### 构建目标

```bash
npm run build:node      # Node.js 产物
npm run build:worker    # Cloudflare Worker 产物
```

## 连接模型

Nyx 实例主动连接中台：

```
Nyx 启动 → 连接中台 → 注册实例 → 保持心跳 → 接收配置下发
```

**优点：**

- Nyx 实例可能有动态 IP
- 中台有固定端点
- 无需服务发现

## 技术栈总结

| 组件 | 技术 |
|------|------|
| 核心语言 | TypeScript |
| 核心运行时 | Node.js / Cloudflare Workers |
| 中台前端 | React |
| 中台后端 | Go（社区版和企业版统一） |
| 代码沙盒 | QuickJS (WASM) |
| 数据库 | KV（默认）/ D1（可选）/ R2（可选） |
| 构建 | pnpm workspace |
| 包管理 | pnpm |

## MVP 版本范围

### 包含

| 模块 | 功能 |
|------|------|
| @nyx-proxy/core | 检测 + 替换 + 还原 + 代理 |
| @nyx-proxy/backends | Node.js 后端实现 |
| @nyx-proxy/cli | 启动 + 状态 + 配置管理 |

### 不包含（后续版本）

| 模块 | 原因 |
|------|------|
| @nyx-proxy/backends/worker | 先验证核心功能 |
| @nyx-proxy/dashboard | 先验证核心功能 |

### MVP 开发任务

1. **项目初始化**
   - Monorepo 结构
   - pnpm workspace 配置
   - TypeScript 配置

2. **@nyx-proxy/core**
   - 类型定义
   - 接口定义
   - 检测引擎
   - 替换引擎
   - 还原引擎
   - 代理转发

3. **@nyx-proxy/backends（Node.js）**
   - 文件日志
   - Node HTTP 客户端
   - 本地存储

4. **@nyx-proxy/cli**
   - 启动命令
   - 状态命令
   - 配置加载

5. **集成测试**
   - 端到端测试
   - 本地 LLM 连接测试

## 后续扩展

- Kong/APISIX 插件集成
- 多租户支持
- 高级监控告警
- 外部日志集成（Loki、ELK）
- PostgreSQL 支持中台

## 商业化设计

### 分阶段实施

| 阶段 | 功能 | 开源/闭源 | 交付方式 |
|------|------|-----------|----------|
| 阶段 1 | 核心功能（代理、检测、还原、沙盒） | 开源 | GitHub + npm |
| 阶段 2 | 社区版中台 | 开源 | Go → WASM |
| 阶段 3 | 企业版中台 | 闭源 | Go → WASM/二进制 |

### 版本对比

| 功能 | 社区版 | 企业版 |
|------|--------|--------|
| 核心代理 | ✅ | ✅ |
| 敏感检测 | ✅ | ✅ |
| 流式还原 | ✅ | ✅ |
| 代码沙盒 | ✅ | ✅ |
| 管理中台（基础） | ✅ | ✅ |
| 管理中台（高级） | ❌ | ✅ |
| 多租户 | ❌ | ✅ |
| 审计报表 | ❌ | ✅ |
| SSO 集成 | ❌ | ✅ |
| 技术支持 | 社区 | 官方 |

### 中台架构

**技术栈统一：Go**

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | TypeScript/React | 开源，社区版和企业版复用 |
| 后端 | Go | 社区版和企业版统一技术栈 |

**功能模块：**

```
Go 后端代码
    ├── 基础功能（社区版）
    │   ├── 配置管理
    │   ├── 实例状态
    │   └── 日志查看
    └── 企业功能（企业版）
        ├── 多租户管理
        ├── 审计报表
        └── SSO 集成
```

**编译目标：**

| 版本 | 部署方式 | 编译命令 |
|------|----------|----------|
| 社区版中台 | Cloudflare Worker | `tinygo build -target wasm -tags community` |
| 企业版中台 SaaS | Cloudflare Worker | `tinygo build -target wasm -tags enterprise` |
| 企业版中台私有 | Docker/裸机 | `go build -tags enterprise` |

**代码复用：**

| 代码类型 | 复用程度 | 说明 |
|----------|----------|------|
| 基础功能 | 100% | 社区版和企业版共享 |
| 企业功能 | 100% | SaaS 和私有部署共享 |
| 前端 | 100% | 社区版和企业版共享 |

**Go 代码量：**

| 功能 | 代码量估算 |
|------|-----------|
| HTTP 服务 | ~50 行（使用 Gin） |
| 基础功能（社区版） | ~350 行 |
| 许可证验证 | ~150 行 |
| 企业功能 | ~600 行 |
| **总计** | **~1150 行 Go** |

### 部署方式

| 部署 | 编译目标 | 代码保护 |
|------|----------|----------|
| 社区版中台 | Go → WASM | 开源，代码可见 |
| 企业版中台 SaaS | Go → WASM | 在你服务器，客户无法接触 |
| 企业版中台私有 | Go → 二进制 | 编译后不可见/不可修改 |

### 消息队列和日志服务

| 部署方式 | 消息队列 | 日志服务 |
|----------|----------|----------|
| 社区版中台 | Cloudflare Queue | R2 |
| 企业版 SaaS | Cloudflare Queue | R2 |
| 企业版私有（简单） | 内存队列 | 文件日志 |
| 企业版私有（企业） | Redis | Loki/ELK |

### 许可证

| 版本 | 许可证 | 说明 |
|------|--------|------|
| 社区版 | Apache 2.0 | 完全开源，允许商业使用 |
| 企业版 | 商业许可证 | 闭源，付费使用 |

### 收入模式

| 收入来源 | 说明 |
|----------|------|
| 企业版授权 | 一次性或年度订阅 |
| 技术支持 | 按小时或包月 |
| 定制开发 | 项目制收费 |

### SaaS 托管（后续）

等企业版收入稳定后考虑：

| 套餐 | 价格 | 隔离级别 |
|------|------|----------|
| 专业版 | $99/月 | 共享实例 |
| 商业版 | $499/月 | 独立实例 |
| 企业版 | $2999/月 | 独立集群 + GPU |

### 检测服务分层

| 客户类型 | 检测方案 |
|----------|----------|
| 个人/小团队 | Cloudflare AI（免费额度） |
| 中型企业 | Cloudflare AI 或共享 GPU |
| 大型企业 | 独立 GPU 或私有部署 |

### 开源运营

| 渠道 | 用途 | 成本 |
|------|------|------|
| GitHub | 代码托管、Issue、PR | 免费 |
| GitHub Discussions | 问答、讨论 | 免费 |
| GitHub Pages | 文档 | 免费 |
| GitHub Actions | CI/CD | 免费 |
| npm | 包发布 | 免费 |
| Docker Hub | 镜像发布 | 免费 |
