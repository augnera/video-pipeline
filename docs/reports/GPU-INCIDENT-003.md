# GPU-INCIDENT-003｜ComfyUI 环境兼容性核查与修复准备

日期：2026-10-27。性质：只读核查及待批准方案。**本轮唯一写入为本报告；未安装/升级/卸载包，未启动服务，未执行 CUDA 初始化、GPU 推理或压力测试。** 未修改驱动、WSL 内核、业务代码、模型权重或任何其他项目环境。

## 1. 结论与实施边界

**具备提出并实施“非推理依赖修复”的准备条件，尚未获得实施批准；不具备恢复 Wan 推理的放行条件。**

推荐仅在 `/home/chen/ai-services/comfyui/venv` 内，将 PyTorch 三件套切换为 **2.11.0+cu130 / 0.26.0+cu130 / 2.11.0+cu130**，同步替换其必需 CUDA 用户态依赖及 Triton。固定 ComfyUI 源码、Python、其余业务依赖不变。

理由：满足固定源码的 cu130+ 要求；有官方配套版本依据；已有可复用的本地 wheel 及历史环境记录，无需下载。选择它不是因为“Qwen 已证明硬件稳定”，也不是声称它一定修复本次 TDR。相比另找更早 cu130 组合，本方案减少新的资产获取和版本组合验证；它不是 PyTorch 版本跨度最小的选项，而是当前已有完整资产和证据的最小变更集合。

本轮完成静态依赖闭包检查及 22 个候选 wheel 的完整 SHA-256 复核，**尚未进行安装后 pip check、CPU 导入或原生扩展 ABI 验证**。这些属于批准后执行的非推理验收。

## 2. 当前版本与要求的差异

程序：`/home/chen/ai-models/ComfyUI`；版本文件为 0.43.0；HEAD：

`426f5eea52a7ece1dd599fff4cb6cd1f352ddd24`

本轮该目录 `git status --short` 无输出。直接读取工作树及 `git show HEAD:README.md`，要求一致。

| 项目 | 当前值 | 固定源码要求 / 拟处理 |
|---|---|---|
| Python | 3.12.3，独立 venv | README 支持使用 3.12；保留 |
| PyTorch | 2.8.0+cu128 | README:197 明确要求 NVIDIA 20 系及以后使用 cu130+；需修复 |
| torchvision | 0.23.0+cu128 | 与新 torch 配套切换 |
| torchaudio | 2.8.0+cu128 | 与新 torch 配套切换；保留现有能力，非新增模型 |
| Triton | 3.4.0 | 新 torch 元数据要求 3.6.0 |
| NumPy / Transformers | 2.2.6 / 4.57.6 | 满足现有要求，保留 |
| comfy-kitchen / comfy-aimdo | 0.2.40 / 0.6.0 | 固定 requirements 要求相同，保留 |
| Windows 驱动 | 610.88 | 不修改 |

固定 `requirements.txt` 对 torch/torchvision 没有精确版本约束，因此 **pip check 通过无法识别 README 的 CUDA 构建要求**。`/home/chen/ai-services/comfyui/constraints.txt` 则明确锁定旧 cu128 三件套，实施时必须同步调整该 ComfyUI 部署记录，不能留下与实际安装相矛盾的约束。

`comfy/quant_ops.py:24–28` 在 torch CUDA<13 时关闭 comfy-kitchen CUDA 后端并警告；事故日志确认该后端禁用，使用 eager/PyTorch attention。升级后可能启用原先关闭的计算路径，**所以相同模型与采样参数不等于实际执行内核完全相同**。CPU 导入通过也不证明该路径在 GPU 上稳定。

## 3. 官方兼容性依据

