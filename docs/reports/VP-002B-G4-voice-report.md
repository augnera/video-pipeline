# VP-002B-G4｜Day9 全部分镜 AI 配音与时间线交付报告

记录时间：2026-10-27T09:26:08.034464+00:00。用途：私人非商业技术评估。

已交付 10 个独立 WAV 和 83.771565 秒完整试听。第 1–9 镜从本人已验收的 R5 完整修正版无损拆分复用；第 10 镜使用 R5 真实运行配置新合成一次。最终 G4 试听尚待本人确认。

## 1. 配置来源与实际复用

- 验收音频：`/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-r5-inline1/long-test.wav`，SHA-256：`aa095f01615295d9a872ad87a47b636de55adab725544e9c8e01ebc06065610a`。
- 配置锁：[locked-config.json](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/locked-config.json)；包含 R5 原始合成记录、节奏计划、峰值补停顿记录、句内修剪记录及本人完整听审确认的完整哈希。
- IndexTTS2 源码提交：`d9e41aac89fd00b3d71497fddb287b7f24613712`。
- 主权重版本：`740dcaff396282ffb241903d150ac011cd4b1ede`；完整模型资产校验见 `/home/chen/ai-services/indextts2/manifests/downloaded-assets.json`。
- 本人音色参考：`/home/chen/work/video-pipeline/local-assets/voice/references/day9-g2/ref-2.wav`。
- 情绪参考：`/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-r4/emphasis-input.wav`。
- 情绪强度 `emo_alpha=0.6`，seed `42`；固定 FP16/CUDA，关闭 Qwen 文本情绪、训练、自定义 CUDA 加速和参数搜索。
- 实际采样：top_k=30、top_p=0.8、temperature=0.8、num_beams=3、repetition_penalty=10、max_mel_tokens=1500、max_text_tokens_per_segment=120；use_random=false。
- 原生 interval_silence=200 ms；R5 额外的完整句/分镜/段落目标间隔分别为 350/600/700 ms。此处明确记录原生参数与最终目标的区别。
- 第 1–9 镜保留 R5 已验收的整句分段、静音补足和 172→60 ms 句内修剪，不重新推理、不重做发音。
- 第 10 镜使用已存档的 R5 原始生成节奏执行器（RMS 版本）合成，再执行同样的保守峰值间隔补足步骤；本次无需额外补入句内静音，也没有套用未经听审的句内删除。
- 使用 R5 记录证明配置；没有仅凭 R4 老配置推断，也没有将 GPT-SoVITS 参数混入 IndexTTS2。

## 2. 独立音频与时间线

| 分镜 | Excel 行 | 来源 | 时长（秒） | 试听开始（秒） | 试听结束（秒） | WAV |
|---:|---:|---|---:|---:|---:|---|
| 1 | 2 | R5 无损复用 | 12.295147 | 0.000000 | 12.295147 | [shot-001.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-001.wav) |
| 2 | 3 | R5 无损复用 | 7.457506 | 12.295147 | 19.752653 | [shot-002.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-002.wav) |
| 3 | 4 | R5 无损复用 | 8.779773 | 19.752653 | 28.532426 | [shot-003.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-003.wav) |
| 4 | 5 | R5 无损复用 | 9.420181 | 28.532426 | 37.952608 | [shot-004.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-004.wav) |
| 5 | 6 | R5 无损复用 | 3.563220 | 37.952608 | 41.515828 | [shot-005.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-005.wav) |
| 6 | 7 | R5 无损复用 | 9.700680 | 41.515828 | 51.216508 | [shot-006.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-006.wav) |
| 7 | 8 | R5 无损复用 | 8.764218 | 51.216508 | 59.980726 | [shot-007.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-007.wav) |
| 8 | 9 | R5 无损复用 | 9.753243 | 59.980726 | 69.733968 | [shot-008.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-008.wav) |
| 9 | 10 | R5 无损复用 | 6.271610 | 69.733968 | 76.005578 | [shot-009.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-009.wav) |
| 10 | 11 | 新合成一次 | 7.511655 | 76.259909 | 83.771565 | [shot-010.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-010.wav) |

- 完整试听：[day9-preview.wav](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/day9-preview.wav)；SHA-256：`85ba511665f9f17380ea55fc2d4dc2fc4a70e11ea1f1e27da00d14d7a693e291`。
- 独立文件时长合计：83.517234 秒；额外跨镜静音：0.254331 秒；试听总长：83.771565 秒。
- 前 9 段拼回后的 PCM 与 76.01 秒 R5 验收版逐样本一致；完整试听的前 76.005578 秒也逐样本一致。见 [reuse-proof.json](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/reuse-proof.json)。
- 拆分点全部来自已验证的合成边界静音，不使用 ASR 猜切点；所有原始语音采样保留。
- WAV 均为 22050 Hz、单声道、PCM16。未按 Excel 建议时长加速、截断或进行音高/音量修饰。

## 3. 完整性和原文对应检查

