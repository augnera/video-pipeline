# VP-007-MVP｜Visual Director × Asset Agent × Video Quality Gate v0.1

日期：2026-10-28。结果：**规则模式的 JSON 制作闭环与质量门禁已跑通**，生成同画面的 +3 dB / +6 dB 两份 18.2 秒试听样片。没有将规则处理伪称为模型自主决策。

持有人对 R2 的最新裁定为 CONDITIONAL PASS：整体观看体验基本可用，开场、构图角标为 PARTIAL，转场不明显、BGM 偏小。本轮保留 R2 原文件，改动只进入 VP-007。

## 1. 先看成片

- [默认试听 sample.mp4（+3 dB）](../../orchestrator/output/day9-vp007/sample.mp4)
- [+3 dB 候选](../../orchestrator/output/day9-vp007/sample-bgm-plus3.mp4)
- [+6 dB 候选](../../orchestrator/output/day9-vp007/sample-bgm-plus6.mp4)

两个候选使用同一视频流，仅音乐增益不同。`sample.mp4` 是 +3 档的副本，便于先看，不代表持有人已选定最终音量。

## 2. 可立即使用的运行入口

已有环境中，从 `orchestrator/` 执行：

```bash
npm run mvp:visual -- --out orchestrator/output/day9-vp007-new-run
```

命令会自动执行：

`Day9 原始输入 → Visual Director → Asset Agent → Visual Director 时间线 → Remotion → 两档混音 → Quality Gate → 有限修复 → 复检`

现有成片可单独复检：

```bash
npm run mvp:visual -- --quality-only
```

业务输入配置：[visual-mvp.json](../../orchestrator/config/visual-mvp.json)。操作说明：[README](../../orchestrator/src/visual-mvp/README.md)。已有完成产物默认拒绝覆盖；新实验用新 `--out`。本轮施工期间先完成媒体构建，收到 Quality Gate 补充后在同一输出目录续接门禁，没有重做 VP-006。

## 3. 复用盘点与能力限制

已读取并复用：现有 Excel 导入器、LLM 客户端/调用链、VP-006/R1/R2 代码与报告、现有 Asset/AssetMatch v0.1、现有四条素材索引、R2 居中图解/字幕/镜头运动、Remotion 软件渲染、FFmpeg 混音与检查。

原 DSE 合成器是另一套 20–60 秒数字人口播链路，包含 TTS/ComfyUI 调用，不适合直接执行本轮 18 秒且禁止模型启动的任务。本轮接入已经跑通的独立 Remotion 实验体系，没有重写其底层或改动旧 pipeline。

当前进程与仓内均未配置可供此命令调用的 LLM/视觉 API 凭据，原文本客户端是脚本生成用途，没有可用的视觉规划/质检接口。因此：

- 本次所有角色输出显式写 `mode=rules`、`modelUsed=null`。
- 不把当前 Codex 会话人工式查看预览，包装成命令里的模型服务。
- 素材描述来自既有索引的实际抽帧分析事实，保留原模型/帧依据；本轮没有伪称重新理解视频。
- 当前规则支持已验证的“工作负担动作→先X再Y→系统上限”语法与既有图解。未知语义、素材不足时输出缺口，不强行用同质文字卡填充。

能力证据：[capability.json](../../orchestrator/output/day9-vp007/capability.json)。没有启动本地 GPU 模型、调用付费视频 API、重新下载素材或公开发布。

## 4. 两个角色通过真实 JSON 交接

1. **Visual Director** 读取真实旁白、45 条原字幕时间和 10 镜音频时间线，枚举 16–20 秒连续整镜窗口，按动作需求、可用元数据覆盖、支持的图解语法及距 18 秒的差值排序。
2. 写出 [visual-brief.json](../../orchestrator/output/day9-vp007/visual-brief.json)，包含候选评分、片段目标、表达类型、切换边界和拟用转场。
3. **Asset Agent** 从该文件读回需求，只检索原 [VP-006 索引](../../orchestrator/output/day9-vp006-poc/asset-catalog.json)，按 description/actions/analysis.facts 匹配，不靠文件名或标签制造语义。检查文件 SHA、实测媒体信息、本地实验授权和审核状态。
4. 写出 [asset-proposal.json](../../orchestrator/output/day9-vp007/asset-proposal.json)，提供实际源区间、匹配理由、候选排名、授权/审核状态和 v0.1 AssetMatch。已下载素材仍为 web_stock，不改成 local_library。
5. **Director** 读回推荐，再写 [timeline.json](../../orchestrator/output/day9-vp007/timeline.json)。实际路径由 Asset ID/索引解析并按 SHA 自动暂存；Remotion 只消费这个结果，不需要人工复制素材路径。

每次交接均写文件并重新读取，最终验证记录文件哈希。没有新建素材索引、数据库或 Agent 服务。

### 本次自动选择

评分最高为原片 **19.752653–37.952608 秒（第 3–4 镜，18.199955 秒）**。另比较了第 2–3、6–7、7–8、1–2、8–9 镜等，共 6 个窗口；评分明细保留在 Brief。

