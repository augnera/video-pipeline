# VP-008｜GL Transitions 库与 Visual Director 选择机制

日期：2026-10-28（Asia/Shanghai）。范围：现有 Day9 18.2 秒私人样片。状态：可审核交付，人工视觉验收 NOT_EVALUATED。没有公开发布，也没有扩展到完整 Day9。

## 结果与入口

- [最终自然编排样片](../../orchestrator/output/day9-vp008/sample.mp4)：1080×1920、30fps、546 帧、18.2 秒。
- [原 VP-007 +3 dB 对照](../../orchestrator/output/day9-vp007/sample-bgm-plus3.mp4)：原件保留。
- [完整转场目录](../../orchestrator/output/day9-vp008/transition-catalog.json)、[图鉴索引 Markdown](../../orchestrator/output/day9-vp008/preview-index.md)、[HTML 索引](../../orchestrator/output/day9-vp008/preview-index.html)、[CSV](../../orchestrator/output/day9-vp008/preview-index.csv)。图鉴为 10 卷 MP4；单效果预览均显示稳定 ID 和上游名称。
- [选择报告](../../orchestrator/output/day9-vp008/transition-selection-report.json)、[时间线](../../orchestrator/output/day9-vp008/timeline.json)、[Quality Gate](../../orchestrator/output/day9-vp008/quality-report.json)。
- [逐效果目录审计](../../orchestrator/output/day9-vp008/library-audit.json)、[批量性能](../../orchestrator/output/day9-vp008/render-performance.json)、[受保护输入复核](../../orchestrator/output/day9-vp008/protected-after.json)。

|统计|数量|
|---|---:|
|固定上游总数|125|
|已收录（不含硬切、参数变体不重复计数）|125|
|VERIFIED：本轮默认参数技术检查通过|124|
|FAILED|1|
|BLOCKED|0|
|REGISTERED／待验证|0|
|人工 NOT_EVALUATED|125|
|人工 RECOMMENDED|0|
|人工 ALLOWED|0|
|人工 REJECTED|0|

125 项全部实际导出、解码并处理，未因达到某个数量停止。**125 项导出成功不等于 125 项技术通过**。唯一未通过为 `glt:TangentMotionBlur`：结束画面与统一终点控制帧 MAD=3.1933，超过预设 3；转场结束后仍有模糊残留。未放宽阈值以凑通过数，自动选择明确排除它。[失败证据](../../orchestrator/output/day9-vp008/validation/TangentMotionBlur.json)、[原始失败预览](../../orchestrator/output/day9-vp008/previews/TangentMotionBlur.mp4)。

## 开工事实与复用盘点

真实仓库：`/home/chen/work/video-pipeline`。分支 `main`，HEAD `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`。开工时领先已核实的 `origin/main` 9 提交、落后 0；远端 main 核实为 `88ec403239f2e0eab6e9735fd92b1b431057d57a`。[未推送列表](../../orchestrator/output/day9-vp008/unpushed-commits.txt)。没有假设远端 main 包含本地最新成果，没有 checkout、reset、commit 或 push。

开工存在大量 VP-003–007 未提交文件和原有 `.gitignore`／`orchestrator/package.json` 修改，以及根 README、PRD 的删除/移动状态，均保留。[工作区开工快照](../../orchestrator/output/day9-vp008/repository-before.json)。仓内没有 AGENTS.md，遵循本轮持有人给出的长期要求。开工没有 PROGRESS.md，本轮新建，未覆盖旧文件。

实际读取并复用：VP-007 报告与 `visual-mvp/core.ts` 的 Director/Asset Agent/二次编排、`types.ts`、JSON Brief/Proposal/Timeline、`quality.ts`、`quality-run.ts`、相关测试；Remotion `Vp007Root.tsx`、`Vp006R1Root.tsx`、`PocShared.tsx`、`visual-effects.ts`；R2 素材、18.2 秒样片、字幕/音轨、配置及既有素材契约。没有重新下载素材或重建素材索引。

