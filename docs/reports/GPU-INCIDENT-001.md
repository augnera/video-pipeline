# GPU-INCIDENT-001｜Wan 运行期间 AI Server 黑屏故障诊断

调查日期：2026-10-27，约 20:00–20:03（Asia/Shanghai）。本轮仅进行只读调查，唯一新增文件为本报告。没有启动 ComfyUI/Wan、执行 CUDA 推理或压力测试，没有下载、安装、修改驱动或模型服务，也没有恢复 VP-004A-G2。

## 1. 结论与证据等级

**最后确认阶段是 Wan 视频扩散采样，已完成 11/20 步（55%）。不是下载阶段，也不是仅停留在模型加载。** 主模型、文本编码器和 VAE 已成功加载；采样日志随后中断，未见 VAE 最终解码、视频编码或完成记录，未产出 MP4。

Windows 在最后一条采样日志写入约 3 秒后记录 nvlddmkm Event 14，随后约 73 秒内出现 126 条 Event 153。可以确认 Wan 采样与宿主 GPU 驱动故障在时间上紧邻；**目前不能从这些记录判定是 Wan 算子、Windows/WSL 驱动路径、显卡/显存、供电或 PCIe 中哪一项导致故障。**

新增线索：Kernel-Power 41 XML 包含 `BugcheckCode=307`，即 `0x133`；但 `BugcheckInfoFromEFI=true`、参数 2/3/4 为零，未找到本时段配套 BugCheck 1001 或新转储。应保留“可能发生 DPC 看门狗超时”的排查方向，不能直接认定此 EFI 字段完整描述本次事故。

**目前不满足重新启动 GPU 推理的前提。** 空闲 NVML 可查询、资产哈希正确和之前 CUDA 初始化通过，都不足以证明持续负载稳定；本报告完成后保持暂停，等待持有人裁定。

## 2. 环境与项目定位

| 项目 | 本轮读取结果 |
|---|---|
| WSL 发行版 | `WSL_DISTRO_NAME=Ubuntu`，Ubuntu 24.04.4 LTS |
| 内核 | `6.6.114.1-microsoft-standard-WSL2`，主机 `DESKTOP-EF85OE9` |
| 本次 WSL 启动 | `uptime -s`：2026-10-27 19:57:00 |
| 项目 | `/home/chen/work/video-pipeline` |
| 项目 HEAD | `404f8d5d64c14b56815bd9cec2856e0bc63ccb81` |
| ComfyUI | `/home/chen/ai-models/ComfyUI`；`426f5eea52a7ece1dd599fff4cb6cd1f352ddd24`；该程序目录 `git status --short` 无输出 |
| 独立环境 | `/home/chen/ai-services/comfyui/venv`；部署记录 Python 3.12.3 |
| PyTorch / CUDA runtime | 安装锁及事故前实际验证：`torch 2.8.0+cu128`、CUDA 12.8；torchvision/torchaudio `0.23.0+cu128` / `2.8.0+cu128` |
| 事故前 CUDA 验证 | `cudaAvailable=true`、设备 RTX 4090、计算能力 8.9；此处引用原记录，本轮没有重新初始化 CUDA |
| GPU 当前标识 | NVIDIA GeForce RTX 4090；UUID `GPU-a7eafd6f-d8c7-9243-8895-a332d61e4e4f`；PCI `00000000:01:00.0`；Device ID `0x268410DE` |
| 驱动 / VBIOS | `610.88` / `95.02.3c.00.02` |
| 显存 | 驱动报告 49,140 MiB；这是软件报告容量，未验证全部显存物理可靠性、显卡具体改装情况或 VBIOS 来源 |
| 当前空闲快照 | 33°C、22.71 W、已用 2,159 MiB、利用率 11%；另一次查询 P8。只是查询时的快照 |
| 服务当前状态 | `ss -ltnp` 未见 8188/9880/9881 监听；进程检查未见对应 Python 模型服务。本轮没有启动它们 |

仓库既有状态：`.gitignore` 已修改；根目录 `PRDv1.1.md`、`README.md` 已删除；`docs/PRDv1.1.md`、`docs/README.md`、`docs/VideoPipeline_PRD_v2.0.md`、`docs/reports/`、`experiments/`、`orchestrator/src/voice/` 为未跟踪项。本轮未整理或修改这些既有变化。

普通沙箱内 `nvidia-smi` 一度返回 `GPU access blocked by the operating system`，且看不到 `/dev/dxg`；在获准的只读宿主访问中，NVML 查询成功，`/dev/dxg` 存在。这是检查权限差异，不能当成本次重启后 GPU 仍故障的证据。

