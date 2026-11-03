# GPU-INCIDENT-005｜2026-11-02 IndexTTS2 后黑屏重启只读取证

核查时间：2026-11-02（Asia/Shanghai）；证据目录 `orchestrator/output/gpu-incident-005/20261102-post-reboot/`。本轮没有运行CUDA、模型、nvidia-smi、GPU推理/解码或压力测试，没有改驱动、TDR、BIOS或系统代理。所有既有STOP保留，新增独立STOP.json；本期制作暂停。

## 当前结论

**本次已经有Windows系统级图形故障证据，不只是TTS程序NaN。** System报告实际bugcheck **0x116**，Kernel-Power41中的十进制278一致；新Minidump已落盘。NVIDIA原始事件含UCodeReset、Resetting、Reset、Restarting TDR。根据[微软0x116文档](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x116---video-tdr-failure)，这是尝试从显示超时恢复/重置失败。不能由此单独判定显卡损坏或驱动软件缺陷。

本次WER另报告LiveKernelEvent117，指向WATCHDOG-20261102-2335.dmp；[微软0x117文档](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x117---video-tdr-timeout-detected)说明117是live dump标识，不能替换本次系统崩溃的116。WER参数aaaaaaaa是报告占位，不当作真实dump参数。

## 真实时间线（全部UTC+8）

| 时间 | 证据与含义 |
|---|---|
| 23:01:49.539 | Application WER1001 Record38689，141，指向WATCHDOG-20261102-2301.dmp，与此前FP16 device-side assert接近；并非这次23:35事故同一份dump。原dump未读，内部时间未确认。 |
| 23:18:47–23:20:04 | 经授权FP16观察诊断runId20261102T151813Z-4ddda026c0b3，捕获原始logits NaN后退出；非新生成成功。 |
| 23:33:19.868 | 本次FP32服务启动，runId20261102T153306Z-e2ab6570a02f，PID726386。 |
| 23:33:46.089 | 本次推理请求开始。 |
| 23:35:10.047725 | observer第4943次捕获一个beam共8194个NaN，保存原数组并抛错，未交付完整WAV。 |
| 23:35:10.611141 | 运行记录服务已退出，STOP_NO_RETRY；请求耗时84.351秒。 |
| 23:35:11.1109855 | 独立监控最后一条整卡遥测。 |
| 23:35:11.2527539 | host-state记录NORMAL_STOP。 |
| 23:35:11.2867044 | nvlddmkm14 Record1453545、153 Record1453546；XML明文UCodeReset TDR occurred on GPUID:100。距NaN约1.239秒，距服务退出约0.676秒。 |
| 23:35:11–23:35:36.236 | 23,993条nvlddmkm14及10条153，共24,003条事件；不是24,003次独立事故。 |
| 23:35:22.297 | WER1001 Record38745，117，指向当晚2335 WATCHDOG。 |
| 23:37:14.232 | Win32_OperatingSystem.LastBootUpTime，重启后启动时间，不是精确崩溃时刻。 |
| 23:37:18.300 | Kernel-Power41 Record1477582，BugcheckCode278，即0x116。 |
| 23:37:26.966 | Minidump LastWriteUtc对应时间，10,005,133字节。 |
| 23:37:29.617 | System WER1001 Record1477667，确认0x116及四参数；邻接1477668提示可能相关驱动nvlddmkm.sys。 |

四个bugcheck参数：`0xffffb50dbff8d2a0`, `0xfffff8008866a350`, `0xffffffffc000009a`, `0x4`。来源是System原始XML，不是已做WinDbg分析。EventLog6008给出的“上一次关闭23:29:12”早于仍有连续推理/监控证据的23:35，存在时间解释冲突，保留原文，不据它倒推本次事故开始时间。重启后重复上报的7–10月旧WER不算新事故；本轮按文件名/报告ID去重。

## 配置、数值与监控

最后一次是**IndexTTS2 FP32受控对照，不是Wan官方基线**。批准服务隔离副本仅将use_fp16和health标识改为False，原服务不改。源revision d9e41aac89fd00b3d71497fddb287b7f24613712、模型revision740dcaff396282ffb241903d150ac011cd4b1ede。Python3.11.13，torch2.8.0+cu128、Transformers4.52.1。原种子42、情绪0.6、top_p0.8/top_k30、temperature0.8、beam3、repetition10.0、max_mel1500保留。完整本地配置及源码差异已归档，不复制私人声音参考或权重。

