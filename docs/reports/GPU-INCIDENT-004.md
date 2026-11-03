# GPU-INCIDENT-004｜480×832 Wan2.1试验黑屏、重启及Qwen历史对照

日期：2026-10-29。**结论：再次出现真实CUDA异常并由持有人确认黑屏、重启；视频生成继续STOP，根因未定。** 本次只读取证，没有CUDA初始化、GPU查询/测试、模型加载、环境安装、CPU导入检查或任务恢复。

## 1. 先行归档与当前状态

证据根目录：`orchestrator/output/gpu-incident-004/20261029T075016Z-d5fa6c0df2/`。

先归档事故run、Windows独立记录器原文件、全局STOP和次数账本，再作后续查询：`initial-scene.tar`，399360字节，SHA-256 `2302f1cae2f65a6cbdd2126d463a4e58fce7db2c8fa7a01eba2cce466538ed2a`。53项来源文件末次校验未变，原状态/原错误不覆写。

主仓库`/home/chen/work/video-pipeline`，main/HEAD `cc562624f8d36cf06fde9e373e72e5451e973ce1`，本地origin/main无领先落后，未fetch、不声称服务器最新。原.gitignore/PROGRESS未提交修改及恢复报告/工具保留，本轮不提交推送。最新持有人长期与项目指令已纳入本次范围；事故读取证据不构成恢复授权。

## 2. 最后一次实际运行：不是官方原样基线

runId **`20261029T073531Z-c17945661b35`**，事故目录：

`orchestrator/output/local-video-recovery-20261029/stage-b/20261029T073531Z-c17945661b35/`

| 项目 | 真实配置/证据 |
|---|---|
| 扩散模型 | 普通Wan2.1 T2V-1.3B BF16；SHA6f999b0d…974ad5fd，非蒸馏/少步模型 |
| 模型来源 | Comfy-Org/Wan-2.1 revision123acf1cc74bccbb9bfff8ac1ee72edc08c2341d，与此前试验相同文件 |
| 实现 | Comfy commit426f5eea52a7ece1dd599fff4cb6cd1f352ddd24，独立试验venv；torch2.11.0+cu130、Python3.12.3、Triton3.6.0安装但计算后端禁用 |
| 宿主/设备历史前检 | RTX4090改装48GB；驱动610.88为本次事故前证据值，本轮没有重启后GPU/驱动探针；供电持有人报告长城黑匣子2200W，显卡转接假设未实物核验 |
| 尺寸/序列 | **480×832竖屏、17帧、16fps、batch1**，latent[1,16,5,104,60]，Transformer tokens7800 |
| 采样 | **30步、seed20261029、CFG6、shift8、uni_pc/simple、denoise1** |
| 提示词 | 上一写实正/负向原文，完整保存在sample-request.json/actual-prompts.json；无扩写、LoRA或其他风格控制 |
| 执行设备/精度 | 文本CPU，scaled FP8 UMT5/FP32激活路径；扩散CUDA BF16；计划原单次CPU FP32 Wan2.1 VAE，**本次未到VAE**；未到FFmpeg |
| 注意力/卸载 | 仅PyTorch math SDPA、kitchen eager；禁用flash/mem-efficient/cuDNN SDPA、编译、graphs、优化后端、异步/pinned，使用同步CPU卸载 |
| 门槛/时限 | 初始空闲GPU32GiB/主机80GiB，采样120秒、CPU VAE110秒、child260秒；WSL290秒/Windows300秒；75°C及运行空闲4GiB停止线不变 |

这是使用固定Comfy基础权重的**自定义受控空间分辨率对照**，不是官方generate.py原样运行、不是官方完整工作流基线、也不是硬件压力测试。480×832满足固定节点步进及patch/latent布局；改变空间形状后同seed不对应同一份噪声，且比例从4:7变成15:26，不称逐像素严格对照。

此前按math SDPA规划batch2×12头×7800²×FP32单个score约5.44GiB、三份工作区约16.32GiB，再计权重/激活/桌面，前置门槛提高到32GiB。该数为保守规划而非峰值保证；本轮没有通过换后端/降低门槛放行。固定PyTorch2.11文档及源码片段、资源计算保存在原run resource-and-shape-review.json/resource-source-evidence/，不是事后推断全显存访问安全。

启动前15项CPU门禁/精确profile测试PASS；模型完整SHA和生成child源码与上次一致。当前failed-executed-source/与事故前sample/run.json源码摘要逐项匹配。**没有新增测试复核，本次引用的是事故前记录。**

## 3. 事故时间线（北京时间UTC+8）

| 时间 | 落盘事实 |
|---|---|
| 15:36:36.916 | Windows原生独立监控PID57108启动，直接写C盘 |
| 15:36:37.858 | WSL父监控启动，PID2725367 |
| 15:36:48.689 | 新试验STOP已持久化，一次性标记先于CUDA子进程 |
| 15:36:48.703 | 模型子进程PID2725619启动，真实后端检查随后通过，文本编码/权重加载通过 |
| **15:37:56.013** | 最后模型阶段记录：**sampling_progress step23/30**；不是sampling_completed |
| 15:37:56.438 / 15:37:56.527 | WSL / Windows最后一条遥测；宿主记录recovery=None、核心57°C、显存16122MiB，但不能覆盖随后故障 |
| 15:37:56.013之后、15:38:34.229之前 | stderr已出现illegal memory access；原stderr无逐行墙钟，无法补造精确异常时间 |
| **15:38:34.229** | 助手已读取错误后追加活动异常STOP，并尝试SIGTERM只结束本次模型进程组；sent=true仅表示系统调用返回，不证明异常设备场景下进程已退出；之后未取得退出落盘 |
| **15:39:18.571** | Windows LastBootUpTime；持有人确认黑屏后重启。用于界定故障窗口，不要求用户回忆秒级时间 |
| 15:39:24.294 | Kernel-Power41，RecordId1452074；BugcheckCode=0、BugcheckInfoFromEFI=false，只确认非正常重启，不写成0x133 |
| 15:39:36.211 | EventLog6008 RecordId1452057；载荷声称上次关闭15:01:59，与实际试验/落盘不符，不能当此次黑屏起点 |
| 15:39:46.296 / 15:42:37.330 | Application WER1001，RecordId35880/35958，LiveKernelEvent/P1=141，均指同一WATCHDOG-20261029-1538.dmp，不计两起事故 |

可支持的事故窗口：最后采样/遥测**15:37:56附近至15:39:18重启前**。CUDA错误已经在15:38:34干预前观察到；黑屏精确瞬间未有独立视频或可用日志，不等同于用户按键重启时间。