## 3. 故障时间线

下表统一使用北京时间 UTC+8；ISO 日志中的 `11:xxZ` 已换算为 `19:xx+08:00`。ComfyUI 普通文本没有逐行墙钟时间，因此不为每步虚构精确时间。

| 时间 | 已确认事件与证据 |
|---|---|
| 19:24:58 左右 | 主模型续传及完整校验完成；见 `orchestrator/output/day9-vp004a/g2-r1/range-events.jsonl` 的主模型完成事件 |
| 19:33:41 | 文本编码器完整校验完成；两项批准资产全部完成，累计新增 12,596,701,391 字节；同上 `approved-assets-complete` |
| 19:35–19:36 | 独立环境 `pip check`、实际导入、CUDA 初始化检查通过；见服务 `logs/*-r1.*` |
| 19:39 左右 | 首次 HTTP 提交被本次服务的图哈希保护拒绝，执行节点为空，没有真实模型推理。原因为等值整数/浮点序列化；见 `g2-r1/guard-rejection-history.json`、`numeric-serialization-fix-proof.json`，历史记录保留 |
| 19:41:11.513 | 修正本次服务保护层的等值数值识别后启动服务；见 `launch-r1-guardfix.json`。模型、工作流、参数未改变 |
| 19:42:20.586 | 唯一真实推理开始；`attempt-state.json`：attempts=1，promptId=`e8c6b377-797a-4234-bf30-f5731a8d33f2` |
| 随后，逐行时间不可得 | VAE、CPU 文本编码器、WAN22 主模型依次加载成功；随后采样进度从 0/20 到 11/20 |
| 19:43:24.854 | `server-r1-guardfix.log` 最后修改时间；最后一条为 `11/20 [00:36<00:30, 3.41s/it]`。这是文件 mtime 与最后可见进度，不代表故障恰在第 11 步结束时发生 |
| 19:43:27.831198 | Windows nvlddmkm Event 14，System RecordId 1450260 |
| 19:43:27.831723–19:44:40.551641 | 126 条 nvlddmkm Event 153，RecordId 1450261–1450414（区间有其他事件，非连续编号）；事件数据包括 `Error occurred on GPUID: 100` |
| 19:44:44 / 19:45:14 | 上一 WSL boot 的另一进程留下连接保活超时及重连记录。说明至少部分 WSL 日志在 GPU 错误后仍有写入；不能据此证明系统全部功能正常 |
| 19:49:39.891 | Kernel-Power 41，RecordId 1450447；BugcheckCode=307、参数 1=1、其余=0、BugcheckInfoFromEFI=true |
| 19:49:51.612 | EventLog 6008，RecordId 1450429；事件载荷声称此前异常关机为 19:40:13，早于本次实际开始采样。此字段与其他证据不一致，不能作为本次故障起点；登记时间和载荷中的历史时间分别保留 |
| 19:50:25–19:50:44 | journal 可见一次短 WSL boot |
| 19:57:00 后 | 当前 WSL 启动；journal 提示旧日志未正常关闭/损坏并替换；模型服务未恢复 |

宿主黑屏、风扇高速、重置快捷键无效和强制关机为持有人现场报告；日志可支持 GPU 驱动异常和非正常关闭，不能重建风扇转速或按键执行情况。

## 4. 最后执行阶段与异常检查

核心日志：`/home/chen/ai-services/comfyui/logs/server-r1-guardfix.log`，8,640 字节，SHA-256：

`8efa96a424c3deb27f87c7dcd9b4900a98978452dca8b77de8a86d35b8004402`

关键摘录：

```text
Requested to load WanVAE
loaded completely; ... 1344.09 MB loaded, full load: True
CLIP/text encoder model load device: cpu, ... current: cpu, dtype: torch.float16
Requested to load WAN22
loaded completely; 40336.04 MB usable, 9536.40 MB loaded, full load: True
55% ... 11/20 [00:36<00:30, 3.41s/it]
```

工作流证据：`orchestrator/output/day9-vp004a/g2/workflow.api.json` 与 `generation-config.json`。576×1024、97 帧、24 fps、20 steps、seed 42、cfg 5、uni_pc/simple；预定约 4.04 秒视频。节点 3 是 KSampler，之后才是节点 8 VAEDecodeTiled、57 CreateVideo、58 SaveVideo。没有证据表明后面三个节点已执行。

`attempt-state.json` 至今停留于 `running`，是断电前最后持久化状态，**不代表重启后任务还活着**。服务 `output/`、`temp/` 均无文件，仓库没有对应 MP4、`inference-result.json` 或成功调用结果。

