# Nyx Proxy - Privacy-Preserving LLM Gateway Design Document

## Overview

Nyx is a privacy-preserving LLM gateway that uses local models to detect and replace sensitive content before sending requests to cloud LLMs, and transparently restores original information after responses return—without changing application behavior.

## Core Problems Solved

1. **Compliance Requirements** — Prevent sensitive data (PII, financial information, credentials, etc.) from being sent to third-party cloud services
2. **Privacy Protection** — Maintain control over data while using cloud LLMs
3. **Security Auditing** — Log and audit all content sent to LLMs

## Architecture Design

### Overall Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Management Dashboard                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Config  │ │Instance │ │  Log    │ │ Access  │       │
│  │Management│ │Management│ │ Audit  │ │ Control │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  Tech Stack: Hono + React + KV/D1                      │
└─────────────────────────────────────────────────────────┘
                         │
                    HTTP API (Shared Secret)
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼───┐           ┌───▼───┐           ┌───▼───┐
│Nyx #1 │           │Nyx #2 │           │Nyx #N │
└───────┘           └───────┘           └───────┘
```

### Request Processing Flow

```
Request → Detection → Replacement → Forwarding → Restoration → Response
              │          │            │            │
           Local LLM  Map Replace  Upstream LLM  Map Restore
```

## Module Design

### Package Structure (Monorepo)

```
nyx-proxy/
├── packages/
│   ├── core/                    # @nyx-proxy/core
│   │   ├── src/
│   │   │   ├── detector/        # Detection engine
│   │   │   ├── transformer/     # Replacement engine
│   │   │   ├── restorer/        # Restoration engine
│   │   │   ├── proxy/           # Proxy forwarding
│   │   │   ├── types/           # Type definitions
│   │   │   └── interfaces/      # Interface definitions
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backends/                # @nyx-proxy/backends
│   │   ├── src/
│   │   │   ├── node/            # Node.js implementation
│   │   │   ├── worker/          # Cloudflare Worker implementation
│   │   │   └── index.ts         # Conditional compilation entry
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
│   └── dashboard/               # @nyx-proxy/dashboard (future version)
│       ├── src/
│       │   ├── client/          # React frontend
│       │   └── shared/          # Shared types
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

### Core Module (`@nyx-proxy/core`)

```
@nyx-proxy/core
├── detector/
│   ├── Detector.ts              # Detection engine
│   └── prompts/                 # Prompt templates
├── transformer/
│   ├── Transformer.ts           # Replacement engine
│   └── Mapper.ts                # Dynamic mapping management
├── restorer/
│   └── Restorer.ts              # Restoration engine (streaming)
├── proxy/
│   └── Proxy.ts                 # Proxy forwarding
├── types/
│   └── index.ts                 # Shared type definitions
└── interfaces/
    ├── ILogger.ts               # Logger interface
    ├── IHttpClient.ts           # HTTP client interface
    ├── IStorage.ts              # Storage interface
    └── ILLMClient.ts            # Local LLM client interface
```

### Backend Module (`@nyx-proxy/backends`)

```
@nyx-proxy/backends
├── interfaces/                  # Inherits core/interfaces
├── node/                        # Node.js implementation
│   ├── logger/
│   │   └── FileLogger.ts
│   ├── http/
│   │   └── NodeHttpClient.ts
│   └── storage/
│       └── LocalStorage.ts
├── worker/                      # Cloudflare Worker implementation (future)
│   ├── logger/
│   │   └── KVLogger.ts
│   ├── http/
│   │   └── FetchClient.ts
│   └── storage/
│       ├── KVStorage.ts
│       └── R2Storage.ts
└── index.ts                     # Conditional compilation entry
```

### CLI Module (`@nyx-proxy/cli`)

```
@nyx-proxy/cli
├── commands/
│   ├── start.ts                 # Start service (default command)
│   ├── status.ts                # View status
│   └── config.ts                # Configuration management
├── bin/
│   └── nyx.ts                   # CLI entry point
└── utils/
    └── config-loader.ts         # Configuration loading
```