**原始错误**（sample/stderr.log）：

```text
torch.AcceleratorError: CUDA error: an illegal memory access was encountered
```

上报栈位于`comfy_kitchen/backends/eager/adaln.py:14`的`normalized * (1 + scale) + shift`；原错误亦警告CUDA异步上报可能导致栈不准确。它是内存访问错误，不能改写为illegal instruction，也不能从上报行断言某一算子/驱动/显存为起因。

本次**采样未完成、最终latent未保存、VAE解码未开始、MP4未生成**。先前小配置成功与本次失败均保留；本次进程1/采样尝试1，无重试；累计B进程5/采样开始4（含最早bootstrap失败），不是5条成片。

## 4. 持久监控保留了什么、缺少什么

- WSL：75条遥测、36条模型阶段；Windows：38条原生遥测。原run.json及host-state均仍`RUNNING/endedAt=null`；没有events-after.json/正常退出，不填假成功或擅自补结束时间。
- 事故前已采样整卡峰值：**16288MiB、核心59°C、388.21W、利用率100%**，包含桌面，不能视作最后故障瞬间/模型独占峰值。未记录PyTorch完成峰值，因为没有sampling_completed/model-result；不能把规划32GiB或整卡峰值当作PyTorch实测。
- 最后一条核心温度/空闲显存没有触及75°C/4GiB停止线，**只能说明已落盘样本未越线，不证明硬件或驱动健康，也不覆盖故障瞬态**。热点、显存结温、PCIe计数UNAVAILABLE；没有填0。
- 两侧监控都保留至15:37:56附近，随后中断；原生Windows独立启动避免依赖WSL写盘，但这次事故证明它也不能保证驱动/宿主失去响应后继续落盘。不得把此前CPU模拟验证说成真实故障存活验证。
- 活动异常STOP在15:38:34已写入，仍保留；原始启动STOP/各历史迁移归档不删。没有无限等待后自动换模型继续跑。

## 5. Windows只读导出、转储限制与进程核查

Windows原生导出位置：