最新推理日志没有 Python traceback、CUDA OOM、illegal memory access、device-side assert 或正常结束信息。**没有记录异常不等于没有底层错误**：驱动/宿主失去响应或强制关机可能阻断 Python 异常落盘。

启动出现 cu130 警告。固定源码 `comfy/quant_ops.py:24–28` 在 runtime<13 时禁用 comfy-kitchen CUDA 优化后端并警告；实际日志显示 CUDA 与 Triton 后端 disabled、eager 可用、使用 PyTorch attention。它是已知环境兼容线索，不能从警告推导“cu128 导致本次黑屏”，本轮不升级任何组件。事故前 `pip check` 无依赖冲突也不能证明 GPU 运行稳定。

## 5. Windows 与 WSL 日志关联及新线索

通过只读 `Get-WinEvent` 核对原始 System 记录及 XML，确认了 Event 14、153 的数量、时间和数据。Event 14 数据为 `\Device\000000ae` 及原始十六进制串；Event 153 包含 GPUID 100。**Windows 事件 ID 14/153 不等同于 NVIDIA Linux Xid 14/153，GPUID 100 也不能当作 Xid 100。** 未取得可支持“GPU fallen off bus/Xid 79”的原始记录，不能如此定性。

Kernel-Power 41 XML 的关键部分：

```text
BugcheckCode=307 (0x133)
BugcheckParameter1=0x1
BugcheckParameter2=0x0; Parameter3=0x0; Parameter4=0x0
BugcheckInfoFromEFI=true
WHEABootErrorCount=0
```

微软将 0x133 定义为 DPC_WATCHDOG_VIOLATION；参数 1 为 1 对应累计在 DISPATCH_LEVEL 或以上耗时过久。该解释仅说明代码语义，不定位具体驱动；本记录 EFI 来源及参数不完整，仍需验证是否属于本次事故。[微软 0x133 文档](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x133-dpc-watchdog-violation)

19:40–20:00 未查到 System BugCheck 1001/Display 4101；19:40–19:52 未查到 WHEA-Logger。可见的 Minidump 最新为 2026-09-13，未见事故当日转储或可见的 MEMORY.DMP/LiveKernelReports 文件。部分目录查询使用了 SilentlyContinue，故“未见”包含权限或未生成的可能，不能断言全盘没有转储。没有转储栈，无法归责 `nvlddmkm.sys` 或其他模块。

WSL `journalctl --list-boots` 能读取事故前 boot（本次索引 -2）；其用户日志延续至 19:45:14。但对该 boot 的 `journalctl -k -b -2` 返回 0 行，事故窗口未查到 OOM/进程被杀/GPU panic 信息。这里是**旧内核证据缺失**，不是证明没有 OOM。当前 `dmesg` 主要属于 19:57 后启动，其中 dxg ioctl -22/-2、journal 非正常关闭提示均发生在重启后，不能移作 19:43 的根因证据。

Kernel-Power 41 本身记录非正常关闭，不能独立证明电源故障。[微软 Event 41 说明](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/event-id-41-restart)

## 6. 模型资产完整性

本轮仅以 CPU 顺序读取文件重新计算完整 SHA-256，没有加载模型、修改文件或重新下载。三个文件的大小及哈希均与既有批准记录一致。

| 资产与现有路径 | 字节数 | 本轮 SHA-256（匹配） |
|---|---:|---|
| `/home/chen/ai-models-data/wan/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors` | 9,999,658,848 | `456f901338bd9eadbded3828b819109a9b68e8a525ca5cf8d0049a69fcfeca1e` |
| `/home/chen/ai-models-data/wan/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors` | 6,735,906,897 | `c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68` |
| `/home/chen/comfyui-models/Wan2.2-TI2V-5B/split_files/vae/wan2.2_vae.safetensors` | 1,409,400,960 | `e40321bd36b9709991dae2530eb4ac303dd168276980d3e9bc4b6e2b75fed156` |

前两项固定来源 `Comfy-Org/Wan-2.2`、revision `c4f60d30c55a624e35427060fdd217579a6c1d77`。记录见服务 `downloaded-assets.json` 及仓库 `g2-r1/downloaded-assets.json`、`range-events.jsonl`。现有证据不支持“下载未完成/断点续传拼坏文件”方向；磁盘文件正确不能排除运行时显存错误。

## 7. GPU 保护机制是否生效