FP32首次logits有限，后一个beam出现8194NaN，其他beam仍有限；无正负Inf。故**不能仅用FP16溢出解释全部现象**，也不能由NaN证明显存损坏。TTS错误是device-side assert/NaN，先前Wan是illegal memory access、Qwen是illegal instruction，错误类型不混同。

FP32独立Windows记录57条样本，整卡峰值显存13,991MiB、核心59°C、功率325.65W、利用率95%。不是模型独占功耗；不能排除瞬态供电、显存热点/温度或PCIe问题。显存结温/热点/PCIe计数不支持，保留null。当前窗口没有WHEA事件不排除硬件问题。

**监控局限和前检缺口：** 最后一条遥测早于首条TDR约0.176秒，NORMAL_STOP/最后event查询与首个TDR极接近，返回零事件不覆盖其后事故。先前“无新增事件”仅适用原短窗口。此次回看还发现23:01已存在141的WER；原前检窗口没有覆盖它，不能据原窄窗口放行就宣称事故已排除。后续门禁需覆盖本次会话所有未审查设备事件，且观察需延续到进程退出之后；本轮只记录缺口，不以修改监控为由再次试跑。

## 证据与权限阻断

63份原运行/参数/observer数组/双侧日志/STOP副本已复制，658,482字节，逐文件SHA均与来源匹配。Windows原始事件和XML保存到windows-evidence.json（原查询因Windows时间处理含更早事件，保留完整），incident-window-events.json再严格以UTC筛选15:10以后；key-events.json及representative-xml便于阅读。没有原件移动覆盖。

普通权限WSL和Windows原生File.OpenRead对三份dump均拒绝访问，不改ACL：

- `C:\Windows\Minidump\110226-16484-01.dmp`
- `C:\Windows\LiveKernelReports\WATCHDOG\WATCHDOG-20261102-2335.dmp`
- `C:\Windows\LiveKernelReports\WATCHDOG\WATCHDOG-20261102-2301.dmp`

后两条准确路径来自WER附加文件，不是假定已成功枚举原目录。LiveKernelReports目录枚举被拒绝，大小/SHA暂缺。**尚未取得可读dump、未开展本次WinDbg调用栈分析**，不能引用旧事故栈冒充本次。

已准备 `C:\Users\admin\video-recovery\export-tools\export-incident005-dumps.ps1`，由持有人管理员PowerShell执行，只复制到唯一新目录、核验大小与SHA、保留原件/ACL及回执。每份独立失败留证，不跳过错误假报成功。dump可能含内存数据，仅私有诊断使用。

```powershell
& ([scriptblock]::Create([IO.File]::ReadAllText('C:\Users\admin\video-recovery\export-tools\export-incident005-dumps.ps1')))
```

## 能确定、不能确定与下一步

能确定：此次TTS异常之后紧接显卡TDR事件，Windows实际记录图形恢复失败0x116并重启；不只是配音程序崩溃。不能确定NaN是GPU异常先兆、软件运算问题还是其他因素；不能判定应用/驱动/改装4090显卡显存/供电/PCIe/系统内存中的根因。原系统4×64GB配置3600，无四条运行6000证据；2200W额定功率也不是实测供电稳定证明。

下一项最有区分价值的检查：取得上述三份普通可读副本，离线WinDbg核验真实dump码/内部时间/恢复上下文/栈和驱动版本，与23:01、23:35两次TTS及10月29 Wan0x141做证据对照；不先重现故障、不换模型再试。所有GPU制作继续STOP，包括本期TTS，保留所有历史锁。Windows/WSL没有观察到本次试验残留进程，不停止无关服务、未修改365vpn。分支main/HEAD cc562624f8d36cf06fde9e373e72e5451e973ce1，本地origin/main相同；未fetch、提交、推送；已有修改/Excel删除状态保留。


## 2026-11-03补充｜三份dump已导出、普通权限复核、正式离线分析完成

