# GPU-INCIDENT-002｜GPU 驱动、硬件与 WSL 稳定性调查

日期：2026-10-27；本轮检查约 20:05 起，时间均为北京时间。范围：只读设备、配置、日志、既有部署记录和官方资料；唯一新增文件为本报告。不启动模型服务或 GPU 计算，不调整驱动、内核、BIOS、功耗、频率、TDR 注册表或文件权限，不改变 VideoPipeline 代码。

## 1. 结论

**仍不具备恢复 Wan 推理的条件，暂不建议进入 GPU 负载验证。** 可继续进行现存证据的只读分析；任何后续计算验证须另获持有人批准。

本轮新增四项重要事实：

1. 本次第一条 nvlddmkm Event 153 的原始数据为 `UCodeReset TDR occurred on GPUID:100`。因此有明确的驱动 TDR 报告，而不只是笼统的 GPU 错误。TDR 是故障机制线索，尚不能定位触发根因。
2. 固定 ComfyUI 提交的 README 明确要求 RTX 20 系及以后使用 cu130 或以上；实际环境为 PyTorch cu128。**应用文档要求与部署不符已证实**，但不能直接归因为本次黑屏。
3. WSL 安装版本为 2.7.12.0，默认内核包报告 6.18.33.2-2；`.wslconfig` 明确指定自定义内核与模块，实际运行的是 6.6.114.1。这是需要单独审查的配置变量，尚未证实有缺陷。
4. 重启后的 WER 141/蓝屏记录引用 7–9 月历史转储；不能把上报时间当成新的故障时间。这些记录证明存在历史故障报告，但不能证明都由同一张 GPU、同一驱动或相同硬件引起。

约 48 GiB 的报告显存与官方 RTX 4090 的 24GB 产品规格不符，是异常规格线索；**改装显存版本尚不能通过现有软件信息最终证实，显存损坏也未证实。**

## 2. 驱动与设备事实

### 2.1 实际查询结果

证据：本轮只读 `nvidia-smi -q`、Windows `Get-CimInstance Win32_VideoController/Win32_PnPSignedDriver`。以下为查询快照，不代表事故发生时状态。

| 项目 | 结果 |
|---|---|
| GPU | NVIDIA GeForce RTX 4090，Ada Lovelace |
| UUID | `GPU-a7eafd6f-d8c7-9243-8895-a332d61e4e4f` |
| PCI 地址 / ID | `00000000:01:00.0` / `0x268410DE`；Subsystem `0x16F310DE` |
| Windows PNP | `PCI\VEN_10DE&DEV_2684&SUBSYS_16F310DE&REV_A1\4&1BABDF5B&0&0009` |
| GPU Part Number / VBIOS | `2684-301-A1` / `95.02.3c.00.02` |
| 驱动 | NVIDIA 610.88；Windows `32.0.16.1088`，INF `oem34.inf` |
| 签名 | `IsSigned=true`，Microsoft Windows Hardware Compatibility Publisher；驱动签名不能证明 VBIOS/物理显卡未经修改 |
| 驱动日期 | CIM 返回时间戳 `1784678400000`（UTC 2026-07-22）；驱动文件日期与官方发布日属于不同字段 |
| 驱动模式 / 显示 | WDDM；Display Attached=Yes，Display Active=Enabled。计算和宿主显示共享该设备 |
| 显存 | Total 49,140 MiB，Reserved 522 MiB，Used 2,176 MiB，Free 46,443 MiB |
| PCIe | 最大 Gen4 x16，当前 Gen4 x8；Host Max Gen5；Replays Since Reset=0 |
| 功耗限制 | Current/Requested/Default=450W；可报告范围 150–450W；未修改 |
| 空闲功耗 / P-state | 平均 22.65W、瞬时 22.86W；P8 |
| 当前频率 | Graphics/SM 210MHz，Memory 405MHz，Video 1185MHz |
| 报告最高频率 | Graphics/SM 3105MHz、Memory 10501MHz；只是 NVML 上限字段，不代表实际负载频率或超频设置已确认 |
| 核心温度 / 风扇 | 33°C / 47%；显存温度 N/A，热点温度未取得 |
| 降频与恢复 | 当前 HW/SW Thermal、HW Power Brake、SW Power Cap 未激活；GPU Recovery Action=None |
| ECC / 页退役 | ECC Disabled，错误计数及退休页主要为 N/A；不能当作零错误证明 |
| 重映射 | 当前报告 Correctable/Uncorrectable=0、Pending=No；不足以验证全部显存稳定性 |
| 进程查询 | nvidia-smi 显示 None；WSL 查询能力有限，不能据此声称 Windows 没有 GPU 用户 |