|运行资产|实际版本/入口|
|---|---|
|Node|v26.7.0|
|既有及隔离 Remotion|4.0.539|
|React|19.2.3|
|TypeScript（隔离环境）|5.9.3|
|系统 FFmpeg|6.1.1-3ubuntu5，未替换|
|浏览器|Google Chrome for Testing 149.0.7827.55，本地 chromium-1228|
|VP-007 原入口|`orchestrator/src/visual-mvp/entry.ts` → cli → Remotion `src/vp007.ts` / `Vp007Root.tsx`，Composition `VisualMvp`|
|VP-007 原输出|`orchestrator/output/day9-vp007/`，4 段视觉、546 帧|

VP-007 三种转场真实实现是通用 CSS 画面变换，而非 GL：`whip_pan` 使用水平位移、轻微放大及正弦模糊；`zoom_blur` 使用进出场缩放、透明度及模糊；`slide_wipe` 使用 clipPath 擦除及平移。实现位于 `visual-effects.ts`，字幕在独立层。原切点 60/107/263 帧，原持续 12/10/14 帧。本轮保留这些旧能力和旧样片，只为新时间线接入 GL 引擎。

原素材/时间输入：VP-007 `timeline.json`、`visual-brief.json`、`asset-proposal.json`，VP-005A 原始字幕，Day9 WAV、原 Excel，以及现有素材目录。截取原音频约 19.752653–37.952608 秒；保持相同 546 帧画面时钟。原 83.771564 秒配音原件保持不变。

## 固定上游、许可证与兼容性结论

