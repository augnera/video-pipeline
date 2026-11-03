# AI编程还需要学吗｜2026-11-03 私人审阅成片

## 最新持有人裁定（2026-11-03）

持有人完整观看后反馈：“看了这期视频，基本合格，先发布了”。本期整体人工验收记录为基本合格，沿用当前成片，不追加返工。`video-review-20261103/holder-review.json` 保存原话及选中视频SHA；该裁定不外推为所有素材、转场效果或音乐分别获批。发布由持有人决定和操作，本仓库未执行发布、未核实平台发布状态；原许可待确认项、历史技术检查和逐项NOT_EVALUATED记录保留。下文为交付当时的状态及证据。

## 结果与人工状态

按持有人“效果可以，你可以按我们刚才分镜脚本那样合成视频了”复用已接受的完整 CPU 配音，完成本期20镜、24个视觉片段。未再次生成配音，没有运行 CUDA、GPU查询、Wan 或其他 GPU 模型，未发布。

- 成片：`orchestrator/output/ai-programming-20261102/video-review-20261103/ai-programming-review.mp4`。
- Windows：`C:\Users\admin\Downloads\xiaochen-video\ai-programming-20261103\ai-programming-review.mp4`。
- 1080×1920，30fps，5835帧，194.5秒；67500089字节。
- SHA-256：`403b5e342e951a61e4ae2679c939ee6f0201ceaf6e43d3c510ab0805893619af`；Windows副本大小、SHA一致。
- 人工状态：完整 CPU 旁白已获本次试听认可；新成片视觉、转场、混音与完整观看均 `NOT_EVALUATED`。公开使用授权仍有待确认项，只交付私人审阅版。

本地 `main` / `cc562624f8d36cf06fde9e373e72e5451e973ce1`，本地 origin/main 同提交；未声称核实服务器最新状态。保留全部既有未提交修改、Excel删除状态及事故现场，未提交推送。

## 输入、配音与原声插入

冻结输入为 `docs/scripts/AI编程还需要学吗_分镜脚本_20261102.xlsx`、`local-assets/user-provided/huangrenxunai.mp4`、`local-assets/music/bgm/AI科技新时代1.mp3`。Excel20镜，其中第9镜为外部视频；514字、19口播镜头、21个合成句段。原始输入、已接受 `voice.wav` 的 SHA 全部复核未变，详见交付目录 `frozen-input-integrity.json`。

复用 `tts-cpu-full-20261103/voice.wav`（97.697506秒）和 `episode-dialogue-with-shot9.wav`（194.478313秒）。配音实际由 IndexTTS2 CPU/FP32 生成；原合成后收尾错误和一次修复记录仍保留，见 [CPU完整旁白报告](IndexTTS2-CPU-full-20261103.md)。本次仅合成视频。

第9镜完整保留96.780998秒原片的2904帧及完整原声。画面位于第1058—3961帧（35.266667—132.066667秒），原声位于35.258685—132.039476秒，帧取整差分别约8ms和27ms。横屏内容等比完整放在竖屏中，保留源字幕、水印及全部画面，不裁掉主体；并非横屏强行铺满竖屏。该段不新增配音、字幕、关键词或BGM。源文件不改，混合交付存在统一电平处理和AAC重新编码，不宣称最终音频码流与源AAC逐字节一致。

21条字幕保留既有原文与句级时钟，不伪称字词级精确对齐。第4、5镜共享一段合成句，视觉切点15.62秒参考既有CPU ASR线索，非强制字级边界；字幕仍完整保留共享句段，不按文字长度造时间。

## 画面与素材

复用10项实际资产，22项有素材的视觉片段，另2段短图解；素材目录与本期 AssetMatch 分离。实际抽帧检查了键盘、触控板、笔记、代码近景、马群比喻、真实编辑器录屏、新闻标题和用户片段。未新增下载或用不相关人脸凑数量；主要使用手部和屏幕，未能核实亚洲人物属性，不宣称已满足人物族裔偏好。

| 视觉类别 | 秒数 | 全片比例 |
|---|---:|---:|
| 网络实景视频 | 51.000 | 26.22% |
| 真实编辑器录屏 | 38.433 | 19.76% |
| 新闻标题图片 | 3.467 | 1.78% |
| 全屏图解 | 4.800 | 2.47% |
| 用户提供完整视频 | 96.800 | 49.77% |

比例来自 `visual-distribution.json` 的逐片段帧数，不能把用户指定的访谈时长隐藏在自制实景统计中。真实编辑器画面是输入、选择和滚动代码/文档，不冒充已经执行验证的AI产品操作。关键词按时出现、退出，字幕保持稳定独立层。两段图解居中；不添加品牌或情景示意常驻角标。

沿用规则 Director → Asset Proposal → 二次时间线 → 现有 Routine/GL 渲染器；`mode=rules`、`modelUsed=null`。实际素材查看及编排由交互式 Codex 完成，不宣称调用了无人值守视觉理解服务。Visual Brief 中的表达目标是意图，实际匹配依据以 `asset-matches.json` 和最终时间线为准。

