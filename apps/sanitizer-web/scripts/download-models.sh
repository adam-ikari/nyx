#!/bin/bash
# Download WebLLM models for offline use
# Usage: ./download-models.sh [model-id]

set -e

MODELS_DIR="public/models"
WEBLLM_VERSION="v0_2_49"  # Current web-llm package version

# Model definitions
declare -A MODEL_URLS
MODEL_URLS["Llama-3.2-1B-Instruct-q4f16_1-MLC"]="https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main"
MODEL_URLS["Qwen2.5-1.5B-Instruct-q4f16_1-MLC"]="https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main"
MODEL_URLS["gemma-2-2b-it-q4f16_1-MLC"]="https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f16_1-MLC/resolve/main"
MODEL_URLS["Phi-3.5-mini-instruct-q4f16_1-MLC"]="https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC/resolve/main"

# WASM library URLs
declare -A WASM_FILES
WASM_FILES["Llama-3.2-1B-Instruct-q4f16_1-MLC"]="Llama-3_2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm"
WASM_FILES["Qwen2.5-1.5B-Instruct-q4f16_1-MLC"]="Qwen2_5-1_5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm"
WASM_FILES["gemma-2-2b-it-q4f16_1-MLC"]="gemma-2-2b-it-q4f16_1-ctx4k_cs1k-webgpu.wasm"
WASM_FILES["Phi-3.5-mini-instruct-q4f16_1-MLC"]="Phi-3_5-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm"

WASM_BASE_URL="https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/${WEBLLM_VERSION}"

# Model files to download
MODEL_FILES=(
    "mlc-chat-config.json"
    "ndarray-cache.json"
    "tokenizer.json"
    "tokenizer_config.json"
)

download_model() {
    local model_id="$1"
    local model_url="${MODEL_URLS[$model_id]}"
    local model_dir="${MODELS_DIR}/${model_id}"
    local wasm_file="${WASM_FILES[$model_id]}"

    echo "Downloading ${model_id}..."

    mkdir -p "${model_dir}"

    # Download model config and tokenizer files
    for file in "${MODEL_FILES[@]}"; do
        echo "  Downloading ${file}..."
        curl -fsSL -o "${model_dir}/${file}" "${model_url}/${file}"
    done

    # Download params shards (need to check ndarray-cache.json for list)
    echo "  Downloading model weights..."
    local shard_count=$(grep -o 'params_shard_[0-9]*' "${model_dir}/ndarray-cache.json" | sort -u | wc -l)
    for i in $(seq 0 $((shard_count - 1))); do
        local shard_file="params_shard_${i}.bin"
        echo "    Downloading ${shard_file}..."
        curl -fsSL -o "${model_dir}/${shard_file}" "${model_url}/${shard_file}"
    done

    # Download WASM library
    echo "  Downloading WASM library..."
    curl -fsSL -o "${model_dir}/${wasm_file}" "${WASM_BASE_URL}/${wasm_file}"

    echo "  Done: ${model_id}"
}

# Main
mkdir -p "${MODELS_DIR}"

if [ -n "$1" ]; then
    download_model "$1"
else
    # Download all models
    for model_id in "${!MODEL_URLS[@]}"; do
        download_model "${model_id}"
    done
fi

echo "All models downloaded to ${MODELS_DIR}/"