**CLI Commands:**

```bash
nyx                            # Start service (default localhost:3000)
nyx --port 8080                # Specify port
nyx --config ./nyx.json        # Specify config file
nyx status                     # View running status
nyx config init                # Generate default config
nyx config show                # Display current config
nyx connect <dashboard-url>    # Connect to management dashboard
```

### Management Dashboard Module (`@nyx-proxy/dashboard`)

**Frontend (TypeScript/React):**

```
@nyx-proxy/dashboard
├── client/                     # React frontend
│   ├── pages/
│   │   ├── dashboard/          # Dashboard
│   │   ├── instances/          # Instance management
│   │   ├── config/             # Configuration management
│   │   ├── logs/               # Log audit
│   │   └── settings/           # System settings
│   └── components/
├── shared/
│   └── types.ts                # Frontend-backend shared types
└── package.json
```

**Backend (Go, separate repository):**

Community and enterprise dashboard backends are developed in Go, see commercialization design section.

**Feature Tiers:**

| Tier | Features | Personal | Team | Enterprise |
|------|----------|----------|------|------------|
| Basic | Config management, log viewing | ✅ | ✅ | ✅ |
| Collaboration | Multi-user, roles | ❌ | ✅ | ✅ |
| Operations | Multi-instance, monitoring & alerting | ❌ | ❌ | ✅ |
| Enterprise | Multi-tenancy, audit reports | ❌ | ❌ | ✅ |

## Sensitive Content Detection

### Detection Method

Use local LLM for semantic understanding to detect sensitive content. No predefined categories needed—LLM automatically identifies all sensitive information based on context.

### Prompt Template

```
You are a privacy protection assistant responsible for detecting all sensitive information in text that should not be sent to external services.

Sensitive information includes but is not limited to:
- Personal identity information: names, phone numbers, emails, ID numbers, addresses, photos, etc.
- Financial information: bank card numbers, credit card numbers, amounts, account information, etc.
- Authentication credentials: passwords, keys, tokens, API keys, etc.
- Internal information: project names, internal system names, employee information, trade secrets, etc.
- Medical information: medical records, diagnoses, medications, etc.
- Any content that could leak privacy or violate compliance requirements

Please detect sensitive information in the following text and return in JSON array format:
[
  {"type": "PERSON", "value": "original value", "start": start position, "end": end position, "context_before": "preceding text", "context_after": "following text"},
  ...
]

If no sensitive information, return empty array: []

Text:
{input}
```

### Local LLM Configuration

- Uses OpenAI-compatible API format
- Supports multiple detection solutions:

| Solution | Description | Use Case |
|----------|-------------|----------|
| Ollama | Local deployment, fully private | Enterprise intranet, high security requirements |
| LocalAI | Local deployment, OpenAI compatible | Enterprise intranet |
| Cloudflare AI | No deployment needed, edge low latency | Personal, small teams |

**Cloudflare AI Configuration:**

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

**Ollama Configuration:**

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

- Optimized for Gemma 4 / Llama 3 8B level models (small parameters, fast inference)
- Single call, structured JSON output

## Placeholder Design

### Placeholder Format

Use unique prefix to ensure no conflict with programming scenarios:

```
Format: «NYX_PERSON_1», «NYX_PHONE_1»

Example:
Original: Please contact Zhang San, phone 13800138000
Replaced: Please contact «NYX_PERSON_1», phone «NYX_PHONE_1»
```

**Advantages:**

- `«»` (guillemets) are rarely used in programming, extremely low conflict risk
- `NYX_` prefix ensures uniqueness
- Cloud LLM can understand semantics (PERSON, PHONE)
- Widely supported Unicode characters

### Conflict Prevention

Detect if user text contains similar format, add random suffix if conflict exists:

