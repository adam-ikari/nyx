# Offline Models Setup

This document explains how to set up offline models for the Nyx Sanitizer web application.

## Overview

WebLLM models can run entirely in the browser without internet access once downloaded. This enables:

- Complete privacy (no data leaves your machine)
- Offline usage
- Faster loading after initial download

## Quick Start

### Option 1: Download via Script

```bash
cd apps/sanitizer-web
chmod +x scripts/download-models.sh

# Download a specific model (recommended - smallest)
./scripts/download-models.sh Llama-3.2-1B-Instruct-q4f16_1-MLC

# Or download all models (~5GB total)
./scripts/download-models.sh
```

### Option 2: Manual Download

1. Create the models directory:
```bash
mkdir -p public/models
```

2. Download model files from HuggingFace:
```bash
# Example: Llama 3.2 1B (smallest, ~700MB)
cd public/models
git lfs install
git clone https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC
```

3. Download the WASM library:
```bash
# Get the appropriate WASM file
curl -LO https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_49/Llama-3_2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm
mv Llama-3_2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm Llama-3.2-1B-Instruct-q4f16_1-MLC/
```

## Available Models

| Model | Size | RAM Required | Notes |
|-------|------|--------------|-------|
| Llama 3.2 1B | ~700MB | ~2GB | **Recommended** - Best balance |
| Qwen 2.5 1.5B | ~1GB | ~3GB | Good Chinese support |
| Gemma 2 2B | ~1.4GB | ~4GB | Google's model |
| Phi-3.5 Mini | ~2GB | ~5GB | Microsoft's model |

## Directory Structure

After setup, your `public/models/` directory should look like:

```
public/models/
└── Llama-3.2-1B-Instruct-q4f16_1-MLC/
    ├── mlc-chat-config.json
    ├── ndarray-cache.json
    ├── tokenizer.json
    ├── tokenizer_config.json
    ├── params_shard_0.bin
    ├── params_shard_1.bin
    ├── ...
    └── Llama-3_2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm
```

## Using Offline Models

1. Open the Nyx Sanitizer web app
2. Check the "Offline mode (local models)" checkbox
3. Select your downloaded model
4. Click "Load Model"

The model will load from local files without any network requests.

## Troubleshooting

### Model not found error
- Ensure model files are in `public/models/<model-id>/`
- Check that the WASM file is present
- Verify file names match exactly (case-sensitive)

### Out of memory error
- Try a smaller model
- Close other browser tabs
- Use a browser with more GPU memory

### WebGPU not available
- Use Chrome 113+ or Edge 113+
- Enable WebGPU flags if needed: `chrome://flags/#enable-unsafe-webgpu`