PCIe x8 可以来自主板通道分配、槽位或其他配置；重启后 replay=0 不还原事故前链路状态。这两项均不构成 PCIe 故障结论。

同机还存在 AMD Radeon(TM) Graphics，驱动 `32.0.21042.62`、INF `oem31.inf`，签名有效、状态 OK。双显卡存在已证实，但没有证据表明其参与了本次故障。

Windows `Win32_VideoController.AdapterRAM` 对 NVIDIA 返回 4,293,918,720 字节，不能拿它反驳 NVML 的约 48 GiB：该属性为 uint32，无法表达超过 4 GiB 的显存容量。[微软属性定义](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-videocontroller)

### 2.2 是否改装显存

NVIDIA 官方 RTX 4090 标准配置为 24GB GDDR6X；本机报告约两倍容量。**已证实的是“与官方标准规格不同”，而不是具体改装手法、颗粒型号或故障状态。** 设备名称、PCI ID、VBIOS 字符串都不是物理改装证明；本轮也未进行全容量寻址/校验测试。需要持有人提供购买规格、商家扩容说明、维修记录、已知稳定配置和 VBIOS 来源。[NVIDIA RTX 4090 官方规格](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/)

## 3. Windows 故障证据

### 3.1 本次事故：原始事件核对

| 时间 | 证据 |
|---|---|
| 19:43:24.854 | Comfy 日志最后 mtime；采样 11/20，见 INCIDENT-001。普通日志没有每步墙钟时间 |
| 19:43:27.831198 | System nvlddmkm Event 14，RecordId 1450260 |
| 19:43:27.831723 | 第一条 Event 153，RecordId 1450261：`UCodeReset TDR occurred on GPUID:100` |
| 至 19:44:40.551641 | Event 153 共 126 条，最后 RecordId 1450414：`Error occurred on GPUID: 100` |
| 19:49:39.891 | Kernel-Power 41，RecordId 1450447；EFI BugcheckCode=307 |
| 19:49:51.612 | EventLog 6008，RecordId 1450429；载荷中的 19:40:13 与采样开始时间不一致，不采用为故障起点 |

Event 14 的 EventData：

```text
\Device\000000ae
024c1547 00000000 00000000 202c0530 202f3166 00000000 00000000 00000000
Binary: 0000000002003000000000000E00AAC0000000000000000000000000000000000000000000000000
```

第一条 Event 153 的 EventData：

```text
\Device\000000ae
UCodeReset TDR occurred on GPUID:100
Binary: 00000000020030000000000099000000000000000000000000000000000000000000000000000000
```

Event ID 153、GPUID 100 不等于 Linux Xid 153/100；不能把未知十六进制数据自行翻译为显存错误、掉卡或供电故障。没有获得 Xid 79 证据。

微软对 TDR 的定义是检测 GPU 超时并尝试复位恢复。本次“驱动报告 TDR”已证实，“成功恢复”没有证实；持有人报告最终强制关机。[微软 TDR 说明](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)

**不能把每步约 3.41 秒与默认 TDR 约 2 秒直接比较并认定原因。** 采样一步包含多个 CPU/GPU 操作与调度；TDR 关注实际 GPU 任务/抢占超时，不是 Python 一次迭代的总墙钟时长。

### 3.2 本次与历史 WER 严格分开

本轮查询 Application 日志的 1001（Windows Error Reporting），补充了 INCIDENT-001 的 System 查询范围：19:40–20:00 共 53 条：

- 20 条 LiveKernelEvent 141、2 条 193。
- 30 条 BlueScreen，涉及 0x9f、0xd1、0x116、0x50、0x34、0x7e、0x19、0xa、0x139、0x3b。
- 1 条 VS Code 相关 MoAppHang。

