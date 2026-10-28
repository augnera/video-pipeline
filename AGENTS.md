# VideoPipeline 工作规则

本文件适用于本仓库。以持有人本期明确指令为先；不要将历史方案、单期参数或未实现能力当作默认生产流程。

## 1. 项目定位

- 本仓库是“小陈AI说”Video Agent：接收冻结 Excel，完成配音、视觉编排、素材准备、字幕、BGM、转场、合成、技术检查与有限修复，交付完整审阅版，等待人工最终观看。
- Script Agent 负责选题与脚本；未经明确授权，不扩展为独立内容策划平台、通用 Agent 平台、素材后台或数据库服务。
- 优先复用现有 TypeScript 编排、已批准 TTS、Asset/AssetMatch、Remotion、FFmpeg、转场选择器和 Quality Gate。先核实旧代码、Git 历史、接口调用链和测试资产，区分“已实现”“未接入”“服务未启用”与“确实缺失”，只补必要差额。

## 2. 开始工作

- 先读本文件与 `PROGRESS.md`，再读本期报告、输入契约及真实执行入口。
- 核实仓库位置、分支、HEAD、工作区、上游跟踪关系及未推送提交。可用 `git status --short`、`git branch --show-current`、`git rev-parse HEAD`、`git branch -vv`；有跟踪上游时再比较领先/落后及未推送日志。只比较本地远端引用时，不能说已核实服务器最新状态。
- 以本地实际代码、文件和执行证据为准，不假设 GitHub main 包含最新工作。保护已有未提交修改、移动/删除状态、素材及历史产物；不擅自 reset、清理、提交或推送。
- `docs/README.md` 保留早期带货、SoVITS、ComfyUI 方案，不代表当前“小陈AI说”默认链路，也不构成启动旧模型或升级环境的授权。根 README 的既有删除/移动状态不得因此擅自恢复。

## 3. 事实与内容

- 冻结旁白未经授权不得改写、增删、改顺序或添加个人经历；制作说明、标题和来源元数据不得混入旁白。Excel 工作表、有效分镜范围及元数据边界按本期契约核实，不把 VP-010 的25镜或 A1:K26 写成通用假设。
- 画面是否允许重编，以本期任务和输入契约为准；允许重编时，先理解表达目标，再找素材、二次编排，不机械照搬画面栏中的卡片指令。
- 分开记录新闻事实、官方表述、媒体报道、推导数字和作者分析；保留支持具体事实的 URL、核查日期、访问失败与不确定性。实质冲突需指出原句和证据，暂停受影响口播，继续不受影响工作，不静默改稿。
- 不伪造公告、邮件、真实产品操作、内部现场、个人经历、引用、授权或模型分析结果。通用办公素材不能冒充实际产品演示或特定公司的内部现场。
- 规则模式明确记录 `mode=rules`、未调用模型时 `modelUsed=null`。交互式 Codex 抽帧查看、人工编排表、规则脚本与无人值守模型服务必须区分；不能把模型凭据存在当作已调用服务。

## 4. 默认视觉原则

- 优先采用真实动态视频或真实录屏作为底层，由 Remotion 动画叠加重点、数字、步骤及必要解释。叠加按旁白节奏出现、退出，兼顾主体、阅读需求与独立字幕安全区。
- 全屏图解按表达需要使用，不用大量同质文字卡填补真实素材缺口，不用不相关办公素材、循环铺片或持续缩放伪装内容变化。静态图片推镜不能称为真实视频动作。
- 不露脸、蓝紫科技风；默认隐藏“小陈AI说”“情景示意”等装饰性常驻角标。保留正常字幕、关键观点与独立必要披露机制，图解标题和主体构图协调。具体视觉开关见 `orchestrator/config/xiaochen-visual.json`。
- 转场按旁白语义、镜头关系、运动与阅读需求选择；普通叙述优先硬切，需要时使用适配的短叠化、推移或遮罩。不得随机轮换、全部统一时长或为了展示效果而滥用。
- 自动选择仅限技术 VERIFIED、未被人工 REJECTED，且参数、时长、余量及纹理经过相应验证的效果。未获人工评价者按用途标记试用；18帧验证不能自动外推为6帧验证。技术渲染成功不代表本次切点适合。
- 单期视觉比例、硬切数量和转场分布不是永久配额；VP-010 的86.98%实景/录屏、7.90%图解、31硬切是该片结果，不是后续必须复制的指标。
- 历史 VP-010 渲染器的关键词叠加主要随整段镜头显示；新常规入口已接入元素级出现/退出时间、位置和动画，见 `orchestrator/contracts/overlay-v1.schema.json` 与 `docs/Production-v1.0.md`，已有真实短片验证。不能把新入口能力说成所有历史模板均已升级或已获人工视觉验收。

## 5. 资产与时间线

