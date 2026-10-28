# VP-005B-BGM-002｜Day9 固定 BGM 接入与试听

日期：2026-10-28
状态：本地试听版已完成，等待持有人试听。BGM 授权状态待核实；本文件和成片不得公开发布。

## 结果

已将持有人指定的 `local-assets/music/bgm/AI科技新时代.mp3`（BGM-01）混入 VP-005A Day9。成片使用 VP-005A 的 `day9-preview.mp4` 作为画面来源，保留已烧录字幕，视频流不重新编码；仅替换音轨。画面逐帧解码哈希与 VP-005A 预览版一致（2514 帧）。

同时保留无 BGM 对照版，它与 VP-005A `day9-preview.mp4` 字节完全一致。独立混音 WAV、配置和验证记录一并交付。

## BGM 文件与授权

- 来源：持有人提供的剪映历史音乐。
- 原文件：`local-assets/music/bgm/AI科技新时代.mp3`，未修改。
- SHA-256：`5601eb321f066b30a39bb2dcee73b139342681641b755a5ccefe86d3d3fa574e`
- MP3，44.1 kHz，立体声，时长 227.056292 秒；文件完整解码通过。
- 授权状态：**待核实**。本轮仅本地试听；未公开发布，也不据此认定可商用或可发布到视频号/YouTube。

## 混音参数

- 配音：冻结输入 `local-assets/voice/experiments/day9-g4/day9-preview.wav`，83.771565 秒，22.05 kHz 单声道；输入 SHA-256 与 VP-005A 记录一致。源文件没有改写。
- 实测配音综合响度：-17.4 LUFS；BGM 完整曲目：-15.1 LUFS；实际截取的前 83.771565 秒：-15.1 LUFS。
- BGM 轨降低 21.0 dB（线性增益 0.0891251），估算 BGM 低于原配音约 18.7 LU；前段 1.5 秒淡入，尾段 2.5 秒淡出。
- 音源长于配音，故从头裁切至配音时长，不循环。
- 配音轨与 BGM 轨独立送入混音。为适应原配音已有的满幅峰值，混音总线统一降低 1.5 dB；没有单独归一化或压缩配音。输出为 48 kHz、立体声、24-bit PCM WAV。

## 技术检查

- 带 BGM MP4：1080×1920、30 fps、83.800 秒视频，单条 48 kHz AAC 立体声音轨；配音音频 83.771 秒，与 83.771565 秒源配音匹配，只有视频帧取整尾差。
- 混音 WAV 实测：-19.0 LUFS，true peak -3.6 dBFS；没有削波。
- 两个 MP4 均完整解码；成片视频为 2514 帧，逐帧哈希匹配 VP-005A 原预览。字幕和画面没有重新生成或修改。
- -60 dB 静音检测只报告开头淡入阶段 0–0.260 秒的渐入低电平；符合预设 1.5 秒淡入。未检测到其他持续 0.25 秒以上的低于 -60 dB 区段。
- 没有启动 Wan、ComfyUI 或其他 GPU 模型。

## 文件

- `orchestrator/output/day9-vp005b-bgm/day9-with-bgm.mp4`
- `orchestrator/output/day9-vp005b-bgm/day9-no-bgm.mp4`
- `orchestrator/output/day9-vp005b-bgm/day9-mixed-audio.wav`
- `orchestrator/output/day9-vp005b-bgm/bgm-config.json`
- `orchestrator/output/day9-vp005b-bgm/bgm-validation.json`

试听后请反馈音乐是否合适、BGM 音量是否满意。授权状态核实前，不将 BGM-01 固定为默认音乐，也不公开发布带 BGM 成片。
