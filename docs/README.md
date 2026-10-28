# AI 带货视频生产流水线（WSL2 + RTX 4090 48G 版）

TypeScript 编排器 + Docker 化模型服务。所有 Python/AI 组件都封装为 HTTP API，
你只写 TS。

## 〇、WSL2 环境准备（一次性，最重要的部分）

### 1. GPU 驱动 —— 只装 Windows 端
在 **Windows** 上装最新 NVIDIA 驱动（Game Ready 或 Studio 均可）。
**不要**在 WSL2 的 Ubuntu 里装任何 Linux NVIDIA 驱动，装了反而会坏。
验证：在 WSL 终端里跑 `nvidia-smi`，能看到 4090 48G 即成功。

### 2. 给 WSL 分配足够的内存
WSL2 默认只用一半内存。在 Windows 的 `C:\Users\你的用户名\` 下创建 `.wslconfig`：

```ini
[wsl2]
memory=200GB
processors=16
swap=32GB
```

改完在 PowerShell 里 `wsl --shutdown` 重启 WSL 生效。

### 3. 项目必须放在 WSL 文件系统里
把本项目放在 `~/video-pipeline`（Linux 侧），**不要**放 `/mnt/c/...`（Windows 侧）。
跨文件系统 IO 慢 10 倍以上，模型加载和视频合成都会被拖垮。
VSCode 用 Remote-WSL 打开 `~/video-pipeline` 即可，你现在的用法是对的。

### 4. Docker
推荐直接在 WSL2 的 Ubuntu 里装 docker-ce + nvidia-container-toolkit
（比 Docker Desktop 少一层，GPU 直通更稳）：
按 Docker 官方 Ubuntu 安装文档 + NVIDIA container toolkit 文档操作，
然后验证：`docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi`

### 5. 磁盘
模型权重共需 150-250GB。WSL 的虚拟磁盘 (vhdx) 会自动增长但不会自动收缩，
确保 Windows 侧所在盘有 300GB+ 空闲。下载慢用 ModelScope（魔搭）镜像。

## 一、启动模型服务

```bash
# TTS + Whisper（Docker）
docker compose up -d

# ComfyUI（原生安装，装自定义节点方便）
bash install-comfyui.sh
cd ~/ComfyUI && source venv/bin/activate && python main.py --listen 0.0.0.0
```

浏览器打开：
- http://localhost:9874  GPT-SoVITS WebUI（先在这里克隆音色）
- http://localhost:8188  ComfyUI（装 LatentSync/MuseTalk 节点，跑通后导出 API JSON）

## 二、编排器

```bash
cd orchestrator
cp .env.example .env        # 填 ANTHROPIC_API_KEY
npm install
npx playwright install chromium --with-deps

# 生成 2 条粤语视频（主题 / hook类型 / 语言 / 数量）
npm run pipeline -- "AI作文批改" 倒计时焦虑型 yue 2
```

成片在 `output/<id>/final.mp4`，生产记录自动写入 `output/metrics.csv`，
发布后手动补播放/点击/注册数据。

## 三、跑通前的 4 个 TODO

1. `voice-ref/brand-voice.wav`：放 5-10 秒干净参考音频，在 SoVITS WebUI 克隆音色，
   并更新 `src/clients/sovits.ts` 里的 `prompt_text`
2. `base/talking-base.mp4`：录 1-2 分钟人物底板视频（自然点头手势，正对镜头）
3. `workflows/lipsync.json`：ComfyUI 跑通对口型后导出，更新 `pipeline.ts` 的节点 ID
4. `src/record/demo-recorder.ts`：把示例场景的选择器换成 dseai.hk 真实元素

## 四、与两周计划的对应

| 天数 | 做什么 | 涉及文件 |
|---|---|---|
| 1-2 | WSL2 环境（上面第〇节） | - |
| 3-4 | SoVITS 克隆音色，跑通 TTS | sovits.ts |
| 5-7 | ComfyUI + 对口型，出数字人视频 | comfyui.ts, workflows/ |
| 8-10 | 录屏 + 字幕 + 合成，全链路出片 | demo-recorder.ts, composer.ts |
| 11-14 | Wan 2.2 B-roll、扩充 hook 库、批量跑 10 条 | assets/ |

## 常见问题

- **SoVITS 容器起不来**：社区镜像 tag 常变，去 GitHub 仓库 README 查最新镜像名
- **ComfyUI 报显存不足**：确认没有同时跑 Wan 和其他任务；启动加 `--lowvram` 兜底
- **Playwright 录屏黑屏**：加 `--with-deps` 重装浏览器依赖
- **ffmpeg 字幕乱码**：`sudo apt install fonts-noto-cjk` 装中文字体
- **粤语字幕用字不准**：Whisper 粤语可用但不完美，发布前必须人工扫一遍
# video-pipeline