`C:\Users\admin\video-recovery\incident-exports\20261029T075016Z-d5fa6c0df2\`

WSL同份复制：本证据目录`windows-export-copy/`。System/Application JSON均含事件时间、Provider、ID、RecordId、消息与原始XML。查询窗口由落盘时钟确定为UTC07:35至本次采集07:51附近，不依赖用户精确回忆。

- System导出5条（启动、Kernel-Power41/172、EventLog6008/6005），该窗口未获取nvlddmkm、Display或WHEA记录。**不能写成无驱动故障**：有应用侧CUDA错误、WER141及持有人黑屏事实；宿主崩溃时事件可能未落盘。
- Application导出54条，大量指向7—9月旧转储的排队报告。只把文件名日期为20261029-1538的2条单列为本次候选；二者相同ReportId/转储引用，非独立新事故数。P2—P5为aaaaaaaa…，不据此定位驱动地址。
- `C:\Windows\LiveKernelReports`枚举拒绝；按WER给出的准确路径`WATCHDOG\WATCHDOG-20261029-1538.dmp`直接Get-Item/只读复制也Access denied。平铺备用路径不存在；MEMORY.DMP不存在；Minidump可列5个但无本次时间匹配文件。WER Queue/Archive部分子目录拒绝访问，全部错误记录在dump-export.json/targeted-dump-and-qwen-events.json。
- 本次成功复制转储0。这里是**未取得转储内容，非断言不存在转储**；未改ACL、提权、删除原件、变TDR或转储策略。若后续要分析，需要持有人/管理员在既有权限规则下导出该准确文件，不作为本轮越权动作。
- 重启后旧WSL PID2725367/2725619均不存在；按精确试验脚本参数检查WSL无该试验进程。Windows试验进程匹配0，相关计划任务action匹配0。未发现自动恢复本次任务；仅核实这些范围，不保证排除所有外部调度机制。
- 本轮没有需要结束的明确试验进程，未停止无关服务。事故前15:38:34的SIGTERM动作和本轮重启后“未停止任何进程”分别记录，不能混为一谈。

## 6. Qwen旧故障：准确原文、环境与阶段

已复用`/home/chen/qwen38-local`日志/部署实录/8月25日验收、现有HWiNFO CSV及旧事故报告。没有启动Qwen、GPU探针、包导入或复现。原日志不变；本目录qwen-evidence仅保存筛选后的错误/栈/版本与SHA，不复制凭据或请求正文。

### 6.1 2026-08-26 Qwen

源：`logs/qwen38-service-20260826-023421-20103/vllm-server.log:236`（物理换行计数，进度CR不另算行）。原文：

```text
(EngineCore pid=377) ERROR 08-26 11:30:12 [core.py:1332] torch.AcceleratorError: CUDA error: an illegal instruction was encountered
```

随后EngineDeadError为引擎死亡后果，不是另一种底层根因。服务已完成加载/编译/graph capture并处理真实请求，故障不是部署安装阶段；栈经`gpu_model_runner.py:get_output`至`torch/cuda/streams.py:synchronize`，同步处报告不能定位原始内核。

### 6.2 2026-09-05 Qwen

源：`logs/qwen38-service-20260905-043351-863470/vllm-server.log:315`。原文：

```text
(EngineCore pid=376) ERROR 09-05 12:40:53 [core.py:1332] RuntimeError: CUDA driver error: an illegal instruction was encountered
```

随后亦有`torch.AcceleratorError: CUDA error: an illegal instruction was encountered`、EngineDeadError。运行中请求执行路径经vLLM模型调用、AOT/Inductor已编译代码、Triton launcher报错；不等于已证明Triton为根因。

两份vLLM原日志仅月日/时分秒，无偏移；结合目录/既有项目时钟按北京时间列示，保留原文，不凭空补精确UTC日志。原始物理行及筛选栈保存在qwen-evidence/*service*.json。

### 6.3 环境和宿主证据的适用边界

- 两份故障日志的config均明确vLLM **0.26.0**、模型Qwen3.8-27B-FP8、quantization=fp8、dtype=torch.bfloat16、max_seq_len=65536、enforce_eager=False、Inductor及FULL_AND_PIECEWISE CUDAGraph模式。原Qwen模型revision017b9c7a…来自既有模型清单，不改Qwen资产。
- 8月25日真实验收环境记录Python3.12.3、torch **2.11.0+cu130**、CUDA build13.0、Triton3.6.0；部署实录同值。两次故障没有独立逐次freeze，准确记为“故障前已验收栈”，不把今天环境冒充每个错误瞬间快照。更早compat-gate记录cu128属于重建前，不能拿它替代已验收栈。历史Windows驱动版本未可靠取得。
- 当前System最早保留到UTC2026-10-26 16:52:45；Application最早2026-08-29 04:07:01。因此8月26日查询两日志0条属于保留范围缺失，**不能认定没有黑屏或驱动错误**。9月5日System0条同样不构成无事件证明。
- 9月5日同窗口Application仍可取72条。WER1001 RecordId19557（UTC04:42:37.1706292）、19558（04:42:40.8279192）分别指向WATCHDOG-20260905-1241.dmp/1242.dmp，P1=141；随后19581/19582/19620/19621重复引用，不能机械算6次独立故障。这与12:40:53 illegal instruction紧邻，支持当时存在GPU看门狗事件。**没有同窗口可用System TDR/黑屏明确记录或持有人当时黑屏确认，不宣称当时必定黑屏或重启。**
- 本次10月29日重启后也重复上报这些9月旧WER，必须按转储日期与原登记时间去重，不能算本次新事故。
- 现有HWiNFO CSV复核：8月31日09:12:17.901—10:55:48.468（与当日Qwen服务窗口重叠），Bad TLP Count与NAKs Sent **94→117**。它是**另一日期**的PCIe累计错误证据，不与8月26/9月5报错或两次Wan事故直接同时对应。Recovery Count762→841不当作错误次数；两次Wan均无同时间可用PCIe计数。保留链路方向，不确证共同根因。

## 7. 四次记录简表：禁止混同错误类型

| 记录 | 最后运行阶段/环境 | 错误原文类别 | 黑屏/宿主记录 | PCIe及限制 |
|---|---|---|---|---|
| Qwen 08-26 11:30:12 | 请求推理中，同步等待；vLLM0.26/FP8权重+BF16；故障前验收torch2.11cu130，编译/graphs启用 | **illegal instruction**；后续EngineDeadError | 该日期System/Application保留缺失；黑屏未确认 | 无同瞬间计数；不把8/31计数移到本次 |
| Qwen 09-05 12:40:53 | 请求推理中，Inductor/Triton路径；相同config家族 | **illegal instruction**（driver error）；后续EngineDeadError | WER141引用12:41/12:42 WATCHDOG，支持GPU看门狗；黑屏/重启仍未确认 | 无同时PCIe计数；System已过保留期 |
| Wan 10-27 19:43 | Wan2.2 TI2V5B FP16，576×1024/97帧/20步，uni_pc/simple/CFG5；torch2.8cu128；异步offload2streams/pinned；11/20步后中断 | **没有落盘Python CUDA错误**，不能替它填instruction或memory access | 持有人黑屏；nvlddmkm14+126条153，后重启；EFI来源0x133线索，不确诊根因 | 无同时PCIe计数/事故温度峰值；dump未得 |
| Wan 10-29 15:37—15:39 | Wan2.1 T2V1.3B BF16，480×832/17帧/30步；torch2.11cu130；math/eager、禁编译graphs/异步，23/30步 | **illegal memory access**，eager AdaLN上报栈不等于起因 | 持有人黑屏后重启；WER141当天15:38dump引用、KernelPower41 bugcheck0；未取到System nvlddmkm/Display/WHEA | 有双侧核心/功耗/显存落盘，无热点/结温/PCIe；dump权限拒绝 |

相同点：本机同一已知改装48GB4090平台，真实GPU计算期间发生引擎或设备故障；Qwen和新Wan均处于cu130软件栈家族，故不能声称升级cu130已排除全部风险。不同点：模型、算子、精度、编译/图模式、卸载和错误类别均有实质差异；旧Wan没有Python错误，新Wan明确非法内存访问，Qwen明确非法指令。**这些证据允许提出跨工作负载可靠性问题，不能证明同一内核、驱动缺陷、供电问题或显存/PCIe硬件故障。**

## 8. 已确认、缺口与下一步边界

已确认：本次采样23/30后illegal memory access，双侧日志中断，持有人黑屏/重启，WER当天WATCHDOG引用和非正常重启记录；本次不是官方原样基线；旧Qwen至少两次illegal instruction，9/5有近时GPU看门狗证据；历史8/31另有PCIe错误累积。未确认：首个故障内核、故障地址/模块、显存可靠性/供电/链路/驱动/模型之间的因果。

缺口：本次WATCHDOG内容因权限未取得，stderr异常无逐行墙钟、缺真实故障后监控、无同刻热点/显存结温/PCIe、无旧Qwen对应System日志/驱动版本和明确黑屏陈述。当前核心温度不高、显存有余、几次短样本成功都不能补齐这些缺口。

下一步只建议在持有人另行裁定后，由有读取权限的管理员导出准确WATCHDOG文件并离线分析；结合原事件/日志核实板卡和供电资料。**不开展新生成、CUDA探针、Qwen复现或环境重装，不自动修复或清锁恢复。** 管理员导出不是要求更改ACL或本轮提权；未得dump时报告限制，不能编造结论。

本轮命令/读取脚本保存在host-incident-readonly.ps1、targeted-host-query.ps1及collector/targeted stdout/stderr；Windows XML/导出错误在windows-export-copy/，Qwen原文/版本/hash在qwen-evidence/。原run状态与STOP原件保持，完整归档清单和最终SHA见本目录final-archive-receipt.json。视频生成继续STOP，完成后等待持有人进一步裁定。


## 9. 内存实测、WHEA归属与主板QVL/BIOS只读核查

核验时间2026-10-29；证据目录：

`orchestrator/output/gpu-incident-004/20261029T080614Z-34d1b4827e-memory-whea/`

**纠正与结论：当前没有“四条内存运行6000”的证据，不得将内存高频作为已确认原因。内存稳定性仍未单独验证。** 料号中60及QVL的6000是型号/验证条件线索，不是本机运行速率证据；主机DDR内存与GPU扩容显存也不能混为一类。

### 9.1 实际硬件字段

持有人实测已记录，并通过本次只读Win32_BaseBoard/Processor/BIOS/PhysicalMemory核对一致：

| 字段 | 实际读取 |
|---|---|
| 主板 | ASUS **ProArt X870E-CREATOR WIFI**，Rev1.xx |
| CPU | AMD Ryzen9 **9950X** |
| 内存 | **4×64GiB Lexar LD5U64G60C40BV**，共256GiB；A/B通道各两条，4条一致 |
| ConfiguredClockSpeed | **四条均3600**；按固件/SMBIOS配置速率字段记录，没有以其他数值替代 |
| Speed | 四条均4800；这是另一个SMBIOS字段，**不覆盖ConfiguredClockSpeed，也不是6000的证据** |
| BIOS | **1805**，SMBIOS ReleaseDate **2025-12-11** |

字段只是只读配置报告，不是独立信号测量或稳定性验收；未读出EXPO开关、训练电压或硬件错误测试，不能自行声称开/关EXPO或推导实际超频。WSL约124GiB可见内存是虚拟机侧容量范围，不用它否认Windows物理256GiB配置。

### 9.2 本次及历史WHEA原始XML

当前直接查询System中Provider=`Microsoft-Windows-WHEA-Logger`的全部保留记录，返回 **0条，查询错误0**；System最早保留UTC2026-10-26T16:52:45.9351740Z。原始查询和JSON在host-query.ps1、host-hardware-and-whea.json，不将空结果写成内存测试通过。

| 范围 | 原始证据可用性 | 错误类型/设备归属能否判定 |
|---|---|---|
| 10/29本次事故 | 既有事故System/XML中没有WHEA-Logger记录；本次全保留日志查询也为0 | **无WHEA事件可解码，不能归属DRAM、CPU缓存/内存控制器、PCIe Root Port或GPU** |
| 10/27 Wan事故 | 历史INCIDENT-001/002当时查询WHEA为0；当前保留窗口亦无WHEA | 不能因0条认定无硬件问题；不能把nvlddmkm14/153当WHEA |
| Qwen08/26、09/05 | 相应System时间已过当前保留期；复查既有35份Qwen host/event快照没有实际WHEA XML | **证据缺失，不是这些日期没有WHEA** |
| 其他既有导出 | recovery/incident004已有328份候选JSON/XML/text文件未找到实际WHEA原始事件 | 没有额外原始记录可归属，不编造错误类型/设备号 |

Kernel-Power41内的`WHEABootErrorCount=0`只是该启动事件的字段，**不是一份WHEA错误记录**；WER LiveKernelEvent141、CUDA illegal instruction/illegal memory access、HWiNFO BadTLP计数也各自不同，不能拼成“WHEA已证实内存错误”或“WHEA已证实GPU/PCIe错误”。未来若取得WHEA XML，需要按ErrorSource/ErrorType/SectionType、处理器/APIC或PCI Segment/Bus/Device/Function及Vendor/DeviceID再归属；本次没有这些字段，不填虚构值。

### 9.3 精确料号与四插槽QVL

访问[本机主板官方QVL](https://www.asus.com/us/motherboards-components/motherboards/proart/proart-x870e-creator-wifi/helpdesk_qvl_memory?model2Name=ProArt-X870E-CREATOR-WIFI)，使用该页面公开嵌入的ASUS GetPDQVLMemory接口及页面已有筛选字段，选实际CPU的**Ryzen9000系列**，按完整SMBIOS料号检索；没有绕过登录/反爬或访问私有接口。原HTML、API完整URL/JSON、核验时间和SHA在reference-sources.json等文件。

| 核查 | 官方当前响应 |
|---|---|
| 搜索LD5U64G60C40BV | 返回2个**带后缀**近似料号；无完全相等的无后缀条目 |
| LD5U64G60C40BV-RGD | Lexar，2×64GB，RAM/Run Speed6000，XMP/EXPO，DS，Micron&SpecTek；SocketSupport **1,2** |
| LD5U64G60C40BV-RGS | 同上关键容量/速率/SocketSupport **1,2** |
| 同料号搜索再限定SocketSupport4 | **Count0**，SUCCESS响应；不把未知状态伪装通过 |
| 4×64GB且SocketSupport4的整板列表 | **7条**，为其他G.SKILL/TeamGroup料号，表明主板存在四条64GB验证方案；不能迁移为本机Lexar通过 |

官网[主板规格](https://www.asus.com/motherboards-components/motherboards/proart/proart-x870e-creator-wifi/techspec/)列4个DIMM插槽、最大256GB，同时说明速率和条数随CPU/配置变化。**板级容量/插槽支持成立，精确Lexar料号的4DIMM QVL验证尚未确认。** 无后缀SMBIOS可能未包含零售完整后缀，但不能擅自认成-RGD/-RGS；即使后缀最终相同，现有这两行只支持1,2槽，不是四槽背书。没有列入QVL并不证明不兼容或已是故障根因。

QVL为2026-10-29所查询的当前列表，未标这些条目专为本机BIOS1805验证；不把它当事故时配置或本机稳定性证明。API响应与速率列也不能反推本机正在6000运行。

### 9.4 BIOS文档信息与本机证据分开

[ASUS官方BIOS版本说明](https://www.asus.com/motherboards-components/motherboards/proart/proart-x870e-creator-wifi/helpdesk_bios?model2Name=ProArt-X870E-CREATOR-WIFI)已保存HTML及SHA，未下载/执行BIOS镜像。

| 版本/官网发布日期 | 与内存有关的文档信息 |
|---|---|
| 1003 /2025-01-23 | 添加兼容型号四条64GB、合计256GB的最高5200MT/s/AEMP支持；不是任意料号承诺 |
| 1504 /2025-05-29 | 改善内存兼容性，特别提及全部四个DIMM槽的配置 |
| **1805 /2025-12-19** | 仅一般性系统稳定性改进，没有指出本机Lexar或CUDA/WATCHDOG问题 |
| 2004 /2026-01-30 | 后续说明提到JEDEC内存兼容性改善，不代表已验证可修复本机 |

本机SMBIOS日期2025-12-11与官网1805发布日期12-19是**固件报告日期与网站发布日期**两个字段；差异本身不是装错BIOS的证明，亦未读取固件镜像作内容校验。不要把1003/1504历史改进写成“本机1805仍缺少该修复”，也不能声称1805或后续2004一定解决本机黑屏。高频训练或ECC-UDIMM的其他文档条款不自动适用于本机非ECC/当前3600配置。

本次不刷BIOS、不降级、不改EXPO/频率/电压/内存条位置，不用网页更新记录当硬件故障证据。

### 9.5 下一项最有区分价值的检查

**在当前只读边界内，优先由已有权限的管理员导出本次`C:\Windows\LiveKernelReports\WATCHDOG\WATCHDOG-20261029-1538.dmp`，保留SHA后离线分析。** 该文件有当天WER141明确引用，较“型号标称6000”“QVL未列四条”“没见WHEA”更接近事故现场；可检查GPU超时上下文、报告模块/故障线程及是否存在可解析硬件记录，区分问题报告路径，避免先改BIOS引入新变量。仍不能单靠dump证明显卡硬件故障或排除DRAM。

目前读取受权限阻断，保持不改ACL；此为下一步建议，本轮未提权、未安装调试器或执行dump解码。若要**直接验证主机DRAM稳定性**，必须另行授权独立内存诊断（可能需离线/重启），与GPU生成分开；本轮不启动、不预设其结果，也不把WHEA0或低配置速率当作替代验证。

本轮总结：四条内存配置字段3600、无四条6000证据；WHEA类型/归属因无原始事件而不可判；精确料号四槽QVL未确认；BIOS存在一般内存改进文档但没有本机因果证据。**内存稳定性未单独验证，根因仍未定；视频生成STOP及全部原现场继续保留。** 本次未运行CUDA/GPU/压力或CPU计算检查，没有变更环境/BIOS/内存参数、未提交推送。


## 10. 15:38 WATCHDOG精确导出准备：等待持有人管理员执行

本次证据目录`orchestrator/output/gpu-incident-004/20261029T081308Z-5f6ca8fa38-dump-analysis/`。只读取证与准备，不加载模型、不初始化CUDA/查询GPU/运行压力测试，不改驱动、BIOS、TDR、硬件或ACL，全部STOP保留。

### 10.1 来源及当前阻断

准确源路径从已有Application WER1001 **RecordId35880** 的消息与原始XML读取，重复RecordId35958指向同一文件：

```text
C:\WINDOWS\LiveKernelReports\WATCHDOG\WATCHDOG-20261029-1538.dmp
```

本次只对重复路径分隔符作Windows等价规范化，目录/文件名完全来自WER，不猜新路径。source-path-evidence.json保留原文/XML/SHA；文件名1538为本地时间线索，WER登记UTC07:39:46.2957232，并不替代尚未读取的dump头内生成时间。

当前账户再次Get-Item的准确错误：

```text
System.UnauthorizedAccessException: Access is denied
FullyQualifiedErrorId: ItemExistsUnauthorizedAccessError,Microsoft.PowerShell.Commands.GetItemCommand
```

普通导出目录目前没有对应副本，因此本轮尚未复制/读取dump内容。持有人已主动表示可协助执行管理员命令；不在后台自动提权或改源目录权限。

### 10.2 已准备且语法核验的管理员命令

管理员导出脚本的普通可读位置：

`C:\Users\admin\video-recovery\export-tools\export-watchdog-1538-20261029T081308Z-5f6ca8fa38-dump-analysis.ps1`

仓内证据副本`export-watchdog-1538-admin.ps1`；内容SHA记录在export-script-location.json。PowerShell原生Parser语法核验0错误，**只解析，未执行导出主体**。

在Windows开始菜单右键PowerShell→**以管理员身份运行**，复制执行这一条：

```powershell
& ([scriptblock]::Create([IO.File]::ReadAllText('C:\Users\admin\video-recovery\export-tools\export-watchdog-1538-20261029T081308Z-5f6ca8fa38-dump-analysis.ps1')))
```

该命令读取已准备好的本地脚本执行，不下载或修改ExecutionPolicy。脚本仅将指定dump复制到：

```text
C:\Users\admin\video-recovery\dump-exports\WATCHDOG-20261029-1538-<UTC时间>-<随机后缀>\
```

每次独立目录，拒绝覆盖；保留原件，不改ACL、不删除。复制后比较源/目标大小、计算并比较**源与副本完整SHA-256**，再核对源大小/LastWriteTime未变；读取副本16字节仅验证普通二进制可读，**不是执行转储或分析模型**。成功输出COPY_VERIFIED_READY_FOR_NORMAL_USER_READ_CHECK，保存export-receipt.json及实际路径/哈希/大小。随后助手还须以普通用户读取副本并复核哈希，不能把管理员能读直接当普通用户已能读。

失败时脚本保留文件和收据，记录ExceptionType/准确ErrorId/消息后停止，不自动重试；如果不是管理员，直接提示重新以管理员打开，未发起UAC自动提权。最短人工操作为上述打开管理员PowerShell、执行一条命令、把收据或完整错误发回；如管理员仍Access denied，也不要takeown/icacls改变源目录，先保留错误交由持有人决定受管导出方式。

### 10.3 离线工具现状与后续分析范围

本轮只读发现：PATH及WindowsKits10常见x64 Debuggers目录没有cdb/kd/windbg/WinDbgX/dumpchk，当前用户Microsoft.WinDbg Appx查询为空；Linux PATH亦未发现gdb/llvm-readobj/dumpchk/windbg。这仅限所查位置，不声称全机绝无其他安装。**没有可读副本，也没有已发现可用调试器，尚未开展dump分析，未安装SDK/调试器。**

待副本可读并有可用调试器后，按[微软内核dump读取说明](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/read-small-memory-dump-file)打开副本（-z），核验工具版本/位数、dump类型/时间，使用微软公开符号服务器并保存所有加载警告；[!analyze说明](https://learn.microsoft.com/windows-hardware/drivers/debugger/using-the--analyze-extension)仅提供诊断线索。预备命令在offline-debugger-commands-NOT-RUN.txt，包含.logopen、.symfix、!sym noisy、.reload /f、vertarget、.bugcheck、!analyze -v、kv、lm及lmvm相关模块；均**未运行**，不是伪造的栈分析结果。

实际报告须分栏记录：dump头错误码/参数、栈/线程、模块版本及符号状态；公开OS符号成功也不等于NVIDIA私有符号完整。若符号下载失败、模块缺页、dump损坏或所需结构缺失，如实标记限制，不补造栈或函数名。模型指令错误、WER P1=141及dump错误码应分别记录，尤其WER参数aaaaaaaa…不能当有效指针解码。

目前唯一可确认的141是WER签名；微软将[0x141定义为视频引擎超时的live-dump标识](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x141---video-engine-timeout-detected)，不应冒称本机dump头已读到0x141，也不把KernelPower41的BugcheckCode0替换成141。驱动名称/Probably caused by或nvlddmkm出现在栈里都不是驱动根因的独立证明；需与超时上下文、硬件/软件状态和证据缺口分开。

当前状态：**导出已准备，离线分析BLOCKED（需持有人管理员复制，之后还需可用调试工具）**。未新增任何试验，不自动恢复生成；本轮完成准备后等待管理员命令结果，STOP与旧现场保留。


## 11. 管理员副本已核验，正式调试分析受工具缺失阻断

持有人已执行第10节命令，成功导出并提供完整收据。本次普通权限读取与本地保全副本均复核一致：

```text
C:\Users\admin\video-recovery\dump-exports\WATCHDOG-20261029-1538-20261029T081840Z-2ed22445\WATCHDOG-20261029-1538.dmp
大小：3227264字节
SHA256：510472F97E67FA6500320E0AA790E6171BF996743A0FCAD5FC38B2FAD56FD272
```

证据保全在`orchestrator/output/gpu-incident-004/20261029T081308Z-5f6ca8fa38-dump-analysis/readable-dump/`，包含相同dump及export-receipt.json；normal-user-read-verification.json记录普通权限复核，原受保护dump未修改、不再重复复制原件或改变ACL。管理员收据的sourceLastWriteUtc=2026-10-29T07:38:03.9799466Z（北京时间15:38:03.980），位于最后23步日志15:37:56.013之后约7.97秒，早于15:39:18的Windows重启和之后WER登记；**这是文件LastWriteTime，不等同于已解析的dump内部故障时间。**

### 11.1 当前可确认和初检范围

文件前8字节为`PAGEDU64`，为64位Windows内核转储家族签名，管理员所报前16字节与普通读取相同。只读二进制头初检保存binary-header-preliminary.json及hex；固定头布局的候选字段为：

| 字段 | 初检值 |
|---|---|
| x64机器类型 / 处理器数 | 0x8664 /32 |
| 版本字段 | Major15 /Minor26200 |
| 偏移0x38代码 | **0x141** |
| 偏移0x40四个参数 | **ffffe10fa95ca010 / fffff804b3619fa0 / 0 / ffffe10f8fdd9080** |

这些是**未由Windows调试器确认的头字段初检，不是!analyze输出**；不从它们虚构栈或模块归属。WER P1=141与头初检0x141相符，但WER中P2—P5的aaaaaaaa…不能代替真实参数。按[微软0x141说明](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x141---video-engine-timeout-detected)，此代码用于视频引擎超时live dump，非实际系统bugcheck；具体转储子类型/标志、内部时间和上下文仍待调试器验证。不能把它改写为本次KernelPower41的系统bugcheck码（当时是0）。

### 11.2 实际缺项与最小安装方式

复用第10节检查：Windows PATH、WindowsKits10常见x64 Debuggers路径及当前用户Microsoft.WinDbg Appx均未发现可用调试器；Linux PATH也没有可用于本kernel dump的Windows调试工具。**目前没有生成完整调试分析输出，不能把文件头解析当成正式调用栈分析完成。** 微软官方下载入口https://aka.ms/windbg/download在当前工具网络中返回HTTP403，已记录microsoft-download-error.json，没有绕过限制或自动安装第三方工具。

Windows已确认存在winget.exe。按[微软WinDbg安装说明](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/)，最小补齐是只安装Microsoft WinDbg，不安装整套WDK/SDK、CUDA或模型环境。持有人可在Windows PowerShell执行：

```powershell
winget install --id Microsoft.WinDbg --exact --source winget
```

本轮没有执行安装；该操作是下一步由持有人执行的标准工具补齐，不是刷驱动/改TDR或内存参数。若winget源不可用，可从微软文档的官方下载安装入口或Microsoft Store取得WinDbg，不能因工具网络403擅自用非官方镜像。安装完成后继续打开普通副本，只做dump离线分析，不Attach实时GPU进程或运行程序。

### 11.3 必需报告项当前状态

| 项目 | 当前状态 |
|---|---|
| 大小/SHA/普通权限读取 | **PASS**，与管理员收据相同，源及本地副本保全 |
| 类型/代码/参数 | PAGEDU64及0x141候选头字段已记录；具体live/triage子类型待Windows调试器 |
| 工具版本/符号 | **无可用调试器，符号未加载**；不能声称完整或仅差NVIDIA私有符号 |
| 故障线程、调用栈 | **NOT_ANALYZED** |
| 相关模块及版本 | **NOT_ANALYZED**，未把字节串或文件名当成栈证据 |
| 时间关联 | 文件修改15:38:03.980位于采样23步日志和重启之间；内部时钟未解析 |
| 根因 | **UNDETERMINED**；不因WER、模块名或报错地址先判驱动/显卡损坏 |

离线命令预案仍在offline-debugger-commands-NOT-RUN.txt；工具可用后保存完整!analyze -v/.bugcheck/kv/lm输出与symbol加载警告。栈上存在nvlddmkm/dxgkrnl或自动分析的Probably caused by，只能说明故障报告上下文/归属线索；不单独证明驱动缺陷、显卡损坏或排除DRAM/PCIe/供电。

本轮停止于明确工具阻断，保存完整已做检查输出及未完成状态。**没有CUDA初始化、模型/GPU/压力测试或驱动/BIOS/TDR/硬件设置更改。STOP及历史现场保持。** 后续等待工具就绪后继续同一dump分析，不重新生成事故样本。


### 11.4 持有人winget安装遇403，改用官方Store入口待人工操作

持有人实际执行标准winget命令后，找到Microsoft.WinDbg版本**1.2610.1001.0**，但下载`https://windbg.download.prss.microsoft.com/dbazure/prod/1-2610-1001-0/windbg.msixbundle`返回：

