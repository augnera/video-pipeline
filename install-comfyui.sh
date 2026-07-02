#!/usr/bin/env bash
# ComfyUI 原生安装 (在 WSL2 Ubuntu 内运行)
# 原生装的原因: ComfyUI-Manager 装自定义节点比 Docker 里方便太多
set -e

INSTALL_DIR="$HOME/ComfyUI"

echo "==> 1/4 安装系统依赖"
sudo apt-get update -qq
sudo apt-get install -y -qq python3.11 python3.11-venv python3-pip git ffmpeg

echo "==> 2/4 克隆 ComfyUI + Manager"
git clone https://github.com/comfyanonymous/ComfyUI.git "$INSTALL_DIR" || true
git clone https://github.com/ltdrdata/ComfyUI-Manager.git \
  "$INSTALL_DIR/custom_nodes/ComfyUI-Manager" || true

echo "==> 3/4 创建虚拟环境并安装依赖 (PyTorch CUDA 12.x)"
cd "$INSTALL_DIR"
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt

echo "==> 4/4 完成"
echo ""
echo "启动: cd $INSTALL_DIR && source venv/bin/activate && python main.py --listen 0.0.0.0"
echo "浏览器打开 http://localhost:8188"
echo ""
echo "接下来在 ComfyUI-Manager 里安装:"
echo "  - LatentSync 或 MuseTalk 节点 (数字人对口型)"
echo "  - Wan 2.2 相关节点 (B-roll 生成, 可后置到第二周)"
echo "模型权重放 $INSTALL_DIR/models/ 对应子目录, 下载慢用 ModelScope 镜像"