```typescript
class RequestMapper {
  private mapping: Map<string, string> = new Map();
  private useRandomSuffix: boolean = false;
  private counter: Record<string, number> = {};

  constructor(originalText: string) {
    // Detect if user text contains similar format
    const conflictPattern = /«NYX_[A-Z]+_\d+»/;
    this.useRandomSuffix = conflictPattern.test(originalText);
  }

  transform(value: string, type: string): string {
    const index = (this.counter[type] || 0) + 1;
    this.counter[type] = index;

    let placeholder: string;
    if (this.useRandomSuffix) {
      // Add random suffix when conflict exists
      const rand = randomString(4);
      placeholder = `«NYX_${type}_${index}_${rand}»`;
    } else {
      // Use simple format when no conflict
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

### Type Semantics

| Type | Meaning | Example |
|------|---------|---------|
| PERSON | Person name | «NYX_PERSON_1» |
| PHONE | Phone number | «NYX_PHONE_1» |
| EMAIL | Email address | «NYX_EMAIL_1» |
| ID | Identity document | «NYX_ID_1» |
| CARD | Bank card number | «NYX_CARD_1» |
| ADDRESS | Address | «NYX_ADDRESS_1» |
| CREDENTIAL | Credential/Key | «NYX_CREDENTIAL_1» |
| MEDICAL | Medical information | «NYX_MEDICAL_1» |
| INTERNAL | Internal information | «NYX_INTERNAL_1» |

## Streaming Response Restoration

### Buffer Replacement Strategy

```
LLM output stream:
"...please contact «NYX_PERSON_1», phone is «NYX_PHONE_1»..."

Buffer window:
"...please contact «NYX_PERS" → incomplete, continue buffering
"...please contact «NYX_PERSON_1»" → complete match, replace with "Zhang San", output
", phone is «NYX_PHON" → incomplete, continue buffering
", phone is «NYX_PHONE_1»" → complete match, replace with "13800138000", output
```

### Dynamic Buffer Size

- Placeholder format: `«NYX_TYPE_N»` or `«NYX_TYPE_N_rand»`
- Maximum estimated length: `«NYX_CREDENTIAL_99_xk9m»` = 24 characters
- Buffer window: 28 characters (slightly larger than maximum placeholder length)

### Implementation Code

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
          // Found mapping, replace and output
          output += this.buffer.slice(0, match.index) + original;
          this.buffer = this.buffer.slice(match.index + placeholder.length);
        } else {
          // No mapping found, output placeholder as-is
          output += this.buffer.slice(0, match.index + placeholder.length);
          this.buffer = this.buffer.slice(match.index + placeholder.length);
        }
      } else {
        // Output safe portion, preserve possible incomplete placeholder
        const safeLength = this.buffer.length - this.bufferSize;
        output += this.buffer.slice(0, safeLength);
        this.buffer = this.buffer.slice(safeLength);
      }
    }

    return output;
  }

  flush(): string {
    // Stream ended, process remaining buffer
    this.pattern.lastIndex = 0;
    const result = this.buffer.replace(this.pattern, (match) => {
      return this.mapping.get(match) || match;
    });
    this.buffer = '';
    return result;
  }
}
```

## Scenario Extension Design

### Scenario Recognition

Local LLM identifies scenario type while detecting sensitive information:

```json
{
  "sensitive": [
    {"type": "PERSON", "value": "Zhang San", "start": 3, "end": 5},
    {"type": "NUMBER", "value": "10000", "start": 8, "end": 13}
  ],
  "scene": "calculation",
  "hint": "User needs to perform numerical calculation"
}
```

### Scenario Types

| Scenario | Description | Local Processing |
|----------|-------------|------------------|
| text | Normal text conversation | None |
| calculation | Numerical calculation | Execute expression |
| code | Code generation/execution | Sandbox execution |

### Cloud Response Format

Cloud LLM returns Turing-complete code, executed locally in sandbox:

```json
{
  "response": "The calculation result is {{result}}",
  "code": "return placeholder_1 - placeholder_2;"
}
```

### Code Execution Sandbox

