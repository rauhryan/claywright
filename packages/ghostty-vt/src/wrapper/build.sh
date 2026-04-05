#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GHOSTTY_SRC="${SCRIPT_DIR}/../../ghostty-src"
OUTPUT_DIR="${SCRIPT_DIR}/../../lib"

mkdir -p "${OUTPUT_DIR}"

clang -shared -fPIC \
    -I"${GHOSTTY_SRC}/include" \
    -o "${OUTPUT_DIR}/libghostty-wrapper.dylib" \
    "${SCRIPT_DIR}/ghostty_wrapper.c" \
    -L"${OUTPUT_DIR}" -lghostty-vt \
    -Wl,-rpath,@loader_path

echo "Built ${OUTPUT_DIR}/libghostty-wrapper.dylib"