其中 52 条内核/蓝屏报告分两批在约 19:50 和 19:52 上报，引用相同的 26 组旧报告/转储；**不是本轮新增 52 次内核事故**。具体例子：

| 上报记录 | 内容 | 引用对象 | 归类 |
|---|---|---|---|
| Application 34472 / 34517 | LiveKernelEvent 141 | `WATCHDOG-20260707-2135.dmp` | 历史 7 月线索 |
| 34496 / 34540 | LiveKernelEvent 141 | `WATCHDOG-20260905-1242.dmp` | 历史 9 月线索 |
| 34489 / 34533 | BlueScreen 116 | `082626-16453-01.dmp` | 历史 8 月；文件仍存在 |
| 34498 / 34542 | BlueScreen 9f | `091326-14203-01.dmp` | 历史 9 月；文件仍存在 |

这些历史报告使“机器在本次 Wan 前已有内核/图形异常历史”值得进一步查证；没有分析转储调用栈，不能归因同一 GPU、驱动版本或 WSL。当前驱动发布时间也不能代替每次事故时实际装载版本。

System 日志最早保留到 2026-10-27 00:03:39，RecordId 1423438；在这个保留窗口内，19:40 前 nvlddmkm 查询返回 0 条。**不是“机器过去没有 NVIDIA 错误”**，更早记录已不在当前 System 查询覆盖范围。

### 3.3 WHEA、可靠性、转储与权限

| 来源 | 本轮结果与边界 |
|---|---|
| System WHEA-Logger | 19:40–20:00 查询 0 条；不能排除硬件故障 |
| System BugCheck 1001 / Display 4101 | 此时段未见对应记录；不能否认已存在的 Event 153 TDR |
| Kernel-Power 41 XML | `BugcheckCode=307(0x133)`、P1=1、P2/P3/P4=0、`BugcheckInfoFromEFI=true`、`WHEABootErrorCount=0`；仍无本次配套转储确认 |
| `C:\Windows\MEMORY.DMP` | Get-Item 明确返回路径不存在 |
| `C:\Windows\Minidump` | 可读，共 5 个，日期 8/22、8/26、8/27、9/9、9/13；最新 9/13 12:50:36，无 10/27 文件 |
| `C:\Windows\LiveKernelReports` | 访问被拒绝；无法据此声称目录为空或没有本次转储 |
| WER ReportQueue | 顶层可列出 26 个 Kernel 目录（含 10 个 Kernel_141、1 个 Kernel_116、1 个 Kernel_193）；递归读取子目录访问被拒绝，报告正文未取得 |
| WER ReportArchive | 顶层未见 Kernel 类目录；递归读取某 AppCrash 子目录被拒绝。仅说明当前访问范围 |
| ReliabilityRecords | 事故窗口可见 19:49:51 EventLog 6008 和 19:57:53 Application Hang；未从该查询取得本次 117/141 记录 |

读取 CrashControl 注册表现有值：`CrashDumpEnabled=3`（小转储）、`LogEvent=1`、`AutoReboot=1`，MinidumpDir=`C:\WINDOWS\Minidump`。配置启用不保证硬锁死/断电能产生转储。本轮不修改配置，也不对权限受限目录采取提权读取、改 ACL 或复制转储措施。

读取 GraphicsDrivers 项：`TdrDelay/TdrDdiDelay/TdrLevel/HwSchMode` 未见显式值。不能由此断言所有策略默认，也不能判定硬件调度最终状态。本轮不建议以延长/禁用 TDR 作为修复结论。

## 4. WSL / CUDA / ComfyUI 兼容性

### 4.1 实际版本与链路