Use QuickJS (WASM) as secure sandbox:

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
      // Inject placeholder variables
      for (const [key, value] of Object.entries(placeholders)) {
        vm.setGlobal(key, value);
      }

      // Safely execute code
      const result = await vm.evalCode(code);
      return result;
    } finally {
      vm.dispose();
    }
  }
}
```

### Security Guarantees

| Measure | Description |
|---------|-------------|
| WASM isolation | Natural sandbox, cannot access host environment |
| No I/O | Cannot access files, network |
| No external calls | Cannot call host functions |
| Resource limits | Can limit execution time and memory |

### Unified Processing Flow

```typescript
async function process(input: string): Promise<string> {
  // 1. Local LLM detection
  const detection = await localLLM.detect(input);

  // 2. Replace sensitive information
  const { masked, mapping } = transformer.transform(input, detection.sensitive);

  // 3. Send to cloud
  const cloudResponse = await upstream.send(masked);

  // 4. Execute code returned by cloud (if any)
  let result = cloudResponse.response;
  if (cloudResponse.code) {
    const output = await executor.execute(cloudResponse.code, mapping);
    result = result.replace('{{result}}', String(output));
  }

  // 5. Restore sensitive information
  return restorer.restore(result, mapping);
}
```

### Extension Capabilities

Cloud can return any Turing-complete code, executed locally in sandbox:

- Mathematical operations
- String processing
- Conditional logic
- Loop iteration
- Data aggregation

No need to predefine action types, model self-extends processing methods.

## Error Handling

### Error Types and Responses

| Error Scenario | Handling Strategy | Response |
|----------------|-------------------|----------|
| Local LLM timeout | Reject request | 503 Service Unavailable |
| Local LLM unavailable | Reject request | 503 Service Unavailable |
| Upstream LLM error | Pass through error | Error code and message from upstream |
| Authentication failed | Reject request | 401 Unauthorized |
| Configuration error | Startup failure | Log and exit process |

### Error Response Format

```json
{
  "error": {
    "type": "detection_timeout",
    "message": "Local LLM detection timeout",
    "request_id": "req_abc123"
  }
}
```

## Configuration Design

### Configuration Structure

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
    "prompt": "Optional: custom prompt template"
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

### Configuration Priority

1. Command line arguments
2. Environment variables
3. Configuration file (`./nyx.json` or `~/.nyx/config.json`)
4. Default values

## Authentication Design

### User → Dashboard

- JWT Token with role permissions
- Standard authentication flow

### Dashboard ↔ Nyx Instance

- Shared secret
- Dashboard carries shared secret in header when calling Nyx management API
- Nyx carries shared secret when reporting status to dashboard for identity verification

## Deployment Solutions

### Deployment Targets

| Scale | Nyx Instance | Management Dashboard |
|-------|--------------|----------------------|
| Personal | Docker/Worker | Docker or Worker (free plan) |
| Small team | Docker | Docker |
| Medium organization | Docker/K8s | Docker/K8s |
| Large enterprise | K8s/Gateway integration | K8s high availability |

### Cloudflare Worker Storage

| Storage | Free Plan | Use Case |
|---------|-----------|----------|
| KV | ✅ Auto-included | Metadata, instance status |
| R2 | ✅ Needs enablement | Full request/response logs (optional) |
| D1 | ✅ Needs enablement | Dashboard database (optional) |

### Build Targets

```bash
npm run build:node      # Node.js artifact
npm run build:worker    # Cloudflare Worker artifact
```

## Connection Model

Nyx instances actively connect to dashboard:

```
Nyx startup → Connect to dashboard → Register instance → Maintain heartbeat → Receive config push
```

**Advantages:**

- Nyx instances may have dynamic IPs
- Dashboard has fixed endpoint
- No service discovery needed

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Core language | TypeScript |
| Core runtime | Node.js / Cloudflare Workers |
| Dashboard frontend | React |
| Dashboard backend | Go (unified for community and enterprise) |
| Code sandbox | QuickJS (WASM) |
| Database | KV (default) / D1 (optional) / R2 (optional) |
| Build | pnpm workspace |
| Package management | pnpm |

## MVP Version Scope

### Phase 1: Sanitizer Tool (Current Focus)

A standalone sanitization tool that allows users to manually sanitize content before sending to cloud AI tools and restore responses.

**Deployment Forms:**
- Desktop Application (Tauri 2.0)
- Cloud Deployment (Vercel / Cloudflare Workers)
- Dashboard Integration (as part of management platform)

**Features:**
- Manual sanitization: Input sensitive text → Output sanitized text
- Response restoration: Paste AI response → Restore original values
- Session management: Track mappings during session
- OpenAI-compatible API configuration (Ollama, LocalAI, vLLM, etc.)

**Included Modules:**

| Module | Features |
|--------|----------|
| @nyx-proxy/core | Detection + Replacement + Restoration |
| @nyx-proxy/sanitizer | Sanitizer class + Session management |
| @nyx-proxy/sanitizer-desktop | Tauri desktop application |
| @nyx-proxy/sanitizer-web | Cloud deployment (API + Web UI) |

**Deployment Modes:**
- **Client Mode**: All processing locally (desktop app)
- **Frontend-Backend Mode**: Frontend calls backend API (web app / dashboard integration)

### Phase 2: Nyx Proxy Gateway

Full LLM gateway with automatic API interception.

**Included Modules:**

| Module | Features |
|--------|----------|
| @nyx-proxy/core | Detection + Replacement + Restoration + Proxy |
| @nyx-proxy/backends | Node.js backend implementation |
| @nyx-proxy/cli | Start + Status + Config management |

### Not Included (Future Versions)

| Module | Reason |
|--------|--------|
| @nyx-proxy/backends/worker | Validate core functionality first |
| @nyx-proxy/dashboard | Validate core functionality first |

### Phase 1 Development Tasks

1. **@nyx-proxy/sanitizer**
   - Sanitizer class (sanitize + restore)
   - SessionManager for mapping tracking
   - OpenAI-compatible API client

2. **@nyx-proxy/sanitizer-desktop (Tauri)**
   - Desktop UI with input/output areas
   - Mode toggle (Sanitize / Restore)
   - Configuration panel
   - System tray integration

3. **@nyx-proxy/sanitizer-web**
   - REST API endpoints (/sanitize, /restore)
   - Simple web UI
   - Session-based workflow

4. **Integration Testing**
   - End-to-end testing
   - Local LLM connection testing

### Phase 2 Development Tasks

1. **@nyx-proxy/core**
   - Type definitions
   - Interface definitions
   - Detection engine
   - Replacement engine
   - Restoration engine
   - Proxy forwarding

2. **@nyx-proxy/backends (Node.js)**
   - File logging
   - Node HTTP client
   - Local storage

3. **@nyx-proxy/cli**
   - Start command
   - Status command
   - Config loading

4. **Integration Testing**
   - End-to-end testing
   - Local LLM connection testing

## Future Extensions

- Kong/APISIX plugin integration
- Multi-tenancy support
- Advanced monitoring and alerting
- External log integration (Loki, ELK)
- PostgreSQL support for dashboard

## Commercialization Design

### Phased Implementation

| Phase | Features | Open/Closed Source | Delivery Method |
|-------|----------|-------------------|-----------------|
| Phase 1 | Core features (proxy, detection, restoration, sandbox) | Open source | GitHub + npm |
| Phase 2 | Community dashboard | Open source | Go → WASM |
| Phase 3 | Enterprise dashboard | Closed source | Go → WASM/Binary |

### Version Comparison

| Feature | Community Edition | Enterprise Edition |
|---------|-------------------|-------------------|
| Core proxy | ✅ | ✅ |
| Sensitive detection | ✅ | ✅ |
| Streaming restoration | ✅ | ✅ |
| Code sandbox | ✅ | ✅ |
| Management dashboard (basic) | ✅ | ✅ |
| Management dashboard (advanced) | ❌ | ✅ |
| Multi-tenancy | ❌ | ✅ |
| Audit reports | ❌ | ✅ |
| SSO integration | ❌ | ✅ |
| Technical support | Community | Official |

### Dashboard Architecture

**Unified Tech Stack: Go**

| Component | Technology | Description |
|-----------|------------|-------------|
| Frontend | TypeScript/React | Open source, shared by community and enterprise |
| Backend | Go | Unified tech stack for community and enterprise |

**Feature Modules:**

```
Go backend code
    ├── Basic features (Community Edition)
    │   ├── Configuration management
    │   ├── Instance status
    │   └── Log viewing
    └── Enterprise features (Enterprise Edition)
        ├── Multi-tenant management
        ├── Audit reports
        └── SSO integration