实现位置：`/home/chen/ai-services/comfyui/serve.py:35` 起的 acquire、`:62` 起的 guarded_execute；既有 GPT-SoVITS/IndexTTS2 也引用 `/home/chen/ai-services/gpu.lock`。

| 保护 | 实际证据与局限 |
|---|---|
| 跨服务互斥 flock | `g2-r1/gpu-lock-during-inference.json` 记录 `exclusiveLockObservedHeld=true`、同一 promptId；可以确认观测时锁确实被持有。只约束合作进程，不能阻止 Windows 图形桌面、其他不使用该锁的程序 |
| 启动门槛 | 执行前 free≥28,672 MiB、温度<85°C、利用率≤15%。持久化 gpuBefore：used 13,418 MiB、free 35,201 MiB、33°C、11%，满足门槛 |
| 已有模型常驻 | 推理前 TTS 健康记录显示两服务 ready、共用锁；约 13 GiB GPU 已占用。互斥并不清空其他服务常驻权重，也没有证据表明当时有第二个大模型同时采样 |
| 运行监控 | 后台线程等待 0.5 秒后调用 nvidia-smi（单次最多等 10 秒），free<1,536 MiB 或温度≥85°C/监控异常时请求中断。实际间隔不保证严格 0.5 秒 |
| 中断能力 | `nodes.interrupt_processing(True)` 是应用协作中断；不能保证立即停止正在执行的 CUDA kernel，更不能修复宿主驱动失联或硬件故障 |
| 显存预留 | 启动有 `--reserve-vram 4`，属于框架内存规划提示，不是宿主级显存硬隔离 |
| 遥测持久化缺口 | samples、guardBreaches 仅存在进程内存，待 old_execute 返回后才写 inference-result。此次该文件缺失，因此无法确认监控线程后续是否顺利采样、是否越界或曾请求中断；也无事故峰值显存/温度/功耗 |
| 覆盖盲区 | 当前只看空闲显存、核心温度和利用率；没有 hotspot/显存温度、板卡功耗瞬态、供电/PCIe 错误等数据；不能作为硬件安全保证 |