| 主时间段 | 自动表达/推荐 | 来源与依据 |
|---|---|---|
| 0–2.000 秒 | 夜间工作环境，图片推移 | 既有 AI 首帧；建立“身体透支”工作情境，静图主段限制为 2 秒 |
| 2.000–3.567 秒 | 实际办公近景 | mixkit-39839；可见手/电脑操作，与疲劳动作分开匹配 |
| 3.567–8.767 秒 | 摘镜低头实景 | mixkit-39854；源 2–7.2 秒来自既有动作事实的时间线索 |
| 8.767–18.200 秒 | 居中动态图解 | 复用 Method 模板；主副标题和身体/进度/上限标签由真实旁白语法提取 |

这是本次输入及规则的计算结果，代码没有写死 Day9 的镜号或 19.75 秒起点。测试改变了 episodeId、全部镜号及绝对时间，仍按内容重新得到对应窗口；不支持的旁白、无关素材、授权不允许、下游引用丢失或源区间异常会报缺口。

## 5. 明显但克制的动态转场

本轮补齐 3 种小效果，复用已有 Remotion Sequence/Freeze 与 CSS。通用效果代码无 Day9 文字，没有特效编辑器。

| 类型 | 开始帧/秒 | 持续 | 语义理由 |
|---|---|---|---|
| slide_wipe | 54 / 1.800 秒 | 12 帧 / 0.400 秒 | 环境静帧切入真实办公细节，用移动遮罩明确改变视角 |
| whip_pan | 102 / 3.400 秒 | 10 帧 / 0.333 秒 | 工作动作切到身体负担动作，快速水平甩镜并短暂运动模糊 |
| zoom_blur | 256 / 8.533 秒 | 14 帧 / 0.467 秒 | “正确的做法”处由疲惫实景转入清晰图解 |

主边界仍为 0 / 60 / 107 / 263 / 546。只重叠画面图层、保持源首末帧，不扣片长，不移动旁白或字幕。AI 图包括转场尾段连续可见约 2.2 秒；全片只使用这张图一次。没有连续同质文字卡，也没有无意义常驻角标。

Quality Gate 实际渲染相同源时钟、相同字幕/运动但禁用转场的控制帧，与成片编码帧做差异比较。3 处差异均明显大于本轮像素阈值，说明转场不是只写在配置里；这不等于机器已判定其自然或有留存价值，正常速度观看仍待持有人确认。

## 6. BGM +3 / +6 试听

固定文件为 `AI科技新时代1.mp3`，原件未改。以 **R2 实际 BGM 增益 -17.3 dB** 为基准，不叠加到施工中间的 +3 草稿上。

| 项目 | +3 dB | +6 dB |
|---|---:|---:|
| 音乐轨增益 | -14.3 dB | -11.3 dB |
| 旁白/混音总线 | 同一旁白，统一 -1.5 dB | 同一旁白，统一 -1.5 dB |
| 成片综合响度 | -17.8 LUFS | -17.8 LUFS |
| 成片 true peak | -4.0 dBFS | -3.7 dBFS |
| 最小 3 秒宽带人声能量优势 | 10.35 dB | 7.35 dB |
| 最小 3 秒语音频带（300–4000 Hz）优势 | 12.82 dB | 9.82 dB |

两份混音无削波；原始配音切片逐采样一致。PCM 分轨相消检查显示两档的人声部分保持一致，音乐差值为固定增益，误差仅在量化范围，没有额外逐句增益跳变。音乐保持 0.5 秒淡入、1 秒淡出。

能量优势是客观代理指标，不是 ASR/人工可懂度结论。+6 在弱语音处音乐更近，Quality Gate 保留 WARN，不擅自把持有人指定的档位调低。请重点对照试听。源音乐实测 27.45 秒，本次 18.2 秒无需循环；时长不足时沿用重复裁切机制。

参数、分轨与检查见 [bgm-config.json](../../orchestrator/output/day9-vp007/bgm-config.json) 和 [validation.json](../../orchestrator/output/day9-vp007/validation.json)。授权仍待核实，样片仅限私人本地试听。

## 7. Video Quality Gate v0.1

规则源：[quality-rules.json](../../orchestrator/config/quality-rules.json)。本次快照：[输出规则](../../orchestrator/output/day9-vp007/quality-rules.json)。执行记录：[quality-report.json](../../orchestrator/output/day9-vp007/quality-report.json)、[repair-log.json](../../orchestrator/output/day9-vp007/repair-log.json)。