本节替代上文“尚不可读/未分析”的当前状态，保留历史权限错误与原始证据。持有人管理员导出到 `C:\Users\admin\video-recovery\dump-exports\INCIDENT005-20261103T013506Z-2c601535\`；本轮以普通权限成功读取，逐个核对大小与SHA，另复制入独立WSL分析目录，分析后复核字节仍未变。原目录、原dump、ACL及STOP不动。没有启动CUDA、模型、GPU测试/查询/解码或压力测试，没有驱动/BIOS/TDR调整，没有上传dump。

### 副本身份与真实分析入口

| 文件 | 字节数 | SHA-256 |
|---|---:|---|
|110226-16484-01.dmp|10005133|7B4B48818678E215334561A966C320911AF6975CF4D4BC8B510D2974679B0A9C|
|WATCHDOG-20261102-2335.dmp|3026569|DA8E0CDBB0EFFD104FEB24C474C2219D176E7817F39B9A3E2B2F630A15535235|
|WATCHDOG-20261102-2301.dmp|3035673|3A87E7C2C6AF48E96F846DF525E0E2F7E38C803DD77D4CC167DB1CC594DD0F7C|

工具复用已安装WinDbg1.2610.1001.0包内amd64/kd.exe，引擎10.0.29661.1004，Microsoft签名Valid，SHA CC5DBEDB2AB24271F327E2FF034F90B960CDF086101EEB0B95440DEE1B3722C6（与旧分析工具一致）。三次均为同批副本的离线会话，不是GPU试验；每次完整执行至q、退出码0，无超时/强制停止/重试。

证据根 `orchestrator/output/gpu-incident-005/20261103-offline-analysis/`，含admin-export-receipt.json、readability-hash-check.json、debugger-tool-integrity.json、driver-file-readonly-crosscheck.json、analysis-results.json、file-manifest.json。三个以dump名命名的目录分别保存完整stdout.log/stderr.log、Windows原生analysis.log副本、commands.txt、invoke.ps1、command.json、exit.json、提取的analyze-v-extracted.txt/stack-summary.txt。准确Windows原生输出位置记录在各command.json；不是仅有摘要。

真实可复查命令在各invoke.ps1，形式为已核验 `kd.exe -z <普通目录副本> -y srv*<原symbols缓存>*https://msdl.microsoft.com/download/symbols -logo <独立输出> -cf <逐行命令文件>`。命令依次version、.time、.bugcheck、!analyze -v、kv、!thread、lmvm nvlddmkm/dxgkrnl/dxgmms2、q。只有公开符号/映像下载，不上传转储或attach运行进程。

### 转储确认的时间、类型与参数（全部UTC+8）

|项目|23:01 WATCHDOG|23:35 WATCHDOG|系统Minidump|
|---|---|---|---|
|dump内部时间|2026-11-02 **23:01:42.910**|2026-11-02 **23:35:11.465**|2026-11-02 **23:36:52.385**|
|系统uptime|14:52:48.643|15:26:17.199|15:27:58.119|
|错误码|**0x141 VIDEO_ENGINE_TIMEOUT_DETECTED**|**0x117 VIDEO_TDR_TIMEOUT_DETECTED**|**0x116 VIDEO_TDR_FAILURE**|
|类型|Kernel Generated Triage / Live Generated Dump|Kernel Generated Triage / Live Generated Dump|Mini Kernel / Kernel Generated Triage Dump|
|Attributes|0x18|0x18|0x21808|
|Arg1|ffffb50dbba4e2a0|ffffb50dcf8c8010|ffffb50dbff8d2a0|
|Arg2|fffff80088669fa0|fffff80088669fa0|fffff8008866a350|
|Arg3|0|0|ffffffffc000009a|
|Arg4|ffffb50d6226c080|0|4|
|FAULTING_THREAD|ffffb50d44be8140|ffffb50d44be8140|ffffb50da3477040|
|PROCESS_NAME|System|System|System|
|归档bucket|LKD_0x141_IMAGE_nvlddmkm.sys|LKD_0x117_IMAGE_nvlddmkm.sys|0x116_IMAGE_nvlddmkm.sys|

这些是实际`.time/.bugcheck/!analyze`输出，不再只依赖WER P1或文件名。141/117为live dump，不能把它们当成此次系统崩溃码。uptime与时间差相符，23:01至23:36是同一系统启动会话，不是已在23:01重启。相同System线程记录的是调度/故障处理上下文，不是证明TTS线程本身是这个线程。

### 调用栈、模块与符号限制

两份live dump都在 `dxgmms2!VidSchiCheckHwProgress / VidSchiReportHwHang`、`dxgkrnl!TdrIsRecoveryRequired / TdrCollectDbgInfoStage1`及`nt!DbgkWerCaptureLiveKernelDump`路径留证。可确认Windows图形调度器报告了进度停滞并触发TDR收集；函数名HwHang不是“硬件损坏已证实”。

