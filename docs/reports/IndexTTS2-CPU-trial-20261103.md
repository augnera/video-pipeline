# IndexTTS2 CPU模式首次短句试用｜2026-11-03

持有人授权“尝试下IndexTTS2 CPU模式”。本轮只做一条短句，复用已有模型/声音/情绪参考，不调用GPU、不下载/安装/升级依赖，不改原GPU服务或生产默认，不清除任何GPU事故STOP。

## 结果

**CPU首次短句技术通过，人工音色/自然度NOT_EVALUATED。** 文本逐字取本期冻结第一句：`去年，我花了几千块钱学AI编程。`。不是完整新稿，不是新整片，未修改任何冻结输入。

- 音频：`orchestrator/output/indextts-cpu/20261103-short-01/sample.wav`。
- Windows试听：`C:\Users\admin\Downloads\xiaochen-cpu-tts\20261103-short-01\sample.wav`，副本SHA与原WAV一致。
- 音频长 **3.494603秒**，22050Hz、单声道，SHA `fb1c2fd9f124b353a3959f94ce87052e75f91845caf61fec894419b15ffae34f`。
- 实际合成 **38.538秒**，RTF **11.028**（约11秒计算/1秒音频），模型构造日志11.269秒；全进程及资产校验/退出监控开销见exit.json，不把冷启动时间当合成速度。
- 5秒间隔观测子进程RSS峰值 **8.575GiB**，不是精确OS高水位。WSL启动可用约120GiB，预留门槛40GiB；RSS停止线32GiB、墙钟600秒、8CPU线程、nice10，正常退出0、无超时或自动重试。
- WAV非空、有限数值、非全静音、时长边界及FFmpeg纯软件完整解码通过，sample peak -0.200dBFS；没有音色/中文发音的人工试听结论，也没有用ASR自动判定正确。

## 执行入口和差异

新增 `experiments/indextts-cpu/run.py`，只补现有GPU端点不适用的CPU直接调用及有界父进程。复用原已批准IndexTTS2 venv、14项7,664,297,068字节固定资产、本人音色及情绪参考、原rhythm adapter及finite-logits observer；没有新服务、没有修改模型源码。实际命令：

```bash
python3 experiments/indextts-cpu/run.py --out orchestrator/output/indextts-cpu/20261103-short-01
```

该目录现已存在，重复执行会拒绝覆盖；不构成授权自动再次合成。此入口当前只对本期已核实首句试用，不宣称是通用生产CPU配音入口。说明见`experiments/indextts-cpu/README.md`。

源revision `d9e41aac89fd00b3d71497fddb287b7f24613712`、权重revision `740dcaff396282ffb241903d150ac011cd4b1ede`，PyTorch2.8.0+cu128为现有wheel，但**实际执行设备CPU**，不是因wheel名字含cu128就使用GPU。显式`device=cpu/use_fp16=False`、禁用CUDA kernels/deepspeed/accel/compile/QwenEmotion、CUDA_VISIBLE_DEVICES=-1；离线权重不联网。复用恢复工具的不同函数对象CUDA初始化拒绝保护，未改Dynamo或PyTorch内部。没有启动会查询GPU的Windows遥测器。

保留seed42、emo0.6、top_p0.8/top_k30、temperature0.8、beam3、repetition10.0/max_mel1500；与已验收GPU配置的差异是CPU/FP32、8CPU线程和短句范围。与上轮失败整稿并非相同长度，因此不能把此次成功视为对GPU故障的严格归因对照。

## 真实证据与边界

六模块gpt/semantic_model/semantic_codec/s2mel/campplus/bigvgan参数与buffer审计均为CPU，参数均FP32；首次logits记录为CPU/FP32且有限，数值保护未捕获非有限末token。`cuda-guard-result.json`记录cudaInitialized=false、attempts=[]，未调用nvidia-smi、CUDA测试或GPU模型。记录不能代替逐层完整数值验证或整机硬件诊断。

原输入及adapter SHA已前后核验；原本期GPU-TTS STOP与事故005 STOP前后SHA一致。模型日志存在既有GenerationMixin/tuple-cache弃用提示，没有因此升级包或修改采样路径。独立CPU试用STOP预留记录保留，完成状态由validation/exit给出，不自动删除锁或历史记录。

完整request.json、rhythm-plan/audit、run/exit、stdout/stderr、fsync阶段/5秒CPU采样、device-audit、numerical-observations、validation和Windows副本回执位于上述输出目录；敏感参考音频仍仅本地路径，不复制进仓库或上传。所有主观项待持有人试听。

下一步：先听这3.49秒，确认音色、咬字及节奏；如通过，再评估较长片段和整稿CPU接线。本轮不自动生成整期、不改生产默认、不重渲染成片。短句成功也不证明GPU修复、硬件稳定或此前NaN只由GPU导致。GPU/Wan继续STOP。


## 持有人试听反馈

持有人反馈：“听了效果还可以。”已记录holder-review.json并核验试听WAV SHA未变。当前范围仅上述3.494603秒短句，记为acceptable_short_sample；未取得音色相似度/自然度的分别评级，不倒改原技术validation的历史待评价字段。整稿连贯性、长时间执行、整期耗时仍未验证。未自动追加生成、未切换生产默认，GPU/Wan STOP不变。