- 复用 `orchestrator/contracts/` 的 Asset/AssetMatch v0.1。Asset 保存素材自身信息，AssetMatch 保存项目/期数/镜头匹配；不把单期业务字段写死进公共 Asset。
- 记录真实来源、作者（未知留空）、逐项许可依据和限制、核验日期、SHA-256、媒体实测参数、可用片段、裁切及匹配理由。描述依据实际画面分析，保存关键帧、分析来源/时间，区分客观事实与推测。
- 下载素材仍保留原始 `web_stock` 来源，不因进入本地目录改成 `local_library`。同字节素材按 SHA 去重；不重复下载同一文件，不擅自删除正式素材；人工未通过不提升为正式素材库。
- 无合适素材时记录具体镜头和缺口，不能因为文件存在就判定匹配、裁切和长度足够。获取素材不得绕过访问限制；网页嵌入视频不自动具有复用授权。
- 先生成/核实实际配音，再定时间线与字幕；估算时长不能用来强行加速旁白。优先可靠生成时间戳/对齐工具，无字词级证据时明确只到句级，不伪称精确对齐。
- 沿用现有 JSON 交接及同一时间线；转场重叠不能扣短整片或移动已冻结字幕。字幕为稳定独立层，不随背景扭曲、模糊或甩动；检查手机安全区及实际字形。
- 每期使用独立 episodeId 和输出目录；同一期修订保留旧版、原配音、原字幕、原 BGM 及输入哈希，记录持有人选版，不覆盖历史成片。
- BGM 使用持有人确认文件及现有 `orchestrator/config/music.json`，不按近似名称误选，不将“常用”推断为授权齐备。按实际响度保证人声优先，保留独立音乐轨，检查循环接缝、淡入淡出、削波与弱语音段；单期固定增益不作为通用音量公式。

## 6. 技术与安全边界

- 本地 Wan 保持 STOP，不擅自启动 Wan、ComfyUI 视频推理、GPU 视频模型或付费视频生成服务。
- 已批准 TTS 按现有流程、参考音色、参数及本期授权使用；不得顺手部署新模型或重新开展音色优化实验。参考音频及模型路径用本地引用/配置，不复制敏感内容进版本控制。
- 不擅自升级共享模型环境、驱动、CUDA、系统 FFmpeg 或关键依赖；先在已有隔离环境验证兼容性，再按授权作最小变更。依赖依据实际 package/lock 和执行记录，不写“最新版”假设。
- 密钥、令牌、私人参考素材等敏感信息使用环境变量或受忽略的本地配置；不写入仓库，不打印完整含凭据的进程参数或配置。
- 不自动上传、发送或发布内容；交付成片供人工审阅。“可以发”的人工裁定不等于要求本轮代发，也不自动抹除许可待确认项。

## 7. 验证与交付

- 技术检查、人工视觉/听觉评价、公开使用授权三者分别记录。技术通过不代表自然、好看、继续观看意愿通过或授权完成；`NOT_EVALUATED` 不得计作 PASS。
- 使用现有 Quality Gate，检查实际导出、全片时长/帧数、配音保留、字幕连续性、安全区、黑边/空帧、转场边界、素材余量、BGM 循环及混音；配置存在、安装成功、预览成功不能替代真实导出证据。
- 每个问题最多自动修复一次并复检、留前后差异；GL 渲染故障可按现有机制一次硬切降级。非 GL 错误不能因堆栈含 gl-transitions 路径而误降级；不无限重试或静默伪装成功。更换语义/素材、授权不明或超出既有修复边界的问题如实交人工判断。
- 复用缓存前核验输入、配置、源码及产物摘要，避免重复配音、下载、全片渲染。已有真实控制帧仅在来源/时钟/哈希及适用范围可核验时复用；浏览器超时必须保留，不能冒称新探针成功。
- 执行到本期授权范围内的可审核交付；真实素材缺口、事实冲突或必需服务不可用时，准确报告阻断与影响，继续不受影响部分。普通可逆接线、检查和修复不额外设置确认流程。
- 成片、时间线、分镜/素材匹配、字幕、BGM、转场选择、质量与修复记录及剩余问题应可追溯。封面如未接入，明确标为单独步骤；不自动发布，完成后等待人工观看。

## 8. 进度与当前裁定

- `PROGRESS.md` 记录当前状态、持有人最新裁定和下一步，详细证据放在 `docs/reports/`。区分“已实现”“已有实际测试”“人工验收”“待确认”，不得把文档计划写成已自动化。
- 持有人最新裁定：VP-010 视频及配套封面约65分，基本满足要求、可以发。此为人工观感/使用裁定；素材、BGM 未确认的授权记录继续保留，不倒改历史技术证据为已获公开授权。
- VP-010 选用换配音前的 `orchestrator/output/microsoft-veo-skills-20261028-vp010/microsoft-skills-review.mp4`；后来开头配音实验被持有人否决，只保留对照，不作为默认音频方案。选版记录见同目录 `holder-selection.json`。
- 封面本次单独生成，尚未证明已集成自动流水线；不虚构封面文件路径、生成入口或全自动覆盖范围。
- “常规视频制作流程固化v1.0”已新增集中配置、统一CLI、阶段缓存/续跑及通用叠加时序。验证复用VP010原版缓存，并实际渲染短片及测试中断恢复；未重新制作VP010或新调用TTS。适用范围与未自动化步骤见 `docs/reports/Production-v1.0-validation.md`。