| 层级 | 实际情况 |
|---|---|
| 宿主 Windows | Windows 11 专业版，`10.0.26200.9711`；CIM build 26200 |
| Windows 驱动能力 | nvidia-smi：KMD 610.88，CUDA UMD 13.3；不是证明 venv 已安装 CUDA 13.3 runtime |
| WSL 应用 | `wsl.exe --version`：2.7.12.0；WSLg 1.0.73.2；所报告内核包 6.18.33.2-2 |
| 实际内核 | `uname -a`：6.6.114.1-microsoft-standard-WSL2；Ubuntu 24.04.4 LTS，发行版名 Ubuntu |
| 显式内核覆盖 | `%USERPROFILE%\.wslconfig`：`kernel=C:\\Users\\admin\\wsl-kernels\\kernel-6.6.114.1-x64`，`kernelModules=C:\\Users\\admin\\wsl-kernels\\modules-6.6.114.1.vhd` |
| 发行版状态 | Ubuntu 正在运行；Ubuntu-24.04 与 docker-desktop 停止，本轮未启动它们 |
| GPU 映射 | 既有 `/usr/lib/wsl/lib/libcuda.so*`，通过 Windows GPU 计算链路；没有为排查另装 Linux NVIDIA 驱动 |
| PyTorch | 2.8.0+cu128；torchvision 0.23.0+cu128；torchaudio 2.8.0+cu128 |
| ComfyUI | 0.43.0，源码 `426f5eea52a7ece1dd599fff4cb6cd1f352ddd24` |
| 运行实现 | PyTorch attention、两条异步权重卸载流、pinned memory；CUDA/Triton 优化后端禁用、eager 后端可用 |