- 10 个文件均非空、FFmpeg 完整解码成功；完整试听也完整解码。
- 分镜号、sourceRow、原始旁白逐项匹配标准化 JSON；没有改写、删除或增加口播文字。
- CPU 离线 ASR 使用已有 faster-whisper-small 权重，不下载新模型，不上传私人音频；原始机器转写和逐词时间戳保存在 `checks/shot-*.json` 与 `checks/preview.json`。
- 第 10 镜去标点及繁简字形后，机器转写与正式旁白完全一致；首尾“下期我会……”和“别错过下一期”均覆盖。
- 第 1–9 镜是已验收波形的精确复用，ASR 未见整句遗漏。仍有“一人/一轮”“一人/艺人”“上线/上限”等机器识别差异；完整试听还有“谈进/弹劲”同音识别差异，均不直接认定为错读。
- “这里是小陈AI说”的本人确认继续有效；没有因机器品牌名识别不同再修改或过度优化。
- 10 段与完整试听均未检测到超过 2 秒的异常静音；所有跨镜间隔均达到已验收的约 600 ms 目标。
- 模型日志没有触及 max_mel_tokens 上限的截断警告。ASR 和端点检查没有明显句首句尾截断证据，最终发音仍以本人听审为准。

## 4. 跨镜一致性与衔接

- 第 1–9 镜没有新的音色、情绪或语速变化来源：PCM 与已验收版本相同。
- CPU CAMPPlus 相邻镜头声纹余弦范围：0.879–0.945；第 9→10 镜为 0.906；第 10 镜与 R5 结尾 8 秒为 0.915。
- 这些分数只作辅助，没有为此人合成音色标定的通过阈值，不能证明情绪或自然度已通过。
- 第 10 镜“字数/文件秒数”代理为 4.926，位于前 9 镜 3.896–4.943 范围内；不是精确音节语速判断。
- 第 9→10 镜：保留原有尾部静音 0.265170 秒和新镜头头部静音 0.080499 秒，仅补入 0.254331 秒，实测合计 0.600000 秒。
- 本次没有客观证据要求重做已验收的前 9 段；第 10 镜及新衔接必须由本人听审，不能凭自动指标替代。没有因自然度猜测反复调参或生成候选。

## 5. 耗时、显存、环境与恢复

- G4 新 TTS 请求：1 次；第 10 镜合成耗时 10.523512 秒。
- 第 10 镜 PyTorch 张量峰值 5898.35 MiB、保留内存峰值 6156.00 MiB；整卡峰值 12935 MiB（含 GPT-SoVITS、桌面等驻留占用）。
- 复用的 9 段本轮 TTS 耗时为 0；其原始 R5 长段共享推理时间保留在来源记录中，不虚构或平均摊成九个独立耗时。
- 启动时一次触发 GPU 利用率保护（18% > 15%），没有放宽门限；连续两次空闲采样后按原配置启动。没有新环境冲突、安装、驱动修改或新增模型。
- IndexTTS2 仅监听 127.0.0.1:9881，复用 `/home/chen/ai-services/gpu.lock`；GPT-SoVITS 的 9880 服务保持正常且配置、依赖记录和启动器哈希不变。
- 成功 WAV 与各镜 `metadata/shot-*.json` 保存完整文本、输入来源、哈希、时长与取得方式。重跑前先验证这些记录；成功文件不覆盖，只补齐失败/缺失分镜后重新打包。
- 交付 CLI 已在真实产物上重复执行，确认直接复用，没有新推理或改写试听。缺镜、旁白不匹配和错误音频哈希三类非法清单均被拒绝，已交付文件哈希保持不变。

## 6. 测试和 VP-003 输入约定

- `node --import tsx --test src/import/excel.test.ts src/voice/*.test.ts`：23 项通过，包含真实 Day9 Excel 导入回归、句间/句内停顿保护、已有停顿不重复补入及时间线逐样本覆盖。
- `./node_modules/.bin/tsc --noEmit`：通过。原 DSE 入口与业务链没有改动。
- 已核实 115 个输入和历史文件哈希不变，包括 Excel、标准化 JSON、原始录音和已验收样音。
- [script.voiced.json](/home/chen/work/video-pipeline/orchestrator/output/day9/script.voiced.json) 的 schemaVersion 为 `ip-script-voiced/1`。保留原脚本各字段，每镜 `voiceover` 新增实际 WAV 路径/哈希、秒数/帧数、时间线位置、采样率和来源。
- VP-003 可读取 `shots[].voiceover.audioPath`、`durationSeconds`、`durationFrames`、`timelineStartSeconds`、`timelineEndSeconds`、`gapBeforeSeconds`；全局信息在 `voiceDelivery.timeline`、`sampleRate`、`totalDurationSeconds` 与 `previewPath`。
- **时间约定：每个 WAV 已包含保留的头尾静音，gapBeforeSeconds 仅表示文件之外额外补入的静音。不能在每个 WAV 之间再盲加 600 ms。**
- 已按 JSON 的帧数和 gapBefore 完整重建试听 PCM，与交付预览逐样本一致。

可重复打包命令（在 orchestrator 目录执行）：

```bash
node --import tsx src/voice/delivery-cli.ts --script output/day9/script.normalized.json --clips ../local-assets/voice/experiments/day9-g4/clip-manifest.json --preview ../local-assets/voice/experiments/day9-g4/day9-preview.wav --out output/day9/script.voiced.json
```

完整机器检查记录：[complete-validation.json](/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/checks/complete-validation.json)。

## 7. 待本人最终听审

请试听完整预览，优先听约 74–84 秒：第 9→10 镜音色、情绪与停顿是否自然，第 10 镜结尾是否完整。前 9 镜与已验收 R5 相同，无需再针对机器同音字差异反复优化。

当前状态：客观交付与完整性检查完成，G4 最终听审待本人裁定。没有进入 VP-003、Wan、素材匹配或公开视频生成，也不授权商业使用。