```text
Download request status is not success.
0x80190193 : Forbidden (403).
```

错误属于下载HTTP403，**不是dump解析失败、WinDbg不支持此dump或安装已完成**。原始持有人输出已结构化保存holder-winget-failure.json；再次只读Get-AppxPackage确认WinDbg仍未安装、Microsoft.WindowsStore已存在（版本22609.1401.7.0）。未尝试反复下载/更换未经验证镜像、改变代理/网络/ACL或安装整套SDK。当前符号/调用栈/模块分析仍BLOCKED，原dump哈希不变。

可由持有人打开微软官方Store的WinDbg条目（ProductId9PGJGD53TN86，Microsoft Corporation）：[官方商店页](https://apps.microsoft.com/detail/9pgjgd53tn86)。PowerShell只打开该条目，不自动同意许可或安装：

```powershell
Start-Process 'ms-windows-store://pdp/?ProductId=9PGJGD53TN86'
```

在商店确认发布者后点击获取/安装。如商店也失败，保留准确错误再决定下一步，不重复同一403路径或擅自下载第三方包。本轮不自动打开/安装，只提供替代官方分发渠道；微软文档明确支持Store安装，不能预先承诺该网络环境下一定成功。所有STOP、转储原件和已核验副本保持。


## 12. WinDbg已安装：WATCHDOG正式离线分析完成（有符号与triage限制）

本节替代第10—11节当时“缺工具/未分析”的**当前状态**，旧阻断/403与原始日志不删除。持有人通过官方渠道安装Microsoft.WinDbg **1.2610.1001.0** 后，本轮使用包内`amd64/kd.exe`；引擎版本 **10.0.29661.1004 AMD64**，Authenticode为Microsoft有效签名，工具SHA记录在首次会话debugger-tool-integrity.json。没有重新安装GPU/模型环境。

普通权限再核同一3227264字节副本及SHA256 `510472F97E67FA6500320E0AA790E6171BF996743A0FCAD5FC38B2FAD56FD272`，未改源/副本或ACL。只用`-z`打开dump，不attach实时进程；网络只用于微软公开符号/匹配映像请求，没有上传转储，没有CUDA初始化/模型/GPU或压力测试，全部STOP保留。

### 12.1 输出位置、工具执行与过程限制

证据根目录仍为：

`orchestrator/output/gpu-incident-004/20261029T081308Z-5f6ca8fa38-dump-analysis/`

- 完整`!analyze -v`所在会话：`windbg-20261029T083943Z-commandfile/stdout.log`及windows-native-log/analysis.log；可读提取本根目录`analyze-v-result.txt`。
- 故障线程/相关模块定向会话：`windbg-20261029T084147Z-targeted/stdout.log`及windows-native-log/analysis.log；可读提取`targeted-readable-sections.json`、`stack-kv.txt`。
- 参数、命令文件、工具入口和启动参数：各会话commands.txt、command.json、invoke.ps1；结构化结论：offline-analysis-result.json。
- Windows原始分析日志在`C:\Users\admin\video-recovery\dump-exports\windbg-<同会话名时间及后缀>\`；上述windows-native-log已完整复制保留。

实际主调用形式：

```text
<已核实WinDbg包位置>\amd64\kd.exe
  -z <已核验普通目录WATCHDOG副本>
  -y srv*C:\Users\admin\video-recovery\dump-exports\symbols*https://msdl.microsoft.com/download/symbols
  -logo <该会话analysis.log>
  -cf <该会话逐行commands.txt>
```

完整路径/参数在command.json，以上不是带占位符的已验证新一键命令。逐行执行version、.time、.bugcheck、!analyze -v、kv及lmvm/!thread等查询。

**实际过程不冒称所有会话正常退出：** 首次会话`windbg-20261029T083812Z`的`.sympath`在分号命令串中吞掉后续指令，造成路径解析错误，保留原输出后仅停止本次离线KD，改为逐行命令文件。第二会话已完整得到!analyze和kv，但全模块lm t n触发无关映像下载，定向收集更合适，因此保留输出后结束本离线会话。第三会话所需!thread/kv/lmvm/地址归属均完成，附加.enumtag的厂商不透明数据大量hex输出触及120秒收集等待限制，随后仅停止该离线KD；保留部分原始tag输出，**未解码或臆测其含义**，.chain/q未运行到。所有本次KD退出已核实；这是对同一dump的离线会话，不是三次GPU试验或自动复现。完整各轮stdout/stderr/控制终止/超时记录保留。

### 12.2 类型、时间、错误码与参数（调试器确认）

| 项目 | 实际WinDbg结果 |
|---|---|
| 文件类型 | Mini Kernel Dump；**Kernel Generated Triage Dump / Live Generated Dump** |
| DUMP_FILE_ATTRIBUTES | **0x18** |
| 错误码 | **0x141 VIDEO_ENGINE_TIMEOUT_DETECTED** |
| 性质 | 视频引擎未及时响应，生成live dump；不是本次系统崩溃bugcheck，也不能把Kernel-Power41的BugcheckCode0改为141 |
| Arg1 | **ffffe10fa95ca010**，TDR recovery context候选指针 |
| Arg2 | **fffff804b3619fa0**，归属驱动/owner tag地址；归入`nvlddmkm+0x1959fa0` |
| Arg3 | **0000000000000000**，secondary bucketing key |
| Arg4 | **ffffe10f8fdd9080**，附加内部上下文；分析器同时列为PROCESS_OBJECT，不能代替故障线程 |
| dump内部时间 | **2026-10-29 15:38:03.975 UTC+8** |
| 系统uptime | **1天19:16:22.762** |
| 内核报告 | Version26200、32处理器、x64；模块资源版本另见下表 |

头部此前候选字段现在由真实`.bugcheck`与`!analyze -v`确认；不是继续只依赖手写偏移。WER中的aaaaaaaa…参数是另一个来源的占位/报告内容，不能当本dump真实地址。

### 12.3 线程及完整捕获栈

`FAULTING_THREAD = ffffe10f511e5080`；`!thread`显示CID **0004.07d4**，Owning Process为 **System/PID4**，Win32 Start Address **dxgmms2!VidSchiWorkerThread**，记录运行于处理器2。

这是图形调度器的**取证/重置上下文**，不是已证实的原始CUDA非法访问线程，也不是Linux模型进程PID2725619的直接Windows用户态栈。

`kv`捕获栈由调用者至取证层可概括为：

```text
nt!KiStartSystemThread
nt!PspSystemThreadStartup
 dxgmms2!VidSchiWorkerThread
 dxgmms2!VidSchiRun_PriorityTable
 dxgmms2!VidSchiScheduleCommandToRun
 dxgmms2!VidSchiCheckHwProgress
 dxgmms2!VidSchiResetEngines
 dxgmms2!VidSchiResetHwEngine
 dxgkrnl!TdrCollectDbgInfoStage1
nt!DbgkWerCaptureLiveKernelDump
nt!DbgkWerCaptureLiveKernelDump2
nt!DbgkpWerProcessPolicyResult
nt!DbgkpWerCaptureLiveTriageDump
```

上为便于读的调用方向，原始kv从当前取证帧向调用者排列，所有地址/偏移/参数保存在stack-kv.txt。本栈说明Windows在检查图形引擎进度后进入重置与TDR取证，**不包含可定位最初CUDA算子/着色器非法访问的完整执行历史**。NV模块归属主要来自Arg2和failure bucket，不应声称栈中已有一条NVIDIA私有函数证明其出错。

### 12.4 模块版本与符号完整性

| 模块 | 版本/归属证据 | 符号状态 |
|---|---|---|
| nt /ntkrnlmp.exe | **10.0.26100.9711**，lmvm资源版本 | 匹配微软public PDB已加载 |
| dxgkrnl.sys | **10.0.26100.9711**，lmvm资源版本 | public PDB已加载，能命名TDR函数；私有`_TDR_RECOVERY_CONTEXT`类型未找到 |
| dxgmms2.sys | **10.0.26100.9711**，lmvm资源版本 | public PDB已加载，能命名VidSchi函数 |
| nvlddmkm.sys | dump模块记录起点fffff804b1cc0000、映像大小07375000、时间戳6A60207A、CheckSum072C8D9B；lmvm未带出版本资源 | **无可用NVIDIA符号**；有Unable to verify timestamp提示，Arg2只能定位模块+偏移，字节页也不可读 |
| 当前磁盘nvlddmkm.sys（独立只读佐证） | 文件版本 **32.0.16.1088**（对应事故前记录610.88）；PE时间戳/映像大小/校验和三者与dump记录匹配 | 不是从dump解析出版本；匹配这三项不是整个映像字节身份/完整性证明 |

当前磁盘文件通过Win32_SystemDriver路径和只读文件资源取得，**不是查询/初始化GPU**，未加载或更换驱动。其SHA为C5DCC1A5F20943B3C3FD10D03BCD31B5832EE3F1B4468F7815BF4E73D9E1D552，路径及版本来源在current-driver-file-metadata-not-dump-version.json、driver-version-provenance.json。Windows可见内核版本26200与模块26100.9711均原样保留，不自行认定错版驱动。

总体符号状态为 **部分满足、并不完整**：核心OS公开PDB足以支持上述函数名，但NVIDIA符号/私有TDR结构不可用。原输出还含`TAG_NOT_DEFINED_202b`、小转储缺卸载驱动列表，以及!thread的共享内存/KeMaximumIncrement读失败；小转储页缺失不能直接解释为内存已损坏。公开符号解析成功也不是私有结构和所有模块都已解析。

分析bucket为 **LKD_0x141_IMAGE_nvlddmkm.sys**，自动分析把Failure.Exception.IP归入nvlddmkm+0x1959fa0。该地址同时是0x141的owner/归档参数，**不等于已找到原始出错CPU指令或GPU program counter**。没有私有符号也不应伪造NVIDIA函数名。

### 12.5 与原采样、双侧监控及宿主事件的时间关系

| 北京时间 | 独立来源与事实 |
|---|---|
| 15:37:56.013321 | 原模型最后sampling_progress23/30 |
| 15:37:56.437568 /56.526523 | WSL/Windows最后遥测 |
| **15:38:03.975** | 本dump内部时间；最后采样后约 **7.962秒** |
| 15:38:03.9799466 | 原文件LastWriteTime；与dump时间差约5ms |
| 至迟15:38:34.228841 | stderr illegal memory access已被观察并追加STOP/终止本模型请求；stderr没有逐行时间，**不能判定非法访问与dump生成的严格先后** |
| 15:39:18.570841 | 重启Windows；dump在重启前约 **74.596秒** |
| 15:39:24.293586 | KernelPower41/BugcheckCode0 |
| 15:39:46.295723 /15:42:37.329741 | WER1001重复报告同一141/当天WATCHDOG，非两份独立dump |

这把CUDA采样中断、视频引擎超时和持有人黑屏连到同一事故窗口，**不把时间邻近替代因果定位**，也不把后登记的WER时间当成故障发生时间。WHEA无原始事件/内存配置3600等第9节结论仍有效，不因当前dump归属NVIDIA就忽略这些限制。

### 12.6 能确定与不能确定

**能确定：** 普通副本未损坏，Windows确实捕获0x141视频引擎超时；图形调度器在检查硬件进度后进入重置/TDR live triage取证；owner/归档归入NVIDIA模块；内部时间与480×832采样23步后日志中断/黑屏相符。

**不能确定：** 最初CUDA illegal memory access对应哪条指令/哪个模型算子；是驱动软件缺陷、GPU/改装显存、PCIe、供电、主机DRAM/IMC或其他交互造成；不能判断显卡已损坏，也不能据此排除DRAM。GPU扩容显存与主机4×64GB3600不是同一资源，现有dump没有独立验证二者稳定性。nvlddmkm模块名或bucket不是根因判决。

**本轮完成离线分析，但不是故障修复或恢复验收。** 当前需保留此dump与完整日志，后续由持有人决定是否提交给硬件/驱动支持方作进一步诊断；不自动上传、不自动进行新GPU/模型/压力/内存测试或换驱动/BIOS/TDR。所有本次离线调试器已退出，未影响其他服务，生产及试验视频生成STOP保持。

完整实际输出、原失败/超时会话、符号缓存摘要、dump及哈希将保存在本证据目录的最终离线分析归档；不将“部分符号可读”写成完整符号、不把根因未定写成已恢复稳定。未提交推送。


## 13. GPU供应商诊断证据包（只汇集已有证据）

- 独立目录：`/home/chen/work/video-pipeline/orchestrator/output/gpu-supplier-evidence/GPU-Supplier-20261029T090454Z`。包内报告为本节追加前的第12节完整快照，来源摘要在copy-provenance.json中；后续包装记录不倒改包内历史快照。
- Windows ZIP：`C:\Users\admin\video-recovery\supplier-evidence\GPU-Supplier-20261029T090454Z\GPU-Supplier-20261029T090454Z.zip`，1901776字节，共126个文件；SHA-256 `a02114178d1297327c503de9f344807de8b0d617cb587223f50e5d93e067983c`。同目录有ZIP的.sha256及一页中文摘要。
- 内容包括完整未修改WATCHDOG副本与导出回执、三个WinDbg会话全部落盘输出、实际配置/命令/环境/源码摘要及匹配执行源码、完整推理stdout/stderr/阶段与双侧监控、5条本次System事件及2条同dump WER原始XML、Qwen已筛选错误片段、STOP副本、简短时间线、逐文件清单与SHA-256。仅从已有导出中筛选事件，没有重新查询或测试GPU。
- ZIP CRC全量检查、有效载荷SHA及Windows复制后SHA全部PASS；原事故53项证据与本轮复制来源在归档时逐项校验未变。没有模型权重、venv、声音参考、完整项目或无关业务请求日志；文本常见凭据规则扫描0命中，不等于能证明不透明dump不存在敏感内存片段。
- dump完整保留，可能含内存数据；日志可能有主机名/设备UUID/本机路径。仅通过供应商私有售后渠道交付，不公开发布，本轮未自动发送。未进行CUDA/模型/压力测试，全部STOP保留。包装回执在同级`.receipt.json`，所有原始证据不移动、不覆盖。
