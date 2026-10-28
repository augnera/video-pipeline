# GPU-INCIDENT-003-G2｜ComfyUI 独立环境定向修复记录

日期：2026-10-27。授权依据：本仓 `docs/reports/GPU-INCIDENT-003.md` 与持有人 GPU-INCIDENT-003-G2 指令。

## 1. 结果

**定向修复完成，非推理验收通过。** ComfyUI 独立环境已切换为 PyTorch 2.11.0+cu130 配套组合。没有启动 ComfyUI/Wan，没有执行 CUDA 初始化、CUDA 张量运算、模型加载、视频采样或压力测试。

- 22 个本地 wheel 完整大小/SHA-256 核对通过，离线安装成功，无网络下载、源码构建或清单外包升级。
- `pip check`：`No broken requirements found.`
- CPU 导入、CPU 矩阵计算及 torchvision CPU NMS 通过；检查进程 `cudaInitialized=false`，没有触发受禁止的 CUDA API。
- 安装后按 RECORD 完整校验 22 个发行包、**13,093 个带哈希文件**，无不匹配。
- 954 个受保护文件前后 SHA-256 一致；ComfyUI 固定源码与 Wan 权重保持不变。
- 完整备份校验通过，未触发回滚；服务继续保持关闭。

依赖修复完成时间：2026-10-27T21:01:27.232887+08:00。安装文件最终校验时间：2026-10-27T21:02:25.271437+08:00。

**本结果只证明环境安装完整、声明依赖一致及 CPU 路径可运行，不证明 CUDA/GPU 执行正常，也不证明黑屏/TDR 根因已消除。完成后停止等待人工裁定。**

## 2. 施工前核查

完整阅读了 GPU-INCIDENT-003 报告，核对结果与施工前要求一致：

| 项目 | 结果 |
|---|---|
| ComfyUI 源码 | `426f5eea52a7ece1dd599fff4cb6cd1f352ddd24`，0.43.0；施工前后 Git 工作树均无变化 |
| 操作 prefix | `/home/chen/ai-services/comfyui/venv` |
| Python / base prefix | Python 3.12.3；`/usr`；venv不包含系统site-packages |
| 实际 site-packages | `/home/chen/ai-services/comfyui/venv/lib/python3.12/site-packages` |
| 原环境 | torch 2.8.0+cu128 / torchvision 0.23.0+cu128 / torchaudio 2.8.0+cu128 / Triton 3.4.0 |
| 驱动只读查询 | NVIDIA GeForce RTX 4090，610.88，49,140 MiB；与批准报告一致，满足其所核对的CUDA13版本门槛 |
| 服务/消费者 | 未发现目标venv消费者；8188/9880/9881/8000均未监听；没有启停其他服务 |
| WSL实际内核 | `6.6.114.1-microsoft-standard-WSL2`，前后相同；本轮没有写内核配置 |
| 资产 | 22个wheel的版本、平台标签、大小、完整SHA-256与来源清单一致，总计2,717,158,470字节 |
| 原依赖检查 | 原环境pip check通过；没有额外旧cu12依赖消费者阻止清理 |

