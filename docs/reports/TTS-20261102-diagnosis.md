# 本期IndexTTS2配置核对与单次受控诊断

本期原任务仍为AI编程视频制作。持有人分别明确允许本期使用既有IndexTTS2，并在设备断言后明确授权一次带数值保护的受控诊断。**本次诊断已执行并停止，完整配音未生成；未经新授权不再GPU重试或换后端/精度。** Wan/历史STOP保持。

## 上次成功与本次比较

成功参照：VP-010原版，`voice/full-raw.wav`，134.145533秒、22050Hz单声道；不是持有人否决的开头换配音版。

- 源码revision相同d9e41aac…；权重revision相同740dcaff…，服务启动时已按原清单逐个核验7,664,297,068字节权重；未新下载模型或升级环境。
- 声音/情绪参考路径与SHA逐项相同，节奏适配器、锁定配置也与成功配置inputs中SHA一致。
- seed42、情绪0.6、FP16、do_sample=true、top_p0.8/top_k30、temperature0.8、num_beams3、repetition_penalty10.0、max_mel_tokens1500等数值保持。
- 现有Python3.11.13；PyTorch/torchaudio2.8.0+cu128、Transformers4.52.1、NumPy2.2.6、Accelerate1.8.1、Triton3.4.0与原清单一致。对照旧freeze的140项==锁定包无版本差异；pip/setuptools/可编辑indextts不在该==列表，不把这点写成新安装了三项。
- 模型目录pyproject.toml/uv.lock虽对Git原版为dirty，但与先前已批准opencv修复后的快照字节一致；其余推理源码没有新的tracked diff。不能把这两份既有修改当作本轮新升级。
- 不能由版本号相同推导完整运行状态相同。未在设备断言后重新查询/测试GPU或重新确认硬件稳定；驱动/硬件/并发状态与10月28日没有完整同瞬间可比快照。

证据：本期preparation/中的tts-success-config-comparison、tts-current-package-versions、tts-package-comparison、tts-environment-file-comparison、tts-success-input-integrity等JSON。

## 按时间区分实际尝试

1. `tts/`：既有统一入口首次新稿实际调用。本期JSON经JS序列化把10.0变为int10，Transformers严格类型校验拒绝repetition_penalty；首段合成前失败。旧VP010用Python保存float10.0。统一入口此前缓存/短片验证没有覆盖这个新稿TTS类型问题。已在入口做仅数值不变的float归一，原失败文件不覆盖。
2. `tts-fix1/`：上述一次类型修复后生成，出现CUDA device-side assert，原始断言为`probability tensor contains either inf, nan or element < 0`；没有完整WAV。停止并保留STOP，不将其与旧Wan illegal memory access或Qwen illegal instruction混同，不据此判显卡损坏。
3. `tts-observe1/`，runId20261102T151613Z-b71aa1ae403d：持有人授权诊断后的本机HTTP前检超时，**没有创建模型进程、没有CUDA初始化或采样**。环境HTTP(S)_PROXY存在且无NO_PROXY，本机健康请求被环境代理转发；直连9881实际为connection refused。为此只把本地TTS请求改为ProxyHandler({})，未改365vpn或系统代理。
4. `tts-observe2/`，runId**20261102T151813Z-4ddda026c0b3**：同一次授权的唯一实际GPU诊断；新增原生Windows独立监控和仅观察数值的forward hook，保持采样参数/输入不变。实际请求15:18:47.272Z开始，77.280秒后异常停止，15:20:04.723Z进程已退出。模型加载约26秒。没有替换异常数值、自动重试或偷偷切FP32。

## 本次直接证据

第1次前向末token logits为有限FP16值；**第3850次前向时，shape=[3,1,8194]，全部24,582个值为NaN，正负Inf数为0**。CPU观察保存数据并在softmax/multinomial前抛出NonFiniteTTSLogits，原模型输出没有被修改或填零。tensor位于`tts-observe2/numerical-observations/invalid-logits-3850.npy`；完整事件JSONL和service.log保留。

能确定：本次异常在原始GPT输出处已存在，不只是后续概率过滤器报错。尚不能确定：FP16溢出、某个中间层/注意力算子、运行时状态、驱动或硬件因素中哪一项是根因。forward hook只观察末token，不能给出首个异常中间层，也不能排除数据传输等其他因素。

此前失败日志记录7个完成的code块，本次记录17个，前7块token数组逐项一致。观察增加同步/时序，不等于采样参数改动，也不能把不同失败位置直接判为硬件故障。两次均未保存完整音频，不将code块当作可直接用的WAV。

## 主机监控

Windows日志独立位于`C:\Users\admin\video-recovery\runs\20261102T151813Z-4ddda026c0b3\`，51条样本，NORMAL_STOP；前后相关设备事件各0，查询错误0。整卡已记录显存峰值11,623MiB、核心温度峰值56°C、功率峰值281.75W；是整卡读数，不是模型独占功耗。热点、显存结温、PCIe计数仍不可获取。无新增事件不证明设备稳定，没有本次黑屏事实记录，不捏造黑屏或重启。

WSL运行/参数/阶段/退出在tts-observe2/run.json、service.log和原attempt-state.json；本期STOP-GPU-TTS.json及两次失败原件均保留，不清除旧事故STOP。

## 已修复与未解决

已修复：JSON integral-float适配；本地HTTP请求明确直连。观察保护CPU验证通过（有限输出不变、NaN/+Inf/-Inf停止留证、未初始化CUDA）。真实诊断也已证明捕获NaN并提前终止，但**不是模型数值问题已修复**。

仍未解决：FP16原始GPT输出出现NaN，无法交付完整配音。后续拟议单因素方案仅把use_fp16改为False，保留全部输入和采样参数/观察保护，隔离脚本及差异在`tts-fp32-proposed/`，**未执行**。通过只能支持“精度与问题有关”，不能证明整卡稳定；失败同样不能直接断言硬件故障。任何下一次GPU运行须持有人再明确授权，不自动开展精度/模型/后端试验或升级依赖。


## 后续实测与持有人黑屏报告（替代上述“未执行”的当前状态）

经持有人另行授权，FP32对照实际执行一次，runId20261102T153306Z-e2ab6570a02f。23:35:10捕获一个beam8194NaN并退出，无完整WAV；23:35:11起实际NVIDIA TDR事件，随后System确认0x116重启。此前23:01已有141的WER，原短监控窗口未覆盖，不能继续把“无新增事件”外推为当晚没有设备故障。原配置/记录/STOP保留，GPU制作全停；本次只读取证没有再运行CUDA或模型。准确时间线、权限阻断及导出命令见[GPU-INCIDENT-005](GPU-INCIDENT-005.md)。根因尚未确认，不能只归因FP16，也不能直接判硬件损坏。


## 2026-11-03｜正式dump分析补证

三份副本普通权限SHA复核通过，现有WinDbg实际离线分析均执行到q/退出0。dump确认23:01:42.910为141（对应首轮device-side assert同秒）、23:35:11.465为117、23:36:52.385为116；第一次失败已有系统级GPU超时。不是单纯FP16数值问题，也不能由此判定显卡损坏。微软public栈可解析，NVIDIA符号/私有TDR类型不可用。完整时间线、参数、模块及符号限制见[事故报告](GPU-INCIDENT-005.md)最新补充。无新CUDA/模型/采样或环境变更，全部GPU制作STOP保留。
