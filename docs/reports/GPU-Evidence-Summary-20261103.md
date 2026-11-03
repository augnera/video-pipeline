# GPU黑屏证据汇总｜2026-11-03

本次只整理已有证据、只读复核及复制；没有GPU计算/查询、模型或压力测试，没有自动发送。三次持有人确认的黑屏重启，与一次仅有GPU超时证据的记录分开统计，报告编号不是事故次数。

## 最方便给售后查看的位置

Windows目录：`C:\Users\admin\video-recovery\supplier-evidence\GPU-JD-Evidence-20261103T015628Z`

- `00-售后故障摘要.txt`：先给客服看这一页。
- `GPU-JD-Evidence-20261103T015628Z.zip`：完整私人技术证据包，5302691字节（约5.30MB），228文件。
- ZIP SHA-256：`f82f4c40702645386c3f0b73b2fffe363d50c0b4696b6461fc440ca76ec67552`。

WSL对应目录：`/mnt/c/Users/admin/video-recovery/supplier-evidence/GPU-JD-Evidence-20261103T015628Z/`。

仓库独立整理目录：`orchestrator/output/gpu-evidence-summary-20261103/`，解压内容、ZIP及latest-receipt.json均存在。旧10月29供应商包原件和Windows副本不覆盖。

## 按事故查看原始位置

|记录|主要证据与实际路径|
|---|---|
|10月27日19:43，Wan2.2，已确认黑屏重启|`/home/chen/ai-services/comfyui/logs/server-r1-guardfix.log`；工作流在`orchestrator/output/day9-vp004a/g2/`；主报告`docs/reports/GPU-INCIDENT-001.md`。本轮按已有记录号只读取得129条当晚相关System原始XML，保存`orchestrator/output/gpu-evidence-summary-20261103/oct27-original-events-readcheck.json`。原日志SHA与首次报告一致；尚无该次可读dump。|
|10月29日15:38，Wan2.1，已确认黑屏重启|原运行`orchestrator/output/local-video-recovery-20261029/stage-b/20261029T073531Z-c17945661b35/`；归档`orchestrator/output/gpu-incident-004/20261029T075016Z-d5fa6c0df2/`；dump与WinDbg在`orchestrator/output/gpu-incident-004/20261029T081308Z-5f6ca8fa38-dump-analysis/`；报告GPU-INCIDENT-004。0x141实际dump确认。|
|11月2日23:35至23:37，IndexTTS2，已确认黑屏重启|运行`orchestrator/output/ai-programming-20261102/tts-fp32/`；事故归档`orchestrator/output/gpu-incident-005/20261102-post-reboot/`；三份dump与完整WinDbg在`orchestrator/output/gpu-incident-005/20261103-offline-analysis/`；报告GPU-INCIDENT-005。117→116，23:36:52实际系统崩溃时间。|
|11月2日23:01，仅确认GPU引擎超时|日志`orchestrator/output/ai-programming-20261102/tts-fix1/`；WATCHDOG-20261102-2301.dmp在上述005分析目录，确认141。没有独立持有人黑屏确认，不另算第四次黑屏。|
|Qwen历史|`orchestrator/output/gpu-incident-004/20261029T075016Z-d5fa6c0df2/qwen-evidence/`。illegal instruction与Wan illegal memory access不同；没有补造人工黑屏确认。|

Windows11月2日三个普通可读dump副本：`C:\Users\admin\video-recovery\dump-exports\INCIDENT005-20261103T013506Z-2c601535\`。原native监控在`C:\Users\admin\video-recovery\runs\20261102T153306Z-e2ab6570a02f\`（FP32）及`20261102T151813Z-4ddda026c0b3\`（FP16观察）。

## 更新包内容与检查

- 01：事故/诊断报告；02：10月27原采样日志、配置及129条相关Windows原始事件。
- 03：原10月29供应商包完整内容，含dump、完整WinDbg、试验/监控/原始事件、Qwen背景。
- 04：本次三份未修改dump、完整WinDbg输出、命令、符号警告及哈希。
- 05：TTS各次运行/错误/阶段/数值观察与Windows独立监控；不把HTTP前检失败当GPU试验。
- 06：11月2日相关原始事件及XML，24,020条记录主要是驱动刷屏，不能当24,020次事故。
- 复制来源223项，SHA逐项校验且整理后来源未变；ZIP全量CRC、Windows副本SHA通过；228文件含摘要/清单/来源记录。文本常见凭据扫描0命中，不是dump不含敏感内存的证明。

不含声音参考、模型权重、venv、.env或整个项目；必要推理日志仍可能有本期输入文字和本机路径。dump必须保持原内容，可能含内存数据，**仅通过京东/供应商确认的私有售后渠道交付，不公开、不传GitHub**。原件不移动/覆盖/删除，STOP不清除，不自行推送。当前只能证实系统GPU超时/恢复失败，不能把售后摘要写成“显存虚焊已证实”或“驱动确定有Bug”。
