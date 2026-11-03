#!/usr/bin/env bash
set -euo pipefail
task_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
expected_commit=3be23788fc0c9f35a2c24b1211caae11d4a54dbc
test "$(git -C "$task_dir/upstream" rev-parse HEAD)" = "$expected_commit"
"$task_dir/build-tools/bin/cmake" -S "$task_dir/upstream" -B "$task_dir/build-cpu" -G Ninja \
  -DCMAKE_MAKE_PROGRAM="$task_dir/build-tools/bin/ninja" -DCMAKE_BUILD_TYPE=Release \
  -DSD_CUDA=OFF -DSD_HIPBLAS=OFF -DSD_METAL=OFF -DSD_VULKAN=OFF -DSD_OPENCL=OFF -DSD_SYCL=OFF -DSD_MUSA=OFF \
  -DSD_WEBP=OFF -DSD_WEBM=OFF \
  -DGGML_CUDA=OFF -DGGML_HIP=OFF -DGGML_VULKAN=OFF -DGGML_OPENCL=OFF -DGGML_SYCL=OFF \
  -DGGML_METAL=OFF -DGGML_MUSA=OFF -DGGML_RPC=OFF
"$task_dir/build-tools/bin/cmake" --build "$task_dir/build-cpu" --target sd-cli -j 8
