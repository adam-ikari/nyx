#!/bin/bash
# Download WebLLM models with parallel downloads using wget
# Usage: ./download-models-fast.sh [model-id]

set -e

MODELS_DIR="public/models"
WEBLLM_VERSION="v0_2_49"

# HuggingFace mirror
HF_MIRROR="${HF_ENDPOINT:-https://hf-mirror.com}"

MODEL_ID="${1:-Llama-3.2-1B-Instruct-q4f16_1-MLC}"
MODEL_URL="${HF_MIRROR}/mlc-ai/${MODEL_ID}/resolve/main"
MODEL_DIR="${MODELS_DIR}/${MODEL_ID}"
WASM_FILE="Llama-3_2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm"
WASM_URL="https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/${WEBLLM_VERSION}/${WASM_FILE}"

echo "Downloading ${MODEL_ID}..."
echo "Using mirror: ${HF_MIRROR}"
mkdir -p "${MODEL_DIR}"

# Download config files first
echo "Downloading config files..."
wget -q -O "${MODEL_DIR}/mlc-chat-config.json" "${MODEL_URL}/mlc-chat-config.json"
wget -q -O "${MODEL_DIR}/ndarray-cache.json" "${MODEL_URL}/ndarray-cache.json"
wget -q -O "${MODEL_DIR}/tokenizer.json" "${MODEL_URL}/tokenizer.json"
wget -q -O "${MODEL_DIR}/tokenizer_config.json" "${MODEL_URL}/tokenizer_config.json"

# Get shard count
SHARD_COUNT=$(grep -o 'params_shard_[0-9]*' "${MODEL_DIR}/ndarray-cache.json" | sort -u | tail -1 | grep -o '[0-9]*')
SHARD_COUNT=$((SHARD_COUNT + 1))
echo "Found ${SHARD_COUNT} weight shards..."

# Download all shards in parallel using wget background processes
echo "Downloading model weights in parallel..."
for i in $(seq 0 $((SHARD_COUNT - 1))); do
    SHARD_FILE="params_shard_${i}.bin"
    echo "  Starting download: ${SHARD_FILE}"
    wget -q -O "${MODEL_DIR}/${SHARD_FILE}" "${MODEL_URL}/${SHARD_FILE}" &
done

# Wait for all downloads to complete
wait
echo "All weight shards downloaded!"

# Download WASM
echo "Downloading WASM library..."
wget -q -O "${MODEL_DIR}/${WASM_FILE}" "${WASM_URL}"

TOTAL_SIZE=$(du -sh "${MODEL_DIR}" | cut -f1)
echo "Done: ${MODEL_ID} (${TOTAL_SIZE})"
echo "Files: $(ls ${MODEL_DIR} | wc -l)"