## 9. 已核实命令与规范索引

以下路径均相对仓库根目录。历史生产脚本可能写入固定目录，先检查参数和目标，不直接对已验收成果重跑。

| 资产/入口 | 已核实范围与限制 |
|---|---|
| `docs/Production-v1.0.md`、`docs/reports/Production-v1.0-validation.md` | 当前常规制作命令、短Prompt、JSON交接、缓存/恢复与实测/未实测边界。 |
| `orchestrator/config/production-v1.json`、`production-runtime-lock.json`（同目录） | 集中默认配置及现有运行依赖版本；机器路径走受忽略production.local.json或环境变量。 |
| `orchestrator/src/production/cli.ts`、`core.ts`（同目录） | 当前统一入口与文件阶段状态，不是新的Agent服务；缺事实/素材时明确阻断。 |
| `orchestrator/contracts/overlay-v1.schema.json`、`experiments/gl-transitions-vp008/src/RoutineRoot.tsx` | 同一时间线的通用叠加与稳定字幕，实际短片验证；主体保护区需真实画面判断提供。 |
| `docs/README.md` | 早期项目说明；模型启动与内容生产方案不可照抄为当前默认。 |
| `docs/reports/VP-008-Transitions-Library.md` | 固定 GL 库、真实验证范围、选择机制与兼容性记录。 |
| `docs/reports/VP-009-Day9-Full.md` | Day9全片技术记录及图解过多、转场不自然的人工反馈。 |
| `docs/reports/VP-010-Microsoft-Skills.md` | 本期真实命令、人工素材/事实审查、导出、修复和选版记录；不是通用一键流程。 |
| `docs/Xiaochen-visual-guidelines.md`、`orchestrator/config/xiaochen-visual.json` | 已有角标、披露、构图与静态停留规范/配置；仍按本期核实渲染接线。 |
| `orchestrator/config/music.json` | 既有固定BGM选择、来源与授权状态；不是已统一的完整混音总配置。 |
| `orchestrator/config/transition-selection.json`、`orchestrator/config/transition-reviews.json` | 选择规则与独立人工评级；前者仍有历史18帧默认，不能不经适配直接用于常规新片。 |
| `orchestrator/config/quality-rules.json`、`orchestrator/src/visual-mvp/quality.ts`、`quality-run.ts`（同目录） | 已有VQ规则、一次有限修复与证据收集；并非所有题材都已自动化。 |
| `orchestrator/contracts/README.md`、`asset-v0.1.schema.json`、`asset-match-v0.1.schema.json`（同目录） | 已有素材与匹配契约；不是独立素材服务。 |
| `orchestrator/src/import/ip-cli.ts`、`excel.ts`（同目录） | 已有Excel解析/CLI，支持输入、`--out`和`--sheet`；有尾部元数据的表格需按契约限定分镜边界，不能直接整表当旁白。 |
| `orchestrator/src/voice/rhythm-plan.ts`、`delivery-cli.ts`（同目录） | 已有节奏规划与音频交付能力；本地已批准TTS运行配置另行核实，未集中成新片通用入口。 |
| `orchestrator/src/visual-mvp/entry.ts`、`cli.ts`（同目录） | VP-007窄规则/样片入口，有部分resume；不等于任意Excel的完整视频入口。 |
| `orchestrator/src/full-day9/run.sh`、`README.md`（同目录） | Day9定向完整流程；含固定本期输入/输出，不直接用于新题材。 |
| `orchestrator/src/episode-production/` | VP-010导入、素材获取、录屏、编排、混音、检查等实际脚本；仍有硬编码路径与人工编排，不能声称全自动通用。 |
| `orchestrator/src/transitions/render.ts` | 已有渲染/有界降级入口，支持`--out`和`--entry`；需先准备正确JSON及独立输出。 |
| `experiments/gl-transitions-vp008/package.json`、`package-lock.json`（同目录） | 已固定的隔离渲染依赖；生产通用配置仍待整理，不升级依赖来代替接线。 |
| `experiments/gl-transitions-vp008/src/GLTimeline.tsx`、`microsoft-skills.tsx`（同目录） | 共享GL背景与VP-010单期渲染器；后者含本期来源/资产逻辑，不是通用模板。 |

已有只读检查/测试命令（无需重做视频，按变更需要使用）：

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git branch -vv
npm --prefix orchestrator run produce -- --help
npm --prefix orchestrator run test:production
npm --prefix orchestrator run test:import
npm --prefix orchestrator run test:visual-mvp
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs --test orchestrator/src/transitions/select.test.ts
python3 -m unittest discover -s orchestrator/contracts -p 'test_contracts.py' -v
```

**当前边界：** 统一入口、集中默认配置、阶段缓存/续跑、通用叠加时序已有代码与缓存/短片实测，参见上述报告；不等于任意Excel无需资料即可无人值守成片。事实核查、素材理解/许可和复杂语义编排仍由交互式Agent或人工供给真实JSON；新稿TTS仍须实际运行/试听，不能用缓存验证替代。封面自动接入仍待办，不宣称已包含封面或发布。