官方来源：[仓库](https://github.com/gl-transitions/gl-transitions)、[效果画廊](https://gl-transitions.com/gallery)、[本次固定官方 Remotion 源码](https://github.com/gl-transitions/gl-transitions/tree/0efa1651dfdbc0cdbd57f4cda55f12d8b3dbc0c5/packages/remotion)。核验日期 2026-10-28。

- 集合固定 `gl-transitions@2.0.0`；源码固定 commit `0efa1651dfdbc0cdbd57f4cda55f12d8b3dbc0c5`。源码归档 SHA-256：`4f37c437889062d5627ed5f10382b4eec082714b93ee8197545ae8fdf5b3d20d`。
- npm 已发布 `@gl-transitions/remotion@0.1.0` 的 peer 是集合 1.x；当前官方源码适配器 1.0.0 的 peer 是集合 2.x、Remotion >=4.0.500。没有强装冲突旧包，使用固定官方源码构建本地 tarball。
- 隔离环境：`experiments/gl-transitions-vp008/`；依赖在其 package.json/package-lock.json 精确固定，本地官方适配 tarball 也在 lock 中固定 integrity。原 `experiments/day9-remotion/package.json` 和 lock 哈希复核未变。源码仅增加独立构建配置，官方适配器和 GLSL 未改写。
- [固定版本与来源](../../orchestrator/output/day9-vp008/upstream/versions.json)、[npm 完整原始目录](../../orchestrator/output/day9-vp008/upstream/catalog.json)、[125 个 shader 与源码快照逐一 SHA 比对](../../orchestrator/output/day9-vp008/upstream/catalog-integrity.json)。映射差异为 0。
- 123 个效果 MIT，`InvertedPageCurl` 为 BSD 3 Clause，`StereoViewer` 为 BSD 2 Clause；官方适配器 MIT。逐效果保留作者、许可证、完整原始声明，BSD 条件/免责声明未省略。[完整声明](../../orchestrator/output/day9-vp008/THIRD-PARTY-NOTICES.md)、[上游 MIT 文本](../../orchestrator/output/day9-vp008/upstream/LICENSE)。这不替代视频素材或 BGM 的授权核实。

实际导出后端：Chrome149 CanvasDrawElement / WebGL2 / **ANGLE SwiftShader CPU 软件渲染** / libx264；不是本地 GPU 视频推理。[实际后端字符串](../../orchestrator/output/day9-vp008/backend-offscreen.json)。Chrome 的软件 WebGL 需要正确的离屏条件；当前封装强制 `--use-angle=swiftshader-webgl --ozone-platform=headless --headless=new`。普通 Studio 预览还需官方说明的 HTML-in-canvas 支持/开关，未将预览成功当作导出证据。

隔离验证发现并处理：

1. 普通 swangle 在此环境偶发 XCB 初始化失败／WebGL2 不可用；换同一浏览器的离屏软件模式后确认软件 renderer，保留所有初始失败日志。
2. 官方 capture 组合在转场 p=0 可出现一帧后镜头闪现。共用 `EndpointGuard` 仅在转场精确首尾帧显示正确源/目标图，GL 仍运行；没有逐效果重写 shader。修正后全目录重跑。淡化复渲染的解码帧 SHA 完全一致。
3. Quality Gate 的 hard-cut 探针必须用各自 inputProps 重新 selectComposition，不能只给 renderStill 更换 inputProps。修正控制帧接线后重新实测，未降低像素差异阈值。[修复前失败](../../orchestrator/output/day9-vp008/quality-before-probe-fix.json)、[修复记录](../../orchestrator/output/day9-vp008/compatibility-repair-log.json)。

## 完整目录与验证边界

稳定内部 ID 为 `glt:上游原名`，独立保存上游版本/commit，参数方向或颜色变体不增加计数。完整目录包括作者、license、声明要求、中文概述/原文描述、分类标签、参数类型与默认值、明确已验证值、推荐/已验证帧数、强度、适配/不适用场景、额外资源、实际证据路径、限制、降级 ID、技术状态、独立人工评价。

本轮参数安全范围是**默认值的精确集合**：`verifiedSafeValues`；未验证连续范围标 null。上游 min/max 仅作为原始指导保留，不宣称全部安全。自动选择仅允许已实测的 18 帧。修改参数或时长需要重新验证。中文概述与类别是规则整理，不伪称模型观看或人工推荐。

批量入口 `experiments/gl-transitions-vp008/scripts/batch.sh`：单浏览器、效果串行、单帧 worker，逐项捕获失败，不中断其余效果；缓存与重试有界。125 项最终导出耗时合计 287.340 秒，中位 1.955 秒；单项最慢 33.943 秒。时间包含各项加载/导出成本，初始兼容性排障不混入该合计。

统一预览条件：360×640、9:16、30fps、30 帧；前后同一 A/B 几何画面，转场 18 帧。逐项 ffprobe、完整解码、起止方向/背景色、端点 MAD、存在中间进度、相邻帧变化、暗区统计、纹理哈希。未把有意黑场/闪光/透明效果机械判 FAIL。局部闪烁、设计性暗场与非预期暗场的区分、内部透明的观感、9:16 审美仍待人工，不将这些未评价项写成 PASS。

纹理：`LumaWipe` 的 luma、`DisplacementMap` 的 displacementMap，均使用本地确定性程序纹理，来源与哈希入记录。没有绕过资源缺失，不下载外部纹理。

补充真实素材组合：图片→实景、实景→图解、图解→实景、实景视频→实景视频、带纹理的实景→图解，共 5 段实际导出并完整解码通过。[结果](../../orchestrator/output/day9-vp008/compatibility/results.json)，同目录有 MP4 与中间帧 PNG。沿用原素材、既有 `TimelineVisual` 和 `Method`，不从文件名假定画面、不生成新素材。库全量技术状态的适用分辨率是上述预览规格；自然样片另对实际选用 3 个效果补充原生 1080×1920 证据，不宣称全库已在所有分辨率/参数组合验证。

## Visual Director 二次编排

沿用 Brief → Asset Proposal → 最终 scenes → Director 二次编排 → 同一 timeline.transitions → Remotion。新增 `orchestrator/src/transitions/`，复用原 TypeScript 编排、进程调用、素材渲染、字幕和 Quality Gate。没有第二套场景时间线或 Agent 服务。

运行模式明确为 `rules`、modelUsed=null。本轮未接入或调用可执行模型服务；根据既有 goal/kind/visualReason 和显式关系字段决策，不将规则识别称为模型理解。主体连续性、焦点坐标、构图对应、运动方向缺失，选择报告逐切点列为未知；未伪造主体识别或语速分析。

流程：

1. **过滤**：只允许 VERIFIED；排除人工 REJECTED；正式模式排除 NOT_EVALUATED，本轮 exploration=true 才允许带试用标记调用。参数/时长须为已验证值，资源实际存在，短镜头余量满足；重要 UI/代码/数据要求清晰阅读时保守硬切。
2. **评分**：已有语义关系 → 类别适配、实际视觉类型、语义适配、人工评价优先级、已记录渲染成本。延续偏淡化，步骤偏擦除，细节/结论偏聚焦，类型变化偏遮罩；不会将切点编号轮换或全库随机抽取。
3. **约束**：最近重复惩罚、连续相同最多 1 次、单片同效果最多 2 次、强效果间隔 >=4秒、强效果最多 floor(切点数×0.34)。本片最多 1 个强效果，实际 0 个。允许适合时均为轻/中效果，不强行上粒子/故障/旋转。
4. **输出**：前后镜头 ID、transitionId、帧数、params、selectionMode、简洁理由、hard_cut fallback、isTrial、纹理和边界余量。报告逐候选保留分数/排除原因、最终分布、约束、降级记录。同样输入/配置/固定目录得到相同选择。

配置集中在 `orchestrator/config/transition-selection.json`。硬切是默认/最终降级，不计库数量。显式人工评级独立存储在 `transition-reviews.json`，目录重建不会把技术通过转成人工推荐。评分优先适配度，重复惩罚只是同类候选的次级选择因素。

以下为实际全库参与后的自然编排，未要求展示全部效果：

|切点|帧 / 样片秒|选择|起始帧|持续帧|实际依据|人工状态|
|---|---|---|---:|---:|---|---|
|visual-1 → visual-2|60 / 2.000s|`glt:SimpleZoom`|51|18|detail|试用、待人工评价|
|visual-2 → visual-3|107 / 3.567s|`glt:DirectionalWipe`|98|18|progression|试用、待人工评价|
|visual-3 → visual-4|263 / 8.767s|`glt:ZoomWipeLeft`|254|18|conclusion|试用、待人工评价|

所有效果都是真正的前后镜头过渡，不是装饰光效覆盖。`SimpleZoom` 对应原 visualReason 的 work detail；`DirectionalWipe` 对应已知 office_work→fatigue 推进；`ZoomWipeLeft` 对应已有 advice/conclusion，且兼顾近期同类效果使用情况。未声称知道人物运动朝向。

契约为原 TransitionDirective 的可选扩展，另有 `visual-transition-v0.2.schema.json` 最小校验；三个实际切点 Schema 校验通过。素材 ID、AssetMatch、画面顺序、字幕与旁白均未改变。

## 时间线、音频、Quality Gate 与降级

GL overlap 只发生在原切点周围的 18 帧窗口内，D+D−D=D，不从 546 帧总时间线扣帧。源画面仍使用原 sourceFrame/Freeze 时钟，只在原可用区间外最多夹持 9 帧（0.3 秒），不会制造长冻结、加速配音或移动字幕。字幕、必要披露层、全局样式与音频在 GL 捕获外部；没有品牌/情景示意角标。

BGM 固定 `AI科技新时代1.mp3`，选原 VP-007 **+3 dB** 档：原音乐 stem -14.3dB、master -1.5dB；不重新混音、不换策略，直接复制原 +3 档 AAC 数据。新旧音轨 SHA 完全一致。原已有混音人声优势最小约10.35dB、峰值-3.9dBTP；本轮以音轨一致性和完整解码复核延续这些结果，人声可懂度仍需试听。授权继续为“剪映历史音乐，待核实”，仅私人本地使用。

最终样片实际 renderMedia 耗时 53.761 秒；含选择/控制帧阶段 88.262 秒，2个 frame worker。[渲染记录](../../orchestrator/output/day9-vp008/day9-render.json)；独立探针另存 day9-probes.json，不覆盖真正导出计时。

最终技术证据：完整解码、1080×1920/30fps/546帧、18.2秒、无 blackdetect 检出区间；原旁白/字幕/Excel/BGM/VP-007输入哈希全部未变。字幕原精度仍为已有短句时间戳估计，并未宣称重新精确对齐。

复用 VQ-01–08，加 VQ-03-GL：**9 项确定性自动检查 PASS，0 FAIL；9 项总体/人工仍 NOT_EVALUATED**。后者不是通过，发布质量没有自动认证。GL 扩展检查目录合法性、参数/时长、资源、重复/强度、连续性、源时钟及可复现选择。[测量](../../orchestrator/output/day9-vp008/quality-evidence/measurements.json) 中实际转场与 hard-cut 控制的画面 MAD 约 42.13 / 28.10 / 55.75；有字幕的切点字形 mask IoU 约0.966 / 0.971。图解主标题中心x=539.5、副标题x=539，图解底界1421，小于字幕安全区1678，无裁切配置错误。这些数值不等于主观构图和转场美感评价。

有界降级已接线：shader/WebGL 失败保存原时间线和错误，受影响切点降硬切，最多再导出一次；第二次失败停止。I/O/根组件加载等非 GL 错误不靠改变转场掩盖。最终样片首轮成功、没有降级。[真实执行记录](../../orchestrator/output/day9-vp008/render-fallback-log.json)。另外以非法效果 ID 触发真实失败，再实际导出硬切对照，验证一次降级；Fade 同参数复渲染解码 SHA 完全一致。[负例与可复现性证据](../../orchestrator/output/day9-vp008/compatibility/failure-and-repeatability.json)。

关键逻辑与原回归共 **33 项测试通过**，隔离 TypeScript 检查通过。覆盖状态过滤、拒绝效果、纹理缺失、类型/精确参数、短镜头、UI阅读、同输入复现、未知语义降级、重复/强度、时间线不变、非法绕过及有界降级；还包含实际全量 MP4 和真实端到端，不以测试数量替代渲染。[测试日志](../../orchestrator/output/day9-vp008/unit-tests.log)、[类型检查](../../orchestrator/output/day9-vp008/typecheck.log)。

## 主要改动与复现

- 新增隔离官方适配/完整源码快照、库生成/批量验证/图鉴、组合兼容性和负例入口；见 `experiments/gl-transitions-vp008/README.md`。
- 新增 Director 选择器、配置、审计、GL Gate、一次渲染降级；仅扩展原 timeline.transitions。
- 既有 `PocMotionSample` 增加可选 background 扩展点；`Vp007Root` 提取原 TimelineVisual 供复用，旧入口行为保留。
- 既有 Quality Gate 增加可选 probe adapter，避免复制测量器；BGM规则支持明确固定已有一个档位，默认 VP-007 的双档逻辑不变。
- 原素材契约未改；没有独立平台、后台、数据库、向量库，未启动 Wan/ComfyUI/本地 GPU 模型，未调用视频生成 API，没有重下载素材。

仓库根目录执行：

```bash
bash experiments/gl-transitions-vp008/scripts/batch.sh
# 批量结束后：在隔离目录执行 node scripts/audit-library.mjs 和 python3 scripts/atlas.py
bash experiments/gl-transitions-vp008/scripts/natural.sh
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs --test orchestrator/src/transitions/select.test.ts orchestrator/src/visual-mvp/core.test.ts orchestrator/src/visual-mvp/quality.test.ts
```

依赖恢复、官方适配构建、组合兼容性/负例入口详见隔离目录 README。完整产物保存在本机 output（仓库原规则忽略生成产物），未进行提交、推送或发布。

## 完成与未完成／阻断／下一步

已完成 A/B 两项成果：固定全目录、一轮全量技术处理、124个可探索调用效果和10卷图鉴、规则 Director 选择/审计/JSON 接线、18.2秒自然编排、原 QG 与 GL扩展、实际降级负例、必要测试及进度记录。

未完成：`TangentMotionBlur` 的结束残留修复；125项人工评价；全参数范围、其他帧数/分辨率组合的验证；模型语义/画面理解；素材/BGM正式发布授权与AI披露审查。后四者没有伪造为完成，也没有扩大施工范围。

阻断：没有阻止本轮私人样片交付的环境阻断；单效果失败已隔离。当前运行编排是规则模式；正式模式没有人工允许项时保守硬切。BGM和素材的既有授权/披露状态仍阻止自动宣称可公开发布。

下一步仅等待持有人观看样片与分卷图鉴，给效果评级及整体裁定。未启动后续自动施工。