事实依据复用11月2日 `preparation/fact-check.json`：Felix个人文章的招聘实践不扩大为Anthropic公司统一政策；用户上传访谈保持原样，未虚构公告或额外引语。Astana网页捕获为访问阻断页，未进入成片。YouTube源链接未成功抓取，完整字幕译文及公开复用许可未据此宣称通过。

许可仍按各素材原档案保存：库存素材为本地实验核验状态；新闻截图、用户提供访谈及BGM公开用途待确认。使用本期视频不自动提升素材的人工审核或授权状态。`asset-usage.json` 保存本期真实使用记录；公共库 `record-use` 尚未适配第9镜派生视频不足一帧补齐的源时钟，未以虚构原片时长绕过，将此项留作后续小修。

## 转场与混音

23个切点：22个硬切（95.65%），1个 `glt:Fade` 6帧叠化（4.35%），位于第4322帧、实景进入“两个关键”图解处。只选技术已验证且未拒绝的效果；叠化人工尚未评价，明确按试用记录。无统一18帧效果、轮换特效或重叠扣短音轨。审计见 `transition-selection-report.json`。

BGM采用指定 `AI科技新时代1.mp3`，实测约27.45秒，8份铺接、1秒等功率交叉淡化，首尾0.5/1秒淡化。按本稿响度计算基线-17.5dB，在其上+3dB得到音乐轨-14.5dB，统一主输出-1.5dB；+3dB是本轮试听设置，未宣称持有人已验收档位。AAC实测约-17.5LUFS、真峰值-1.6dBFS，无削波。

保留 `audio/` 初始版本。一次修复将BGM静音范围从实际原声结束扩展至第9镜最后一帧结束，覆盖35.258685—132.066667秒，音乐stem该区间峰值0，详见 `audio-boundary-repair.json`。没有移动字幕、改原声或重新制作画面。最终使用 `audio-final/`。最弱3秒人声/音乐能量差约7.18dB，保留WARN，主观清晰度和音乐接缝待试听，未自动改档掩盖提醒。

## 实际渲染、检查与有限修复

复用现有 `production/media.ts`、`production/quality.ts`、音频请求入口和 Routine 渲染器；本期接线脚本位于 `orchestrator/output/ai-programming-20261102/preparation/`，不是新建生产平台。真实渲染后端为Chrome ANGLE SwiftShader软件渲染和libx264，画面导出及探针约662.024秒。明确禁用视频硬件编解码，并保留运行进程参数证据 `render-process-backend.json`。没有使用物理GPU推理。

为避免实际Gate误报，做两处有边界的小修并运行25项相关测试：

1. 仅对来源哈希匹配、具有明确派生文件及SHA的素材允许不足一帧补齐，普通原片越界继续失败。原视频时长不改。
2. 没有第二行标题时不对空DOM Range做居中判定；真实存在且偏移的第二行仍失败。

自动Quality Gate最终8 PASS / 4 WARN / 0 FAIL。全5835帧解码与空帧/近黑帧/纯黑边代理检查无异常；21条字幕字形存在、实际DOM安全区、叠加时序、配音保留、源文件完整性通过。叠化实际编码帧相对硬切控制帧MAD约29.44，证明效果接线有效，不证明主观自然。第9镜首/中/末帧与预处理源对比MAD约1.59/1.62/1.60，新增字幕及叠加均无交集，详见 `external-clip-validation.json`。

四项提醒：新闻静态标题3.47秒；连续实景类型最长5段；弱语音音乐能量差；同一素材复用。相同素材使用不同源区间不等于独立来源，仍保留重复提醒。Gate对视觉重编和替代素材仅生成提案，因涉及语义/素材未自动应用，`rechecked=false`如实保留，不宣称执行了不存在的修复或复检。未发生完整重渲染或GL失败降级。实际画面接触图已查看，抽样未发现乱码、主体切断或字幕与叠加冲突；完整自然度、素材贴切程度及观看意愿仍等待持有人裁定。

## 实际可运行入口与交付

以下为本期已实际运行的接线命令，具有本期固定输出路径，不能当作任意新片入口重复覆盖运行：

```bash
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/output/ai-programming-20261102/preparation/prepare-render.mjs
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/output/ai-programming-20261102/preparation/finish-video-review.mjs
python3 orchestrator/output/ai-programming-20261102/preparation/check-external-clip.py
```

交付目录含成片、`timeline.json`、`quality/final-timeline.json`、字幕源、Asset/AssetMatch、逐片段视觉占比、转场审计、独立音乐轨、初始/最终音频、Quality Gate/提案/有限修复记录、实际渲染与源哈希证据。Windows目录另含字幕副本和代表帧图。

下一步仅等待持有人完整观看；不发布，不自动返工或开启Wan。封面尚未制作，不宣称包含封面。
