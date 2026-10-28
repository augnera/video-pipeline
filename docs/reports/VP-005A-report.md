# VP-005A｜Day9 无 Wan 完整成片 MVP

日期：2026-10-27。状态：**已完成，待本人观看**。用途：私人非商业技术评估。未公开发布。

## 交付

- [带字幕预览版](../../orchestrator/output/day9-vp005a/day9-preview.mp4)
- [无烧录字幕 clean 版](../../orchestrator/output/day9-vp005a/day9-clean.mp4)
- [字幕 SRT](../../orchestrator/output/day9-vp005a/subtitles.srt)
- [完整十镜时间线](../../orchestrator/output/day9-vp005a/timeline.json)
- [机器可读渲染报告](../../orchestrator/output/day9-vp005a/render-report.json)

## 结果

完成 Excel → 冻结配音 → 画面 → 字幕 → Remotion → MP4 的全片闭环。十镜都已覆盖；第 1 镜使用已验收静态首帧并缓慢推近，第 5 镜复用 VP-003A 原 Remotion 视觉组件/节奏，其他镜头使用各自不同的观点卡、流程图解和结尾卡，维持蓝紫科技风。没有为填时间机械重复一张文字卡。

全片 1080×1920、30fps、2514 帧。视频流 83.800 秒；音频容器 83.819 秒。冻结 preview WAV 的实际时长为 83.771565 秒，画面帧取整误差约 28.4ms，AAC 容器尾差约 47.4ms。两份成片各有一条 AAC 旁白音轨，没有叠入第 5 镜 MP4 的原声，也没有 BGM。解码 AAC 与输入 WAV 的 22.05kHz 单声道重采样相关度最高为 0.9957，估计偏移约 9.8ms。

第 9 镜在第 10 镜开始前延续 8 帧，以覆盖原音频中的 0.254 秒跨镜间隔。时间线帧区间连续覆盖 0–2514；FFmpeg 完整解码通过。黑帧扫描（0.05秒、0.01像素阈值）没有报告黑段。抽帧检查了第 1 镜标题、第 5 镜原版风格、第 9 镜间隔延续和第 10 镜结尾；中文字体正常，字幕留在底部深色安全区。

## 字幕精度

SRT 共 45 条分句，字幕文本逐字来自冻结 voiced JSON；拼接后与十镜原旁白完全一致（417 字符）。时间来自仓内既有十镜 Whisper `words` 时间戳，并将 ASR 词长度顺序映射到原始旁白字符，再按短语分段。繁简字和 ASR 同音字不覆盖原稿。**这是 ASR 估时，不是强制/音素级对齐**；不能据此宣称逐字精准，观看时仍需人工判断句段边界。

## 运行边界与冻结输入

- Remotion 4.0.539、Chromium swangle、CPU libx264；本轮没有调用 Wan、ComfyUI 或 GPU 生成模型。
- 完整旁白仅来自 `day9-preview.wav` 一轨；没有启动配音模型或改变音频。
- 冻结的 voiced JSON、preview WAV、第 5 镜原版 MP4、第 1 镜验收首帧 SHA-256 均与执行前记录一致，详见 `render-report.json`。
- 未部署、未公开发布；当前交付等待持有人全片观看。

## 留待观看

技术检查通过；主观节奏、画面喜好和字幕句段同步以本人观看意见为准。本轮到此停止。