```

**Build Targets:**

| Version | Deployment Method | Build Command |
|---------|-------------------|---------------|
| Community dashboard | Cloudflare Worker | `tinygo build -target wasm -tags community` |
| Enterprise dashboard SaaS | Cloudflare Worker | `tinygo build -target wasm -tags enterprise` |
| Enterprise dashboard private | Docker/Bare metal | `go build -tags enterprise` |

**Code Reuse:**

| Code Type | Reuse Level | Description |
|-----------|-------------|-------------|
| Basic features | 100% | Shared by community and enterprise |
| Enterprise features | 100% | Shared by SaaS and private deployment |
| Frontend | 100% | Shared by community and enterprise |

**Go Code Volume:**

| Feature | Estimated Lines |
|---------|-----------------|
| HTTP service | ~50 lines (using Gin) |
| Basic features (Community Edition) | ~350 lines |
| License verification | ~150 lines |
| Enterprise features | ~600 lines |
| **Total** | **~1150 lines Go** |

### Deployment Methods

| Deployment | Build Target | Code Protection |
|------------|--------------|-----------------|
| Community dashboard | Go → WASM | Open source, code visible |
| Enterprise dashboard SaaS | Go → WASM | On your server, customers cannot access |
| Enterprise dashboard private | Go → Binary | Compiled, not visible/modifiable |

### Message Queue and Log Services

| Deployment | Message Queue | Log Service |
|------------|---------------|-------------|
| Community dashboard | Cloudflare Queue | R2 |
| Enterprise SaaS | Cloudflare Queue | R2 |
| Enterprise private (simple) | In-memory queue | File logging |
| Enterprise private (enterprise) | Redis | Loki/ELK |

### Licensing

| Version | License | Description |
|---------|---------|-------------|
| Community Edition | Apache 2.0 | Fully open source, commercial use allowed |
| Enterprise Edition | Commercial License | Closed source, paid use |

### Revenue Model

| Revenue Source | Description |
|----------------|-------------|
| Enterprise license | One-time or annual subscription |
| Technical support | Hourly or monthly |
| Custom development | Project-based pricing |

### SaaS Hosting (Future)

Consider after enterprise revenue stabilizes:

| Plan | Price | Isolation Level |
|------|-------|-----------------|
| Professional | $99/month | Shared instance |
| Business | $499/month | Dedicated instance |
| Enterprise | $2999/month | Dedicated cluster + GPU |

### Detection Service Tiers

| Customer Type | Detection Solution |
|---------------|-------------------|
| Individual/Small team | Cloudflare AI (free tier) |
| Medium enterprise | Cloudflare AI or shared GPU |
| Large enterprise | Dedicated GPU or private deployment |

### Open Source Operations

| Channel | Use Case | Cost |
|---------|----------|------|
| GitHub | Code hosting, Issues, PRs | Free |
| GitHub Discussions | Q&A, discussions | Free |
| GitHub Pages | Documentation | Free |
| GitHub Actions | CI/CD | Free |
| npm | Package publishing | Free |
| Docker Hub | Image publishing | Free |
