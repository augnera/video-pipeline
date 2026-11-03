# 本期完整CPU旁白与默认路线切换｜2026-11-03

持有人授权声音克隆改CPU，并生成本期完整旁白。复用现有IndexTTS2、本人与情绪参考及已试听短句参数；没有CUDA/GPU推理、硬件查询、Wan、环境/驱动升级或网络上传。历史成片、短句、GPU失败现场及全部STOP保留，不改原GPU服务源码。

## 交付

输出：`orchestrator/output/ai-programming-20261102/tts-cpu-full-20261103/`。

|文件|内容|
|---|---|
|voice.wav|全部19个口播镜头、514字、21合成分句；**97.697506秒**，22050Hz/mono PCM16；第9镜不送TTS。|
|episode-dialogue-with-shot9.wav|按镜头顺序在35.258685秒插入第9镜原声，插入长96.780792秒；总长**194.478312秒**，48000Hz/stereo PCM16，无BGM。|
|script.voiced.json、captions.json、subtitles.srt|按实际合成边界的21句原文与原声插入后时钟，第9镜区间无新增字幕。|
|script.narration-only.voiced.json、captions-narration-only.json、subtitles-narration-only.srt|不含原声插入的旁白时钟，不能误当最终全片时钟。|
|validation.json、audio-delivery-validation.json、sample-peak-check.json|原WAV及顺序试听技术检查。|
|cpu-asr-crosscheck.json|已有small模型CPU/int8交叉核查，识别文本不覆盖冻结稿。|
|request/run/exit、stdout/stderr、stages、device-audit、cuda-guard-result|完整参数/源码版本/进程/内存/真实阶段/执行设备证据。|
|failure.json、repair-log.json、executed-run.py|原收尾错误、一次有限修复与实际启动源码，不隐去失败。|

Windows试听目录：`C:\Users\admin\Downloads\xiaochen-cpu-tts\ai-programming-20261103-full\`，含voice.wav、episode-dialogue-with-shot9.wav及subtitles.srt，逐文件复制SHA核验通过。

原voice SHA `fa8b0239df7773020712f90431148fd16bb99a1cff545905cf1001dad4a399aa`。原用户MP4 SHA `ecc42a6437e7f907fbe2dd0e6f55567ff502315d91cb851b1fa25a3ae0ebe448`，不改原文件/AAC。顺序试听需把原AAC和克隆音轨转成同一48000Hz立体声PCM再拼接，不是原AAC比特流无损封装；原96.78秒内容完整解码保留，无变速、无额外配音、无BGM。对照48k准备旁白，插入区外PCM逐样本一致，原22050Hz voice.wav独立保留未改。

## 实测与错误修复

单次完整推理合成 **987.639秒**（约16分28秒），RTF **10.109**；包含资产哈希/加载/退出的进程墙钟1017.153秒。每5秒采样RSS峰 **9.467GiB**，不是精确OS高水位。8线程/nice10、32GiB采样RSS停止线/3600秒墙钟，本次未触发资源停止线。六模块参数/buffer CPU、参数FP32；cudaInitialized=false、保护调用0。

21个分句都已实际生成并保存voice.wav；随后收尾校验代码误读短句默认sample.wav，子进程因此退出1。**原失败、exit1与STOP_NO_RETRY都保留**，不能写成整轮原进程退出0。一次修复仅把读取目标改为配置的voice.wav；独立CPU-only校验复用已有WAV，完成有限数值/非空/非全静音/时长/FFmpeg软件完整解码检查，没有再合成或换参数。修复记录与实际WAV SHA保存。新增不依赖模型的“只有voice.wav、无sample.wav”回归检查通过；生产与CPU检查12+4通过。停止保护不因后处理可恢复而删除。

原WAV峰值接近0dBFS，共7个孤立满幅采样点，最长连续1点，sample-peak-check保留WARN；不宣称绝无削波，也没有擅自调音覆盖音频。后续混音仍需留人声峰值余量。

## 字幕/镜头时间精度与听审边界

514字及顺序与冻结稿逐字一致；21字幕文本拼接一致，第9镜35.258685—132.039476秒没有新增字幕。以真实rhythm-audit样本边界和波形确定句级时间，非字词强制对齐。

**第4、5镜在原rhythm plan中属于同一合成句。** 通用alignGenerated正确拒绝跨镜猜分界，本期仅保留该完整句为共享时间组，原两镜旁白各自未改；alignment-limitations.json及voiced.sharedNarrationSpan明确preciseWithinGroupBoundaryAvailable=false。没有按字数比例拆分、伪造精确镜间切点或重新合成。该缺口不影响完整旁白及第9镜插入；未来编排4/5镜时需真实波形/试听确认切点或直接采用共享句视觉段，不能把共享区间当两段串联时长。

CPU small ASR实际耗时8.631秒，覆盖到97.62秒，显示首尾内容和主要句序；有Cloud/Claude、指示/只是、烈马/列码等及繁简混用，不据此直接认定TTS错读。粗略文字相似度不是准确率；未将ASR估时取代原合成边界。整篇音色、发音、停顿/自然度仍NOT_EVALUATED，短句“效果还可以”反馈不外推为长稿人工通过。

## CPU默认接线

production-v1.json集中voice.device=cpu、precision=fp32、CPU资源限制；机器模型路径在受忽略production.local.json或VP_TTS_MODEL_SOURCE/VP_TTS_MODEL_DIRECTORY，保留既有服务/Python路径。

原统一CLI继续使用，voice-runtime只允许CPU/FP32并交给cpu-voice.py；GPU请求失败关闭，无GPU回退。CPU JSON含冻结text/rhythm，所有本地资源已做无推理交接验证；已开始/失败不会自动重试，已完成缓存需匹配输入/配置/源码指纹与音频SHA。CPU执行模式/路径/参数及runner/guard/observer纳入阶段指纹。已验收旧片缓存不重做。

本次完整WAV由独立CPU直接调用器真实生成；生产CLI接线经无模型边界/请求测试，**不是新一期经统一CLI无人值守完整出片验收**。没有全片渲染、封面生成或发布。后续以本次已验证音频缓存继续，避免再跑同一长稿。主观试听通过前不宣称本期成片通过。

实际运行命令、试听路径和恢复说明另见experiments/indextts-cpu/README.md及docs/Production-v1.0.md。原命令已使用独立目录，不能原样重跑覆盖。旧短句和本次启动源码均先留档，后续代码修复不倒改实际执行版本证据。所有GPU/Wan事故STOP哈希前后不变，CPU成功不能证明GPU故障根因或硬件已恢复。