沿用批准报告的官方兼容性依据；没有重新下载模型或运行GPU兼容性测试。当前PyTorch三件套是官方提供的cu130组合，但实际GPU路径仍未验证。[PyTorch官方配套版本](https://pytorch.org/get-started/previous-versions/)

## 3. 修复前后版本

| 发行包 | 修复前 | 修复后 |
|---|---|---|
| `torch` | `2.8.0+cu128` | `2.11.0+cu130` |
| `torchvision` | `0.23.0+cu128` | `0.26.0+cu130` |
| `torchaudio` | `2.8.0+cu128` | `2.11.0+cu130` |
| `triton` | `3.4.0` | `3.6.0` |
| `cuda-toolkit` | `未安装` | `13.0.2` |
| `cuda-bindings` | `未安装` | `13.3.1` |
| `cuda-pathfinder` | `未安装` | `1.7.0` |
| `nvidia-cublas` | `未安装` | `13.1.0.3` |
| `nvidia-cuda-cupti` | `未安装` | `13.0.85` |
| `nvidia-cuda-nvrtc` | `未安装` | `13.0.88` |
| `nvidia-cuda-runtime` | `未安装` | `13.0.96` |
| `nvidia-cudnn-cu13` | `未安装` | `9.19.0.56` |
| `nvidia-cufft` | `未安装` | `12.0.0.61` |
| `nvidia-cufile` | `未安装` | `1.15.1.6` |
| `nvidia-curand` | `未安装` | `10.4.0.35` |
| `nvidia-cusolver` | `未安装` | `12.0.4.66` |
| `nvidia-cusparse` | `未安装` | `12.6.3.3` |
| `nvidia-cusparselt-cu13` | `未安装` | `0.8.0` |
| `nvidia-nccl-cu13` | `未安装` | `2.28.9` |
| `nvidia-nvjitlink` | `未安装` | `13.0.88` |
| `nvidia-nvshmem-cu13` | `未安装` | `3.4.5` |
| `nvidia-nvtx` | `未安装` | `13.0.85` |

保留原版本：NumPy **2.2.6**、Transformers **4.57.6**、Pillow 12.3.0、setuptools 78.1.0、filelock 3.32.3，以及其他未列入本次变更集合的包。comfy-kitchen 0.2.40、comfy-aimdo 0.6.0未更换。

旧三件套与Triton由对应新版本替换；以下14个旧cu12发行包已从**目标venv**卸载：

- `nvidia-cuda-nvrtc-cu12==12.8.93`
- `nvidia-cuda-runtime-cu12==12.8.90`
- `nvidia-cuda-cupti-cu12==12.8.90`
- `nvidia-cudnn-cu12==9.10.2.21`
- `nvidia-cublas-cu12==12.8.4.1`
- `nvidia-cufft-cu12==11.3.3.83`
- `nvidia-curand-cu12==10.3.9.90`
- `nvidia-cusolver-cu12==11.7.3.90`
- `nvidia-cusparse-cu12==12.5.8.93`
- `nvidia-cusparselt-cu12==0.7.1`
- `nvidia-nccl-cu12==2.27.3`
- `nvidia-nvtx-cu12==12.8.90`
- `nvidia-nvjitlink-cu12==12.8.93`
- `nvidia-cufile-cu12==1.13.1.3`

发行包总数 **88 → 92**，严格符合移除18个、安装22个的集合差异。没有残留这些旧cu12发行包，没有额外发行包变动。`cuda-toolkit==13.0.2`是用户态pip依赖元包，不是系统CUDA Toolkit安装；没有安装nvcc、vLLM、FlashInfer或其他无关组件。

## 4. 实际安装wheel清单

下表所有文件均直接读取自同一个现有目录，**没有复制/移动/修改Qwen环境或wheel源文件**：

`/home/chen/qwen38-local/downloads/cu130-wheelhouse/run-20260822-202127-17438/verified/`

每项完整路径为该目录加下表文件名。来源URL、大小和哈希已保存在 `/home/chen/ai-services/comfyui/backups/GPU-INCIDENT-003-G2-20261027-205858/before.json`；原来源账本是wheel目录上一级的 `wheel-manifest.tsv`、`wheel-sources.json`。安装输入为 `/home/chen/ai-services/comfyui/backups/GPU-INCIDENT-003-G2-20261027-205858/approved-wheels.txt`，每行是固定本地file URL及SHA-256。

| wheel文件 | 字节数 | SHA-256 |
|---|---:|---|
| `cuda_bindings-13.3.1-cp312-cp312-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl` | 6,657,965 | `e32d08f71ebcdf00f0f41eab2eb37e8da94c8ed411cc9f7f7a019ce6b34abe3a` |
| `cuda_pathfinder-1.7.0-py3-none-any.whl` | 63,091 | `e9d67e950f3d5992b854dfd25917c3719d0c21d3057b11abe86ba6feec526138` |
| `cuda_toolkit-13.0.2-py2.py3-none-any.whl` | 2,364 | `b198824cf2f54003f50d64ada3a0f184b42ca0846c1c94192fa269ecd97a66eb` |
| `nvidia_cublas-13.1.0.3-py3-none-manylinux_2_27_x86_64.whl` | 423,133,236 | `ee8722c1f0145ab246bccb9e452153b5e0515fd094c3678df50b2a0888b8b171` |
| `nvidia_cuda_cupti-13.0.85-py3-none-manylinux_2_25_x86_64.whl` | 10,715,597 | `4eb01c08e859bf924d222250d2e8f8b8ff6d3db4721288cf35d14252a4d933c8` |
| `nvidia_cuda_nvrtc-13.0.88-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl` | 90,215,200 | `ad9b6d2ead2435f11cbb6868809d2adeeee302e9bb94bcf0539c7a40d80e8575` |
| `nvidia_cuda_runtime-13.0.96-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl` | 2,243,632 | `7f82250d7782aa23b6cfe765ecc7db554bd3c2870c43f3d1821f1d18aebf0548` |
| `nvidia_cudnn_cu13-9.19.0.56-py3-none-manylinux_2_27_x86_64.whl` | 366,066,321 | `d20e1734305e9d68889a96e3f35094d733ff1f83932ebe462753973e53a572bf` |
| `nvidia_cufft-12.0.0.61-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl` | 214,085,489 | `6c44f692dce8fd5ffd3e3df134b6cdb9c2f72d99cf40b62c32dde45eea9ddad3` |
| `nvidia_cufile-1.15.1.6-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl` | 1,223,672 | `08a3ecefae5a01c7f5117351c64f17c7c62efa5fffdbe24fc7d298da19cd0b44` |
| `nvidia_curand-10.4.0.35-py3-none-manylinux_2_27_x86_64.whl` | 59,544,258 | `1aee33a5da6e1db083fe2b90082def8915f30f3248d5896bcec36a579d941bfc` |
| `nvidia_cusolver-12.0.4.66-py3-none-manylinux_2_27_x86_64.whl` | 200,941,980 | `0a759da5dea5c0ea10fd307de75cdeb59e7ea4fcb8add0924859b944babf1112` |
| `nvidia_cusparse-12.6.3.3-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl` | 145,942,937 | `2b3c89c88d01ee0e477cb7f82ef60a11a4bcd57b6b87c33f789350b59759360b` |
| `nvidia_cusparselt_cu13-0.8.0-py3-none-manylinux2014_x86_64.whl` | 169,884,119 | `25e30a8a7323935d4ad0340b95a0b69926eee755767e8e0b1cf8dd85b197d3fd` |
| `nvidia_nccl_cu13-2.28.9-py3-none-manylinux_2_18_x86_64.whl` | 196,493,177 | `e4553a30f34195f3fa1da02a6da3d6337d28f2003943aa0a3d247bbc25fefc42` |
| `nvidia_nvjitlink-13.0.88-py3-none-manylinux2010_x86_64.manylinux_2_12_x86_64.whl` | 40,713,933 | `13a74f429e23b921c1109976abefacc69835f2f433ebd323d3946e11d804e47b` |
| `nvidia_nvshmem_cu13-3.4.5-py3-none-manylinux2014_x86_64.manylinux_2_17_x86_64.whl` | 60,412,546 | `290f0a2ee94c9f3687a02502f3b9299a9f9fe826e6d0287ee18482e78d495b80` |
| `nvidia_nvtx-13.0.85-py3-none-manylinux1_x86_64.manylinux_2_5_x86_64.whl` | 148,047 | `4936d1d6780fbe68db454f5e72a42ff64d1fd6397df9f363ae786930fd5c1cd4` |
| `torch-2.11.0+cu130-cp312-cp312-manylinux_2_28_x86_64.whl` | 531,146,695 | `96911323dcfcd42028c7e8edde7bdf25bb187753234e8775f0f3f112e86a22db` |
| `torchaudio-2.11.0+cu130-cp312-cp312-manylinux_2_28_x86_64.whl` | 1,728,401 | `3fba988f4301fe13547fe5e99c76d9ae36a27e19ded82eeffed9d2456e12edef` |
| `torchvision-0.26.0+cu130-cp312-cp312-manylinux_2_28_x86_64.whl` | 7,522,264 | `0f030a9bd8ada1a31b7111ea1589c1ecb5fa0884fee700a203e731b4cf378a98` |
| `triton-3.6.0-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl` | 188,273,546 | `6f5928e6d44c34a97bbe164cceddc0ef2007121c89ebcfba5415cf452de7ee9f` |

安装使用 `--no-index --no-deps --require-hashes --no-cache-dir --no-compile`，清空会改变安装目标/来源的外部Python及pip配置；设置 `PIP_CONFIG_FILE=/dev/null`、`PIP_NO_INDEX=1`。安装器不解析/下载额外依赖，而是安装事先核实的完整22包闭包；随后用实际pip check确认。

## 5. 完整备份及回滚路径

- 本次记录/备份目录：`/home/chen/ai-services/comfyui/backups/GPU-INCIDENT-003-G2-20261027-205858`。
- 完整归档：`/home/chen/ai-services/comfyui/backups/GPU-INCIDENT-003-G2-20261027-205858/environment.tar`。
- 归档大小：**8,511,477,760字节**，共**63,853条目**。
- 归档SHA-256：`d5afa2e29752125ee3a5bae1b5a71f041543865a6fb389b3b5fcd4ef06caaad3`。
- 归档包含：完整 `venv/`、原 `constraints.txt`、原 `requirements.lock.txt`；保留符号链接及ACL/xattr。
- 校验：`tar -tf`可完整读取；`tar --compare`逐文件与原环境一致；安装前与修复后再次校验整个归档SHA-256通过。
- 证据：`backup-commands.json`、`backup-create.log`、`backup-file-list.txt`、`backup-compare.log`、`backup-verified.json`、`environment.tar.sha256`。

**本轮未回滚。** 若后续获准回滚，必须先确认没有目标环境使用者、校验归档SHA，再将当前venv移至唯一的失败环境保留目录，整体恢复至原绝对路径，避免把旧文件覆盖混入新环境。示意（未执行）：

```bash
B=/home/chen/ai-services/comfyui/backups/GPU-INCIDENT-003-G2-20261027-205858
cd "$B"
sha256sum -c environment.tar.sha256
# 确认没有相关进程，且下列保留目录不存在；不能覆盖既有目录
mv /home/chen/ai-services/comfyui/venv "$B/failed-venv-on-rollback"
tar --acls --xattrs -xpf "$B/environment.tar" -C /home/chen/ai-services/comfyui
tar --acls --xattrs --compare -f "$B/environment.tar" -C /home/chen/ai-services/comfyui
PYTHONDONTWRITEBYTECODE=1 CUDA_VISIBLE_DEVICES=-1 /home/chen/ai-services/comfyui/venv/bin/python -B -m pip check
```

随后核对原版本与 `before.json`，保持服务关闭。归档完整性已经检查；本轮没有为了演示回滚而执行一次恢复，也不把未执行的恢复演练说成已经通过。

## 6. 验证结果及实际命令

| 检查 | 实际结果 |
|---|---|
| 解释器和前缀 | 正确目标venv，base prefix=/usr，无系统site-packages混入 |
| 安装后pip check | 退出0，无依赖冲突 |
| 版本及集合 | 22个目标包精确匹配，其余包版本不变 |
| 安装文件 | 22个发行包、13,093个带哈希文件匹配RECORD |
| CPU导入 | torch、torchvision、torchaudio、numpy、transformers、safetensors、av均通过 |
| CPU功能 | 显式CPU矩阵乘法、torchvision.ops.nms通过 |
| CUDA构建信息 | `torch.version.cuda=13.0`；这是构建值，不是实际GPU运行验证 |
| CUDA边界 | `CUDA_VISIBLE_DEVICES=-1`；封锁cuda init/lazy-init/可用性与属性查询入口；实际未调用；`torch.cuda._initialized=false` |
| GPU扩展 | 对3个comfy-kitchen/aimdo原生库作静态ELF依赖检查，没有导入GPU后端或运行其kernel |
| 模型/服务 | 没有导入Comfy服务入口，没有加载模型；最终8188/9880/9881/8000监听列表为空 |

comfy-kitchen的CUDA后端注册代码会调用 `torch.cuda.is_available()`，因此遵守批准报告，本轮只做该部分静态检查。**其GPU后端动态加载/ABI及运行效果仍未实测**；不以CPU三件套导入通过来替代该结论。

实际编排命令（脚本副本保存在本次备份目录）：

```bash
python -B /tmp/comfy-incident003-g2-preflight.py
python -B /tmp/comfy-incident003-g2-backup.py
python -B /tmp/comfy-incident003-g2-repair.py
python -B /tmp/comfy-incident003-g2-finalcheck.py
```

修复脚本中实际执行的命令（以下均已执行且退出0）：

```bash
/home/chen/ai-services/comfyui/venv/bin/python -B -m pip uninstall -y nvidia-cuda-nvrtc-cu12 nvidia-cuda-runtime-cu12 nvidia-cuda-cupti-cu12 nvidia-cudnn-cu12 nvidia-cublas-cu12 nvidia-cufft-cu12 nvidia-curand-cu12 nvidia-cusolver-cu12 nvidia-cusparse-cu12 nvidia-cusparselt-cu12 nvidia-nccl-cu12 nvidia-nvtx-cu12 nvidia-nvjitlink-cu12 nvidia-cufile-cu12 torch torchvision torchaudio triton
/home/chen/ai-services/comfyui/venv/bin/python -B -m pip install --no-index --no-deps --require-hashes --no-cache-dir --no-compile --disable-pip-version-check -r /home/chen/ai-services/comfyui/backups/GPU-INCIDENT-003-G2-20261027-205858/approved-wheels.txt
/home/chen/ai-services/comfyui/venv/bin/python -B -m pip check
/home/chen/ai-services/comfyui/venv/bin/python -B /tmp/comfy-incident003-g2-cpu-check.py /home/chen/ai-services/comfyui/backups/GPU-INCIDENT-003-G2-20261027-205858/cpu-check.json
/home/chen/ai-services/comfyui/venv/bin/python -B -m pip freeze --all
```

CPU命令的环境变量含 `CUDA_VISIBLE_DEVICES=-1`、`PYTHONDONTWRITEBYTECODE=1`、`OMP_NUM_THREADS=2`、`MKL_NUM_THREADS=2`；不是默认可见GPU的执行方式。readelf与文件校验只读取二进制，不执行GPU代码。

原始检查输出：`after.pip-check.txt`、`cpu-check.json/log`、`gpu-extensions-static.json`、`final-integrity-check.json`。安装/卸载日志及参数：`install.log`、`uninstall.log`、`repair-commands.json`。

## 7. 修改范围及其他环境保护

实际修改：目标 `venv/` 内的核准依赖；本服务 `constraints.txt`、`requirements.lock.txt`；本服务本次备份/日志记录；本报告。没有修改VideoPipeline业务代码。

954项施工前后完整哈希比较全部相同，具体包括：

- GPT-SoVITS：252项包METADATA/RECORD、venv配置及服务文件。
- IndexTTS2：288项同类文件。
- Qwen：393项同类文件，只读取其wheel作为安装源。
- Wan：两项新权重及既有VAE完整SHA-256不变。
- ComfyUI服务入口、工作流、attempt-state、模型路径配置、源码入口文件、系统Python及WSL libcuda等。

这是所列文件的保护证据，不声称对其他环境所有文件做了全盘校验。全部pip写操作使用ComfyUI解释器绝对路径，没有使用系统pip或其他环境解释器；没有修改系统Python、Windows驱动、系统CUDA Toolkit或WSL内核。

服务 `attempt-state.json` 保留事故前的历史 `running/attempts=1` 状态，没有重置推理计数；它不表示进程仍存活。任何未来恢复都不能把此状态直接当成可重试授权。

`constraints.txt`现记录22个目标版本并保留NumPy/Transformers约束；`requirements.lock.txt`来自修复后的实际freeze，完整前后列表在 `before.freeze.txt`、`after.freeze.txt`。没有复制Qwen过期锁文件。

## 8. 未解决事项与安全恢复建议

环境层面：本轮安装、依赖与CPU检查均通过，无新增依赖冲突，没有扩大修复范围或触发回滚。

仍未解决：

1. cu130在本机的实际CUDA上下文/原生GPU扩展/模型计算路径未验证；ComfyUI真实服务可用性未验证。
2. 魔改显存可靠性、板卡/VBIOS匹配、供电、PCIe错误、Windows TDR及WSL链路根因仍未排除；Qwen历史也存在illegal instruction。
3. 当前保护层的GPU遥测需在故障前持续落盘；现有协作锁不等于宿主级GPU隔离。该保护修正没有包含在本轮施工内。

建议下一步先由持有人评审本报告与硬件/转储证据，明确遥测与停止方案，再另行裁定是否允许最小GPU验证。**不得因本次pip check/CPU导入通过而自动启动ComfyUI、清除事故状态、重试Wan或扩大到压力测试。**

完成后停止，等待人工裁定。