`.wslconfig` 的 kernel/kernelModules 是微软支持的全局覆盖项。当前版本差异有配置依据，不是仅凭版本号推断系统混乱；但自定义文件来源、构建配置、为何固定旧内核、是否曾为其他项目解决问题均未知。不能直接删除覆盖或更换内核，且它影响全部 WSL2 发行版。[微软 WSL 配置说明](https://learn.microsoft.com/en-us/windows/wsl/wsl-config)

### 4.2 官方兼容性核对

1. **Windows/WSL GPU 基础支持：满足一般平台条件。** NVIDIA 指南列出 R495+ Windows 驱动支持 WSL2，使用宿主驱动映射，不应在 WSL 另装 Linux 显示驱动。WSL 的 pinned memory 与 NVML 功能有限；现有程序日志的 pinned memory 启用值不等于保证可实际锁定全部所报内存。[NVIDIA WSL 指南](https://docs.nvidia.com/cuda/wsl-user-guide/)
2. **CUDA runtime 与驱动版本：没有证据显示驱动太旧。** CUDA 12.8 GA 对应 Windows 驱动表为 ≥570.65；610.88 高于该版本，驱动对旧 CUDA 应用具备向后兼容机制。这只能说明版本门槛，不认证具体内核/硬件稳定性。[CUDA 12.8 官方发布说明](https://docs.nvidia.com/cuda/archive/12.8.0/cuda-toolkit-release-notes/index.html)
3. **PyTorch 组合：属于官方提供组合。** PyTorch 官方列出 2.8.0 / torchvision 0.23.0 / torchaudio 2.8.0 的 cu128 wheel，现有三件套版本相配。事故前 pip check 和 CUDA 初始化通过，本轮只读取记录，不重新执行 CUDA。[PyTorch 官方版本表](https://pytorch.org/get-started/previous-versions/)
4. **ComfyUI 应用要求：存在明确偏差。** 本地固定提交 `README.md:197` 原文包含：`Using a cu130 or above version of pytorch is required on Nvidia 20 series and above.` 当前 RTX 4090/cu128 不符合这条要求。`comfy/quant_ops.py:24–28` 同时会在 CUDA<13 时关闭 CUDA 优化后端并警告。能进入采样只证明部分路径可运行，不等于完整满足应用要求。

第四项是对 INCIDENT-001 的补充：先前只说明了优化后端禁用，本轮已核实固定 README 的更强要求。未修改旧报告、环境或服务。是否升级独立环境、改用其他固定 ComfyUI 版本或保持当前环境做诊断，应先形成有版本依据的最小方案，另行批准；本轮不作选择或安装。

### 4.3 驱动 610.88 已知问题核查

直接读取 NVIDIA 官方 GeForce 610.88 PDF（仅在内存解析，无安装/模型下载）：

- URL：<https://us.download.nvidia.com/Windows/610.88/610.88-win11-win10-release-notes.pdf>
- 文档：`RN-08399-610.88_v01`，37 页，618,493 字节。
- PDF SHA-256：`4a1015872edb7dc72b7ae23d10da4f84a4500f65a21ee6c99884e55c8d9b924d`。
- 第 15 页列出的开放问题是“Prefer Maximum Performance”模式可能未正确应用，编号 6007998。该问题不直接等同于本次 TDR/黑屏；文档未找到 WSL 字样或明确的本机 Wan 复现说明。[官方发布说明](https://us.download.nvidia.com/Windows/610.88/610.88-win11-win10-release-notes.pdf)

同号 Data Center 610.88 发布说明列出 OpenCL、Blackwell TMA、Hopper VBIOS 等问题，产品/API/系统适用范围与本机 Ada/WDDM CUDA 工作负载不同，不能套用为根因。[Data Center 发布说明](https://docs.nvidia.com/datacenter/tesla/tesla-release-notes-610-57-04/index.html)

NVIDIA 开发者论坛有用户对 610.88、Windows build 26200、RTX 3050 Laptop 持续 GPU 负载下 0x133 的原始报告，也注明此前驱动存在同样问题。这是第一手用户报告，**不是 NVIDIA 工程团队确认的通用缺陷，更不是本机证据**；显卡、执行环境和转储均不同，不足以确定回滚版本。[原始用户报告](https://forums.developer.nvidia.com/t/bug-rtx-3050-laptop-recurring-nvlddmkm-sys-dpc-watchdog-violation-0x133-under-sustained-gpu-load-4-crashes-driver-610-88/380559)

结论：发现相似报告与已知开放问题，但没有查到足以证明“610.88 的某项已确认缺陷就是本次根因”的官方材料。没有推荐未经验证的驱动升降级。

## 5. 硬件风险分析

“已证实”描述可观察事实；“有迹象”描述调查方向；“尚无证据”不等于排除故障。

| 方向 | 已证实 | 有迹象/需关注 | 尚无证据或不可确认 |
|---|---|---|---|
| 显存稳定性 | 报告容量与官方标准不同；ECC 错误信息不可用 | 非标准容量、未知 VBIOS/颗粒匹配，应优先核实来源与既有全容量验收 | 未证明显存损坏、越界、位错误或某个容量阈值触发；未做压力/容量测试 |
| GPU 供电 | 默认及当前功耗限制均为 450W；事故时风扇高速为持有人观察 | 负载时黑屏属于需考虑供电的症状之一，但不具专属性 | 无 PSU 型号、接线、事故功耗或电压瞬态记录；未证实接头/电源故障 |
| 温度散热 | 当前核心 33°C，约 23W，未显示当前热降频 | 显存/热点不可读，事故前遥测丢失；高速风扇也可能是故障后的保护表现 | 无过热证据，不能由空闲正常排除负载温度异常 |
| PCIe | 当前 Gen4 x8，重启以来 replay=0 | 需核实主板通道分配与历史设备错误 | 未证实链路掉线；无 Xid 79/WHEA 支持本次掉卡 |
| 驱动兼容性 | 610.88 签名有效、设备 OK；本次明确报告 TDR | 同 GPU 同时承担 WDDM 显示；存在相似用户报告 | 未证明特定版本缺陷，未获得本次故障栈 |
| WSL 计算链路 | 显式自定义内核/模块；cu128 与固定 ComfyUI 要求不符 | 异步卸载/pinned memory 路径及内核来源应审查 | 未证明 dxg/内核缺陷或 pinned-memory 耗尽 |

本次日志仍不足以把任何单项硬件风险标为“故障已证实”。模型文件哈希已在 INCIDENT-001 重启后核实，本轮复用该完整校验结果，不再重复读取全部大文件。

## 6. 仍无法确认的问题

1. 显卡是否扩容、扩容方式、显存颗粒与 VBIOS 配套、销售/维修来源；PSU 规格与连接方式、既有超频或降压设置。
2. 本次 TDR 的具体触发驱动栈、GPU 引擎/算子、是否存在硬件先行故障；日志原始代码没有公开解码依据。
3. EFI 0x133 是否属于本次，而非缺失上下文的历史值；没有本次配套 dump，不能仅凭该字段归责 nvlddmkm。
4. 权限受限的 LiveKernelReports/WER 子目录是否藏有当日有效报告；本轮明确记录 Access Denied，没有把它当成“没有文件”。
5. 历史 141/116、其他蓝屏是否同因；现存 5 个 Minidump 未做符号栈分析，历史报告也没有事故时设备/驱动快照。
6. 自定义 WSL 内核与模块的来源、启用理由、构建和验证记录，及它与当前 WSL 2.7.12 的组合稳定性。
7. 事故前显存峰值、核心/热点/显存温度、功耗/频率、Windows GPU 进程负载。已有协作 GPU 锁不覆盖 Windows 桌面或不遵守锁的程序。

## 7. 安全恢复前置条件与下一阶段裁定建议

| 前置事项 | 当前判断 |
|---|---|
| 保留原始证据，完成只读事实调查 | 本轮完成；文件与配置未更动 |
| 在允许的 Windows 管理员会话读取受限 WER/LiveKernelReports，优先分析既有转储 | 待另行安排；不要求重现故障，不改权限 |
| 确认显卡 48GB 规格来源、VBIOS 与供电资料 | 未完成；由持有人/供应商提供现有资料，当前不拆机 |
| 评审自定义内核启用理由及影响其他项目的范围 | 未完成；不得直接删除配置或切换内核 |
| 解决或明确接受 ComfyUI/cu128 配置偏差，固定后续实验版本 | 未完成；先给出最小变更方案与回退记录，再申请授权 |
| 事故前遥测逐条持久化，记录节点、墙钟时间、GPU 快照与监控失败 | 未实现；需单独批准最小服务保护修改，不能在本轮写业务/服务代码 |
| 宿主显示与计算资源影响、人工可观察性和停止路径已明确 | 未完成；应用中断不能保证恢复失联驱动 |
| 持有人批准下一阶段受控计算验证 | 尚无；本轮仅只读 |

建议下阶段先做**受限证据读取与配置评审**，不要直接恢复原 Wan 请求或以更小帧数代替根因排查。未来若批准计算验证，应分离变量、逐阶段、每阶段人工检查，禁止自动重试；监控不可用、出现新 GPU 错误或设备状态异常时停止。降低功耗/改频率/改 TDR/改内核/换驱动均是独立变更，不在本次授权内，也不应捆绑实施后宣称已定位根因。

**当前裁定建议：只读证据阶段可以继续；GPU 负载验证暂不放行。完成上述前置评审并获得持有人明确授权后，再制定一次受控验证施工单。本报告没有执行或授权任何推理。**

## 8. 本轮取证方法与复用来源

复用 `docs/reports/GPU-INCIDENT-001.md`、`/home/chen/ai-services/comfyui/logs/cuda-validation-r1.json`、`requirements.lock.txt`、既有 workflow/attempt-state 与完整性记录；读取固定程序 README/版本及 Git HEAD，不导入 torch、不调用 CUDA。

主要只读命令/查询：

```text
nvidia-smi -q
uname -a
git status --short
git -C /home/chen/ai-models/ComfyUI show HEAD:README.md
git -C /home/chen/ai-models/ComfyUI describe --tags --always
cat /home/chen/ai-models/ComfyUI/comfyui_version.py
cat /etc/wsl.conf
ls -l /usr/lib/wsl/lib/libcuda.so*
ss -ltnp
Get-CimInstance Win32_OperatingSystem
Get-CimInstance Win32_VideoController
Get-CimInstance Win32_PnPSignedDriver
wsl.exe --version
wsl.exe --list --verbose
Get-Content $env:USERPROFILE\.wslconfig
Get-WinEvent -FilterHashtable ...（System/Application、事故窗口、指定事件）
Get-WinEvent -LogName System -Oldest -MaxEvents 1
Get-CimInstance Win32_ReliabilityRecords
Get-Item / Get-ChildItem（转储及 WER 元数据）
Get-ItemProperty（CrashControl、GraphicsDrivers；仅读）
```

Windows 查询使用 PowerShell `-NoProfile -NonInteractive`，未调用修复、服务控制或注册表写操作。使用已有 Python pypdf 在内存读取官方发布说明；首次尝试 pdftotext 时命令不存在，随后复用已有 pypdf，没有安装工具或写入 PDF。没有复制私人数据、转储或模型到 Git，没有提交/推送。