因此结论为：**互斥和启动检查有实际生效证据；运行中保护效果无法完整验证，且设计上不足以防止宿主级黑屏事故。** NVIDIA 同时说明 WSL 下 NVML/nvidia-smi 功能受限，不应假定具有完整宿主进程与硬件监控能力。[CUDA on WSL 官方说明](https://docs.nvidia.com/cuda/wsl-user-guide/)

## 8. 故障方向、优先级与不确定性

1. **优先：Windows GPU 驱动/WSL GPU 提交路径或与负载相关的设备失稳。** 依据是采样进行中紧接 nvlddmkm 错误、宿主黑屏和风扇变化，而不是普通应用报错。0x133 EFI 字段支持继续检查内核 DPC/ISR 路径，但还不能定位驱动，也不能断言驱动 610.88 存在某个已确认缺陷。
2. **同等需要保留：显卡/显存、VBIOS、供电或 PCIe 稳定性。** 当前 RTX 4090 报告约 48 GiB，需持有人核实具体板卡来源、是否扩容、VBIOS 配套及维修/超频历史；本轮没有硬件资料，不能直接称为改装卡，更不能判断已损坏。核心空闲温度正常不能排除负载 hotspot、显存温度或瞬态供电问题。
3. **待验证：ComfyUI/PyTorch/cu128 的特定计算或异步卸载路径。** 事故配置开启两条异步权重卸载流、pinned memory、PyTorch attention。没有算子级跟踪或转储，不能定位具体内核；不得靠升级 CUDA 或随机改采样参数代替诊断。
4. **证据不足：显存耗尽或 WSL/宿主 RAM 压力。** 没有 OOM traceback、旧内核记录或峰值遥测，故不能确认也不能彻底排除。启动时可用资源充足只证明启动时点。
5. **目前不支持：损坏下载或许可/网络导致的推理失败。** 全部文件完整校验通过，故障前已正常进入采样；网络掉线记录出现得更晚，可能是事故影响，不能认作根因。

NVIDIA 官方指出 GPU 错误可能涉及应用、驱动或硬件，单一错误值通常不能独立确定根因；本案更没有可用的标准 Xid 细分值。[NVIDIA Xid 解释](https://docs.nvidia.com/deploy/xid-errors/introduction.html)

## 9. 安全恢复建议与重新推理门槛

以下为后续建议，**本轮均未执行，不构成恢复授权**：

1. 保留本次 System 事件、关键 XML、Comfy 日志及冻结配置；核实 Windows dump/错误报告是否因权限不可见，优先分析已有转储，不先重现故障。重点核对 0x133 EFI 信息是否属于此次，以及是否有对应 `!analyze -v` 栈。
2. 持有人核实板卡/显存/VBIOS 来源；由熟悉硬件者在断电安全条件下检查供电线与连接器、PSU 规格、PCIe 接触和任何超频/降压设置。是否需要硬件维修或驱动变更另行裁定，本轮不作操作。
3. 若要恢复实验，先单独批准最小保护修正：遥测逐次持久化并带墙钟时间、记录每个执行节点、监控超时和中断请求；最好包含 Windows 侧温度/功耗/事件记录。不能仅等任务结束再保存。状态应显式保留“异常中断待人工处理”，不得重置次数自动重试。
4. 在变更前明确与其他服务的协作方案。GPU 锁不能卸载常驻权重，任何涉及暂停/卸载其他公共服务都需确认影响与授权。保护应拒绝监控不可用、资源不足或故障后未解锁的实验状态。
5. 有足够宿主/硬件排查依据、监控与退出方案并获持有人新授权后，才设计一次受控恢复实验。降低帧数/分辨率可减少负载，但不证明已排除硬件或驱动故障；不能把本次失败简单当作“调小参数即可”。

| 重新推理前提 | 当前状态 |
|---|---|
| 模型文件完整、固定版本可追溯 | 满足 |
| 宿主设备可进行空闲查询 | 满足，不能替代负载验证 |
| 事故根因/风险已有足够排查依据 | 未满足 |
| 0x133 与转储、板卡规格及供电情况核实 | 未完成 |
| 崩溃前遥测可持久化、保护覆盖缺口处理 | 未满足 |
| 持有人事故后重新推理授权 | 尚无；本任务明确禁止 |

## 10. 证据索引及实际检查命令

主要本地证据：

- `/home/chen/ai-services/comfyui/logs/server-r1-guardfix.log`：唯一真实采样尾部。
- 同目录 `server-r1.log`：此前保护层拒绝的历史启动日志；`pip-check-r1.txt`、`import-check-r1.json`、`cuda-validation-r1.json`：事故前环境验证。
- `/home/chen/ai-services/comfyui/attempt-state.json`、`launch-r1-guardfix.json`、`serve.py`、`requirements.lock.txt`、`downloaded-assets.json`。
- `orchestrator/output/day9-vp004a/g2/call-started-r1.json`、`workflow.api.json`、`generation-config.json`。
- `orchestrator/output/day9-vp004a/g2-r1/gpu-lock-during-inference.json`、`health-before-actual-inference.json`、`other-services-before-inference.json`、`range-events.jsonl`、`numeric-serialization-fix-proof.json`、`guard-rejection-history.json`。
- Windows System 原始记录号 1450260、1450261–1450414、1450447、1450429；WSL journal boot ID `4154fd1c6e4f4dea86b59982d67bec5c`，当前为 `7b2625d27449452facc4c37ad4172b94`。

实际只读检查包括：

```bash
pwd
git status --short
git rev-parse HEAD
uname -a
cat /etc/os-release
printenv WSL_DISTRO_NAME
date -Is
uptime -s
ss -ltnp
journalctl --list-boots --no-pager
journalctl -b -2 --since '2026-10-27 19:35:00' --until '2026-10-27 19:50:00' --no-pager -q
journalctl -k -b -2 --since '2026-10-27 19:30:00' --no-pager -q
dmesg -T
nvidia-smi --query-gpu=name,uuid,pci.bus_id,driver_version,memory.total,memory.used,temperature.gpu,power.draw,utilization.gpu --format=csv
nvidia-smi --query-gpu=name,driver_version,vbios_version,pci.device_id,memory.total,pstate --format=csv
git -C /home/chen/ai-models/ComfyUI rev-parse HEAD
git -C /home/chen/ai-models/ComfyUI status --short
```

另用 Python `-B` 的 pathlib/json/hashlib 读取记录、归一化日志回车并计算三个完整文件 SHA-256；不导入 torch、不执行 CUDA。Windows PowerShell `-NoProfile -NonInteractive` 通过 `Get-WinEvent -FilterHashtable` 限定日期与 System 日志，分组计数并调用 `ToXml()`；`Get-Item/Get-ChildItem` 仅检查转储文件元数据。原始系统日志可能包含其他服务连接信息，本报告不复制与事故无关的连接参数或凭据。

**完成状态：只读诊断及报告完成；Wan 未恢复、首镜未生成。等待持有人评审事故报告和后续排查裁定。**