1. PyTorch 官方版本表列出 torch 2.11.0、torchvision 0.26.0、torchaudio 2.11.0 的 cu130 配套 wheel。已找到的本地文件为 CPython 3.12、Linux x86_64/manylinux 构建，与 Ubuntu 24.04 glibc 2.39 和本环境相容。[官方版本表](https://pytorch.org/get-started/previous-versions/)
2. CUDA 13.x 官方最低驱动分支门槛为 R580；当前宿主 610.88 满足版本门槛。CUDA 13.0 表中 Windows Toolkit 捆绑驱动为 N/A，不能把它误读为 Windows 不支持；应结合宿主驱动能力判断。此前只读 NVML 报告 CUDA UMD 13.3，支持本方案所需版本方向。[CUDA 13.0 发布说明](https://docs.nvidia.com/cuda/archive/13.0.0/cuda-toolkit-release-notes/index.html)
3. WSL 使用 Windows 驱动映射提供 CUDA，不应在 WSL 安装 Linux 显示驱动。本方案安装的是 venv 内用户态 wheel，不是系统 CUDA Toolkit/驱动。[NVIDIA WSL 指南](https://docs.nvidia.com/cuda/wsl-user-guide/)

以上只确认一般版本与平台条件，不是对魔改板卡、特定内核组合或持续负载稳定性的官方认证。固定 ComfyUI 的更强要求以本地固定源码为证据，不拿其他版本 README 替代。

## 4. 推荐修复组合：准确版本及现有资产

### 4.1 仅变更以下 22 个发行包

```text
torch==2.11.0+cu130
torchvision==0.26.0+cu130
torchaudio==2.11.0+cu130
triton==3.6.0
cuda-toolkit==13.0.2
cuda-bindings==13.3.1
cuda-pathfinder==1.7.0
nvidia-cublas==13.1.0.3
nvidia-cuda-cupti==13.0.85
nvidia-cuda-nvrtc==13.0.88
nvidia-cuda-runtime==13.0.96
nvidia-cudnn-cu13==9.19.0.56
nvidia-cufft==12.0.0.61
nvidia-cufile==1.15.1.6
nvidia-curand==10.4.0.35
nvidia-cusolver==12.0.4.66
nvidia-cusparse==12.6.3.3
nvidia-cusparselt-cu13==0.8.0
nvidia-nccl-cu13==2.28.9
nvidia-nvjitlink==13.0.88
nvidia-nvshmem-cu13==3.4.5
nvidia-nvtx==13.0.85
```

这些版本来自现有 wheel 的 METADATA，不是根据文件名猜测。`cuda-toolkit` 是本处只有约 2KB 的 Python 依赖元包，torch 只要求其 cublas/cudart/cufft/cufile/cupti/curand/cusolver/cusparse/nvjitlink/nvrtc/nvtx extras；**不安装该元包全部 extras，不安装 nvcc、编译工具链、vLLM、Qwen、FlashInfer、Cutlass DSL 或其他无关组件。** 各 CUDA 子库版本号独立，例如 cuFFT 12.x 不代表仍在使用 CUDA 12 runtime。

保留满足要求的现有通用依赖，例如 NumPy 2.2.6、Pillow 12.3.0、setuptools 78.1.0、filelock 3.32.3、fsspec 2026.7.0、typing-extensions 4.16.0、sympy 1.14.0、networkx 3.6.1、Jinja2 3.1.6。不能把 Qwen wheelhouse 中较新的 NumPy/filelock 等一并带入。

静态检查方法：以当前 ComfyUI 已安装 METADATA 为基线，按 Python 3.12/Linux marker 和所需 extras 展开新 torch 依赖闭包，保留满足要求的旧版本；替换旧 GPU 包后，对全部候选发行包的非可选 `Requires-Dist` 再检查。结果：**22 个新增/变更包，未发现声明层面的缺失或版本冲突**。这不是 pip resolver 的实际安装结果，也不验证 DLL/原生扩展 ABI。

### 4.2 优先只读复用已有 wheel

来源目录：

`/home/chen/qwen38-local/downloads/cu130-wheelhouse/run-20260822-202127-17438/verified/`

来源/哈希清单位于上一级 `wheel-manifest.tsv` 和 `wheel-sources.json`。只把 wheel 当安装资产，**不复制、移动、修改或运行 Qwen 的 venv/服务**。本轮对 22 个候选文件逐个重新计算完整 SHA-256，与既有清单及大小一致；总计 **2,717,158,470 字节**。该数字是本地可复用的压缩 wheel 总量，不是本轮下载量；本轮没有下载。

三个主包：

| 文件 | 大小（字节） | SHA-256 |
|---|---:|---|
| `torch-2.11.0+cu130-cp312-cp312-manylinux_2_28_x86_64.whl` | 531,146,695 | `96911323dcfcd42028c7e8edde7bdf25bb187753234e8775f0f3f112e86a22db` |
| `torchvision-0.26.0+cu130-cp312-cp312-manylinux_2_28_x86_64.whl` | 7,522,264 | `0f030a9bd8ada1a31b7111ea1589c1ecb5fa0884fee700a203e731b4cf378a98` |
| `torchaudio-2.11.0+cu130-cp312-cp312-manylinux_2_28_x86_64.whl` | 1,728,401 | `3fba988f4301fe13547fe5e99c76d9ae36a27e19ded82eeffed9d2456e12edef` |

清单记录三者源 URL 为 `https://download-r2.pytorch.org/whl/cu130/` 下对应文件，其他依赖源 URL 逐项保留在既有清单。本轮复核的是本地字节与已有来源记录一致，未对所有远端对象重新下载或重新做来源认证。实施前再次校验哈希，禁止把整个 196-wheel 目录盲目装入 ComfyUI。

### 4.3 处理旧 cu12 依赖

必须在完成备份之后，先在 **ComfyUI venv** 移除旧 torch/vision/audio、Triton 及下列 14 个 GPU 用户态发行包，再安装精确的新集合；不能同时保留两套可能共享 `site-packages/nvidia/*` 目录的运行库。

```text
nvidia-cuda-nvrtc-cu12==12.8.93
nvidia-cuda-runtime-cu12==12.8.90
nvidia-cuda-cupti-cu12==12.8.90
nvidia-cudnn-cu12==9.10.2.21
nvidia-cublas-cu12==12.8.4.1
nvidia-cufft-cu12==11.3.3.83
nvidia-curand-cu12==10.3.9.90
nvidia-cusolver-cu12==11.7.3.90
nvidia-cusparse-cu12==12.5.8.93
nvidia-cusparselt-cu12==0.7.1
nvidia-nccl-cu12==2.27.3
nvidia-nvtx-cu12==12.8.90
nvidia-nvjitlink-cu12==12.8.93
nvidia-cufile-cu12==1.13.1.3
```

这些是 venv 内 pip 包，**不是 Windows NVIDIA 驱动，也不涉及其他项目同名库**。如果实施时检查发现别的已安装包依赖这些旧发行包，或卸载后的残留文件无法按 RECORD 安全解释，停止并报告，不清空共享目录、不扩大删除范围。

## 5. 可限定的修改范围

| 位置 | 批准后拟处理 |
|---|---|
| `/home/chen/ai-services/comfyui/venv/` | 唯一依赖安装/卸载目标，固定解释器绝对路径 |
| 同服务 `constraints.txt` | 更新三件套及本方案 GPU 依赖精确约束，保持 NumPy/Transformers 等原约束 |
| 同服务 `requirements.lock.txt` | 验收后写实际 freeze；旧文件保留在备份中 |
| 同服务新增备份/修复记录目录 | 保存原始快照、清单、哈希、命令、pip check、CPU 导入结果与失败记录 |
| Qwen wheelhouse | 只读来源，不写入、不改权限、不复制 Qwen 环境 |
| ComfyUI 程序、serve.py、工作流、attempt-state、模型及输入 | 保持不变；不重置已消耗的推理次数 |
| 其他模型服务/系统 Python/驱动/WSL | 不修改、不启停 |

独立性依据：`pyvenv.cfg` 的 `include-system-site-packages=false`，目标 prefix 是 `/home/chen/ai-services/comfyui/venv`，启动记录使用其绝对解释器。cfg 记录创建命令曾来自另一个解释器路径，但实际 `home=/usr/bin`、`executable=/usr/bin/python3.12`，不能仅凭创建命令就认为两项目共享 site-packages。实施前须再用只读 prefix/sysconfig 检查确认，不使用系统 pip、`--user`、全局 LD_LIBRARY_PATH 或共享环境变量修改。

当前 venv 占用约 8.0GiB；文件系统可用约 652GiB。建议留至少 30GiB 临时余量用于完整备份、安装展开与失败环境保留，不把压缩包大小当作最终磁盘占用。

## 6. 修改前备份与失败回滚

**以下步骤及命令均为批准后的方案，本轮没有执行。**

### 6.1 备份门槛

1. 确认 ComfyUI 没有进程/监听、没有任何消费者使用该 venv；当前 8188/9880/9881/8000 均未见监听，但实施时必须重新核实。若服务意外已启动，停止准备，不擅自控制其他服务。
2. 使用目标 `venv/bin/python -B` 记录 sys.prefix、base_prefix、site-packages、pip list/freeze；读取源码 HEAD、constraints、锁文件、serve.py、workflow、attempt-state 的哈希。其他三项目只做版本/文件哈希对照，不导入或运行其模型。
3. 在服务专用备份目录建立唯一时间戳子目录；完整归档 venv、constraints.txt、requirements.lock.txt；额外保存当前配置/状态的只读快照和清单。保留原模式、符号链接及可用的 ACL/xattr；不得使用会与原环境共享可写文件的硬链接备份。
4. 对归档计算 SHA-256 并检查清单；可提取到临时目录验证关键文件哈希，但**不运行被移动的 venv**。备份或读回校验失败则不修改环境。

示意命令（由实施任务设定唯一 B 值，先检查不存在）：

```bash
S=/home/chen/ai-services/comfyui
B="$S/backups/<唯一时间戳>"
mkdir -p "$B"
tar --acls --xattrs -cpf "$B/environment.tar" -C "$S" venv constraints.txt requirements.lock.txt
sha256sum "$B/environment.tar"
tar -tf "$B/environment.tar"
```

### 6.2 有界修复与非推理验收

1. 基线确认后生成仅包含上列 22 个 wheel 的精确安装清单，逐个带既有 SHA-256；冻结其余包的版本。先检查旧 GPU 包的反向依赖，之后才卸载本报告列出的旧集合。
2. 用绝对路径 `.../comfyui/venv/bin/python -m pip`，仅从本地 wheel 安装；禁止访问索引、隐式下载、源码构建和未列出的依赖。可在闭包已验证后采用 `--no-index --no-deps --require-hashes` 安装该精确清单；`--no-deps` 不是跳过依赖核查，而是阻止安装器扩大已核实闭包。
3. 执行目标环境 `pip check`，对比安装前后发行包集合；除了上列替换/新增/移除集合，任何额外变动都停止并报告。
4. 使用 `CUDA_VISIBLE_DEVICES=-1`、`PYTHONDONTWRITEBYTECODE=1` 做 CPU 导入：torch、torchvision、torchaudio、numpy；确认 `torch.__version__`、`torch.version.cuda`，并做 CPU 张量及 torchvision CPU 核心操作。仅读取 CUDA 构建信息，**不调用 torch.cuda.is_available/get_device_properties，不创建 CUDA context 或 CUDA 张量**。
5. 检查 comfy-kitchen/comfy-aimdo 原生库的依赖路径与 CPU 侧可加载性；不运行其 GPU kernel，不通过启动 ComfyUI 来代替检查。如果扩展导入会主动初始化 CUDA，则只做静态 ELF/依赖检查，记录该项待后续授权；不据此扩大到 GPU 验证。
6. 保持服务关闭、attempt-state 原样、模型不加载。通过后更新本服务约束/锁文件和修复记录，停止等待下一 Gate。**不执行现有 serve.py、health 启动或原工作流请求**；serve.py 本身会初始化模型运行环境，不属于本轮非推理导入验收。

### 6.3 失败回滚

适用：安装失败、pip check 非零、CPU 导入/ABI 检查失败、出现清单外依赖变更或发现修改范围超出本服务。

1. 停止后续步骤；先保存失败命令、输出和当时 freeze 到本服务记录目录，不再次尝试随机升降级。
2. 确认目标 venv 无运行进程，校验环境归档 SHA-256。将失败 venv **整体移到备份子目录保留**，不要把旧文件覆盖叠加到失败环境。
3. 从归档恢复到原绝对路径 `/home/chen/ai-services/comfyui/venv`，同时恢复原 constraints.txt 与 requirements.lock.txt；验证原文件哈希、发行包版本、前缀以及 `pip check`。
4. 仅做相同 CPU 侧检查；回滚成功也不启动服务或推理。若恢复校验失败，保持停用并报告，不删除备份或调整系统组件。

示意恢复命令：

```bash
# B 必须是已经校验的本次唯一备份目录；先确认 failed-venv 不存在
mv /home/chen/ai-services/comfyui/venv "$B/failed-venv"
tar --acls --xattrs -xpf "$B/environment.tar" -C /home/chen/ai-services/comfyui
```

恢复必须回到原路径，避免 venv 中绝对 shebang/路径失效；不能只“pip 装回 torch 2.8”就宣称完整回滚。全过程不改 serve.py、模型权重、外部服务或 Windows/WSL 配置。

## 7. WSL 自定义内核与 GPU 访问路径

本轮实测 `uname -r` 为 `6.6.114.1-microsoft-standard-WSL2`；Windows `wsl.exe --version` 报告 WSL 2.7.12.0、自带内核包 6.18.33.2-2。`.wslconfig` 指向：

```text
kernel=C:\\Users\\admin\\wsl-kernels\\kernel-6.6.114.1-x64
kernelModules=C:\\Users\\admin\\wsl-kernels\\modules-6.6.114.1.vhd
```

本轮找到 `C:\Users\admin\wsl-kernels\prepared-kernel-6.6.114.1.json`，记录来源为微软 WSL 2.7.3 MSI：

- `AssetUrl=https://github.com/microsoft/WSL/releases/download/2.7.3/wsl.2.7.3.0.x64.msi`
- MSI 大小 255,135,744 字节；记录 SHA-256 `64d8c096738ab72e74e11c4d4afb1ae425627f71cc651734db1f887c82c07dfe`。
- 记录内核 SHA-256 `13a18309e59a8083b335e15c9ce117176b2c9be14cd65a5801f2bb04f849c434`，准备日期 2026-08-22。

这是**现存准备记录的来源声明**，本轮未重新提取 MSI 或核对全部内核/模块字节。应将“自定义内核”准确理解为显式覆盖内核选择，不能直接称其为来源不明的自行编译内核。当前模块文件与内核的完整配对校验仍未做。本次只读核查不会调整该全局配置。[微软 WSL kernel/kernelModules 配置说明](https://learn.microsoft.com/en-us/windows/wsl/wsl-config)

获准的只读宿主访问确认 `/dev/dxg` 存在，`/usr/lib/wsl/lib/libcuda.so.1` 存在；NVML 报 RTX 4090、610.88、49,140 MiB、核心34°C。访问链路为：

```text
ComfyUI venv 内 CUDA 用户态库
  → WSL 提供的 libcuda.so
  → /dev/dxg / Windows GPU 虚拟化路径
  → 宿主 NVIDIA WDDM 驱动
  → GPU（同设备也承担显示）
```

这个路径说明为什么 venv 可以独立修复，也说明为什么 venv 隔离不能隔离驱动/硬件故障。本轮不重启 WSL、不执行 GPU 可用性代码。

## 8. Qwen 对照与尚未排除的硬件风险

持有人已确认 RTX 4090 魔改48GB成品卡，卖家未提供专用驱动建议或稳定性测试记录。因此不再把“是否魔改”列为未知；未知的是扩容工艺、颗粒/VBIOS匹配、供电与实际可靠性。

实际历史项目为 `/home/chen/qwen38-local`（此前给出的 qweb38 拼写路径不存在）。模型卡及下载清单为 Qwen3.8-27B-FP8，revision `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`，FP8 E4M3/128×128；现有 wheel、venv 元数据及8月25日验收均支持 torch 2.11.0+cu130/vLLM 0.26.0。旧 `requirements.lock.txt` 标为过期，未用其 cu128 数值作成功环境依据。

| 已有证据 | 对本次修复的意义与边界 |
|---|---|
| Qwen 有真实 API 成功、显存峰值46,184MiB及退出释放记录 | 说明曾成功加载/计算，不是 Wan 稳定性认证 |
| Qwen 8/26 与9/5日志均有 illegal instruction、EngineDeadError | 故障不限于 Wan；单换 cu130 不能视为硬件风险已排除 |
| HWiNFO CSV 与8/31服务重叠约1小时43分钟：最高387.697W、核心55.3°C、显存结温66°C | 是历史真实负载温度/功耗，不还原10/27事故温度，也不等于全部焊接颗粒都被传感器覆盖 |
| 同窗口 Bad TLP/NAKs Sent 均94→117 | 保留 PCIe 链路排查方向，不能直接归因；Recovery Count 增量不当作错误数 |
| 10/27 Wan 明确 TDR/黑屏，峰值遥测未落盘 | 驱动、显存、供电、链路仍不能区分根因 |
| 现有 ECC/显存错误信息不可用、无卖家稳定性记录 | 缺少硬件稳定性背书；不能用空闲状态或一次成功替代 |

依据分别为 `qwen38-local/logs/qwen38-smoke-test-20260825-115115-324129/metrics.tsv`、`logs/qwen38-service-20260826-023421-20103/vllm-server.log`、`logs/qwen38-service-20260905-043351-863470/vllm-server.log`、`/mnt/c/Users/admin/hwinfo-gpu.csv`；事故证据见本仓 INCIDENT-001/002。历史 Qwen 当时驱动版本仍未可靠还原。

需要继续排查：既有转储的只读分析、卖家/板卡资料、历史 PCIe 错误、PSU及接线资料、事故前持续遥测。改变显示连接、硬件检查、驱动/内核变更或实际压力测试均需另行裁定，本方案不包含。

## 9. 放行判断及待批准事项

| 问题 | 判断 |
|---|---|
| 是否确认软件配置偏差？ | 是：固定 ComfyUI 要求 cu130+，实际 cu128 |
| 是否有准确修复组合及资产？ | 是：22个精确版本，本地SHA复核通过；其余依赖保留 |
| 是否能限定为 ComfyUI 独立环境？ | 是，需实施前再次确认prefix/无消费者，严格按路径执行 |
| 是否具备非推理修复准备条件？ | 是；本报告提交后等待批准，不代表已经安装或验收 |
| 是否保证修复后消除TDR？ | 否；原因未定位，硬件/宿主驱动风险尚未排除 |
| 是否允许随后自动启动服务/验证GPU/恢复Wan？ | 否；本轮没有该授权，修复验收后也必须停止 |

建议持有人下一步只批准：**完整备份 → 本地有界依赖替换 → pip check/CPU导入/静态ABI检查 → 保存记录 → 停止**。具体版本与范围以本报告为准；任何新增依赖、缺失资产、原生扩展冲突或清单外变化都先停止报告，不扩大修复。

## 10. 本轮实际执行与未执行

实际：读取固定源码、requirements/constraints/venv配置与 METADATA；读取本地wheel ZIP元数据；CPU计算22个文件完整SHA-256并对照来源清单；静态展开marker/extras与检查反向依赖；只读NVML/设备/端口/WSL配置和准备记录查询；查询官方版本资料；写本报告。

未执行：pip安装、卸载、升级或dry-run安装；没有创建备份、constraints新文件或锁文件；没有导入torch/comfy执行初始化；没有启动模型服务、CUDA初始化、推理或压力测试；未改变其他环境。

**报告完成后停止，等待批准实施。**
