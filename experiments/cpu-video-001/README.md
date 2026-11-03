# CPU-VIDEO-001（独立实验，未接生产）

本期仅授权Wan2.1 T2V-1.3B的纯CPU样本A，以及A通过、预算可接受时的样本B。所有GPU STOP保留，不清锁、不用CUDA/硬件编解码、不运行常驻服务；不提升生产可用性或人工画质评级。

## 已执行的安装与构建

仓库根目录执行。本地路径清单为受忽略的 `components.local.json`，只引用既有原权重，不复制或移动。

```bash
python3 -m venv experiments/cpu-video-001/build-tools
experiments/cpu-video-001/build-tools/bin/pip install 'cmake==3.31.6' 'ninja==1.11.1.4'
git clone --recurse-submodules https://github.com/leejet/stable-diffusion.cpp experiments/cpu-video-001/upstream
```

在新机器复现时，clone后还须固定检出及子模块，然后运行构建脚本；现有目录有修改时先检查，不覆盖：

```bash
git -C experiments/cpu-video-001/upstream checkout 3be23788fc0c9f35a2c24b1211caae11d4a54dbc
git -C experiments/cpu-video-001/upstream submodule update --init --recursive
bash experiments/cpu-video-001/build.sh
```

本次实际检出commit `3be23788fc0c9f35a2c24b1211caae11d4a54dbc`，子模块固定提交见 `evidence/submodules.txt`，没有升级共享环境。`build.sh`保存实际使用的构建选项，重建前核对固定提交，不能随远端更新漂移。实际编译日志为 `configure.log`、`build.log`；`evidence/`含CMakeCache、可执行文件SHA、动态依赖、CPU设备列表、帮助和组件许可来源。

## 单次运行

```bash
python3 -u experiments/cpu-video-001/run.py --label A \
  --prompt 'Photorealistic live-action footage of a quiet office desk in daylight. A closed laptop and a small green plant sit beside a window. Soft natural light, realistic wood grain, detailed leaves, natural colors, subtle slow camera movement. No people and no visible text.' \
  --seed 20261103 --width 256 --height 448 --frames 17 --fps 16 \
  --threads 16 --timeout 1800 --outputDir experiments/cpu-video-001/runs
```

可选 `--negativePrompt`，默认值见 `python3 experiments/cpu-video-001/run.py --help`。A和B各有一次性 `runs/sample-A.attempt.json` / `sample-B.attempt.json`，**不得删除后重跑**。参数接口不意味着任意尺寸已实测；实际验证范围以报告为准。B只有A技术通过并完成实际预算审查后才可运行，使用 `--label B --width 480 --height 832 --frames 17 --timeout 3600`，其他参数保持A。33帧的计算规模预计接近或超过预算，因此选择授权范围内17帧短序列；真实时长1.0625秒，不降FPS冒充更长素材。

引擎明确 `--backend cpu --params-backend cpu --auto-fit off`，30步Euler/discrete、CFG6、shift3来自本版本Wan文档/源码，不冒充原Comfy配置。原生导出所有无损PNG，再使用系统FFmpeg的软件libx264编码，16fps不人为拉长。

资源监控每2秒持久化。初始至少48GiB可用、现有Swap不超过1GiB；连续3次可用内存低于16GiB、进程组RSS超过64GiB或Swap较启动新增超过2GiB时停止自己的进程组。资源阈值为本次保守实验预算，不是模型官方要求。截止时间包含加载、文本编码、采样、VAE和视频编码；显式CPU编译、设备列表和真实放置日志共同作为证据，CUDA_VISIBLE_DEVICES不是主要证明。

## 停止与排查

先确认该run的 `result.json` 仍为RUNNING，并核对该PID的命令行确属本实验；已结束的run不要向旧PID发信号。向当前run的 `launcherPid` 发送SIGTERM：

```bash
kill -TERM <launcherPid>
```

包装器只终止该run创建的进程组；不使用pkill等宽泛命令。意外退出、超时或资源异常保留STOP和机会标记，不自动清理、重试。无GPU测试已验证进程组含子进程、可受控终止，非黑屏可靠性证明。

先看 `runs/<runId>/result.json`、`stages.jsonl`，再看完整 `stdout.log`/`stderr.log`、`resources.jsonl`、`encoding.stderr.log`。`engine_output`保留实际输出和UTC时钟；没有输出的内部阶段不造日志。温度接口未取得，标NOT_RECORDED；现接口不导出latent及VAE clamp前统计，明确记为不可获取，不改造上游伪造支持。

成功时有 `sample.mp4`、全部 `frame_*.png`、`ffprobe.json`，首中尾PNG及视频SHA在result中。原始模型、旧事故、其他服务及已验收视频保持不变；样片不自动进入正式素材库或上传。