| 规则 | 确定性结果 | 自动证据 | 模型/人工项 |
|---|---|---|---|
| VQ-01 静态停留 | PASS | 含转场约 2.2 秒，运动配置存在，同图只出现一次 | 可感知运动、吸引力 NOT_EVALUATED |
| VQ-02 同质化类型 | PASS | 图片→实景→实景→动态图解，连续同类最多 2 段 | 实际表达是否单调 NOT_EVALUATED |
| VQ-03 配置与实际转场 | PASS | 成片对 hard-cut 控制帧差异约 18.10 / 58.13 / 28.71 灰阶；有字幕帧白字重合度约 97.4% / 98.7% | 正常速度可感知性、自然度 NOT_EVALUATED |
| VQ-04 构图与安全区 | PASS | 实测标题中心 x≈539.5、副标题 x≈539；图解底 y≈1421，字幕上界 1678，未裁切 | 审美平衡 NOT_EVALUATED |
| VQ-05 角标 | PASS | 默认角标关闭，独立 AI 披露状态保留 | 烧录标记和画面整洁体验 NOT_EVALUATED |
| VQ-06 BGM | WARN | 两档指定增益、峰值和人声一致性通过；+6 弱语音宽带优势低于项目提醒阈值 | 最终可懂度与偏好 NOT_EVALUATED |
| VQ-07 匹配/重复 | PASS | 实际文件/索引/源区间与授权状态检查，无过量重复，不提升素材审核状态 | 语义贴合与正式审核 NOT_EVALUATED |
| VQ-08 字幕/音频 | PASS | 11 条原字幕、配音样本一致、18.2 秒/546 帧、时间范围及无异常重叠 | 感知同步体验 NOT_EVALUATED |

**确定性汇总：7 PASS、1 WARN、0 FAIL。综合为 WARN，人工 Gate 必需。** 顶层逐规则对未做的主观项保留 7 个 NOT_EVALUATED，不能把上表确定性 PASS 当作审美/发布 PASS。没有把当前可用性判定为公开发布许可。

### 实际效果检查不是配置自证

证据在 `quality-evidence/`：实际编码帧、相同源时间的无转场控制帧、手机预览、像素布局测量与哈希。控制帧由现有 Remotion API 自动生成，不调用视觉模型。像素差异证明实际画面存在效果；具体风格是否好看仍交模型辅助或人工。本次无可调用模型接口，模型辅助项全部如实为 NOT_EVALUATED。

### 有限修复边界

每条规则每个输出最多一次尝试，比“每个问题一次”更保守，次数持久保存在 repair-log。允许：补轻微镜头运动、恢复原 Brief 的转场配置并同步渲染、切换既有居中布局、关闭装饰角标、重用混音器生成指定候选、恢复可确定的原字幕时间。

以下只给提案/人工 Gate：需要换素材、改变语义、素材/授权缺口、未知源文本或配音异常。视觉类型重复可请求 Director 提案，但不自动采用更换内容的方案；过度重复素材可列出既有替代项，不自动替换。

修复前保存配置与媒体；修复后重新渲染或仅重混音，再收集实际证据复检。如果仍失败，不二次循环。无修复时复检项明确标记“未执行/NOT_EVALUATED”，不虚报新的 PASS。

当前真实样片已经符合可确定规则，没有适用的安全修复，**实际修复 0 次**。+6 的试听提示保留给持有人，不被自动“修复”为另一档音量。

## 8. 测试与有限修复回放

- 23 项角色/质量规则测试 + 12 项效果/披露测试，共 **35 项通过**。
- TypeScript 编排器检查通过；Remotion PoC 编译通过。完整旧项目严格 unused 检查仍有原有 `Vp005aRoot.tsx` 未使用导入，未扩大修复。
- 两个候选完整解码，视频流一致，无黑帧，配音切片样本一致；原 Excel、字幕、配音、BGM、既有索引与契约等保护输入未变。
- 隔离集成测试复制样片到临时目录，移除 +6 成片及候选清单，真实触发 **一次音频修复→重新产生 +6 成片→复检**，没有重新渲染画面。缺失候选问题解决，但 +6 弱语音提示仍为 WARN，不把复检伪称全 PASS。交付样片未被故障注入或改变。
- 额外验证媒体不存在时仍输出 8 项 NOT_EVALUATED 和失败记录，不将未检查项目当 PASS。

测试证据：[角色与规则测试](../../orchestrator/output/day9-vp007/core-quality-tests.log)、[效果测试](../../orchestrator/output/day9-vp007/effect-tests.log)、[真实隔离修复摘要](../../orchestrator/output/day9-vp007/quality-integration-test.json)、[修复/复检明细](../../orchestrator/output/day9-vp007/quality-test-evidence/repair-log.json)、[缺媒体记录测试](../../orchestrator/output/day9-vp007/quality-missing-media-test.json)。

## 9. 完成、未完成、阻断与下一步

完成：可执行的规则 Director/Asset Agent JSON 协作、实际 Remotion 成片、3 种明显转场、两档音乐、8 项 Quality Gate、有限自动修复/复检机制、测试与来源记录。没有新建素材平台、后台、向量库或独立 Agent 服务。

未完成：模型型自主导演/新视觉理解调用、主观审美/留存与音频可懂度的最终人工裁定、BGM 公开授权和 AI 披露发布复核。当前没有可调用模型配置，已按允许的规则模式降级，不声称补齐模型能力。

无阻断本地观看的事项。下一步请观看 +3 / +6，确认转场是否足够明显而自然，并选择音乐音量。完成后停止等待，不扩展完整 Day9，不自动公开发布。
