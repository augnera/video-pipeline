# 本地视频生成恢复评估与受控试用

日期：2026-10-29。**最新：480×832受控试验在23/30步后出现CUDA illegal memory access，持有人确认再次黑屏并重启Windows，视频生成继续STOP。** 详见[GPU-INCIDENT-004](GPU-INCIDENT-004.md)及第21节。本轮事故后只读取证，无CUDA初始化、模型/GPU测试或恢复。双侧日志/STOP已先归档；取得WER当天WATCHDOG引用及非正常重启事件，但dump读取拒绝，根因未定。Qwen历史illegal instruction与两次Wan分别对照，不混为同一错误或根因。

## 1. 工作基线与授权范围

- 仓库 `/home/chen/work/video-pipeline`，`main`，HEAD `cc562624f8d36cf06fde9e373e72e5451e973ce1`。与本地 `origin/main` 领先0/落后0；本轮没有 fetch 或宣称核实服务器最新状态。
- 开工已有 `.gitignore`、`PROGRESS.md` 未提交修改，全部保留。本轮不提交/推送。
- 已阅读 AGENTS、PROGRESS 和全部四份事故报告：GPU-INCIDENT-001、002、003、003-G2-repair。复核旧 `serve.py`、部署锁、资产记录、源码及现有日志；旧服务已有合作锁和内存监控，本轮仅补独立落盘、宿主事件与失败锁。
- 本期明确授权覆盖受控恢复准备；AGENTS中的生产Wan STOP继续有效，不改变生产配置或把视频模型设为必需依赖。

## 2. 原事故配置与已确认事实

| 项目 | 实际事故配置 |
|---|---|
| 程序 | ComfyUI0.43.0，commit `426f5eea52a7ece1dd599fff4cb6cd1f352ddd24` |
| 模型 | Wan2.2 TI2V-5B fp16扩散 + UMT5 XXL fp8 e4m3fn scaled + Wan2.2 VAE |
| 环境 | Python3.12.3，torch2.8.0+cu128，vision0.23.0+cu128，audio2.8.0+cu128，Triton3.4.0 |
| 画面/采样 | 576×1024，97帧，24fps，20步，cfg5，seed42，uni_pc/simple |
| 内存/算子 | reserve-vram4GiB，PyTorch attention，2条异步权重卸载流，pinned memory；优化CUDA/Triton后端当时禁用 |
| 结果 | 2026-10-27 19:42:20.586开始；最后11/20步；19:43:27.831宿主nvlddmkm14/153及UCodeReset TDR；无完成MP4 |

第一次HTTP请求被图哈希校验拒绝，没有执行模型；修正整数/浮点序列化后仅有一次真实推理，不能把请求数当推理次数。旧 `attempt-state.json` 的 running/attempts=1是遗留现场，未重置。

确认：宿主发生TDR；后来Kernel-Power41含EFI 0x133记录。**未确认：具体故障模块、触发内核、显存/供电/PCIe/驱动之间的根因。** 无Python OOM不代表硬件正常；采样步耗时不等于单个CUDA内核耗时；Event153不能冒充Linux Xid。

历史Qwen存在illegal instruction/EngineDeadError，故障并非只见于Wan；8月31日HWiNFO与负载重叠窗口BadTLP/NAKs Sent94→117，保留链路排查方向，但不直接归因。持有人此前已确认魔改48GB4090成品卡，不再把“是否魔改”当作未知。

## 3. 本轮实际复核

| 检查 | 2026-10-29观察与边界 |
|---|---|
| GPU | 同UUID RTX4090，49140MiB，610.88，VBIOS95.02.3c.00.02；GPU recovery action=None。只是当前读数 |
| 修复环境 | 原Comfy独立venv已为torch2.11.0+cu130/vision0.26.0+cu130/audio2.11.0+cu130；pip check通过。原源码仍为固定commit、干净 |
| WSL | 实际内核仍6.6.114.1-microsoft-standard-WSL2；不修改显式内核覆盖 |
| System事件 | 从10/27 19:40查询：nvlddmkm14为1条、153为126条，属于已知事故；此次查询未见事故后新增NVIDIA/WHEA事件。不能因此证明负载稳定 |
| Application | 只取匹配提供者最新200条，另核对最新10条LiveKernel/BlueScreen引用。发现10/29再次报告9月旧dump，不能按报告日期当新蓝屏；不是全量Application排障 |
| 转储 | MEMORY.DMP不存在，Minidump仍5个8—9月文件；LiveKernelReports访问被拒，事故当次dump仍未取得；未改ACL、未调用UAC或安装调试器 |
| 遥测 | 旧hwinfo-gpu.csv的修改时间8/31 10:55，不能作本轮持续记录；未发现HWiNFO运行进程 |
| 其他消费者 | WSL未见Comfy/TTS/Qwen模型进程或8188/9880/9881/8000监听；Windows有Chrome、WebView、DWM、Overlay和两个Python（其中一个解释器来自Hermes虚拟环境）。CIM一次GPU引擎快照为空，不代表这些进程永不使用GPU；未停止任何业务 |

原始证据：`orchestrator/output/local-video-recovery-20261029/host-evidence.json`保留Windows原编码；另有UTF-8规范副本、host-followup.json、host-consumers.json、gpu-current.xml。进程只记录名称/解释器路径，不导出可能含令牌的命令行。

三份已有权重重新完整SHA-256，全部与既有清单一致：

| 文件 | 字节数 | SHA-256 |
|---|---:|---|
| wan2.2_ti2v_5B_fp16.safetensors | 9999658848 | `456f901338bd9eadbded3828b819109a9b68e8a525ca5cf8d0049a69fcfeca1e` |
| umt5_xxl_fp8_e4m3fn_scaled.safetensors | 6735906897 | `c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68` |
| wan2.2_vae.safetensors | 1409400960 | `e40321bd36b9709991dae2530eb4ac303dd168276980d3e9bc4b6e2b75fed156` |

VAE的现存HuggingFace下载metadata也记录相同固定revision和SHA，故来源不是按文件名猜测。本轮没有重复下载已有权重。

## 4. 环境准备与模型选择

新独立路径：`local-assets/experiments/video-recovery-20261029/venv`。系统Python创建venv，只复制已修复Comfy环境site-packages，未用硬链接，不共享可写包inode；不改TTS/Qwen/原Comfy包。92项精确版本见 `experiments/local-video-recovery/requirements.lock.txt`，实际freeze及CPU检查在输出目录。

已测pip check、torch/vision/audio/numpy导入、CPU矩阵计算；`torch.cuda.is_initialized()`为false。环境没有通过Comfy GPU后端动态验证。原生包存在不表示其内核被调用。