0x116栈为 `nt!KeBugCheckEx ← dxgkrnl!TdrBugcheckOnTimeout ← ADAPTER_RENDER::Reset ← DXGADAPTER::Reset ← TdrResetFromTimeout / TdrResetFromTimeoutWorkItem ← nt!ExpWorkerThread`，确认恢复/重置失败进入系统bugcheck。不是简单的应用退出或仅断电后无记录重启。第三参数保留原NTSTATUS值；不从该值直接推断显存不足、坏显存或电源故障。

微软dxgkrnl/dxgmms2的public PDB已加载，模块资源版本均 **10.0.26100.9711**，能够解析上述栈函数；**符号不完整**：NVIDIA显示(no symbols)、Unable to load image / Unable to verify timestamp，私有`dxgkrnl!_TDR_RECOVERY_CONTEXT`类型不存在。不能伪造NVIDIA内部函数、GPU指令或完整恢复上下文。分析还报告Unknown TAG202b；Minidump提示Failed to read dump data exension data，两份live dump缺卸载模块列表，全部警告保留，不将这些读取/工具限制当成dump损坏已证实。

三份dump模块记录NVIDIA映像大小07375000、timestamp6A60207A、checksum072C8D9B一致；live Arg2归为nvlddmkm+1959fa0，116 Arg2归为nvlddmkm+195a350。这些owner/模块地址与自动bucket不等于找到了根因或原始出错算子。lmvm未能从dump带出NVIDIA版本资源。独立只读复核当前磁盘驱动SHA与此前完全相同C5DCC1A5…D9E1D552、三项PE元数据匹配dump，沿用此前同SHA文件资源版本 **32.0.16.1088（610.88）**；明确这是磁盘佐证，不能冒称完整dump映像SHA已经验证。

### 与配音、宿主事件的关系，以及调查结论

1. 23:01:42.910的141与tts-fix1首轮device-side assert/HTTP500记录处于同一秒。stderr没有每行精确时钟，不能排定两者毫秒先后。**第一次TTS失败时已经存在系统级GPU引擎超时，不只是一条模型数值断言。**
2. FP32 NaN在23:35:10.047725，服务退出23:35:10.611141，首条nvlddmkm TDR事件23:35:11.2867044，117 dump在23:35:11.465。dump比NaN晚约1.417秒、比服务退出晚约0.854秒；时间关联很紧，但不证明NaN先于真正GPU故障或是其唯一原因。
3. 116内部时间23:36:52.385，比117晚**100.920秒**，比服务退出晚约**101.774秒**；Windows23:37:14.232重新启动，比116晚约21.847秒。可以描述为已记录超时，后续恢复失败导致bugcheck再重启；不能把文件写入/重启后WER报告时间当事故开始。
4. 前次独立监控23:35:11.111的末条样本早于首条TDR约0.176秒，NORMAL_STOP只证明日志正常结束，没有覆盖之后恢复过程。原前检/后检窄窗口漏掉23:01的141，这一门禁缺口保留，不用“零事件”继续推断设备健康。技术上捕获NaN不是恢复条件已满足。
5. 与10月29 Wan0x141相比，均有GPU超时证据且NVIDIA模块身份记录相同，但本次另确认117→116恢复失败；应用、算子、工作量、时间均不同，不能直接合并为同一根因。Qwen历史illegal instruction和Wan illegal memory access也不能混称同一CUDA错误。

**确定结论：** 本次是已被Windows dump证实的GPU/显示驱动链路超时及恢复失败；不能再仅归为FP16精度或TTS普通程序异常。**未确定根因：** 驱动软件缺陷、改装4090 48GB的GPU/显存、PCIe/主板、供电、主机内存或应用/运行时交互，现有triage dump无法区分。没有证据判定显卡已损坏；也没有证据排除硬件。4×64GB配置3600事实保持，不恢复“四条6000”说法。核心59°C/整卡325.65W峰值不能排除未监测显存热点或瞬态问题。

本轮离线取证完成，不需要再导出这三份副本。下一步优先把**这次三份dump、两次TTS参数/错误及旧Wan141**提供供应商私有售后做硬件/驱动交叉诊断；不自动发送、不公开转储。若今后要做驱动变更或已知良好板卡/供电的交叉验证，需另定受控方案和授权，本轮不启动任何复现。生产Wan和本期GPU TTS继续STOP，不恢复制作、不自动重试。封存证据可用于后续追加供应商诊断包，但本轮未重打包旧证据ZIP或声称供应商已收到。


## 2026-11-03｜魔改4090 48GB相似案例检索（仅网络研究）

结论：存在相似的AI计算后锁死、掉卡及Windows141/117/116案例，但未找到可直接套用本机610.88/Windows+WSL的已证实通用软件修复。以下是原作者报告及官方说明，非本机根因判定；没有新增GPU运行或环境更改。

|原始来源|实际信息与最终状态|本机适用限制|
|---|---|---|
|[NVIDIA仓库Issue1490](https://github.com/NVIDIA/open-gpu-kernel-modules/issues/1490)|48GB改装4090作者报告计算后锁死；初称关GSP/闭源驱动解决，后续评论撤回，问题仍在，作者怀疑该卡内存子系统。无独立维修报告。|“结束计算后出故障”可比较；Linux Xid不是Windows TDR同一码，不能采用标题里的过时修复结论。|
|[48GB4090D亲历帖](https://lcz.me/topic/1012)|报告116/117/141、Event14、花屏，已送换；另一个使用者称自己的换卡后暂未复发。|主帖作者明确承认诊断由AI撰写、本人不确定根因；降级为症状线索，不接受“低负载即可排除驱动/供电”等断言，无维修单或长期复验。|
|[LinuxDo两台4卡记录](https://linux.do/t/topic/2615222)|原作者称掉卡、多次返修、换535/565/580仍出问题，供应商未说明原因；其他人也有长期正常的报告。|不是统一故障率统计，不能说魔改卡必坏或哪个驱动普遍修好。|
|[普通4090用户解决记录](https://www.reddit.com/r/nvidia/comments/1ihq3l7/4090_resolved_black_screens/)|用户报告更换故障供电线后黑屏消失；线材厂商账号说明sense端子问题，厂商网页亦说明相关设计。|不是48GB魔改专属案例；本机连接方式尚未实物确认，不能由2200W额定值排除线材/端子。|

官方/厂商交叉来源：[NVIDIA4090供电接头说明](https://nvidia.custhelp.com/app/answers/detail/a_id/5413/kw/applications)、[CableMod说明](https://store.cablemod.com/stealthsense-technology/)、[微软TDR注册表边界](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)、[NVIDIA WSL指南](https://docs.nvidia.com/cuda/wsl-user-guide/index.html)。厂商产品宣传不是本机线材检测结果。WSL使用Windows宿主驱动，不能套原生Linux关GSP/更换内核模块的命令；不在WSL另装Linux显卡驱动。

另外查到[48GB BAR1/P2P原作者实验](https://duanyll.com/2026/7/13/4090-48G-P2P/)，针对多卡P2P映射，不是本机已有单卡TTS的直接证据，不推荐刷VBIOS或套P2P补丁。搜索中部分“焊点/颗粒/故障率/指定驱动万能修复”文章没有可核验实验、或由AI生成，不纳入确定结论。YouTube换卡视频未取得完整正文，不假称已逐帧观看或取得维修检测证明。

建议处理顺序（方案，不在本轮执行）：先让供应商确认实物PCB/显存/固件身份、已知故障及适用驱动；在彻底关机断电条件下由装机商检查并以适配本电源针脚定义的已知良好线材做单因素替换；再由售后做已知良好显卡/整机的受控交叉诊断，记录故障是否随卡/随线/随主机转移。如更换或维修，要求实际AI工作负载、结束后的恢复/空闲阶段与原始事件证据，不以短跑分/一次CUDA通过结案。若开展任何带电负载须另经受控授权，本轮STOP不变。驱动变更仅在供应商给出具体兼容版本与回滚方案后另行评估，不盲目DDU/刷BIOS/禁用安全检测。提高TdrDelay不是故障修复，微软亦说明终端用户不应随意修改这些调试键。

结合本机：跨Wan/TTS出现系统GPU超时、FP32仍异常，足以把显卡本体/板载显存及供电链路作为优先交叉排查对象，但不证明已损坏，也不排除驱动与主机平台。当前4×64GB配置3600，没有高频6000证据；显存占用未满和核心温度59°C不能独立排除显存/板级问题。没有从社区帖子推导本机故障概率。