| 候选 | 适配与资产 | 权重及组件许可，核验2026-10-29 | 当前状态 |
|---|---|---|---|
| Wan2.2 TI2V-5B | 优先复用现有三组件，支持文生/图生，适合后续首帧小幅动态化；官方完整720P配置不是低资源稳定性测试 | [固定Comfy重打包模型卡](https://huggingface.co/Comfy-Org/Wan-2.2/blob/c4f60d30c55a624e35427060fdd217579a6c1d77/README.md)声明Apache2；[原始权重模型卡](https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B)明确覆盖模型；VAE来自同组权重，UMT5原始[Google权重模型卡](https://huggingface.co/google/umt5-xxl)也为Apache2 | 权重完整性PASS；GPU运行NOT_EVALUATED |
| **Wan2.1 T2V-1.3B（选定轻量候选）** | 验证较小Wan文生路径，复用固定Comfy已有架构与监控；不承诺它能做已验收图片的图生。其Wan2.1 VAE不能用Wan2.2 VAE替代；fp8 UMT5复用仍须实际验证，不能视为官方bf16组件等价 | [固定权重仓LICENSE.txt](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/blob/37ec512624d61f7aa208f7ea8140a131f93afc9a/LICENSE.txt)为Apache2，覆盖本仓模型/VAE声明；UMT5/分词资源遵循Google组件许可 | 已选定并固定版本；主权重/VAE未下载；未运行 |

没有安装LTX或声称完成其许可评估。选择Wan1.3B减少另一套架构/依赖的引入，且本期可先验证办公情境文生；图片动态化留给现有5B路径。重打包仓包含其他模型不表示其所有文件都获同一用途许可，本次只核实列出的三文件来源。Apache2需保留适用许可/版权通知和变更说明，生成内容本身仍需事实与人工审查；这不是公开发布授权。

来源快照、权重revision、源码commit和组件列表见 `experiments/local-video-recovery/models.json` 及输出`sources/`。官方Wan2.2模型卡内LICENSE.txt相对链接访问404，已保留访问事实；许可判断同时依据明确的权重声明及官方仓许可证，未伪造该文件存在。ComfyUI程序GPL与Wan权重许可分开。

参数只按真实实现确定：固定Comfy Wan2.2节点为宽高32倍数、帧数4n+1；Wan2.1节点宽高16倍数、帧数4n+1。官方5B建议1280×704/704×1280，1.3B以832×480为480P示例。节点允许更短序列不等于低分辨率/少步数质量已通过。本轮没有编造“已实测低资源配方”，没有生成任何采样任务。

重要兼容性未决：cu130修复后comfy-kitchen的优化CUDA路径可能重新启用，旧启动参数不能保证仍走原eager路径。下一次模型试用必须显式核对禁用优化后端/编译、关闭异步卸载和pinned-memory的支持方式，再验证标准算子；本轮未启动Comfy来探测它。

## 5. 落盘监控与受控门禁

新增 `experiments/local-video-recovery/recovery.py`、`host-watch.ps1`、审查模板与六项测试，未建设新平台。WSL每条JSONL flush/fsync，Windows宿主每条Flush(true)，记录时间、GPU身份、显存、核心温度、功耗、利用率、recovery action、System设备事件和阶段状态。

本轮三个12秒只读窗口（第三个验证最终代码）不包含CUDA计算；前两个各12个WSL样本、6个独立宿主时间点，温度最高33°C、功耗最高24.78W、显存最高4574MiB。monitor-01瞬时利用率最高22%，说明桌面也有波动，不能用空闲快照放行全部负载。最终窗口读数另存validation.json；这些数字绝不是模型生成峰值或性能。

门禁检查：事故处置、供电/硬件资料、宿主监控、其他消费者、现场观察五项真实审查证据与摘要。审查记录一小时内有效，后续宿主事件从审查时间开始查询；自动门禁只保证证据未变，不代替对“已解决”的判断。

已实现停止条件：NVML查询3秒超时；宿主心跳>8秒/失联/异常；核心≥75°C；空闲显存<4096MiB；recovery action非None；新nvlddmkm/WHEA/Display4101/Kernel-Power41等事件。CUDA入场另要求空闲≥28672MiB、利用率≤15%，沿用合作式共享GPU锁。

CUDA子进程仅64×64 FP32矩阵及有限值/CPU对照，30秒截止，完成后再观察8秒宿主错误。**此成功路径未执行**；实际验证了缺审查时在任何CUDA进程启动前拒绝。CUDA尝试启动前写持久STOP，成功也需检查后人工归档，不自动重试、换模型或清锁。异常只终止本工具自己的进程；进程终止不能保证卡住的驱动恢复。

局限：WSL发起的宿主logger已实测，但尚未证明WSL整体失效后的独立存活；Windows本地文件可降低只存WSL盘的证据风险，不能保证断电不丢失最后记录。已提供原生Windows独立启动命令。热点/显存结温、PCIe累计错误及供电瞬态仍缺实时记录。

## 6. 恢复Gate、缺项和下一步

| Gate | 结果 | 影响/下一步 |
|---|---|---|
| 事故配置与资产核实 | PASS | 三组件完整性核实；原事故现场保留 |
| 修复环境及独立CPU环境 | PASS（仅CPU） | 不可外推GPU稳定性 |
| 只读落盘监控 | PASS（限定窗口） | 真实Windows/WSL记录；原生独立性和更全面传感器待补 |
| 事故错误处置 | BLOCKED | 仍无当次可分析dump，驱动/显存/供电/链路根因未区分。需要Windows管理员只读导出可获得的LiveKernelReports/WER证据，不改ACL；没有当次dump则明确保留缺失 |
| 板卡/供电资料 | BLOCKED | 已知改装卡；仍缺电源型号/额定功率、显卡供电接法及事故后症状更新。先核实资料，不要求擅自拆机或修改VBIOS/驱动 |
| CUDA最小计算 | NOT_RUN | 门禁未满足，禁止自动递进 |
| 首次出片 / 重复运行 | NOT_RUN / NOT_RUN | 无新样片，不下载暂不可用的大权重，不以安装完成代替首次出片 |
| 生产适用性 / 人工画面评价 | NOT_EVALUATED / NOT_EVALUATED | 生产Wan STOP不变 |

已通过异步问题请求持有人补充供电和修复后症状，交付时若仍无答复则保持未知，不推断正常。Windows两个Python的实际GPU用途不能从解释器路径推定；不擅自停止它们。先完成事故/硬件/监控审查，再单次CUDA、检查宿主事件，之后才安排单个短模型样本；3—5秒办公/科技/首帧动态化素材在这之后逐级进行。任何设备错误停止当轮，不换模型继续。

## 7. 交付与实测边界

- 工具/固定版本/命令：[试验说明](../../experiments/local-video-recovery/README.md)。
- 详细本地证据：`orchestrator/output/local-video-recovery-20261029/`（已忽略，不提交环境/模型/宿主日志）。
- 六项单元测试PASS：缺失/过期/变更证据、持久STOP、宿主失联/事件、资源与恢复动作门禁；不运行GPU。
- 真实执行：CPU依赖/导入/算子、三次短只读监控、三文件全量SHA、缺审查CUDA入口拒绝。
- 未实现/未验证：模型采样受控接线、CUDA成功路径、黑屏时logger存活、首次及重复出片、画面人工验收、生产可靠性。没有压力测试、驱动/内核/TDR/VBIOS/时钟变更、模型推理或业务启停。

**本轮结果不是恢复失败的新事故，也不是恢复完成：已把事实、证据和运行门禁补齐到可审核状态，停在真实恢复条件缺口。**

## 8. 门禁收敛v0.2（现行）

仍为main/HEAD `cc562624…`，保留未提交修改、全部旧事故报告、原服务attempt-state及已有STOP；没有改变环境、驱动、TDR或生产配置。本次用户明确要求只改方案和工具，CUDA/采样均未启动。

### 8.1 分级及每项门槛的依据

| 项目 | A：单次64×64 FP32 | B：Wan2.1 T2V-1.3B单样本 | C：有限重复 / 生产 | 依据与变更 |
|---|---|---|---|---|
| 既有事故 | 读完/承认残余风险即可，不要求根因清零 | 复核A结果、错误及预期算子差异 | 重复证据及残余风险复核 | 历史TDR是事实，不是每级都必须先证明根因的条件 |
| 当次dump | 尽力获取，缺失是诊断限制，不单独阻断 | 继续保留缺失，不自动要求先补到才采样 | 作为可靠性证据缺口保留 | dump能帮助定位故障，但“未取得”不能推出当前最小CUDA一定不可验证 |
| 空闲显存28GiB | **删除** | 也不盲用，预算待按真实组件/卸载/形状制定 | 根据B及重复实测复核 | 源自旧5B工作流的保守资源条件；没有64×64或1.3B必要性证据 |
| 空闲显存4GiB | 保留入场/运行停止线 | 保留共享桌面余量，另加样本预算 | 延续、按实测再审 | 是已有共享桌面保护余量，不是矩阵数学下限；目前没有缩减它的实测依据。只移除跨级28GiB，不顺便降低既有停止保护 |
| 核心75°C停止线 | 保留 | 保留 | 保留 | 本机恢复实验的保守保护政策，不是厂商损坏温度或显存温度，也不能从低温证明整卡可靠 |
| 利用率15% | 改为WARN | 调度干扰依据，结合已识别计算任务判断 | 同B | 桌面已实测短峰22%；一个百分比不能判定重推理或小矩阵安全性。已知重任务仍不并行、不擅自停止 |
| NVML3秒/心跳8秒 | 保留 | 保留 | 保留 | 宿主约2秒采样，允许查询与调度余量；这是监控失效截止，不是TDR阈值，不延长WindowsTDR |
| CUDA30秒截止/结束后8秒观察 | 保留，仅A | 不能套用，需独立加载/采样/解码期限 | 按有限计划执行 | A覆盖进程导入和极小算子，有界超时不是性能目标；B完整阶段明显不同 |
| 审查1小时有效 | 保留现场复核时效 | 同A | 同A | 限制当前设备/消费者快照变旧；不要求每小时重新提供电源铭牌。实际执行仍检查实时监控/共享锁 |
| UUID、恢复动作、设备事件 | 必须身份一致、recovery=None，无新待处理设备异常 | 同A | 同A | 防止错卡或已知异常下继续。新设备事件即STOP；不把日志未报错宣称稳定 |
| 宿主独立落盘 | 已验证，实际运行时需新鲜心跳 | 同A | 同A | 原生Windows进程、本地磁盘；不依赖WSL日志进程存活 |
| 热点/显存结温/PCIe实时计数 | 非必需，明确UNAVAILABLE | 作为监控限制和风险项，不伪造可测 | 纳入持续负载可靠性审查 | 不因WSL/NVML不支持就要求永久无法完成的前置证明 |
| 电源型号/功率、供电连接 | 不阻断A，保留风险记录 | 必须据资料评估，未知则B不放行 | 同B | 这是持续模型负载判断所需，不能套到极小矩阵；如报告明显硬件异常则A也停止 |
| 事故后黑屏/花屏/重启 | 必须先取得症状更新 | 同A | 同A | 宿主事件不能完整覆盖屏幕症状；不能默认未知为无复发 |
| 其他GPU消费者 | 识别并记录，避免已知重任务并行 | 同A并核算预算 | 同B | 不要求停止所有浏览器/桌面，也不从进程名推断模型在运行 |
| STOP与重试 | 保留所有历史记录，新异常不自动清锁/重试 | 不自动换模型或重试 | 只按明确有限计划，生产另行授权 | A通过不授予B/C执行权，日志测试通过不等于恢复完成 |

矩阵一个FP32 64×64张量仅16KiB，三份此大小张量约48KiB；实际还含临时量、CUDA上下文及cuBLAS内部资源，因此不能宣称总用量仅48KiB。但没有据此要求28GiB的依据。[cuBLAS官方接口文档](https://docs.nvidia.com/cuda/cublas/index.html#cublascreate)说明库句柄和内部资源需要另行考虑；本机尚无CUDA初始化实测峰值。4GiB只是沿用共享桌面保护政策。

### 8.2 dump及进程核实的实际结果

- 新增只读`host-dump-export.ps1`；未升权、不改ACL、不删原件、不改转储/TDR设置。LiveKernelReports根目录拒绝访问；WER26个子目录拒绝访问；Minidump可读5个旧文件，均非事故当次；MEMORY.DMP仍不存在。**本次未获得当次dump**，不把拒绝访问写成确认不存在。
- 已将事故窗口相关System129条、Application53条事件的原始XML导出到Windows本地；dump导出结果为`NO_INCIDENT_DUMP_OBTAINED`。可读且时间/名称匹配的dump才复制并记录SHA；本次匹配数为0，不把旧dump充作当次证据。
- 两个Python PID35652→35772是父子链，均运行`-m hermes_cli.main`且含gateway子命令；本地Hermes CLI源码说明其为消息网关。三次GPU引擎快照未见这两个PID活动；只能确认用途/当前观察，不保证未来不调GPU。没有结束进程或读取其凭据配置。
- 原生Windows监控的启动端已退出、记录进程仍存活且继续落盘，已实证。没有重启WSL或制造驱动故障；不能外推整机黑屏/断电时存活保证。[微软Start-Process说明](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process?view=powershell-5.1)是启动方式依据，实际文件/PID记录才是本机证据。

### 8.3 当前GO/NO-GO与最少用户信息

**A级当前NO-GO：仅“事故后是否再次黑屏/花屏/异常重启”尚未答复。责任人：持有人；具体动作：回复有/无，有则给大致时间。** 缺dump、根因未明、PSU型号未知、缺热点/PCIe传感器均不列为A独立阻断。当前审查JSON的真实输出仅有`post_incident_symptoms: not satisfied`。

已一次性请求且只需三项资料：①电源型号与额定功率；②显卡供电连接（原生线/转接头、是否独立线）；③事故后上述症状是否复发。前两项用于B，第三项用于A。可凭已有资料回答，不要求带电拆机。若症状有复发，先核对时间及对应事件再判断，不能自动标为通过。

当前指令另明确禁止本轮运行计算，即使资料补齐也不自动启动。实际下次执行前刷新状态/原生监控和合作锁，是运行时检查，不是额外资料问卷。

**B仍缺实现（责任人：执行Agent）：** 单样本模型组件获取及SHA/许可闭包、1.3B与UMT5/Wan2.1 VAE兼容加载、固定合法尺寸/帧数/采样参数、单独资源预算与各阶段时限、显式标准算子/卸载接线、只允许一次提交的执行器、真实采样进度/解码/编码阶段日志、成片解码与画面验证。A探针的30秒、4GiB保护余量不能冒充B预算。没有运行旧serve.py代替这些实现。

**C仍未获准/未实现：** B结果复核、受控重复计划/次数、重复证据与人工画面验收；生产使用还须独立裁定，工具不自动更改生产配置。

## 9. 故障日志持久化补充（无GPU验证）

沿用同一恢复工具，新增共享文件持久化助手及CPU测试，不重建监控系统。每次试验自动生成UTC时间+随机后缀runId；宿主/WSL必须同ID，目录存在即拒绝覆盖。保存环境发行包/解释器、源码摘要、模型版本与完整本工具参数、PID、起止时间、状态及产物路径。不保存环境变量全集或其他服务完整命令行/令牌。

### 9.1 双侧准确位置与写入机制

已验证runId：**`20261029T052746Z-cadfc5bc8d1f`**。

- Windows：`C:\Users\admin\video-recovery\runs\20261029T052746Z-cadfc5bc8d1f\`。从Windows本地归档脚本原生独立启动，stdout/stderr、telemetry、状态及事件均在Windows本地磁盘；WSL启动端返回用时约0.43秒，记录继续约37秒并正常停止。
- WSL：`/home/chen/work/video-pipeline/orchestrator/output/local-video-recovery-20261029/gate-refinement/durable-wsl-verified/`。`run.json`、`stages.jsonl`、`telemetry.jsonl`、`host-mirror.jsonl`、launcher stdout/stderr独立保存。
- 本地归档：`orchestrator/output/local-video-recovery-20261029/gate-refinement/archives/20261029T052746Z-cadfc5bc8d1f.tar`及SHA清单。归档不删来源、不清STOP。

Windows JSONL每条Flush(true)，stdout/stderr是WriteThrough+AutoFlush文件流，正常结束再Flush(true)。WSL JSONL/阶段/状态逐条fsync；CUDA子进程（未执行）预置`-u`与O_DSYNC独立stdout/stderr。重要阶段立即写；原始输出不只在退出时保存。系统/库缓存及物理断电边界仍存在，不能承诺任何故障下最后一字节必然留存。

同runId和带时区时间戳用于两侧关联。可获取指标逐项标`SUPPORTED`；显存结温、热点与PCIe错误计数为`UNAVAILABLE`/null，不填0。前后事件快照保存时间、Provider、ID、RecordId和原始XML；本次前后均0条相关新事件，事故历史XML另已导出，不伪造现场新事件。

实际可提供阶段：监控开始/停止、子进程创建，以及CUDA探针自身的导入、初始化开始/完成、小矩阵结果（**CUDA阶段本轮均未执行**）。模型加载、采样进度、VAE解码、视频编码尚无执行器，明确未实现；CPU测试使用fixture名称和simulation标签，不冒充模型阶段。

### 9.2 真实验证及失败保留

| 检查 | 结果与证据 |
|---|---|
| Windows启动端退出后继续记录 | PASS；有启动器已退出/记录器仍活的快照；最终验证记录18个宿主样本，同ID，stdout11744字节，stderr0字节（本次无错误输出） |
| WSL记录结束后宿主仍写入 | PASS；宿主最后记录晚于WSL monitor结束；WSL `MONITOR_ONLY_PASS`，宿主`NORMAL_STOP` |
| 正常停止请求 | PASS；只写自己run目录的stop.request，记录结束时间和NORMAL_STOP；不结束其他服务 |
| CPU正常进程stdout/stderr | PASS；退出前已可读，8条stdout、39字节stderr，最后阶段fixture_completed |
| 受控终止CPU测试进程 | PASS；终止前输出已刷新，6条stdout、39字节stderr，最后阶段fixture_progress；保存STOP_INCOMPLETE及测试STOP，无自动重试 |
| 模拟设备事件 | PASS；仅测试目录构造SIMULATED事件/rawXML，触发该目录STOP，不向Windows事件日志注入，不污染真实故障锁 |
| 归档 | PASS；正常及未完成状态分别归档，来源保留、SHA记录，不覆写旧日志 |
| 门禁单元测试 | 10项PASS；仅CPU/文件/模拟逻辑，不证明恢复完成 |
| 真实黑屏、断电、驱动故障存活 | NOT_TESTED；没有制造，不能外推 |

日志接线调试中出现过原生启动兼容/超时、Windows PowerShell空备份路径File.Replace失败；未完成RUNNING及.tmp、已写stdout/遥测全部保留，未倒改为成功。已修正采用明确备份路径的原子替换，最终正常停止及归档通过；失败run `20261029T052643Z-7472e516ec84`以`-incomplete.tar`单独归档，保留原始未完成状态。失败后的修正验证只涉及日志程序，不是GPU/模型重试。

### 9.3 命令与失败后排查

真实启动/正常停止/归档/模拟验证命令集中在[恢复工具说明](../../experiments/local-video-recovery/README.md)，不在生产入口新增依赖。关键入口是`native-monitor.py`、`recovery.py monitor --host-log`、`native-monitor.py --stop-run`、`archive-logs.py`、`log-validate.py`。

失败先看：①全局STOP及WSL run.json/stages.jsonl；②Windows host-state/STOP/bootstrap-error；③两侧原始stdout/stderr与最后真实阶段；④同runId的遥测及前后原始事件；⑤转储导出结果。缺结束时间或停在RUNNING就是未完成，不自动清锁、补写成功或启动下一模型。完整日志/档案路径和版本证据在`gate-refinement/durable-log-validation.json`、`log-validation-final/validation.json`与`review-v2.json`。

**本轮CUDA=NOT_RUN，模型采样=NOT_RUN；日志准备完成不触发恢复推理。**

## 10. 持有人症状确认与单次A验证授权（2026-10-29）

持有人明确确认：“事故黑屏重启后，未再次出现黑屏、花屏、异常重启或风扇高速且无法恢复。”该答复解除A的症状资料缺口，不表示事故根因已查明或硬件稳定性已通过。

本次授权仅运行一次初始化、小张量/矩阵、显式同步、CPU对照、退出；启用Windows原生独立监控及WSL持久日志。不得加载Wan、采样、压力测试、自动重试或清除STOP。以下执行结果以实际新run记录为准；原第8/9节的NO-GO及NOT_RUN保留为此前检查点。

### 10.1 运行前检查与唯一执行

runId：`20261029T053405Z-f4150e9ca742`。仓库仍为main/HEAD `cc562624f8d36cf06fde9e373e72e5451e973ce1`，相对本地origin/main无领先/落后；保留既有工作区，未fetch、提交或推送。

- 运行前没有全局STOP；合作式GPU锁及试验锁可获取，执行时再次持有。唯一NVIDIA GPU的UUID与配置一致，recovery action=None，温度33°C、空闲44429MiB，满足A的4GiB共享桌面保护余量。
- 从修复检查点2026-10-27 21:02起查询System相关事件，未见新nvlddmkm/WHEA/Display4101/Kernel-Power41等；查询无错误。未将旧事故或WER重报历史dump当成新事件。
- 当前compute-app查询为空；未见Comfy/TTS/Qwen对应端口监听。Windows两Python仍为Hermes Gateway父/子链，GPU引擎快照为空。未启停其他服务。
- 新run单独保存持有人确认、读数、主机事件原始XML、review及摘要。独立原生宿主记录器覆盖review时间起的事件，心跳、runId与UUID验证通过；`gate-decision.json`真实记录`GO_FOR_SINGLE_STAGE_A_ONLY`。
- 实际只调用一次既有`recovery.py monitor --stage A --cuda`，未修改探针/门槛。调用参数在本run的`invocation.json`；计算子进程PID2559637，退出返回码0，随后确认`/proc/2559637`已不存在。

### 10.2 实际结果与指标

| 项目 | 本机实测 |
|---|---|
| 运行环境 | 独立venv，torch2.11.0+cu130，CUDA构建13.0；没有启动ComfyUI或模型加载 |
| 工作量 | 一次64×64 FP32 arange/缩放、矩阵乘法；单CPU线程，TF32关闭；没有循环压力负载 |
| CUDA初始化 | PASS，日志中的开始→完成约0.100秒 |
| 同步与正确性 | 显式torch.cuda.synchronize执行；有限值断言和CPU矩阵对照通过，atol/rtol均1e-4 |
| 数值误差详情 | 仅记录断言通过，没有记录最大绝对误差；不为补指标再次运行 |
| 导入→结果记录 | 约2.654秒，包含torch CPU导入；不是纯GPU核耗时。初始化完成→计算及检查报告约0.332秒 |
| 含前后监控总窗口 | WSL约24.506秒、23个样本；原生宿主32个样本；计算子进程结束后完成至少8秒宿主观察 |
| torch已分配显存峰值 | 8581120字节，约8.18MiB；不包含全部CUDA上下文/驱动占用 |
| NVML整卡采样显存峰值 | 4644MiB，含桌面及其他非计算消费者，不当作本探针独占显存 |
| 核心温度/功耗采样最高 | 两侧采样均最高34°C、63.37W；不是捕获全部瞬态，也不证明持续负载稳定 |
| 利用率采样最高 | WSL9%，宿主23%，含桌面活动；不是矩阵性能基准 |
| 不可获取指标 | 显存结温、热点、PCIe错误计数仍为UNAVAILABLE/null |
| CUDA stderr | 0字节；未出现计算错误、超时或自动重试 |
| 宿主事件 | 运行前、原生before/after、额外postflight及宿主遥测均0条新增相关设备事件；事件查询无错误 |
| 退出后状态 | CUDA进程已退出，postflight recovery=None、核心33°C、空闲44416MiB；原生logger正常请求停止，状态NORMAL_STOP |

结果：**PASS_STAGE_A_SINGLE_CUDA_ONLY**。这只证明本次环境能完成这一极小CUDA路径，不证明事故根因解决、全部扩容显存可靠、负载/重复运行稳定或Wan生产适用。

### 10.3 日志、STOP与下一步

- WSL完整记录：`/home/chen/work/video-pipeline/orchestrator/output/local-video-recovery-20261029/stage-a/20261029T053405Z-f4150e9ca742/`。先看`result.json`，再看`gate-decision.json`、`compute/run.json`、`compute/stdout.log`/`stderr.log`、`compute/stages.jsonl`及前后事件。
- Windows独立记录：`C:\Users\admin\video-recovery\runs\20261029T053405Z-f4150e9ca742\`。含runId、PID、实时stdout/stderr、host.jsonl、host-state、before/after原始事件XML。
- 完整归档：`orchestrator/output/local-video-recovery-20261029/stage-a/archives/20261029T053405Z-f4150e9ca742.tar`（204800字节），SHA-256 `76a7aa57e89aada0f7f2c38fb5494f2d3367eb9ac768e3a1c9fcd604da3a0b11`。含两侧记录和控制锁/尝试记录；来源未删除。
- 全局`local-assets/experiments/video-recovery-20261029/STOP.json`按既有机制在计算前写入、**成功后仍保留**。该条是试验保护锁，不是本次新故障；未清锁、归档移走锁、覆盖旧现场或再次运行。原事故attempt-state与生产/BGM/服务文件摘要复核不变。
- 下一步仅建议进入B级准备审查：补供电资料、完成1.3B组件/资源预算/标准算子与单样本有界接线。当前授权只含A，不自动进入模型采样；B/C及生产适用性仍未通过。生产Wan STOP保持不变。

## 11. B级Wan2.1 T2V-1.3B单样本准备（2026-10-29）

**结果：BLOCKED_BEFORE_MODEL_LOAD。** 持有人已明确授权B级单样本，但既定`hardware_power_review`仍缺电源型号/额定功率、显卡供电连接方式。该项此前就在B级门禁中，本轮未新增门槛，也未将A成功当作供电资料。已通过异步问题一次性请求两项资料；在未收到前继续完成全部不依赖该答复的准备，未启动模型负载。

### 11.1 A结果与保护锁归档

本轮仓库仍main/HEAD `cc562624…`，既有.gitignore、PROGRESS和恢复工具修改保留，无fetch/提交/推送。重新核实A的PASS、退出码0、进程已退出、前后事件0及归档SHA；确认STOP仅有该次A的预写保护记录，不是设备故障记录。

在持有试验锁和合作GPU锁期间，按本期明确授权将原STOP**原子重命名**至：

`local-assets/experiments/video-recovery-20261029/stop-archive/20261029T053405Z-f4150e9ca742-to-20261029T053922Z-92112f18def3/STOP.json`

原始字节与SHA一致，旁有transition.json，B目录有a-stop-archive.json；没有直接删除、改写、忽略或绕过锁。此举只结转已成功A试验的保护锁，不开启生产Wan，也不删除原Comfy事故attempt-state。B真正启动前会再次写自己的STOP及持久一次性消耗标记。

### 11.2 模型、来源及许可

本轮准备runId：`20261029T053922Z-92112f18def3`。此前没有1.3B扩散权重/Wan2.1 VAE，故只下载以下两项，总计3091919846字节；没有重新下载已有UMT5或Wan2.2资产。

固定来源：[Comfy-Org/Wan-2.1模型卡](https://huggingface.co/Comfy-Org/Wan-2.1/blob/123acf1cc74bccbb9bfff8ac1ee72edc08c2341d/README.md)，revision `123acf1cc74bccbb9bfff8ac1ee72edc08c2341d`；完整SHA与该固定来源的LFS对象SHA一致。

| 文件 | 字节数 | SHA-256 |
|---|---:|---|
| wan2.1_t2v_1.3B_bf16.safetensors | 2838104528 | `6f999b0d6cb9a72b3d98ac386ed96f57f8cecae13994a69232514ea4974ad5fd` |
| wan_2.1_vae.safetensors | 253815318 | `2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b` |

本地：`local-assets/experiments/video-recovery-20261029/wan21/`。权重卡声明Apache2，与[原Wan2.1权重仓固定LICENSE](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/blob/37ec512624d61f7aa208f7ea8140a131f93afc9a/LICENSE.txt)分开核对并保留许可证；不是仅凭ComfyUI代码许可证判定。核验日期2026-10-29，原始模型卡/API、来源URL及manifest保留在B输出目录/source-records和stage-b-preparation目录。没有下载其他候选或附加LoRA/加速权重。

UMT5复用原文件：其4096维、256384词表与固定Comfy的WanT5/UMT5结构一致；嵌入spiece_model SHA `e3909a67b780650b35cf529ac782ad2b6b26e6d1f849d3fbb6a872905f452458`与官方Wan2.1分词器LFS SHA一致。CPU上对真实FP8权重的4096个元素进行eager反量化，有限值检查PASS。**这验证结构/分词器和局部算子，不证明完整文本编码或与官方bf16权重数值等价**。本轮未进行完整T5编码，未下载另一份文本编码器。

VAE为Wan2.1的16通道版本，未用Wan2.2 VAE替代；其头部形状、BF16存储已核对。1.3B权重通过meta形状张量调用固定Comfy的model_detection，正确识别WAN21_T2V、dim1536，未实例化或加载GPU模型。

### 11.3 固定单样本参数及接线

| 参数 | 拟执行的固定值及依据 |
|---|---|
| 尺寸/序列 | 256×448，17帧，batch1，16fps，约1.0625秒；固定节点宽高16倍数、长度4n+1，Wan2.1空间压缩8/时间压缩4，latent为[1,16,5,56,32] |
| 采样 | 8步、cfg6、shift8、uni_pc/simple，seed20261029；步数在现有KSampler范围，cfg6有官方示例依据，WAN21默认shift8 |
| 提示词 | 安静现代工位、合上的笔记本和绿植、窗边蓝色晚光、轻微镜头运动；无人物、文字、logo或新闻现场。完整正负提示见wan21-profile.json |
| 精度 | 扩散BF16；现有scaled FP8文本权重在CPU上走full_precision_mm的FP32计算路径；VAE CPU FP32；完整文本计算路径尚未实际执行 |
| 卸载 | 文本与VAE固定CPU；扩散权重CPU存放、采样时CUDA、结束卸载；同步/pageable内存，禁用async offload、pinned memory、dynamic VRAM及fast-disk |
| 标准算子 | 仅PyTorch math SDPA；关闭flash/memory-efficient/cuDNN SDPA、comfy-kitchen非eager后端、xformers、Triton、编译和CUDA graphs；使用native分配器，不调用旧serve.py或自定义节点 |
| 资源预算 | 空闲显存≥14GiB：2.65GiB权重+4GiB激活/math注意力余量+2GiB上下文/分配器余量+4GiB桌面余量向上取整；主机可用内存≥48GiB。都是保守规划值，不宣称实测峰值；原75°C/运行中4GiB停止线保持 |
| 时间上限 | 子进程总240秒；bootstrap45、TE加载60、正/负编码各90、扩散加载45、采样90、VAE加载30/解码90、编码20秒。各阶段上限不累加突破总限；监控280秒，原生宿主300秒覆盖前后窗口 |

尺寸、序列和步数均偏离常见官方480P/81帧配置，**只用于受控运行验证，不能据此评价模型正常画质**。没有把帧数或分辨率随意设置成不被实现支持的值。

接线复用既有recovery.py的双侧监控、日志、共享锁、STOP和阶段超时，仅增加B分支和wan21-child.py。直接调用固定Comfy的加载/编码/采样/VAE核心及系统FFmpeg，不启动HTTP服务、不修改生产入口或其他环境。VAE采用一次核心解码，避免默认OOM后自动分块重试；采样完成时保存latent，编码stdout/stderr也实时落盘。任何异常保留现场，不重复提交、不换模型。

B启动前持久写sample-attempt-consumed.json，最多一次；没有该标记且请求/模型/配置/审查/实时监控全部满足才可启动。成功子进程退出后仍须validate-wan21-output.py检查尺寸/帧数/fps/全解码并复核宿主事件，不能直接把退出码当成首次出片验收。

### 11.4 实测、阻断和交付状态

- CPU检查：全部实际配置参数可解析；显式切到CPU检查模式后CUDA未初始化；eager反量化4096元素有限值PASS；CPU latent/noise形状PASS；Comfy采样、VAE prepare_decode接口及meta模型识别PASS。第一次检查将--cpu与--lowvram同时传入而被argparse拒绝，记录保留；修正为先解析真实配置，再仅在该CPU检查进程覆盖设备模式，没有GPU尝试或包升级。
- 12项测试PASS，含B供电缺项时不查询GPU/不创建模型进程/不消耗样本次数，以及配置边界/禁用加速路径检查。成功GPU路径、完整T5编码、VAE真实解码及MP4验证仍NOT_RUN；不以测试通过宣称业务恢复完成。
- 最新准备快照GPU33°C、空闲44292MiB，compute-app无计算任务；A结束后未见新增相关宿主事件。该快照只记录准备期，真正采样前还必须刷新资源/消费者/事件并启动同runId原生监控；目前没有为阻断的采样启动新宿主logger。
- **唯一外部资料阻断：hardware_power_review。责任人持有人；具体动作：提供电源型号/额定功率及显卡原生线/转接头/独立线的接法。** 不要求带电拆机，不要求先查清全部历史根因。当前真实readiness评估仅返回该项，不能用桌面21W等读数推断电源规格。
- 实际模型/CUDA初始化次数0，未创建sample-attempt-consumed，未加载Wan、未采样、没有MP4；PyTorch峰值/模型耗时为未测，不填0。最后完成阶段为CPU接口、meta权重识别和FP8局部反量化。没有原始模型错误，属于门禁前阻断，不是一次生成失败。

输出：`orchestrator/output/local-video-recovery-20261029/stage-b/20261029T053922Z-92112f18def3/`；先看result.json/gate-decision.json，再看assets/许可、sample-request、readiness-review、CPU检查stdout/stderr和测试记录。`experiments/local-video-recovery/README.md`提供真实已实现入口，明确GPU成功路径未执行。原生产配置、服务/锁文件及原事故状态摘要复核不变；A STOP归档原件SHA再次核对一致。

下一步：收到供电资料后在本次B授权范围内继续现场复核并决定一次单样本；若有新异常仍立即STOP，不自动重试。不自动扩大配置、不进入Wan2.2、重复运行或生产使用。

### 11.5 持有人补充电源型号

持有人提供：**长城黑匣子2200W，铂金全模，ATX3.1**。作为持有人报告的本机资料保存，不冒充已核对铭牌/厂商手册，也不据额定功率证明板卡供电稳定。

持有人进一步表示“应该是电源模块供电吧”。这说明的是对全模组电源的理解，尚不能确认实际显卡端是原配单根显卡供电线直连，还是多根8pin经转接头；当前消息没有可供分析的接线图片，不虚构视觉核实。

电源型号/额定功率资料缺口已解除，**剩余硬件资料仅为实际显卡线缆/转接连接方式**。证据保存在本B run的holder-power-confirmation.json；readiness-review保留WAITING_CONNECTION_DETAILS，未伪标SATISFIED。实际模型尝试仍0，生产Wan STOP保持；历史review/result版本另存，不覆盖旧结论的证据。

### 11.6 持有人提出先按转接记录

持有人表示“我们先按转接的来吧”。已在本B run的holder-adapter-assumption.json记录为**ASSUMED_ADAPTER_NOT_PHYSICALLY_VERIFIED**，不是接线照片、实际线缆规格或规范连接的验证，不据此伪标门禁通过，也不认定历史黑屏由转接造成。

“使用转接”本身不等于供电有问题：[NVIDIA RTX4090官方快速指南](https://www.nvidia.com/content/geforce-gtx/GeForce_RTX_4090_QSG_Rev1.pdf)明确列有配套转接供电配置，并要求相应独立供电线。这是标准官方卡的参考，不能当作本机改装卡/未知转接头已获验证。实际线缆匹配与连接情况比“转接”标签本身更有判断价值；2200W总额定功率也不能单独证明显卡端连接可靠。本轮没有启动GPU模型，原门禁/事故证据保留。

## 12. 按转接假设继续后的唯一B尝试：启动保护检查失败

### 12.1 供电审查范围的明确修订

持有人已提供长城黑匣子2200W铂金全模ATX3.1，表示“我们先按转接的来吧”，随后询问继续。本轮将“必须看清实际接线”从这个小配置单次试验的绝对否决条件，改为**记录并保留的残余风险**：已知型号/额定功率、无复发症状、A级通过、转接本身为官方支持的一类供电方式，结合固定低配置/实时监控/一次即停后允许本次诊断。

这修订了此前过于绝对的接线未知门禁，**不是宣称实际接线已验证安全**。policy0.3.1及bounded-hardware-review.json明确physicalConnectionSafetyVerified=false、ASSUMED_ADAPTER_NOT_PHYSICALLY_VERIFIED；hardware_power_review的SATISFIED只表示接受本次限定范围的风险审查，不表示物理确认。没有降低75°C、运行中4GiB余量、14GiB入场预算或任何超时，不涉及重复/压力/生产。标准官方卡的参考也不是改装卡认证。

### 12.2 运行前与实际执行

- 仍使用B runId `20261029T053922Z-92112f18def3`，其此前仅准备、未消耗机会；A STOP归档原件再次核验，未清除新/旧故障锁。
- 重新完整SHA核实两项新权重与已有UMT5；已有A/模型/许可证据保留。资源前检GPU33°C、空闲44345MiB、主机可用约120.30GiB、recovery=None；无其他compute-app消费者，无新增相关宿主设备事件。
- Windows独立logger于本机14:03:18左右启动，覆盖新review时间；原生心跳、runId、UUID检查通过。实时审查记录为GO_FOR_ONE_FIXED_B_SAMPLE_WITH_DECLARED_HARDWARE_UNCERTAINTY。
- 固定参数仍为256×448、17帧、8步、BF16、seed20261029，TE/VAE CPU，禁用加速/异步。仅调用一次B子进程入口，启动前写入sample-attempt-consumed及全局STOP。
- 子进程PID2596363，真实阶段日志只有bootstrap_started；父监控约19.394秒后以STOP_INCOMPLETE结束，返回码2，子进程已退出。**文本编码0次、扩散权重加载0次、采样0次、VAE解码0次、视频编码0次，无MP4。** 尽管未到采样，机会已消耗，不自动重试。

### 12.3 原始错误与只读定位

原始stderr：`sample/stderr.log`，核心错误为：

```text
wan21-child.py:37
assert torch.backends.cuda.math_sdp_enabled() and not torch.backends.cuda.flash_sdp_enabled() and not torch.backends.cuda.mem_efficient_sdp_enabled()
AssertionError
```

这是本地试验接线中的设置顺序错误：child先禁用flash/memory-efficient SDPA，再import comfy.sd；该导入链加载固定Comfy的model_management.py，其548—550行在ENABLE_PYTORCH_ATTENTION分支重新启用math、flash和memory-efficient SDPA。因此导入后的保护检查不满足“仅math”，主动停止，尚未加载权重或执行采样。已静态定位代码分支；本次没有把每个flag的运行时值逐项写出，不补造读数。

此问题本应在前置检查中覆盖；此前CPU模式检查没有覆盖实际GPU导入分支。保护检查起效，不能将12项测试通过当作完整接线已通过。没有把这个AssertionError当作GPU设备错误或供电故障，也不能据此排除历史事故的其他原因。

### 12.4 设备、指标与证据保全

- 监控期整卡采样峰值：4679MiB、核心34°C、63.74W、利用率18%，均含桌面活动；不是模型推理峰值，因为模型未加载。PyTorch峰值未测，失败点在reset/peak-report之前，不填0。
- before/after原始宿主事件、额外postflight及连续宿主记录均没有新增相关设备事件，查询无错误；退出后recovery=None、核心33°C。不能据此宣称整卡稳定。
- 全局STOP及一次性消耗记录保留，没有清锁、换模型、改配置或追加尝试；仅正常停止本工具的Windowslogger，状态NORMAL_STOP，不启停其他服务。生产配置/原服务/事故文件摘要复核不变。
- 失败源码快照保存在本run的failed-source-snapshot，包含实际child、监控器、policy/profile、Comfy分支片段与SHA。完整两侧日志和控制记录归档到 `orchestrator/output/local-video-recovery-20261029/stage-b/archives/20261029T053922Z-92112f18def3-failed-bootstrap.tar`；来源不删除，archive-receipt记录SHA。
- 结果入口：`orchestrator/output/local-video-recovery-20261029/stage-b/20261029T053922Z-92112f18def3/result.json`。先看rawModelError、sample/stderr、model-stages、run状态，再看宿主事件及STOP。

结论：**FAILED_BOOTSTRAP_OPERATOR_GUARD；首次出片未通过，重复/生产未评价。** 下一步建议把后端策略设置放到Comfy导入后并增加GPU导入分支的无计算检查，同时补齐失败路径的逐flag/退出码记录；本轮不修改后再重跑、不清STOP。后续实际尝试须另行明确裁定，不能复用这次已消耗的机会。生产Wan STOP保持不变。

## 13. 注意力初始化顺序修复（只改代码和CPU回归，无视频）

### 13.1 同一次失败核对，不新增计数

本次回报对应第12节**同一失败**，不是又执行一次：

- B runId：`20261029T053922Z-92112f18def3`，PID2596363。
- 父监控：`2026-10-29T06:03:59.716516+00:00`至`06:04:19.110370+00:00`，即北京时间14:03:59—14:04:19。
- 一次性消耗记录：`06:04:10.583300+00:00`；bootstrap_started：`06:04:10.633389+00:00`。
- B累计子进程尝试1，采样0；**本修复任务新增子进程/采样尝试0**。CPU测试进程不计入视频尝试。

本轮验证编号`20261029T061017Z-613c9cb75ed6`仅用于独立的修复证据目录，不是B试验runId。原trace的wan21-child.py:37对应failed-source-snapshot中的失败版本，不能用修复后的当前行号解读为新错误。attempt-audit.json核对了上述时间和次数。

### 13.2 修改位置与防覆盖范围

- `experiments/local-video-recovery/wan21-child.py:28–44`：先导入sd、sample、model_management、ops、attention、Wan和T5等相关模块，再安装MathAttentionPolicy；记录施加前和施加后真实开关，保留原math/flash/memory-efficient保护断言，并增加cuDNN检查。attention_policy_checked与bootstrap_completed必须先于第一份权重加载。
- 新增`experiments/local-video-recovery/attention_policy.py`：进程内设置math=True、flash/memory-efficient/cuDNN=False、kitchen仅eager；不改共享Comfy源码或生产配置。每阶段及每次注意力调用检查实际状态，发现后续改写就断言停止，不静默重设或放宽条件。
- 发现第二层绕行：固定Comfy `comfy/ops.py:70–92`在大输入路径用sdpa_kernel(SDPA_BACKEND_PRIORITY,set_priority=True)，原列表包含Flash/cuDNN/Efficient，可能在调用期间覆盖全局禁用状态。现将该进程的列表限制为[MATH]，在实际SDPA入口额外使用仅MATH上下文并核验；只移动初始化语句不足以解决此问题。
- 固定Wan self/cross attention走其导入的optimized_attention；T5通过optimized_attention_for_device(small_input=True)取attention_pytorch。已将Wan导入别名、普通/带mask入口及Comfy ops入口接入同一保护。按层preferred_attention若选择非PyTorch实现，或transformer_options提供optimized_attention_override，会在调用前拒绝，不能绕过检查直接调用Flash/Sage等实现。
- 对固定源码和已用包搜索后，显式全局SDPA重设定位在model_management导入分支；调用级优先上下文定位在ops。固定试验脚本后续没有再次启用SDPA后端的代码；即使出现新的漂移，阶段/调用级断言仍保持。自定义节点/编译/优化后端原有禁用配置不变。

此次修复保留并加强保护断言，没有删除它、把检查变为WARN、把断言放到权重加载之后，或修改温度/显存/时间/次数限制。下一次真实GPU试验仍必须先取得bootstrap检查通过记录，再进入权重加载。

### 13.3 无CUDA回归及实测状态

命令（本轮实际执行，使用原独立venv）：

```bash
CUDA_VISIBLE_DEVICES=-1 PYTHONDONTWRITEBYTECODE=1 \
  local-assets/experiments/video-recovery-20261029/venv/bin/python -B \
  experiments/local-video-recovery/check-attention-policy.py \
  --out orchestrator/output/local-video-recovery-20261029/attention-fix/20261029T061017Z-613c9cb75ed6/cpu-verified
```

该输出目录已存在，后续核验应选新目录，禁止覆盖。测试进程将torch.cuda.init及_lazy_init替换为拒绝函数，只创建CPU张量；结束时cudaInitialized=false，没有模型权重加载、采样、Windows监控启动或视频编码。

| 回归 | 结果与范围 |
|---|---|
| 实际Comfy导入复现旧顺序问题 | PASS。导入前math=True/flash=False/mem=False/cuDNN=False；导入后flash=True、mem=True，真实复现旧断言失败，无CUDA初始化 |
| 导入后约束生效 | PASS。math=True，其余三项False；非eager可用后端为空，调用守卫安装状态True |
| Wan/T5实际CPU调用链 | PASS。真实入口及Wan的AttentionTensorContainer路径到达SDPA；在原语调用处采到的flags均仅math |
| 大输入GPU包装分支 | PASS（CPU覆盖）。从固定ops源码抽取该函数的原始AST，在CPU张量上运行，执行真实sdpa_kernel优先列表上下文；列表仅MATH、原语处flags仅math。不是声称GPU分支已在显卡运行 |
| 后续开关/列表被改写 | PASS。重新启用Flash或篡改优先列表会断言，前者在底层原语调用前拒绝 |
| 按层及运行时替代实现 | PASS。非PyTorch preferred_attention和未审查override被拦截，替代函数未调用 |
| 启动/模型加载顺序 | PASS。源码回归检查所有Comfy导入先于策略施加，bootstrap_completed先于所有权重加载入口 |

共7项针对本问题的无CUDA回归PASS；原12项门禁测试亦PASS，未增加机械数量替代真实路径检查。CPU结果和原语处状态保存在`attention-fix/<验证编号>/cpu-verified/result.json`，stdout/stderr同级父目录留存。

**未验证项：** 修复后的真实GPU初始化/完整bootstrap、CUDA上实际SDPA内核选择、完整文本编码、权重加载、采样、VAE/视频输出，以及持续/重复运行稳定性。GPU包装函数在CPU的控制流覆盖不能替代显卡测试；没有据此解除STOP或宣布恢复完成。

### 13.4 证据保全及下一步

原B目录、错误、源码快照、STOP和尝试账本等74个既有文件已做修复前后SHA对照，0差异；原生产/服务保护文件摘要亦一致，共享Comfy工作树未改动。没有更新旧run为PASS、改写旧readiness证据来放行或重置一次性消耗标记；没有新GPU/视频尝试。

主报告与PROGRESS记录本轮为代码修复/CPU验证。下一次受控试验应新建试验审查记录、保留旧失败，在独立监控下先核验attention_policy_checked和bootstrap_completed的实际状态，再加载权重；本轮不执行该步骤，也不自动重试。生产Wan STOP不变。


## 14. 修复版B级单样本受控试验：首次技术出片通过

### 14.1 授权、计数与保护锁

持有人本轮明确授权一次修复版B试验，要求真实GPU启动检查通过后同一进程继续至MP4，正常阶段不再等待确认。新runId `20261029T062208Z-2d5d88bb6a11`；不是复用旧任务，不重置旧消耗标记。**本轮进程调用1次、采样1次；累计B进程调用2次、实际采样1次。** A记录及第12节失败/原始错误保持原状。

前检复核旧失败结果、归档SHA、PID已退出及新宿主事件，旧STOP两条记录均属于软件bootstrap保护失败，没有活动设备异常。持合作monitor/gpu锁后，将旧STOP原子重命名归档到：

`local-assets/experiments/video-recovery-20261029/stop-archive/20261029T053922Z-92112f18def3-to-20261029T062208Z-2d5d88bb6a11/`

原始字节/SHA和transition保留；不是删除或绕过活动异常锁。新试验在子进程启动前写入新STOP及独立一次性消耗标记，成功退出后仍保留。生产Wan STOP从未解除，未改生产配置、共享Comfy、驱动、TDR或其他服务。

供电资料沿用持有人报告：长城黑匣子2200W铂金全模ATX3.1；显卡连接仍为`ASSUMED_ADAPTER_NOT_PHYSICALLY_VERIFIED`。仅本次固定低资源诊断接受该未知项，不代表实物核验或整卡安全认证。

### 14.2 运行前检查与固定参数

- 本地main/HEAD仍为`cc562624f8d36cf06fde9e373e72e5451e973ce1`，与本地origin/main领先/落后0；未fetch，不宣称已查服务器最新。开工工作区原有.gitignore/PROGRESS修改及恢复工具/报告保留，未提交推送。
- 三项模型完整SHA重新核验匹配；固定revision、来源和许可沿用第11节，无下载、安装或依赖变更。执行源码快照/哈希在本run `executed-source/`、`source-manifest.json`，metadata记录独立venv及包版本。
- 前检核心33°C、空闲44064MiB、recovery=None，主机可用RAM满足48GiB预算；compute-app为空。Windows两个Python PID35652/35772仍为HermesGateway父子链，未结束它们。从上次失败结束至本次前检无新增相关系统设备事件，查询无错误。
- 保持已审查profile：Wan2.1 T2V-1.3B BF16，256×448、17帧、16fps、8步、cfg6、shift8、uni_pc/simple、seed20261029、batch1；简洁无人办公桌提示词。UMT5 CPU full_precision_mm、Wan2.1 VAE CPU FP32，扩散GPU BF16，同步卸载/pageable；仅math SDPA/eager，编译/graphs/加速内核/异步/pinned均禁用。
- 运行预算和保护未降低：前置空闲14GiB、运行中4GiB、75°C、子进程总240秒及原分阶段时限；WSL监控280秒、Windows独立监控300秒上限。本次正常完成后主动正常停止本工具logger，无额外样本。

### 14.3 同一进程真实阶段结果

Windows独立logger PID59936，直接写本地C盘，`06:22:35.6840824+00:00`启动，`06:23:59.8279526+00:00`正常停止。WSL父监控从`06:22:36.542220+00:00`至`06:23:54.304976+00:00`，约77.763秒（精确时间以run.json为准）。模型子进程PID2622910正常返回0；原始stderr 0字节。

- 真实GPU Comfy初始化后，`06:22:52.523691+00:00`记录attention_policy_checked：math=True，flash/memoryEfficient/cuDNN=False，priority仅MATH，nonEagerAvailable=[]，SDPA/Wan守卫已安装。
- `06:22:52.536520+00:00`记录bootstrap_completed，随后`06:22:52.550128+00:00`才开始首份权重加载。保留原断言，没有放宽或跳过。
- 同一进程继续文本权重加载、正/负编码、扩散模型加载、8次采样进度、采样有限值检查、一次VAE CPU解码、FFmpeg编码、child_completed；无人工阶段暂停、无后端切换或自动重试。
- 上述检查及真实采样证明该固定进程路径通过保护；未使用CUDA profiler，不能声称有逐kernel trace或扩大到其他模型/配置。

| 阶段 | 实测秒数 |
|---|---:|
| bootstrap | 4.481 |
| 文本模型加载 | 0.538 |
| 正向文本编码 | 12.877 |
| 负向文本编码 | 13.157 |
| 扩散模型加载 | 0.527 |
| 采样（含首次GPU模型准备） | 2.915 |
| VAE加载 | 0.101 |
| VAE CPU解码 | 20.002 |
| 视频编码 | 0.247 |
| 子进程入口至model-result | 55.206 |

阶段耗时来自model-stages真实时间，间隙/卸载等未拆分耗时存在，因此分段不要求求和等于总耗时。

### 14.4 输出、遥测和宿主对比

输出根目录：`orchestrator/output/local-video-recovery-20261029/stage-b/20261029T062208Z-2d5d88bb6a11/`

- 样片：`sample/sample.mp4`。ffprobe及全片CPU解码PASS：256×448、17帧、16fps、1.0625秒；详细SHA/字节见sample/video-validation.json。
- PyTorch峰值allocated **3579718656字节（3.334GiB）**，reserved **3888119808字节（3.621GiB）**。整卡两侧采样合并峰值 **8737MiB / 核心46°C / 396.1W / GPU利用率97%**，含桌面，非瞬态最大值或独占推理指标。WSL/native各自样本与峰值见result.json。
- 宿主before/during/after/additional-postflight相关事件均0，查询错误0；原始XML字段机制保留，本次没有事件故无XML实例。不等于已排除所有硬件问题或证明整卡稳定。
- 显存结温、热点、PCIe计数不可获取，仍为UNAVAILABLE/null；不以核心温度替代。postGPU recovery=None。
- 生产/原服务保护文件6项SHA均不变，见protected-files-check.json。

**画质限制：** 交互式助手查看解码中间第8帧preview-frame.png，能见桌面/绿植/矩形设备形状，但存在明显青黄紫色块、边缘块化，未达到正常实景素材要求。此为实际帧观察，不是无人值守视觉API结果，也没有伪称模型理解。根因未确定，不能把它直接归因GPU故障或仅归因8步。该极短、小尺寸、少步数profile用于运行验证，不能代表常规画质；本轮不改参数再跑。持有人视觉评价仍NOT_EVALUATED，productionAssetReady=false。

### 14.5 证据、实际命令与结论

Windows：`C:\Users\admin\video-recovery\runs\20261029T062208Z-2d5d88bb6a11\`，保留host.jsonl、stdout/stderr、before/after事件、host-state和源码快照。WSL独立日志在上述输出根目录sample/，含run.json、stages.jsonl、model-stages.jsonl、stdout/stderr、telemetry、host-mirror、模型/视频结果。两侧同runId/UTC逐条落盘；本次成功并不能证明真实驱动故障或断电时一定存活。

本轮实际执行命令（**审计用，目录与次数已消耗，不得直接重跑**）：

```bash
python3 experiments/local-video-recovery/recovery.py monitor --stage B --seconds 280 \
  --run-id 20261029T062208Z-2d5d88bb6a11 \
  --review orchestrator/output/local-video-recovery-20261029/stage-b/20261029T062208Z-2d5d88bb6a11/review.json \
  --sample-request orchestrator/output/local-video-recovery-20261029/stage-b/20261029T062208Z-2d5d88bb6a11/sample-request.json \
  --out orchestrator/output/local-video-recovery-20261029/stage-b/20261029T062208Z-2d5d88bb6a11/sample \
  --host-log /mnt/c/Users/admin/video-recovery/runs/20261029T062208Z-2d5d88bb6a11/host.jsonl
python3 experiments/local-video-recovery/validate-wan21-output.py \
  orchestrator/output/local-video-recovery-20261029/stage-b/20261029T062208Z-2d5d88bb6a11/sample-request.json
```

归档同时保存完整本run、Windows日志和旧STOP迁移记录，源文件未删；归档路径与SHA见archive-receipt.json。失败后先看run.json/model-stages和stderr，再看Windows状态/事件/telemetry；本次最后阶段child_completed。

**结论分级：** 独立环境安装已完成；A最小CUDA已PASS；B首次出片技术PASS；重复运行NOT_RUN；人工视觉NOT_EVALUATED，样帧有明显缺陷；生产适用性NOT_EVALUATED。全局试验STOP及生产Wan STOP保留。本轮已结束，不再采样；下一步先由持有人看样片，再决定是否授权针对画质的离线诊断或下一次独立受控计划，不自动扩大到3—5秒、更大配置、Wan2.2或生产。


## 15. 首次样片人工画质FAIL与既有证据诊断（不运行GPU/模型解码）

### 15.1 最新人工裁定、范围与保全

持有人已观看第14节约1秒样片，明确判定 **人工画质FAIL：异常色彩、明显色块、轮廓失真，不能用于正式素材。** 保留FIRST_SAMPLE_TECHNICAL_PASS，不能写成素材质量通过。本裁定更新第14节当时尚未观看的NOT_EVALUATED状态；不倒改原run结果或已归档证据。人工裁定单独存入本次诊断目录holder-verdict.json。

诊断编号`20261029T063251Z-9e24ebb51782`，证据目录：

`orchestrator/output/local-video-recovery-20261029/quality-analysis/20261029T063251Z-9e24ebb51782/`

实际仅进行了文件/源码读取、参考工作流获取、safetensors头部解析、现有latent的CPU统计及CPU标记像素排列检查。CUDA_VISIBLE_DEVICES=-1，CPU脚本禁止torch.cuda.init/_lazy_init，结果cudaInitialized=false；没有导入Comfy运行模型、没有VAE/视频重新解码或新MP4，没有调用GPU计算/采样或修改生产/试验参数。CPU载入已保存张量不是重新推理。

原run下完整样片、日志、配置、执行源码与归档收据，加全局STOP和次数账本共61文件前后SHA一致（preservation-before/after.json）。本轮新增GPU进程0/采样0/VAE解码0；累计B进程2、采样1不变。仓库main/HEAD和既有未提交修改不变，不提交或推送。

### 15.2 固定参考与实际资产核对

参考不是凭记忆推断。已保存原JSON/源码、来源URL、获取时间和SHA，详见reference-sources.json。

- 实际执行Comfy固定commit：`426f5eea52a7ece1dd599fff4cb6cd1f352ddd24`；本轮对照本机该版本的sd.py、samplers.py、latent_formats.py、supported_models.py、Wan VAE及节点实现。
- Comfy官方示例固定到该工作流最后变更commit `cb13911e7d83e4f61ca12e29629cab85a6c08856`：[text_to_video_wan.json](https://github.com/comfyanonymous/ComfyUI_examples/blob/cb13911e7d83e4f61ca12e29629cab85a6c08856/wan/text_to_video_wan.json)。不是把随时变化的main当成本次默认。原始快照reference-workflow.json及摘要已保存。
- Wan官方源码对照固定commit `9737cba9c1c3c4d04b33fcad41c111989865d315`：[1.3B配置](https://github.com/Wan-Video/Wan2.1/blob/9737cba9c1c3c4d04b33fcad41c111989865d315/wan/configs/wan_t2v_1_3B.py)、[VAE](https://github.com/Wan-Video/Wan2.1/blob/9737cba9c1c3c4d04b33fcad41c111989865d315/wan/modules/vae.py)。这是本次读取的源码参考，不冒充当次模型权重revision；权重/许可revision仍以第11节assets为准。

| 项目 | 本次实际 | 固定参考/判定 |
|---|---|---|
| 扩散模型 | wan2.1_t2v_1.3B_bf16.safetensors；825个BF16张量，dim1536已在运行断言通过 | 官方1.3B dim1536；Comfy示例用FP16版本，本次BF16为差异，固定loader明确支持BF16，不能据此直接判权重错误 |
| VAE | wan_2.1_vae.safetensors，194个BF16存储张量，解码计算CPU FP32；z=16、图像输入/输出3通道 | 示例指定同名Wan2.1 VAE；关键header为96维decoder head、3通道输出，走固定sd.py的Wan2.1分支；不是Wan2.2的48通道/16倍空间VAE |
| 文本编码器 | UMT5 XXL scaled FP8，shared FP16，CPU full_precision_mm；shared=[256384,4096] | 固定Comfy示例同名scaled FP8/wan loader。存放在历史Wan2.2目录不等于架构属于Wan2.2；结构和loader复用有证据，不能据此宣称与原BF16逐值等价 |
| 分词器 | 编码器内嵌spiece，SHA e3909a67…f452458 | 第11节核验与官方Wan2.1分词器一致；本次不替换、不重新下载 |

本次头部只读结果见asset-header-audit.json；运行前全量文件SHA已在第14节重核对。原assets.json记录Comfy-Org/Wan-2.1 revision123acf1c…的LFS SHA。**“VAE/分词器选错代际”未获证据支持；尚不能因此排除实现数值差异或某一层计算问题。**

### 15.3 采样与latent接线核查

| 参数 | 实际 | Comfy固定示例 | 结论 |
|---|---|---|---|
| steps | 8 | 30 | 明确差异，未验证该8步配置能获得正常画质；少步未收敛为待验证假设 |
| sampler / scheduler | uni_pc / simple | uni_pc / simple | 一致，不是误选调度器 |
| CFG / shift | 6 / 8 | 6 / ModelSamplingSD3=8 | 固定WAN21_T2V默认sampling_settings.shift=8，由FLOW sampler使用；未发现缺接shift补丁造成默认1的证据 |
| denoise | sample默认1.0 | 1.0 | 一致 |
| 尺寸/帧数/批次 | 256×448 / 17 / 1 | 832×480 / 33 / 1 | 运行验证采用更小配置，不能把满足节点尺寸条件外推为画质保证；也不能直接认定低分辨率是色块根因 |
| 计算精度 | diffusion BF16、TE CPU、VAE CPU FP32 | diffusion FP16，其他由默认环境决定 | 有差异；没有数值对照，未证明精度是根因 |

现有sampled-latent.pt CPU只读结果：FP32、形状`[1,16,5,56,32]`、全部有限、min=-9.817599、max=10.422699、mean=-0.170948、std=2.856522；逐通道统计在latent-statistics.json。不是RGB，因此不能按[-1,1]范围将这些值判为异常。

- 17=4×4+1，时间latent5；空间448/8=56、256/8=32，均可被patch2×2整除，符合固定EmptyHunyuanLatentVideo及官方vae_stride=(4,8,8)、patch=(1,2,2)结构条件。无需升720P来修复形状。
- 固定samplers.py:1239在采样返回前调用process_latent_out；Wan21.process_out已执行`latent*std+mean`。子进程直接将此返回值存盘并送入VAE，与Comfy流程一致。
- 官方Wan原代码在VAE.decode内部做相应逆归一化；Comfy将其移至latent_format/sampler端。**不能看到child没有手写mean/std就判漏归一化，也不应再加一次造成双重缩放。**
- 现有latent只代表最终输出，未保存每步x/x0或实际sigma列表，不能据最终统计认定8步已充分收敛，也不能排除中间数值偏差。

### 15.4 VAE至编码链路、日志与明确缺口

静态对照固定sd.py VAE.decode正常单次分支：准备/加载patcher → 同dtype/device样本 → first_stage_model.decode → process_output → 通道移至最后/展平。试验绕过OOM自动分块重试，直接执行一次核心decode，但关键像素数学与正常分支一致；未发现漏掉额外latent归一化或颜色后处理的源码证据。

实际像素链：VAE `[B,3,T,H,W]` → `(x+1)/2`并clamp[0,1] → movedim(1,-1)得到`[B,T,H,W,3]` → 展平为`[17,448,256,3]` → 乘255/round/uint8/contiguous → FFmpeg输入rgb24 → libx264输出yuv420p。没有BGR交换、平面YUV冒充RGB或将NCTHW直接作为RGB字节的代码证据。CPU微型标记像素核验`[-1,-0.5,1]`对应RGB字节`[0,64,255]`，shape/布局PASS（pixel-layout-cpu-check.json）；它验证转换表达式，不代表模型画质通过。

| 已有证据 | 能说明什么 | 不能说明什么 |
|---|---|---|
| 条件张量、最终latent有限检查PASS；本轮latent全量有限 | 已检查节点没有NaN/Inf | 未检查所有中间层/步 |
| VAE处理后min0/max1/std0.29656、shape正确/finite PASS | clamp后的帧有限且非纯常量 | 原始VAE输出未记录，clamp可将Inf压到边界；不能排除clamp前Inf、极值或过饱和 |
| child/FFmpeg stderr0字节，无缺失权重、NaN/Inf、overflow或mismatch警告 | 已保存日志未报告这些问题 | 不是逐层数值检查，也不是严格缺失键审计；INFO/DEBUG和完整权重load返回值未全部持久化 |
| MP4既有ffprobe/fullDecode PASS，h264/yuv420p/17帧 | 编码文件结构及已完成解码有效 | 不等于颜色、轮廓正确；未显式写colour range/space/primaries/transfer标签，不能据此单独认定严重色块根因 |
| preview-frame.png来自上轮MP4抽帧 | 可见最终损坏画面 | 不是编码前PNG，不能拿它与MP4当作独立前后对照 |

**已确认的定位能力缺口：未保存VAE原始float输出、clamp前统计、编码前RGB帧或raw bytes。** 目录核查见preencode-frame-audit.json，因此现有证据无法完成“编码前vs编码后”逐像素比较。本轮没有为补证据偷偷重新解码。本轮也未通过调色、放大或后期修复掩盖缺陷。

### 15.5 396.1W的准确时间及阶段

对齐两侧原始记录与model-stages.jsonl，时间均UTC（北京时间+8小时），详见power-stage-correlation.json：

| 时间UTC | 来源/整卡读数 | 临近真实阶段 |
|---|---|---|
| 06:23:21.808278 | WSL 243.01W | 采样进度期间 |
| 06:23:22.827401 | 真实模型阶段 | sampling_completed，已显式CUDA同步 |
| 06:23:22.847610 | WSL **396.1W** | 采样完成约20ms后、vae_load_started前约6ms |
| 06:23:22.976330 | 真实模型阶段 | CPU vae_decode_started |
| 06:23:23.3213388 | Windows 373.36W | 日志时间落在CPU VAE解码起始后 |
| 06:23:23.899487 | WSL 84.39W | CPU VAE解码期间 |

这是NVML整卡传感器读数，包含桌面/整卡其他活动；两侧抽样频率、查询时延、传感器平均窗口/滞后不等同模型阶段瞬时边界，具体传感器窗口未记录。它与刚结束GPU采样在时间上相邻，**不能写成Wan独占396W，也不能因后一条Windows读数时间在CPU VAE段内就认定CPU解码使用GPU或消耗373W。** 功耗自身不能证明显卡故障；同次无宿主设备错误只能说明未记录到对应事件，不能排除全部硬件/数值问题。

### 15.6 结论分级与下一次最小对照（尚未执行）

**已确认问题：** 人工画质FAIL；8步低于固定Comfy示例30步；缺少编码前/原始VAE证据、检查置于clamp后的观测盲区。当前未锁定单一根因，不能将第一项直接归因于后两项。

**排除或降低优先级（限已核实范围）：** 错用Wan2.2 VAE/分词器、尺寸/通道接线错误、重复/缺失latent反归一化、代码中的RGB/BGR互换，以及最终latent NaN/Inf。日志未出现权重缺失/不匹配或溢出告警。以上不构成全链路数值/硬件排除证明。

**仍待验证：** 少步未收敛、文本/精度/数学实现导致的上游偏差、VAE解码数值问题或clamp前异常、没有前后帧对照时尚未完全排除的编码贡献。没有证据把1.3B模型规模、分辨率或显卡直接定为根因。

下一次优先安排 **只重新解码，不重新采样** 的受控对照，须持有人另行授权后才执行：

1. 输入固定为当前sampled-latent.pt（按SHA），同Wan2.1 VAE、CPU FP32、256×448/17帧；不加载扩散/TE、不启用GPU、不移动或清除当前STOP。新runId/独立目录，保留原件。
2. 只将解码调用路径从当前直接核心调用改为固定Comfy参考单次分支；执行前补齐独立CPU-only单次接线，禁止走标准decode默认的OOM→tiling重试，任何错误立即停止。该工具目前**未实现/未运行**，不是已验证命令。此变化测试解码接线，预期是否一致须实测，不宣称能修复画质。
3. 保存原始VAE float tensor、clamp前finite/min/max/分位数及各通道饱和比例，保存编码前uint8 RGB PNG/哈希，再按原x264参数编码一次；CPU对比编码前与编码后对应帧及原MP4。禁用CUDA初始化；日志和STOP分别保全，不用“仅解码”绕过新授权。
4. 若原始帧已坏，编码不是唯一原因；若原始帧正常、编码后坏，定位像素/编码链；若参考解码与原损坏画面一致，则直接decode包装更不支持作为主因，继续区分latent上游与VAE实现。
5. 只有该对照审阅完且确需重新采样时，再另行批准一个单因素计划：保留相同权重/精度/种子/提示词/256×448/17帧/uni_pc/simple/CFG6/shift8，仅steps **8→30**。须重新核预算/超时，沿用新观测证据，不同时换FP16、720P、模型或调色。若效果改善，仅支持步数影响；若仍异常，停止并转检查条件/精度或独立VAE实现，不能自动连跑所有假设。

当前结论：**推理链路首次通过；人工素材质量FAIL；根因UNRESOLVED；重复/生产稳定性未验证。** 本轮完成后停止，当前试验STOP与生产Wan STOP保持，下一次方案均未执行。


## 16. 已授权一次CPU参考解码对照：工具bootstrap失败，未执行VAE

### 16.1 授权范围与重要事实纠正

持有人授权一次复用首次latent的CPU参考解码，禁止GPU/重新采样，失败即停，不换精度/解码器。本轮新runId `20261029T064028Z-44f44f00b0cf`，目录：

`orchestrator/output/local-video-recovery-20261029/cpu-reference/20261029T064028Z-44f44f00b0cf/`

**原B路径是GPU BF16采样 + CPU FP32 VAE解码，并不存在已执行的“原GPU VAE解码”对照。** 本轮计划保持同一latent、同一Wan2.1 VAE、CPU FP32及8线程，只测试直接核心调用与固定Comfy参考VAE.decode成功分支的接线差异，并补存中间输出。它不能被称为GPU解码转CPU解码的硬件对照。

开工核实main/HEAD `cc562624f8d36cf06fde9e373e72e5451e973ce1`，本地origin/main无领先落后，未fetch/提交/推送。原未提交修改、历史产物及全局STOP不动。原B人工画质FAIL与技术链路PASS保持独立。

### 16.2 输入核验、参考路径与资源保护

- latent原路径：`stage-b/20261029T062208Z-2d5d88bb6a11/sample/sampled-latent.pt`。
- 本轮实际重核SHA-256：`a9b7fa2d4032e8c6750d346a7dff3973c465da647fbc2a84955908313d40364f`，匹配原归档manifest。形状`[1,16,5,56,32]`、dtype FP32来自第15节已保存CPU统计及相同文件哈希；本次失败子进程尚未读取latent张量，不冒称本次完成张量校验阶段。
- VAE SHA重新匹配：`2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b`，仍为配套Wan2.1 16通道文件；没有新下载或替换。
- 参考为固定Comfy commit `426f5eea52a7ece1dd599fff4cb6cd1f352ddd24` 的 `comfy/sd.py:1269` VAE.decode。新工具使用原函数，并计划在进程局部将其异常处理入口raise_non_oom改为无条件重抛，阻止OOM→tiling第二次解码；核心调用计数上限1。不是另写解码模型。**本次在导入阶段失败，未到该接线安装/模型执行步骤。**
- 父进程预检可用内存129050624000字节（约120.19GiB），要求≥16GiB；运行中监测本子进程RSS≤12GiB、系统可用≥8GiB，总超时180秒。nice+10、8/32逻辑CPU线程；未启停任何其他服务。VAE专属memory_used_decode估计原计划在加载后检查，本次未到该阶段，不伪造实际估计或VAE峰值。
- 独立原venv，无依赖/驱动变更。环境CUDA_VISIBLE_DEVICES=-1，torch.cuda.init/_lazy_init/current_device/set_device加入拒绝调用保护，Comfy参数显式--cpu/--cpu-vae/--fp32-vae。无GPU计算/模型采样，无原生GPU logger需要启动。

### 16.3 唯一一次运行与准确失败原因

新增入口：`experiments/local-video-recovery/cpu-reference-decode.py`。仅完成CLI帮助/AST语法检查，然后实际启动一次CPU子进程；**不能将该入口标为已可用或已通过解码验证**。

实际命令（只作审计，现有目录不能重跑）：

```bash
python3 experiments/local-video-recovery/cpu-reference-decode.py \
  --request orchestrator/output/local-video-recovery-20261029/stage-b/20261029T062208Z-2d5d88bb6a11/sample-request.json \
  --out orchestrator/output/local-video-recovery-20261029/cpu-reference/20261029T064028Z-44f44f00b0cf
```

父监控UTC `06:40:31.010189+00:00`—`06:40:36.423370+00:00`，约5.413秒。CPU子进程PID2646402已退出；父命令返回1。子进程具体数值退出码未写入父run.json，只记录非零错误，因此结果文件保留null和限制说明，不事后冒充实测数值。采样RSS峰值640790528字节（约611.1MiB），不属于VAE内存峰值。

最后持久化阶段是`cpu_bootstrap_started`（入口，未完成bootstrap）。真实失败链：

`import comfy_kitchen -> tensor.base -> import torch._dynamo -> get_torch_obj_rule_map`

原始错误：

```text
AssertionError: Duplicate torch object <function child.<locals>.deny ...>
with different rules: TorchInGraphFunctionVariable, SkipFunctionVariable
```

**已确认原因是本次新增工具的保护接线错误，由实现者引入，不是模型错误。** cpu-reference-decode.py将多个torch.cuda接口指向同一个deny函数对象；固定torch/_dynamo/trace_rules.py:235—236对set_device设SkipFunctionVariable、对current_device设TorchInGraphFunctionVariable，:2992—3013构建对象键映射时发现同一个对象对应不同规则，断言失败。导入Dynamo是依赖模块正常导入行为，不等于启用了torch.compile，也不是发生CUDA设备错误。

torch导入及前置“未初始化/不可用”检查按源码/trace顺序已通过，但最终cudaInitialized结果未写出，因为bootstrap失败；不伪造最终遥测标志。没有走到VAE权重加载、解码、clamp或FFmpeg。原始stderr完整保留；失败源码快照executed-cpu-reference-decode.py和元数据源码SHA可重现该工具问题。

**本轮CPU进程1次；新GPU进程0、VAE加载0、核心解码0、重新采样0、输出MP4数0。** 未修后自动重跑，未换精度、模型、解码器或参数；没有以原MP4抽帧冒充对照结果。

### 16.4 交付、保全与未完成项

- 已完成：输入hash/配套VAE核验、CPU资源前检、参考源码审查、单次受控启动、完整错误/阶段/CPU内存日志、原件SHA保全、失败归档。
- 未完成：clamp前NaN/Inf/分布、原始VAE输出、编码前无损帧、对照MP4和对照图。均因bootstrap阻断，**没有新的证据判断异常是否在编码前已存在**。原B色块根因仍UNRESOLVED，不能据本次工具失败判断显卡、VAE或8步为根因。
- 原全局STOP SHA保持`0b4fac9934d1636f2d89c1905a393ba11adf3700e743ae72f6b2c2d3a727e65d`，原run及账本全部前后SHA一致，见preservation-before/after.json。本CPU失败另写本run/STOP.json，状态STOP_INCOMPLETE；不覆盖生产/原B STOP。
- 排查入口：本run `result.json` → `stderr.log` → `stages.jsonl` → `run.json`、`preflight.json`、`cpu-memory.jsonl`。stdout/stderr实时落盘；输入参数/启动环境白名单在execution-command.json、实际父命令在invocation.json，没有记录其他服务凭据。
- 完整失败归档：`cpu-reference/archives/20261029T064028Z-44f44f00b0cf-cpu-bootstrap-failed.tar`；SHA/字节见archive-receipt.json，来源不删。本轮不修改生产配置、原配音/视频或模型文件。

下一步应先在**无权重、无解码、无CUDA**范围修复保护函数对象身份冲突，补实际Comfy/Dynamo CPU导入回归；例如为各API使用不同的拒绝函数对象，保留禁止CUDA的保护强度。该修复及回归本轮未执行，不能用删保护、先运行解码再补检查的方式绕过。通过后再按持有人下一次明确授权做一次CPU参考解码，不自动复用本次已失败run或接着采样。

**最终结论：CPU对照未完成，真实工具阻断已定位；原B首次链路技术通过、人工画质FAIL均不变。遵照“失败即停”，本轮结束，生产Wan STOP及全部原记录保留。**


## 17. 排查方向收敛与最小CPU导入修复

本节对应持有人“本轮不重新采样或解码”的指令，已完成无模型CPU导入验证；随后收到新的30步生成授权，该生成必须另立run，不计入本节结果。审查编号`20261029T065041Z-b848bac30122`，证据在direction-review/<编号>/。

### 17.1 原样片真实阶段

基准run `20261029T062208Z-2d5d88bb6a11`；以下路径均相对该run。精度严格区分文件存储、源码计算路径与运行日志，未采集逐kernel dtype。

| 阶段 | 实际设备/精度 | 参数与证据 |
|---|---|---|
| 文本编码 | CPU；scaled FP8权重、FP16 shared embedding/F32 scales；固定源码以FP32 embedding/激活和eager反量化矩阵路径计算，不宣称所有算子均有运行dtype测量 | executed-source/wan21-child.py的load_clip/load/offload/initial_device=CPU；sample/model-stages.jsonl的text_model_load_completed明确device=cpu、weightDtypes=[float16]，这是loader dtype集合，不能写成所有权重/运算都FP16；正负编码有限检查PASS。sd1_clip.py:212/279、t5.py:243/246、ops.py:1495等为FP32激活路径依据 |
| 扩散采样 | GPU CUDA/BF16；noise/初始latent在CPU，采样返回/保存latent为CPU FP32 | diffusion_model_load_completed记录bfloat16；sampling_started记录8步/seed20261029/[1,16,5,56,32]，后续8条进度。CFG6/shift8/uni_pc/simple来自冻结request和调用；math-only/eager状态在bootstrap及逐调用保护 |
| VAE解码 | **CPU FP32**，源VAE文件存储BF16 | vae_load_completed明确device=cpu/dtype=float32；prepare_decode+一次first_stage_model.decode+process_output，8线程，16通道Wan2.1。解码20.002秒，不是GPU VAE |
| 视频编码 | CPU libx264，输入8bit RGB24，输出8bit YUV420P/H264；不适用“模型FP32精度” | executed-source/wan21-child.py的FFmpeg参数：256×448/16fps/CRF18/threads2，无硬件编码参数；sample/ffprobe.json为17帧。原命令未显式写颜色空间标签 |

机器可读stage-execution-map.json保存上述定位；不把静态代码推断包装成原日志不存在的逐层实测。

### 17.2 取消重复CPU参考解码

复核固定sd.py VAE.decode成功分支与原代码：都加载同一VAE核心、同CPU FP32 latent、同核心decode、同(x+1)/2/clamp及通道排列。差别为wrapper的批量/输出缓冲分配和拷贝、device context、OOM异常重试管理；原单batch CPU场景未发现会改变像素公式的差异。拟议中额外保存raw/PNG只是增加观测，并非独立的数值对照；额外BT.709编码设置反而会引入另一变量。

**取消该重复解码实验，不再为它扩展保护或执行解码。** cpu-reference-decode.py保留历史实现及失败快照，CLI现明确拒绝执行；不是删除失败记录或把第16节改PASS。原GPU采样/CPU VAE的事实始终不变。

### 17.3 普通权重与少步配置：证据及全部可核实差异

原固定权重LFS SHA `6f999b0d…974ad5fd`属于Comfy-Org/Wan-2.1 revision123acf1c…的普通wan2.1_t2v_1.3B_bf16文件，与官方Wan-AI基础T2V-1.3B相应重打包来源匹配。模型卡和调用代码没有蒸馏/Lightning/Turbo/CausVid/加速LoRA接线依据；**按普通权重处理，不能把8步诊断配置当作已配套少步模型。** 来源模型卡固定版本已另存；权重没有新下载。

匹配参考为第15节固定Comfy text_to_video_wan.json commitcb13911e…，该版本30步/CFG6/shift8/uni_pc/simple。官方Wan另一入口函数有50步默认，不混写为同一个工作流默认。官方1.3B说明的CFG6和shift8—12也支持当前CFG/shift选择：[固定官方模型卡](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/blob/37ec512624d61f7aa208f7ea8140a131f93afc9a/README.md)。

| 维度 | 原样片 vs 固定Comfy参考 | 排查意义 |
|---|---|---|
| 步数 | **8 vs 30** | 优先单因素；8步仅曾用于运行验证，没有正常画质依据，尚未证明是色块根因 |
| 扩散权重/计算 | 同基础1.3B家族，BF16文件/计算 vs 示例FP16文件/默认计算 | 后续候选差异，本次先固定BF16，不与步数一起更换 |
| CFG/shift/sampler/scheduler/denoise/batch | 6/8/uni_pc/simple/1/1，一致 | 未见参数错配证据 |
| 文本权重与分词器 | 同名不作为结论：已有实际全量SHA c3355d30…204f68 **与Wan2.1固定仓库LFS完全一致**；分词器SHA此前也匹配 | 源文件存放Wan2.2目录不等于错误模型。text-encoder-reference-identity.json保存API项与原实际全量hash，不仅验证架构 |
| VAE文件 | 同Wan2.1 VAE；实际CPU FP32，参考工作流由设备默认值决定 | 文件配套，参考图未固定CPU/GPU或精度，不能编造其实际后端 |
| 尺寸/长度 | 256×448/17帧 vs 832×480/33帧 | 与参考有差异，结构合法不代表画质保证；本次不升尺寸或时长 |
| 正负提示词/seed | 原固定办公场景/seed20261029 vs 示例fox/不同seed及randomize、不同负词 | 内容任务差异，不据此认定模型失配；下一对照固定原提示词及种子 |
| 注意力/卸载/缓存/线程 | 实际math/eager、同步CPU存储、禁止编译/异步/pinned、8线程；参考JSON未限定这些运行环境 | 属于实际环境与未指定参考环境的差异，不能说某个参考后端已测通过；下一对照全固定 |
| VAE包装/输出观测 | 原单核心调用 vs 标准wrapper；原无raw/编码前帧 | 无有效数值差异依据，取消重复包装对照；下次在原路径被动保存证据 |
| 输出格式 | 原H264/yuv420p/16fps/CRF18 vs 参考启用WEBP16fps，另WEBM节点禁用 | 编码格式有差异，当前不能完全排除编码贡献；下一生成不同时切格式/色彩矩阵，另存无损帧来定位 |

上述为可由参考图和现有代码核实的差异。参考图没有固定的GPU型号、驱动/包版本、峰值或逐层精度，不伪造一套参考硬件值。

优先级：P1普通权重8步是否不足；P2在新证据中检查clamp前输出及编码前/后，区分上游与编码；P3若仍失败，再考虑BF16/文本/数学实现的独立对照。P1是最有针对性的下一因素，不等于已确证根因，不直接归咎低分辨率、小模型或显卡。

### 17.4 最小修复及实测

本地cpu-reference-decode.py中安装CUDA拒绝保护时改为每API一个独立闭包对象；保持同样拒绝强度，不修改Dynamo规则表、缓存、PyTorch/Comfy共享源码或包环境。仅新增check-cpu-import.py调用该修复并导入真实Comfy Kitchen、sd、model_management与Dynamo，不实例化模型或解码。

实际命令：

```bash
CUDA_VISIBLE_DEVICES=-1 PYTHONDONTWRITEBYTECODE=1 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 \
  local-assets/experiments/video-recovery-20261029/venv/bin/python -u -B \
  experiments/local-video-recovery/check-cpu-import.py \
  --out orchestrator/output/local-video-recovery-20261029/direction-review/20261029T065041Z-b848bac30122/cpu-import
```

结果CPU_IMPORT_REGRESSION_PASS：4个保护对象不同，cudaInitialized=false、guardCalls=[]、device=cpu；权重加载0、解码0、采样0。安装包trace_rules.py/decorators.py与torch发行包RECORD哈希一致；没有修改PyTorch内部机制。旧失败及原B/STOP共75文件SHA不变。该PASS仅为CPU导入，不能把取消的解码实验标为通过。

### 17.5 下一次明确单因素计划

验证普通权重的步数影响；仅steps8→30，保持原种子/提示词/负词/256×448/17帧/16fps、CFG6、shift8、uni_pc/simple、denoise1、BF16/文本路径、math-only/eager及原CPU FP32 VAE核心调用和原FFmpeg编码配置。追加clamp前统计和无损RGB只是观测，不引入参考解码器或调色。

需要一次新的GPU采样和一次原路径CPU解码，无下载；沿用初始空闲14GiB GPU/48GiB主机预算、75°C/运行中4GiB停止阈值。原8步采样约2.915秒、总55.206秒只作预算基线，不能当30步实测；计划保留采样90秒/子进程240秒上限、WSL280秒/Windows300秒独立监控，明显超过简单步数比例预估，遇超时仍停止不重试。每次重新检查宿主、其他消费者、锁和保护余量，不能根据CPU导入PASS放行GPU。

下一方案机器可读next-control-plan.json；此文件建立时为提案。随后持有人已明确授权一次30步对照，需独立记录后续执行结果，不覆盖本节“无生成”证据。若改善只支持当前配置下步数影响；若仍失败停止后审阅raw/PNG/MP4，不自动继续精度/分辨率/模型试验。生产Wan STOP保持。


## 18. 授权30步单因素对照：完整生成、编码前证据及对应帧

### 18.1 授权与严格控制

持有人本轮明确授权仅steps8→30，保持原种子、提示词、256×448、17帧、CFG6、shift8、uni_pc/simple、精度、注意力约束及原CPU FP32 VAE路径。新runId `20261029T065718Z-764c987d402f`，基准为第14节run `20261029T062208Z-2d5d88bb6a11`。

本轮进程1次、采样1次、原路径CPU VAE解码1次；累计B进程3次（含第12节权重加载前失败）、实际采样2次。第16节CPU工具启动失败不计入GPU模型尝试。没有异常后重试、另换模型/后端或增大画幅/时长；第17节取消的参考解码工具没有调用。

- 新`wan21-profile-30step.json`与冻结8步profile逐字段比较，仅steps不同；原8步profile不改。版本号、种子20261029、正负提示词、256×448/17/16fps/batch1、CFG6/shift8、denoise1、采样器/调度器、BF16扩散与CPU文本/FP32 VAE、math/eager、同步卸载及全部禁用项均不变。profile-diff.json保存依据。
- recovery.py仅将严格profile校验扩展为两个精确登记profile，未接受任意请求参数；13项CPU门禁测试PASS，含30步与8步唯一差异及拒绝31步/任意720宽请求。没有更改生产默认配置。
- wan21-child.py只追加CPU被动观测：同一VAE核心解码返回后、原clamp前保存统计/raw，原RGB转换后保存无损PNG；没有改归一化、解码器、种子或采样数学。编码仍原rgb24→libx264/yuv420p/CRF18/threads2，**没有引入先前CPU提案的BT.709额外变换或调色**。
- 独立profile和被动观测均属于本轮明确授权实现；不是把第15—17节尚未生成时的提案记录倒改成已执行。

### 18.2 前检、STOP迁移与监控

三项模型完整SHA重新匹配8步实际使用的文件，没有下载或安装。前检GPU核心33°C、空闲44240MiB、recovery=None；主机RAM满足≥48GiB，无compute-app消费者。从原8步监控结束至本轮前检无新增相关宿主设备事件，查询无错误；两个Windows Python仍为Hermes链，未结束或改动其他服务。供电仍为持有人报告2200W、转接方式未实物核验，不倒改残余风险记录。

原全局STOP属于已结束的8步试验启动保护记录；复核子进程2622910已退出、完整result/归档SHA及无新设备事件后，持合作锁原子迁移至：

`local-assets/experiments/video-recovery-20261029/stop-archive/20261029T062208Z-2d5d88bb6a11-to-20261029T065718Z-764c987d402f/`

字节/SHA和transition保留。第16节CPU工具的局部STOP仍保留，属于已退出的软件错误，不是活动GPU异常锁。新试验在启动前重新持久化全局STOP及新run一次性标记，成功后不清锁。历史尝试账本只追加，本次之前的字节前缀SHA匹配。

Windows原生独立监控PID59140、同runId直接写C盘，WSL另存持久日志。UTC父监控`06:58:03.537191+00:00`至`06:59:24.304231+00:00`，80.767秒；退出后保留观察窗口并正常停止本工具logger，NORMAL_STOP。预设采样90秒/子进程240秒、WSL280秒/宿主300秒上限未用尽，不放宽75°C、运行空闲4GiB等保护。前/持续/后/额外postflight相关设备事件全0，查询错误0；原始查询及XML记录机制保持。

### 18.3 实际生成、耗时与峰值

真实GPU attention_policy_checked/bootstrap_completed在任何模型权重加载前通过，保持仅math SDPA、其余后端关闭。随后同一子进程连续完成文本编码、权重加载、30条采样进度、一次CPU VAE、原始统计/无损帧、MP4。正常退出0，stderr0字节，FFmpeg及全片CPU解码PASS。

| 实测项 | 8步基准 | 30步本次 |
|---|---:|---:|
| 采样阶段 | 2.915秒 | 7.161秒 |
| 入口至model-result | 55.206秒 | 58.383秒 |
| VAE阶段 | 20.002秒 | 18.899秒（本次含新增clamp前统计/raw持久化） |
| PyTorch allocated峰值 | 3579718656 B /3.334GiB | 3579718656 B /3.334GiB |
| PyTorch reserved峰值 | 3888119808 B /3.621GiB | 3888119808 B /3.621GiB |
| 整卡采样显存峰值 | 8737MiB | 8607MiB |
| 整卡核心温度采样峰值 | 46°C | 51°C |
| 整卡功耗采样峰值 | 396.1W | 398.77W |
| 相关宿主新增事件 | 0 | 0 |

这是各一次运行，文本/CPU解码时间、桌面占用及缓存会波动；不能将全程差值或整卡显存差值当作纯步数性能定律。PyTorch峰值与两侧整卡采样峰值分开，不是独占模型功耗或瞬态上限。本次WSL最高功耗时间UTC06:58:52.010051，位于sampling_progress期间。显存结温、热点、PCIe计数仍UNAVAILABLE/null。无新增事件不证明整卡/生产稳定。

### 18.4 文件、原始统计与对应帧

输出根目录：

`orchestrator/output/local-video-recovery-20261029/stage-b/20261029T065718Z-764c987d402f/`

| 交付 | 路径（相对本run） |
|---|---|
| 30步MP4 | sample/sample.mp4 |
| 最终latent | sample/sampled-latent.pt |
| clamp前原始VAE输出 | sample/pre-clamp-vae-output.pt |
| clamp前整体/逐通道分布 | sample/pre-clamp-statistics.json |
| 17张无损编码前RGB PNG | sample/preencode-frames/000.png—016.png；SHA清单sample/preencode-frames.json |
| 新旧同帧三列图 | comparison/corresponding-frames.png |
| 单帧对照及编码误差 | comparison/old8-*.png、pre30-*.png、new30-*.png、comparison.json |
| 参数差异/最终结果/事件 | profile-diff.json、result.json、host-postflight.json、sample/model-stages.jsonl |
| 执行源码/完整原始日志 | executed-source/、source-manifest.json、sample/stdout.log/stderr.log、telemetry.jsonl、host-mirror.jsonl |

MP4实测256×448、17帧、16fps、1.0625秒，45547字节，SHA-256 `786cb61328da41b484488937bef4e4e8e1881fe00b69e5b5b0c312c4850907b3`。

clamp前真实输出CPU FP32、`[1,3,17,448,256]`，5849088个数：

- NaN/正Inf/负Inf均 **0**；min **-1.4108083**，max **1.3550489**，mean **-0.2974656**，std **0.5630895**。
- 1%分位-1.0273948，中位-0.3770862，99%分位0.6397648；完整分位和逐通道分布保存在JSON。
- 低于-1约3.0065%，高于1约0.0866%，合计约3.0931%会落在原clamp边界外。不是看到少量超范围就断定数值故障，也不能据NaN/Inf0证明所有中间层无异常。

对照图行对应帧0/8/16，即0/0.5/1秒；列依次为 **8步MP4、30步编码前PNG、30步MP4**。原8步编码前帧不存在，不伪造。

CPU FFmpeg明确-hwaccel none抽帧，无额外模型解码；compare-frames.py及其命令和stderr保留。本次17帧编码前→MP4平均绝对像素误差1.949/255、RMSE3.876、PSNR36.364dB、最大单通道绝对差85（局部边缘/色度压缩可能较大）；不是逐像素一致，不能说编码无损。这些仅为编码误差，不是审美评分。新旧MP4像素差很大也不能直接当作质量分数。

### 18.5 本次对照可以与不可以得出的结论

交互式助手实际查看上述三行三列图（不是无人值守多模态API，也不是持有人新片验收）：相比8步，大面积杂色矩形块明显减少，绿植/笔记本等轮廓更可辨；30步仍有平面插画式色彩、硬轮廓，不能宣称已成为合格真实办公素材。

30步编码前PNG已有这些残余特征，MP4与之接近，因此**本次残余风格/轮廓问题不是仅由H264编码引入**。旧8步raw缺失，不能把新证据反填为旧8步原始像素事实；编码仍有实测损失，不将其影响机械归零。

唯一主动生成因素为步数，观察支持“8→30对当前小配置的色块/结构有明显影响”，降低了直接把普通权重当8步画质配置的可信度；**尚不证明步数是全部异常的唯一根因，不证明GPU硬件故障或正常，不外推720P/更长序列/生产稳定性。** 新片持有人观感评价保持NOT_EVALUATED，原8步人工FAIL不改。无调色、放大、后期修复或追加生成。

### 18.6 实际命令、保全及停止

本轮实际执行（已有次数/目录，不得重跑）：

```bash
python3 experiments/local-video-recovery/recovery.py monitor --stage B --seconds 280 \
  --run-id 20261029T065718Z-764c987d402f \
  --review orchestrator/output/local-video-recovery-20261029/stage-b/20261029T065718Z-764c987d402f/review.json \
  --sample-request orchestrator/output/local-video-recovery-20261029/stage-b/20261029T065718Z-764c987d402f/sample-request.json \
  --out orchestrator/output/local-video-recovery-20261029/stage-b/20261029T065718Z-764c987d402f/sample \
  --host-log /mnt/c/Users/admin/video-recovery/runs/20261029T065718Z-764c987d402f/host.jsonl
python3 experiments/local-video-recovery/validate-wan21-output.py \
  orchestrator/output/local-video-recovery-20261029/stage-b/20261029T065718Z-764c987d402f/sample-request.json
CUDA_VISIBLE_DEVICES=-1 PYTHONDONTWRITEBYTECODE=1 \
  local-assets/experiments/video-recovery-20261029/venv/bin/python -B \
  orchestrator/output/local-video-recovery-20261029/stage-b/20261029T065718Z-764c987d402f/compare-frames.py
```

Windows日志：`C:\Users\admin\video-recovery\runs\20261029T065718Z-764c987d402f\`。完整两侧记录/raw/PNG/视频/参数/源码及旧STOP迁移已归档为`stage-b/archives/20261029T065718Z-764c987d402f-30step-control.tar`，27392000字节，SHA `6cd32b3ba7552f3f479235771f802bc976de51194003e78d534acf3f4fea6299`，来源不删。原B与CPU失败现场文件不变；控制STOP经授权迁移，账本仅追加；6项原服务/生产保护文件SHA一致。

结果为 **30步对照技术PASS，人工画质待评价，生产适用性未验证**。本次机会已消耗，当前全局试验STOP和生产Wan STOP保留。完成后停止，等待持有人看样片和对应帧，不自动继续更大尺寸/时长、更多步数、其他精度或模型。


## 19. 30步持有人反馈、实际提示词与仅改正向的写实对照提案

### 19.1 最新人工裁定与本轮范围

持有人已看30步样片，评价“比8步改善，但仍偏插画、不够自然，尚不满足真实动态素材要求”。记录为 **FAIL_FOR_REAL_DYNAMIC_STOCK / 相比8步IMPROVED**；原生成/全解码技术PASS不改，也不把改善写成素材质量通过。第18节当时的NOT_EVALUATED为历史时点，本次人工裁定另存在holder-verdict.json，原run/归档不改写。

审查编号`20261029T070957Z-488818900537`，路径：

`orchestrator/output/local-video-recovery-20261029/prompt-review/20261029T070957Z-488818900537/`

本轮不加载权重/分词器，不执行CPU或GPU模型、不重新采样或解码，不创建可执行的新profile；只进行文件/源码核对和方案编写。main/HEAD仍为cc562624f8d36cf06fde9e373e72e5451e973ce1，本地上游引用无领先落后，未fetch/提交/推送。原未提交修改与历史产物保持。

### 19.2 实际送入分词/编码调用的完整文本

依据30步run的sample-request.json profile.prompt/negativePrompt与executed-source/wan21-child.py:54、58：

```python
positive = clip.encode_from_tokens_scheduled(clip.tokenize(cfg['prompt']))
negative = clip.encode_from_tokens_scheduled(clip.tokenize(cfg['negativePrompt']))
```

本次核对请求和执行源码SHA均匹配该run原archive-source-manifest；编码完成阶段也在model-stages.jsonl中。模型实际接收token/embedding，以下是直接交给clip.tokenize的完整字符串；原运行没有另存token ID/embedding，不伪造其记录。

完整正向：

```text
A quiet modern office desk, a closed laptop and a small green plant beside a window, soft blue evening light, subtle camera movement, no people, no visible text.
```

完整负向：

```text
people, text, letters, logos, news footage, watermark, distorted objects
```

**扩写：未经过扩写。** 没有LLM扩写、翻译、提示词增强或外部服务调用；最终正/负向就是上述原文，不存在另一份“扩写后的最终文本”。WanT5Tokenizer/SPieceTokenizer进行常规分词和特殊token/padding处理，不能称作语义扩写。

**风格控制：没有加载风格LoRA或其他独立风格控制。** 实际完整执行源码只有基础扩散/UMT5/VAE加载和math注意力约束，没有LoRA权重加载/注入、ControlNet、参考图、图生输入或风格适配器接线，且自定义节点禁用。FP8存储/反量化、BF16精度及math SDPA是数值/执行配置，不是风格控制；“无额外控制”不代表基础模型没有视觉倾向。

### 19.3 根据真实文本可以判断什么

| 检查项 | 正向 | 负向/含义 |
|---|---|---|
| 明确实拍/摄影/live-action/photorealistic | 没有。camera movement只要求运动，不明确要求摄影质感 | 无相应写实强化 |
| 明确自然光 | 没有。soft blue evening light描述蓝色傍晚氛围，window提供情境线索 | 不能把蓝色光本身认定为插画根因 |
| 明确真实材质/纹理 | 没有具体表面纹理、自然反射等要求 | 没有针对材质的排除条件 |
| illustration/cartoon/anime/stylized/render | **正向全未出现** | **负向也全未出现**，即未主动排除这些风格 |
| 其他线索 | quiet/modern/green plant为场景；closed laptop是物体状态；no people/no visible text为内容约束 | news footage用于排除新闻场景，不能机械解释为“要求插画”；本次不据此改负向 |

结论仅为：**写实表达目标没有在原提示词中被明确约束，是值得对照的假设；没有发现直接要求插画的词。** 缺少写实词不证明是唯一原因，出现/缺少某个词也不能替代真实对照。30步相对8步已改善，不抹除步数影响；后续也不把所有残余问题一概归于文本。

### 19.4 下一次仅调整提示词的单样本提案（未执行）

为降低混淆，建议**只改正向**：保留原正向作为逐字不变的前缀，末尾追加实拍、自然光、材质和光影要求。**负向完整保持原文**，不同时添加cartoon等负词；如此测试的是整组正向写实指令的联合影响，不能反推哪一个词独立起效。

拟议完整新正向：

```text
A quiet modern office desk, a closed laptop and a small green plant beside a window, soft blue evening light, subtle camera movement, no people, no visible text. Photorealistic live-action video recorded with a camera in a real office. Soft natural evening light comes through the window. Realistic surface textures on the laptop and desk, fine natural details on the leaves, physically plausible shadows and reflections, and natural colors.
```

拟议负向（不变）：

```text
people, text, letters, logos, news footage, watermark, distorted objects
```

- 目的：测试在当前小配置下，明确摄影/材质目标能否减少平面插画感、改善自然光影与物体质感。
- 唯一改变字段：profile.prompt。保持negativePrompt、seed20261029、30步、256×448、17帧、16fps、CFG6、shift8、uni_pc/simple、denoise1、batch1、全部模型SHA、精度/CPU文本路径、math-only/eager、同步卸载、原CPU FP32 VAE及原RGB24→libx264/YUV420P/CRF18/threads2不变。无新LoRA、扩写、参考图、调色或放大。
- 场景/主体不变：桌面、关闭的笔记本、小绿植、窗边、蓝色傍晚、细微镜头运动、无人无文字。新文没有改成白天、更换物件或更强运动；检查时也记录笔记本是否遵守“关闭”要求，不能仅看颜色就算匹配。
- 观测不变：若日后获准，则沿用30步run的最终latent、clamp前raw/分布、17张无损编码前帧、MP4和对应帧0/8/16。关注摄影感、真实表面/叶片细节、光影、轮廓及既定微运动；主观验收由持有人完成，不用关键词命中或像素差自动PASS。
- 资源：需要一次新GPU采样及原路径一次CPU VAE，无下载；沿用前置空闲14GiB GPU/48GiB主机、采样90秒/总240秒、75°C/运行中4GiB停止阈值和Windows独立监控/WSL持久日志。原30步实测58.383秒、PyTorch allocated3.334GiB只作参考，不保证新文本耗时或峰值。
- 边界：当前**未获新生成授权、没有执行**。runtime profile/allowlist不改，提案只存next-prompt-control-proposal.json，不能直接绕过固定profile门禁。若下一次获准仍须新run、现场检查和历史STOP审查；一次机会，异常即停，不自动改负词/精度/尺寸续试。
- 解释：若改善，只支持这组正向写实指令对当前模型/配置有影响，不能证明模型/精度或硬件已排除；若无改善则保留失败，不自动遍历提示词或追加模型实验。AI生成素材来源类型仍为ai_generated，提示词中live-action不是实际拍摄来源证明。

实际提示词审计、完整提案及持有人裁定见本审查目录JSON；原run、样片、参数、latent、日志和STOP前后哈希保持一致。原B进程累计3、采样2不变；本轮生成0/模型解码0。生产与试验STOP继续保留，完成后停止，等待持有人决定是否执行该文本对照。


## 20. 仅修改正向提示词的一次30步对照

### 20.1 授权、基准与参数控制

持有人明确授权使用第19节已列出的完整写实正向，负向及上一条30步配置全部不变，仅一个样本、异常即停、不重试。新runId `20261029T071853Z-6a4e0e853d97`，基准run `20261029T065718Z-764c987d402f`。本轮模型进程1次、采样1次、原CPU FP32 VAE解码1次；累计B进程4（含首次bootstrap失败）、实际采样3次。随后“继续”只用于完成本次复检/报告，没有再次启动生成。

实际正向，逐字匹配已提出的方案：

```text
A quiet modern office desk, a closed laptop and a small green plant beside a window, soft blue evening light, subtle camera movement, no people, no visible text. Photorealistic live-action video recorded with a camera in a real office. Soft natural evening light comes through the window. Realistic surface textures on the laptop and desk, fine natural details on the leaves, physically plausible shadows and reflections, and natural colors.
```

实际负向，逐字保持基准：

```text
people, text, letters, logos, news footage, watermark, distorted objects
```

无额外扩写、翻译、风格LoRA、参考图或风格控制。生成child仍直接clip.tokenize(cfg['prompt'])和clip.tokenize(cfg['negativePrompt'])，源码SHA与上一条30步executed-source/wan21-child.py完全一致。actual-prompts.json、sample-request.json、profile-diff.json及sample/run.json共同保留真实执行参数；无token/embedding逐值存档，不伪称存在。

新增精确登记profile `wan21-profile-30step-realistic-prompt.json`，与基准仅prompt字段不同；原30步profile不修改。14项CPU门禁测试通过，含仅正向改变/负向及其余字段完全一致、未登记负词改动拒绝。模型SHA、seed20261029、256×448/17帧/16fps/30步/batch1、CFG6/shift8/uni_pc/simple/denoise1、BF16扩散、CPU文本/FP32 VAE、math-only/eager、卸载与所有保护、原FFmpeg RGB24→libx264 YUV420P/CRF18/threads2均保持。没有变更驱动/依赖/生产默认或取消的CPU参考解码器。

### 20.2 前检、STOP及完整阶段

前检GPU核心33°C、空闲44122MiB、recovery=None、主机可用约120.18GiB；三项模型完整SHA匹配基准，compute-app为空。两个Windows Python仍为Hermes服务链，未停止其他服务。从基准结束至本次前检无新增相关宿主设备事件/查询错误。

全局旧STOP对应已结束的基准30步试验，复核原result、子进程退出、完整归档SHA及现场事件后，持合作锁原子重命名到：

`local-assets/experiments/video-recovery-20261029/stop-archive/20261029T065718Z-764c987d402f-to-20261029T071853Z-6a4e0e853d97/`

原字节/SHA与transition保留，没有绕过活动异常锁。新run启动前写新STOP/一次性标记，成功后均保留。账本仅追加，历史字节前缀SHA匹配。供电接法仍按持有人转接假设且未实物核实，不扩大为生产许可。

Windows原生独立logger PID61412，C盘独立落盘，结束NORMAL_STOP；WSL另有持久日志。父监控UTC07:19:34.522050—07:20:55.662075，81.140秒。真实GPU注意力检查在加载前通过，然后同进程完成正负文本编码、扩散加载、30步采样、原CPU VAE、raw/PNG保存及MP4编码。子进程返回0、stderr0字节，完整视频解码PASS。所有正常阶段连续执行，没有再次询问或增加样本。

### 20.3 输出与技术实测

输出根目录：`orchestrator/output/local-video-recovery-20261029/stage-b/20261029T071853Z-6a4e0e853d97/`

- 新MP4：`sample/sample.mp4`，256×448、17帧、16fps、1.0625秒，SHA/大小见sample/video-validation.json。
- 实际提示词/参数：actual-prompts.json、sample-request.json、profile-diff.json。
- 最终latent：sample/sampled-latent.pt；clamp前原始VAE/统计：sample/pre-clamp-vae-output.pt、pre-clamp-statistics.json。
- 编码前17张无损RGB PNG：sample/preencode-frames/；逐帧SHA清单sample/preencode-frames.json。
- 四列对应帧图：comparison/corresponding-frames.png；行0/8/16，对应0/0.5/1秒；列为 **原30步PNG / 原30步MP4 / 新写实正向PNG / 新写实正向MP4**。两版都有真正编码前帧，不是拿MP4抽帧冒充。
- CPU抽帧命令/逐帧误差：compare-frames.py、comparison/comparison.json；FFmpeg显式-hwaccel none，仅视频解码，不是又运行VAE或模型。

| 实测 | 基准30步 | 新正向30步 |
|---|---:|---:|
| 生成入口至model-result | 58.383秒 | **59.757秒** |
| 扩散采样阶段 | 7.161秒 | **6.740秒** |
| CPU VAE阶段（含raw统计保存） | 18.899秒 | **19.738秒** |
| PyTorch allocated峰值 | 3579718656字节 | **3579718656字节 /3.334GiB** |
| PyTorch reserved峰值 | 3888119808字节 | **3888119808字节 /3.621GiB** |
| 整卡采样显存峰值 | 8607MiB | **8750MiB** |
| 整卡核心温度采样峰值 | 51°C | **50°C** |
| 整卡功耗采样峰值 | 398.77W | **397.23W** |
| 相关宿主新增事件（前/持续/后/额外复检） | 均0 | **均0，查询错误0** |

各一次运行，差值受文本长度、CPU/桌面/缓存及测量波动影响，不能据此建立性能结论。整卡指标含桌面/采样误差，不是模型独占功耗或瞬态上限；显存结温、热点、PCIe计数仍UNAVAILABLE/null，无新增设备事件不证明硬件或生产稳定。

clamp前CPU FP32原始输出[1,3,17,448,256]：NaN/正Inf/负Inf均0，min=-1.6869124、max=1.5663466、mean=-0.0769269、std=0.7202850；低于-1约7.2152%、高于1约13.8197%，合计约21.0349%落在原clamp范围外，较基准约3.0931%增多。这里只记录输出分布及更多边界截断，不将它直接认定为溢出、显卡错误或根因。

新编码前PNG→MP4平均绝对误差2.832/255、RMSE6.165、PSNR32.332dB，最大单通道差131，编码有损且局部边缘误差可能较大。图中残余光滑/硬轮廓特征已在编码前出现，不能全部归于H264；误差及新旧像素差不是审美分数。

### 20.4 实际对应帧观察与提示词遵循

方法：交互式助手查看真实四列图的0/8/16帧，不是无人值守模型API分析，也不是持有人最终验收；观察单独存visual-observation.json。

| 项目 | 与原30步相比的实际观察 | 本轮结论 |
|---|---|---|
| 材质 | 物体更正面，新增较亮桌面/白盆，叶片和笔记本表面依然光滑、简化，缺少可确认的细微自然纹理 | 写实材质目标没有明确达成，不能因为提示词写photorealistic就标PASS |
| 颜色 | 原蓝色窗/暗桌面变为亮青蓝背景、饱和绿色叶、棕橙边框及亮白桌面 | 颜色变化显著，但不等于自然色彩改善；本轮没有调色 |
| 轮廓 | 主体可辨，仍有粗硬深色/彩色边线、简化圆叶和高对比边缘 | 插画/渲染感在编码前依然存在 |
| 桌面/绿植/窗边 | 三者可见 | 部分场景内容遵循 |
| closed laptop | 两版均可见**打开**的笔记本，新版更明显露出屏幕/键盘 | **未遵循**原正向物体状态要求 |
| 无人/无可见文字 | 抽查帧未见人、未见清晰可读词语 | 仅限所查静帧；未做全片OCR或自动事实保证 |
| 自然傍晚光/真实阴影反射 | 强蓝背景、亮桌面不能单独证明光照真实；真实材质细节不足 | NOT_ESTABLISHED |
| 细微镜头运动/动态自然度 | 不用三张静帧替代正常速度观看 | **NOT_EVALUATED，留持有人观看** |

**结论：** 这组正向写实描述明显改变了当前配置输出的构图/颜色/物体形态，但没有在所查帧中明确消除插画感；不能认定达到真实动态素材要求。它也不能证明文本是全部异常的唯一原因，或排除/证明显卡问题。仅一个种子/短片/小尺寸，结论不外推其他场景/尺寸。新片人工视觉与动态自然度仍NOT_EVALUATED；不擅自追加负词、换精度或重新采样。

### 20.5 实际命令、归档与停止

以下已执行一次，目录/机会已消耗，命令仅供审计：

```bash
python3 experiments/local-video-recovery/recovery.py monitor --stage B --seconds 280 \
  --run-id 20261029T071853Z-6a4e0e853d97 \
  --review orchestrator/output/local-video-recovery-20261029/stage-b/20261029T071853Z-6a4e0e853d97/review.json \
  --sample-request orchestrator/output/local-video-recovery-20261029/stage-b/20261029T071853Z-6a4e0e853d97/sample-request.json \
  --out orchestrator/output/local-video-recovery-20261029/stage-b/20261029T071853Z-6a4e0e853d97/sample \
  --host-log /mnt/c/Users/admin/video-recovery/runs/20261029T071853Z-6a4e0e853d97/host.jsonl
python3 experiments/local-video-recovery/validate-wan21-output.py \
  orchestrator/output/local-video-recovery-20261029/stage-b/20261029T071853Z-6a4e0e853d97/sample-request.json
CUDA_VISIBLE_DEVICES=-1 PYTHONDONTWRITEBYTECODE=1 \
  local-assets/experiments/video-recovery-20261029/venv/bin/python -B \
  orchestrator/output/local-video-recovery-20261029/stage-b/20261029T071853Z-6a4e0e853d97/compare-frames.py
```

Windows日志 `C:\Users\admin\video-recovery\runs\20261029T071853Z-6a4e0e853d97\`；WSL原始stdout/stderr/阶段/遥测在sample/，宿主复检在host-postflight.json；执行源码在executed-source/，来源/参数/hash均保留。

完整两侧日志/raw/PNG/MP4/比较图与旧STOP迁移归档到`stage-b/archives/20261029T071853Z-6a4e0e853d97-positive-prompt-control.tar`，28160000字节，SHA `c31a7caf3d6857e04fb98fcc36edc34c0c82f77e5a74f007cebd8a3eab8f0784`。原baseline文件逐项SHA不变；6项服务/生产保护文件不变，历史账本仅追加，归档不删除来源。

当前结果 **POSITIVE_PROMPT_ONLY_CONTROL_TECHNICAL_PASS**，真实素材视觉目标尚未确立、动态自然度待人工观看。已完成本轮交付并停止，新全局试验STOP/机会标记和生产Wan STOP均保留，不扩分辨率/时长、不追加其他试验，不自动发布或推送。


## 21. 480×832试验失败及事故后只读取证

持有人授权的空间分辨率单因素run `20261029T073531Z-c17945661b35` 确实启动1次；配置为480×832/17帧/30步、原写实正负词、seed20261029/CFG6/shift8/uni_pc/simple/BF16、math-only/eager与计划原CPU FP32 VAE。尺寸经固定实现支持条件核查，初始GPU门槛32GiB/主机80GiB和120/110/260秒超时均有资源审查；75°C/运行4GiB保护不变。生成child源码和模型文件保持。它是自定义Comfy受控诊断，**并非官方原样基线**。

最后阶段UTC07:37:56.013321 sampling_progress23/30；随后stderr明确`torch.AcceleratorError: CUDA error: an illegal memory access was encountered`，栈在eager AdaLN逐元素运算上报，异步错误可能来自更早调用，不能判该行即根因。15:38:34追加活动异常STOP并尝试只终止本模型进程组，未取得成功退出记录；之后持有人确认黑屏重启，Windows LastBootUpTime为UTC07:39:18.570841。采样未完成，最终latent/VAE/MP4均未产出，不重试或换后端。

双侧落盘中断至UTC07:37:56附近：WSL75条遥测/36条模型阶段、Windows38条遥测；原run/host-state仍RUNNING/endedAt=null，无events-after，原状保留。整卡事故前采样峰值16288MiB/59°C/388.21W，不是最终故障瞬态或PyTorch峰值。未越既定停止线不能说明硬件正常。

事故后按新授权仅只读取证：先归档53个现场文件，导出System/Application事件及XML，尝试读取精确WATCHDOG路径，不改ACL、不初始化CUDA、不查询GPU、不加载/测试Qwen或其他模型、不重新做环境/CPU检查。KernelPower41 RecordId1452074 BugcheckCode0；WER1001 RecordId35880/35958均引用WATCHDOG-20261029-1538.dmp/P1=141，是同一候选报告重复登记。Root/精确dump路径Access denied，备用平铺路径与MEMORY.DMP不存在，转储复制0；不能宣称本次不存在dump。原生独立监控也没有保证真实故障后持续落盘，本次盲区如实保留。

重启后WSL/Windows未发现本次试验进程，相关计划任务未匹配；旧PID已不在，未停止无关服务或自动恢复任务。活动异常STOP及历史记录不移动/删除；本轮新增GPU/模型/解码0，累计B进程5/实际采样开始4（含最早bootstrap失败），不计作成功成片。

Qwen旧日志与宿主证据补查：8/26 11:30:12及9/5 12:40:53均为**illegal instruction**，不是illegal memory access。9/5 WER引用12:41/12:42 WATCHDOG支持近时GPU看门狗；黑屏/重启未由现存证据确认。旧System已过保留期，8/26 Application亦缺失；8/31 HWiNFO BadTLP/NAKs94→117是另一日期计数，不能当各事故同时证据。环境/错误原文/阶段及与两次Wan简表见[GPU-INCIDENT-004](GPU-INCIDENT-004.md)。不同错误类型、执行模式和证据缺口均保留，根因未定，不作硬件/驱动/模型因果认定。

证据目录 `orchestrator/output/gpu-incident-004/20261029T075016Z-d5fa6c0df2/`，主简报`docs/reports/GPU-INCIDENT-004.md`。原事故run不改写结束/PASS，原生产文件和现场摘要保全。**所有视频生成继续STOP；下一步仅建议管理员有权限时导出精确dump作离线分析，任何恢复/测试均需后续新裁定。** 不提交推送。


## 22. 内存实测和WHEA/QVL/BIOS只读补充

持有人实测并经本轮只读CIM核对：ProArt X870E-CREATOR WIFI / Ryzen9 9950X，4×64GB Lexar LD5U64G60C40BV，共256GB；ConfiguredClockSpeed全部3600，Speed字段4800；BIOS1805/SMBIOS日期2025-12-11。**当前无“四条运行6000”的证据，不得将内存高频作为已确认原因。内存稳定性仍未单独验证。** 原主机内存与GPU扩容显存分开。

全保留System WHEA-Logger查询0条，错误0，最早窗口UTC10/26 16:52；既有328份恢复/事故导出及35份Qwen host/event快照未找到实际WHEA XML。不能根据缺记录判断DRAM/CPU/PCIe/GPU归属；BootErrorCount0、WER141、BadTLP或CUDA错误不冒充WHEA。Qwen故障日期System已过保留期，不能写无WHEA。

ASUS公开QVL接口按Ryzen9000及精确PN查询，仅返回-RGD/-RGS近似料号2×64GB、SocketSupport1,2；同前缀四槽筛选0条。整板官方有4槽/最高256GB及其他7条4×64GB QVL，但不替代本机料号四槽验证；未列也不证明不兼容。BIOS1003/1504有大容量/四条兼容性改进，1805仅一般稳定性，2004后续JEDEC兼容性；均为文档信息，非本机根因或建议自动刷写。官网1805日期12/19与本机SMBIOS12/11分开。

详细原始记录、URL及核验限制见[GPU-INCIDENT-004第9节](GPU-INCIDENT-004.md)；证据目录gpu-incident-004/20261029T080614Z-34d1b4827e-memory-whea/。下一项只读优先仍为管理员在现有权限下导出当天WATCHDOG，离线核对超时上下文；DRAM独立诊断需另行授权，本轮不运行。所有STOP、原事故53项文件SHA保持，未改BIOS/内存设置/环境，未启动GPU或压力测试。


## 23. WATCHDOG已完成Windows离线分析，恢复仍STOP

管理员导出的同一dump已普通权限校验并用Microsoft.WinDbg1.2610.1001.0内KD10.0.29661.1004分析。确认0x141视频引擎超时、KernelGeneratedTriage/LiveDump，时间15:38:03.975与本次480×832试验最后23步记录相差约7.962秒；捕获线程为System图形调度器worker，栈经过硬件进度检查、引擎重置、TDR live dump取证。Arg2归入nvlddmkm+1959fa0/bucket，不等于原始CUDA错误IP或驱动/显卡损坏证据。

OS公开符号支持栈名，NVIDIA符号/私有TDR类型和部分triage内存缺失；完整参数/线程/版本/日志来源及各次离线会话限制见[事故报告第12节](GPU-INCIDENT-004.md)。原dump/STOP/历史现场不变；本轮无CUDA/模型/压力/内存测试，无驱动/BIOS/TDR变更，所有离线KD已退出。根因仍未定，生产及试验视频生成继续STOP，不把离线取证完成当作恢复通过。
