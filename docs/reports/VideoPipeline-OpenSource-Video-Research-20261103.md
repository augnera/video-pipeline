# VideoPipeline 开源视频制作项目深度调研

日期：2026-11-03。用途：决定下一次最小实验，**不是安装或接入批准**。

## 1. 决策摘要

**建议继续用现有CPU配音、真实素材、Remotion/FFmpeg和Quality Gate，优先提升“观众看到什么、何时看到、是否看得清”，不换整套编辑平台，也不继续扩充转场数量。**

最值得借鉴的四项能力，按实际增量排序：

1. **真实证据的区域聚焦与停留。** 由原文截图/录屏提供内容，镜头只做定位、适量放大、框选及让位。video-shotcraft提供最完整的用途→参数→源码链；其演示UI不能冒充我们的真实界面。
2. **旁白中的强调点与画面落点绑定。** 借鉴video-talkcraft的“主句/陪衬句、一个节拍一个视觉主角”和Herk的锚点检查；使用我们自己的已验收字幕/音频来源。句级时间不能包装成字级精度；无可靠词时间时用句级或人工确认锚点。
3. **少量配方的可解释过滤。** 配方按表达目的、所需素材、阅读需求、持续时间、强度及禁用条件索引；先过滤再选，最终落回原timeline。shotcraft有124张Markdown卡，但选择主要靠Agent阅读，不是已经训练好的Director服务；Herk有406个登记卡，也不是406个已逐一渲染验收的组件。
4. **最终成片切点及短动效窗口复核。** 从video-use借鉴源时间→输出时间的明确映射、叠加PTS偏移和切点前后复核；复用我们的Gate/一次修复上限，不采用它的逐段音频淡化或另建EDL。

直接决策：**先讨论实验1“真实证据聚焦”，再讨论实验2“强调点与让位”，实验3只检查切点审核能否更快发现问题。** 不建议先装HyperFrames、OpenMontage、OpenChatCut或大批卡片。ffmpeg-skill多数能力与我们重叠，暂时无需再包一层MCP。

许可决定了复用边界：shotcraft为Apache-2.0，video-use、ffmpeg-skill为MIT，Herk原作MIT且有商业视频使用声明，但附属资产仍独立授权；**talkcraft、anything2explainer的当前版本明确限制商业使用，不能直接搬代码、配方文本或模板进商业生产。** 本报告只总结方法，不复制受限实现。

## 2. 核查范围与证据等级

真实仓库 `/home/chen/work/video-pipeline`，分支main。研究开始HEAD为`cc562624f8d36cf06fde9e373e72e5451e973ce1`，存在大量未提交代码、文档和一个历史Excel删除；读取了根AGENTS、PROGRESS、生产指南、VP-008/009/010及CPU实验记录，并沿实际调用链核查。

持有人随后要求“本地的你先集中推送”。已单独提交并推送本地91项成果至`85892f178b8675b1e74c7ebfc190116c65de955b`，`git ls-remote origin main`核验一致。模型、声音、素材、环境、缓存、第三方整仓及既有Excel删除未提交。**以下本地代码依据是这个已同步快照，调研报告另行提交。**

证据标记：**R**＝我们已有运行产物/记录，非本轮重跑；**S**＝本轮读取固定源码、契约或示例；**D**＝作者README/文档/自报验证；**U**＝未运行或无法确认。外部13项目均未安装、运行、渲染或调用API，不写成“已验证可用”。查看了3张上游静态预览、一个已发布5秒示例的首/中/尾CPU抽帧及已有Felix原文截图；未重新渲染示例，也未完整观看全部动态效果。固定分支/commit、所读文件与预览范围见[证据索引](VideoPipeline-OpenSource-Video-Research-20261103-Evidence.md)。

没有读取.env内容，没有执行外部Skill指令/安装脚本，没有修改用户级Agent配置，没有新视频、GPU、视频模型或付费调用。CPU Wan的A不可用、B约60分且内容不符，32分16秒只生成1.0625秒，继续不作为生产方向；这不推导GPU事故根因。

## 3. 现有能力—真实入口—证据—具体缺口

| 已有能力/成熟度 | 真实生产者→消费者 | 现有证据 | 具体缺口 |
|---|---|---|---|
| 集中配置、统一CLI：已实现 | `production/cli.ts`→`core.loadConfig`，`config/production-v1.json`；命令`npm --prefix orchestrator run produce -- --excel … --episode …` | S；R：Production-v1.0缓存/短片/中断恢复记录 | 不是任意Excel无人值守出片；事实、素材与复杂二次编排仍需真实JSON供给；默认转场catalog还引用被忽略的VP-010输出 |
| 冻结Excel/新配音：已接线 | `importProduction`→`generateVoice`→`alignGenerated`；CPU/FP32路由，无GPU回退 | S；R：本期完整CPU旁白及用户认可 | 外部原声插入、共享合成句跨镜等复杂情况仍有单期准备脚本，不可仅看统一入口宣称全自动 |
| 初次Visual Brief：窄规则已实现 | `visual.intentBrief`按原文与画面栏生成requests，正则偏好实景/录屏 | S：`mode=rules, modelUsed=null` | 没有通用旁白语义理解、主体检测或成熟配方选择器；不能把文件名/凭据当已理解 |
| Asset/AssetMatch：已实现 | `contracts/asset-v0.1.schema.json`与`asset-match-v0.1.schema.json`；`library.py`维护素材，匹配关系另存 | S；R：素材库/网络补充及两条人工通过记录 | 人工视觉通过与公开许可确认独立；素材获取成功不代表许可完成 |
| 本地优先、外部补缺：已有生产接线 | `production/asset-library.ts::localAssetProposal`→`library.py::propose`→有缺口时`network.py discover` | S；R：Pixabay/Coverr/Unsplash搜索、预览、下载记录 | 外部搜索要求Director给具体需求；筛选/入库不应无条件自动化，Coverr回调403仍未解决 |
| 素材理解/片段索引：有适配器与受限实测 | `videoseek.py::retrieve`，PySceneDetect片段记录，原Asset复用 | S；R：Video-Library-CPU-validation | CLIP检索不是整段动作理解，有限抽帧不是运动自然度证明；没有每片自动可靠的视觉语义模型 |
| 二次编排：已有但有明确人工输入边界 | `visual.assembleTimeline`消费Asset Proposal/Match或已提供timeline | S：一镜多个match时要求显式真实时间线，否则`SECOND_ARRANGEMENT_REQUIRED` | 一镜多片段的内容决策还不能凭统一CLI自动推导；无素材时不应退回整屏文字卡 |
| 视频底层＋叠加：已有真实短片/全片 | `RoutineRoot.Base`→`GLBackground`，`OverlayLayer`、`Caption`独立稳定层 | S；R：Production-v1.0与本期成片 | 通用overlay契约目前是text+rect+4种入退场，不是任意图形/图片/ROI/箭头；没有真实图像区域聚焦的通用消费端 |
| 字幕及动效时间：已有全局时钟 | 字幕`startSeconds/endSeconds`；overlay `fromFrame/toFrame`；`overlays.ts::validateOverlays` | S；R：句级来源/波形、字幕原文与时钟检查 | 缺少逐强调点的来源/置信度记录；现自动关键词常为scene.from+8到scene.to−8，不能称语义拍同步 |
| 转场：已实现选择与审计 | `transitions/select.ts::relationOf/selectTransitions`→`GLTimeline`；筛选VERIFIED、人工状态、参数/余量 | S；R：125登记、124技术通过，VP-008及后续渲染 | 给定元数据的规则推断不等于模型理解；18帧验证不能外推6帧；效果数量已不是瓶颈 |
| Gate/有界修复：已实现 | `production/quality.ts::inspectQuality/qualityAndRepair`→`visual-mvp/quality.ts`、`frame_scan.py` | S；R：全帧解码、字形/DOM、安全区、控制帧、混音、一次修复 | 已测MAD不等于识别自然剪辑；闪烁审美/信息表达仍NOT_EVALUATED，缺切点语义与实际素材内容的成对审核 |
| 缓存/续跑：阶段级已实现 | `core.Engine.stage`按显式fingerprint与产物SHA；`media.renderPicture`有图片已导出后的probe-only续跑 | S；R：中断/变更策略/防篡改测试及部分真实复用 | **不是镜头级增量渲染**；Gate需要改画面时仍调用完整`renderPicture`，未有可复用片段拼接的通用实现 |

实际版本：Remotion及官方渲染包4.0.539、React19.2.3，Node24系列现有运行环境，FFmpeg6.1.1；依赖依据已检package/lock与运行记录，不升级来迁就外部项目。软件ANGLE SwiftShader＋libx264已有实测；新组件仍须验证最终导出，不能只看浏览器预览。

**本机能跑与公开仓库可从零复现也要分开。** 当前默认`transitions.catalogRef`指向`orchestrator/output/microsoft-veo-skills-20261028-vp010/transition-catalog.json`，该输出不上传；素材库部分测试还读取被忽略的`local-assets/library/index.json`和既有产物。集中同步代码不等于干净clone即可运行全部测试/生产。后续可把无私有素材的已验证转场元数据整理到版本化配置，并补合适的可公开测试fixture；本轮不搬目录、不生成fixture，也不把已有本机测试冒称干净环境验证。

[生产指南](../Production-v1.0.md)、[通用叠加契约](../../orchestrator/contracts/overlay-v1.schema.json)、[生产编排](../../orchestrator/src/production/cli.ts)、[二次编排](../../orchestrator/src/production/visual.ts)、[质量与修复](../../orchestrator/src/production/quality.ts)、[阶段缓存](../../orchestrator/src/production/core.ts)。

## 4. 项目比较与复用决策

全部“可复用”均指许可及接口审查后的候选，不是本轮已接入。表中S/D不表示导出成功。

| 项目 | 实际形态/主要增量 | 依赖、许可与代价 | 适配与决策 | 证据 |
|---|---|---|---|---|
| video-shotcraft | Agent流程＋Markdown镜头卡＋Remotion示例；用途/能量/时长/参数/禁忌组织较完整 | Apache-2.0；示例另有品牌/音效归属；模板Remotion4.0.484、TS6.0.3，非我们的版本 | **优先少量配方结构和2D聚焦方法**，不整装产品宣传风 | S/D，静态预览已看 |
| video-use | Agent剪辑说明＋Python EDL/字幕/叠加实际渲染 | MIT；FFmpeg/libass；转写用ElevenLabs Scribe云API；Manim可选 | **复用时间映射思路与切点复核**；不替换现有时间线/已验收配音 | S/D |
| ffmpeg-skill | 42个工具的CLI/MCP契约、FFmpeg执行与验证 | MIT；Python≥3.10/FFmpeg≥6.1；本地工具本体不需云凭据 | **仅补已证明缺项**，大部分现有能力足够，不再部署整套MCP | S/D |
| Herk Edit Kit | 教学/Agent工作流＋406卡登记＋HyperFrames/GSAP卡片 | 原作MIT＋使用声明；第三方资产另算；Node≥22，锁HyperFrames0.7.109 | **借鉴tier/slots/共享tokens/分层结构**；暂不引入第二渲染器 | S/D，卡源与预览索引已读 |
| video-talkcraft | 中文口播语义/选卡/时间脚本＋Remotion卡/审核规范 | PolyForm Noncommercial1.0.0及作者商业许可要求；Remotion4.0.519/React19.2.8；CPU ASR也需额外模型 | **方法参考；未授权不复制工具、配方、模板** | S/D，静态预览已看 |
| Remotion官方Skills | 指南/规则资源，不是新Director或效果引擎 | 所查仓库无独立LICENSE、package无license字段；SDK许可另核；当前4.0.540 | 读文档校准即可；**默认GPU转写示例禁用**，不需要全量安装 | S/D |
| HyperFrames | HTML/CSS/GSAP确定性渲染框架及CLI，另有Studio/云端路径 | Apache-2.0；Node≥22、浏览器/FFmpeg、GSAP独立许可；当前CLI0.9.7 | 软件渲染/缓存与预检有价值，但会添HTML时间线和第二渲染器；**暂缓** | S/D |
| chengfeng-videocut-skills | 面向独立Product Runtime/Studio的业务Skill与MCP包装 | Apache-2.0＋NOTICE；Node≥20；固定Runtime安装/服务/EDL能力契约 | 其产品拥有唯一时钟的边界可参考；**不引入另一个剪辑产品与常驻服务** | S/D |
| OpenMontage | 多流水线/Agent生产系统、provider路由、分析工具 | AGPL-3.0；多种本地/云端服务可选，API/模型另有费用许可 | 清晰失败而不静默换provider可参考；对当前任务整体过重，**暂缓** | S/D，简筛 |
| anything2explainer | 稿件到全屏科普/结构动画的Skill/Remotion模板 | 非商业许可＋作者商业授权；字体独立OFL | 会向图解路线偏移且许可受限，**只研究质检方法，不接入** | S/D，简筛 |
| OpenChatCut | 聊天/桌面编辑器＋项目/媒体/时间线/渲染CLI | AGPL-3.0；独立应用/前端及provider体系，不能按“开源”免除义务 | 与现有流水线职责重叠，**暂缓整套引入** | S/D，简筛 |
| drama-skills | 短剧的编剧、角色一致性、分镜/生成提示工作流 | MIT工具；生成服务、原著和素材另有权利/费用 | 更接近Script Agent与短剧，不适配冻结口播；**不引入** | S/D，简筛 |
| seedance2-skill | Seedance提示词写作指南，非视频编辑器，也非已实现下载/生成API客户端 | MIT指南；实际模型/服务权利另算 | 与当前真实素材＋CPU路线无直接增量，**不引入** | S/D，简筛 |

“Generative Media”无法凭名称唯一识别，本轮未认定其仓库，也未把以上任意项目改称该名称。

## 5. 五个重点项目深查

### 5.1 video-shotcraft：最值得迁移的是表达与实现之间的索引

固定版本的实际链路：用户/产品需求→功能映射→Agent扫描卡片frontmatter并说明选择→帧预算/素材计划→真实页面采集→阅读选中demo及依赖→Remotion成片→独立终检。`references/pipeline.md`明确最终素材按已确定表达采集，并禁止拿手搓UI替代要复刻的真实页面。**不存在本轮已确认的、输入Excel就自动完成语义匹配的可执行总选择器**；核心选择仍由Agent执行说明。[pipeline.md](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/pipeline.md)

抽查以下五条，均核对了说明、示例TSX及其引用；前两条查看了上游海报；Changelog另取得已发布5秒/约1.74MB预览并CPU抽取首中尾，构图及目标行与源码相符，但不作为我们运行组件成功的证据。另两条只追踪Gallery条目/示例源码，没有观看动态预览，不写为观感通过。

| 配方/用途 | 真实实现及预览关系 | 可取之处、适配与限制 |
|---|---|---|
| `cursor-flyover`：截图/界面巡览 | `demos/camera/cursor-flyover/CursorFlyover.tsx`，海报是作者自己绘制的仪表盘；CAMS/TARGETS表和CSS变换驱动，不是浏览器真实操作记录 | 拿目标框导出相机路径、放大后保留可读停留；示例2400×1500世界/1920×1080输出，竖屏须重标；不要复制演示点击/伪造我们已执行操作 |
| `scanline-annotate-focus`：证据标注 | 同名TSX以作者品牌页面为背景，扫描线/框选/标签有帧表；海报与代码的品牌页相符 | 优先迁移“已存在内容＋短标注”，不迁移全页逐块机器扫描和满屏标签；真实新闻关键句不需要装成AI已识别页面 |
| `scroll-brake-moves`中的`ChangelogScrollBrake`：滚动到重点 | 150帧示例与已发布5秒预览相符；首/中/尾由普通条目到v2.41目标行强调，程序绘制changelog，非任意网页播放器 | 只取先定位后停留的时间语法；新闻阅读应降低速度/模糊，不把演示版本号当真实资料 |
| `gauge-readout-moves`中的`NeedleSweepSelftest`：数字落定 | 三表盘、固定目标值、spring及帧函数；“System health”是演示内容 | 真数字可用轻量数值变化/静止结论；不能借自检表盘暗示实际系统检测，更不必整屏仪表盘 |
| `line-carry-transition`：有意义的图形接力 | 190帧完整场景演示，3840宽世界/绘线/相机连续移动；并非6帧通用视频转场 | 仅在前后确有图形亲缘时备选；卡片自述全片≤1次。普通办公镜头继续硬切，不塞进每个边界 |

源码及说明：[CursorFlyover.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/camera/cursor-flyover/CursorFlyover.tsx)、[ScanlineAnnotateFocus.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/effects/scanline-annotate-focus/ScanlineAnnotateFocus.tsx)、[ChangelogScrollBrake.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/data/scroll-brake-moves/ChangelogScrollBrake.tsx)、[NeedleSweepSelftest.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/data/gauge-readout-moves/NeedleSweepSelftest.tsx)、[LineCarryTransition.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/transition/line-carry-transition/LineCarryTransition.tsx)。

这些示例共享`demos/_fixtures/Polish.tsx`、`Fixtures.tsx`、`Brand.tsx`等，里面有背景/模糊/字体及品牌辅助，不是随手复制一个TSX就能复现预览。选择项主要可用2D CSS/SVG实现，无需新的WebGL引擎；库中其他3D卡不能一概外推为CPU低成本。直接作为Remotion组件叠加不需要透明视频中间文件。

模板4.0.484与我们4.0.539、React版本及TS版本不同，本轮没有做兼容渲染。需要挑单组件适配，不应拷其package/lock覆盖生产。终检清单要求输入缺失时写无法验证，但独立Agent审查仍需真实可用的模型/人，不是脚本自动验证自然度。[final-review.md](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/final-review.md)

许可：根Apache-2.0适用于原作代码/文档；保留许可证、版权和适用NOTICE/ATTRIBUTION，改动应留说明。音效、赞助/品牌/截图资源有单独出处，不因主许可自动获得全部商业素材权利。[LICENSE](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/LICENSE)、[ATTRIBUTION.md](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/shots/ATTRIBUTION.md)。只复制必要组件也要履行对应义务。

### 5.2 video-talkcraft：语义拍和分层有价值，默认强制规则不适合照搬

输入可以是中文稿＋成品配音；CPU字时间脚本→`semantics.json`→素材/选卡候选→SHOTBOOK/分层→Remotion/叠加/审核，是最接近口播的参考。`semantic_annotate.py`会生成骨架/词法提示并检查文本、时间、主/陪衬标注，**语义值仍需要填写**；`card_match.py`按已提供语义和素材输入类型过滤、排序，最终卡由Agent定案，不是模型自主识别实景的证据。[semantic_annotate.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/semantic_annotate.py)、[card_match.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/card_match.py)

可借鉴的通用方法：主句允许新主体，陪衬句只让既有主体变化；新信息出现前旧强调退出或退到次级层；有截图/录屏才选需要这种输入的卡；“证据、数字、对比、结构”的表达需求不能被无意义装饰替代。**我们应检查表达是否被真实画面承担，不要求每句都上一张卡。**

字级同步不能只看名称：`timestamps_cpu.py`的CPU ASR结果经过繁简/拼音匹配，未命中字符及拉丁段会插值，低匹配率需复听；它不是每字都有声学强制对齐真值。所列Apple CPU耗时/误差是作者自报，未在本机运行；FireRed/Whisper/Qwen的模型许可也须另核，不能自动下载。我们可先复用现有句级合成来源/CPU ASR，只为确需落字的少数强调点提供人工确认锚点，不改冻结字幕。[timestamps_cpu.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/timestamps_cpu.py)、[make_timing.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/make_timing.py)

`layout.md`、`shot-design.md`将主体/背景/文字分层；`review-protocol.md`要求检查最终成片锚点及高风险三连帧。透明层/分段渲染可减轻修改成本，但WebM alpha或中间片段仍须处理PTS、帧边界、背景与字体一致性。已有Remotion层能直接叠加时，不必多走透明编码。示例`evidence-scroll-tour.tsx`以固定几何和示意合同条款展示滚动，不是会自动抓真实新闻的组件；它默认960×540，不是可直接套竖屏。[evidence-scroll-tour.tsx](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/template/cards/evidence-scroll-tour.tsx)

必须拒绝照搬的强制规范：其审核把素材“裸贴”、未使用承接卡列为缺陷，并要求每个边界作转场处置、禁止连续1秒全静止、静息帧相机仍需运动等。其cinematography.md更明确禁止裸切，这与我们普通叙述优先硬切的已确认原则冲突，不能成为默认规则。否则会重现卡片过多、持续运动和过度包装。我们保留真实视频可直接承担表达、阅读时允许稳定静止、硬切优先。[review-protocol.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/references/review-protocol.md)、[cinematography.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/references/cinematography.md)

工程：统一runtime锁Remotion4.0.519、React19.2.8，并包含GSAP、three、anime等；与本仓4.0.539不同，不能直接软链其runtime。模板、静态预览和源文件能确认结构，未确认每种alpha/分段方案在本机可导出。

许可是硬限制：根LICENSE为PolyForm Noncommercial1.0.0，说明商业使用toolkit须事先授权；“输出视频属于创作者”不等于商业使用工具无须授权。原作代码、卡片、模板/文档不能直接并入商业流水线；图标、声音和人像素材又有独立条款。**目前只总结一般方法，若要直接复用须先取得明确授权，不能靠改名或改写逃避义务。** [LICENSE](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/LICENSE)、[THIRD_PARTY_NOTICES.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/THIRD_PARTY_NOTICES.md)

### 5.3 video-use：时间映射代码比整套剪辑规则更适合我们

实际代码`helpers/render.py`：EDL切出source片段→分段编码→concat→叠加→字幕最后；`build_master_srt`把选中词的源时间减片段起点、再加输出累计偏移；`build_final_composite`为叠加`setpts`加`start_in_output`，防止窗口开始时动画已经结束。存在真实字幕/帧率/方向测试源码，本轮未运行。[render.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/helpers/render.py)、[test_render_captions.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/tests/test_render_captions.py)

适用边界：用于真实源音频被剪掉的场景时，EDL重映射有必要；**连续已验收旁白上单纯换画面时，音频根本没有剪，不应应用同一剪辑/淡化逻辑。** `extract_segment`默认每段两端30ms音频淡化，会对我们逐镜不断音旁白制造不必要的电平起伏。我们应仅在确实改变音频来源/剪接的位置检查波形和接缝；用户要求保留完整原声的片段不得擅自修剪或淡出。

云端转写：`helpers/transcribe.py::call_scribe`上传16k单声道音频到ElevenLabs Scribe，需API key，不是无条件本地离线；已有转写文件可缓存，但按输出存在复用不等于我们的强SHA缓存。Python项目另有requests/librosa/numpy/pillow等，Manim可选。原有配音、字幕和CPU路径已经够用，不引入新上传。

本地编码为libx264/AAC，支持竖屏方向与按高度缩放到1920，但不保证任意原画幅都得到1080×1920，还需明确fit/crop；字幕默认英语短词块、Helvetica与大写策略并非中文默认方案，libass中文字体另测。`grade.py`是亮度/对比/饱和度等数学分析及受限调色，不是“AI画质评审”。

SKILL要求对**最终输出**每个切点±1.5秒做图像/波形复核，并最多3轮审查；这是Agent流程指令，不是已经实现的自动视觉评分器。我们只取“每个切点成对证据”，保留原Gate每问题最多修复一次，不导入3轮重试政策。[SKILL.md](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/SKILL.md)、[grade.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/helpers/grade.py)

MIT代码可按保留声明等条件复用；示例视频、音乐、字体及ElevenLabs服务不因MIT而一并授权。没有必要为了两个有用的时间公式引入第二套EDL事实源；映射作为原timeline的派生审计记录即可。

### 5.4 ffmpeg-skill：值得参考契约治理，现有FFmpeg能力多数无需替换

其`_contract.py`从实际脚本的argparse提取input_schema，人工维护无法从parser推导的工具角色、组件与验证策略；`tests/test_contract.py`检查工具/MCP/文档一致性。**不是输入契约一存在就完成业务验证，也不是完全无人工维护的schema生成。** 当前文档contract2.0/skill3.1.1，要求Python≥3.10、FFmpeg≥6.1，与本机版本范围表面匹配，未做导入/执行兼容验证。[contract.md](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/docs/contract.md)、[_contract.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/_contract.py)

| 功能 | 我们的真实对应 | 具体增量/取舍 |
|---|---|---|
| probe、裁切、叠加、混音、循环、loudness | `media.ts`、`audio.py`、素材预处理/已有索引 | 已有且有成片证据；不重复包CLI/MCP |
| black/freeze/silence及成片验收 | `frame_scan.py`、`quality.ts`及已有FFmpeg日志 | `check.py`对未知平台/未测项目显式WARN可参考；不把其平台阈值直接套视频号 |
| `cropdetect` | 我们有9:16真实构图预览与主体保护区 | 它主要发现黑边/内容边界，**不是语义主体追踪器**，不能自动证明人脸/屏幕不被切 |
| contract/doctor/退出码一致性 | 我们有schema、阶段状态、Blocked与哈希 | 若未来CLI数量明显增长，可借鉴从parser校验契约；当前单生产入口无需另包42工具 |
| 切点自然度、证据是否对应观点 | 仍须模型或人工 | ffmpeg-skill也不能从解码/SSIM/黑场等数学指标确定；不会因此解决导演判断 |

`check.py`检查最终媒体的尺寸、响度、黑/静/音频异常/可选对比；`verify.py`会对用户提供的真实媒体运行裁切、9:16填充、字幕、叠加、响度和导出等工具链兼容性检查，不能混称最终成片语义验收。部分结果依赖用户给平台/目标值，未知不能算PASS。源码有超时/错误结果契约，但未确认和我们每问题一次修复等价，不替换现有修复预算。硬件编码/设备探测路径必须显式避开，不能执行默认doctor来“顺便”触碰GPU。[check.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/check.py)、[verify.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/verify.py)、[cropdetect.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/cropdetect.py)

MIT代码候选可按许可局部复用；ffmpeg构建所含组件、第三方字体/音效和所处理素材许可各算，不因“本地无key”全部可商用。

### 5.5 Herk Edit Kit：支持层与接管层的组织优于风格照搬

真实结构是Agent工作流、共享编辑脚本、HyperFrames HTML卡片与生成registry；`style-library/registry.json`登记2种style、406卡，style状态仍有draft。Guide分tier1全屏接管、tier2透明支持层和custom，记录purpose、slots、相对依赖及共享tokens。Agent按风格/tier/purpose查目录并填槽，不是输入旁白后由代码自动选出最合适卡。[GUIDE.md](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/GUIDE.md)、[registry.json](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/registry.json)

具体抽查`t2-lb-magnify.html`、`t2-lb-spotlight.html`、`t1-stat-quote.html`：卡是1920×1080的HTML/CSS，GSAP暂停时间线挂到`window.__timelines`，从tokens.css取色/字/缓动，依赖相对CSS、GSAP加载和可能的字体网络请求。**magnify卡的放大内容是`term`文字槽，不是底层真实截图的像素区域**；要实现工具演示ROI，还需要我们已有媒体层的真实裁切/相机消费端，不能声称复制这张卡就能放大真实界面。[t2-lb-magnify.html](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/01-vox-explainer/cards/tier2/t2-lb-magnify.html)

tier2透明是HTML合成层的透明，不要求先导出alpha视频；如留在Remotion，可只移植布局/slots/tokens思路，用同一个组件树叠加。若直接使用原HTML，则要HyperFrames运行时或额外iframe/中间文件路径，增加第二时间线、字体/浏览器和缓存验证成本。

`validate-beat-sync.mjs`真实解析组合时间和data-anchor，检查锚字相对beat启动的时间窗，默认允许约0.2秒晚入到1.8秒提前，并能给建议时间；它并不等价于字级帧精确、也不评判动效落点是否讲清观点。`preflight.mjs`偏HTML根、暂停timeline、引用和可预览条件；作者`docs/VERIFICATION.md`明确406资源索引/语法检查不代表全部重渲染。[validate-beat-sync.mjs](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/scripts/validate-beat-sync.mjs)、[preflight.mjs](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/scripts/preflight.mjs)、[VERIFICATION.md](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/docs/VERIFICATION.md)

原作MIT＋`PIPELINE-USE-PERMISSION.txt`允许按条件制作个人/商业视频；保留声明。第三方GSAP、Google Fonts、品牌/成品样片/声音另有许可，Vox/Kallaway只是参考风格名，不是品牌授权。依赖锁HyperFrames0.7.109、GSAP3.14.2、Node≥22，当前HyperFrames源为0.9.7，未做版本互通验证。对9:16和中文须重新排版、字体离线化及最大长度检查，不直接缩放1920×1080卡。[LICENSE](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/LICENSE)、[PIPELINE-USE-PERMISSION.txt](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/licenses/PIPELINE-USE-PERMISSION.txt)、[THIRD_PARTY_NOTICES.md](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/THIRD_PARTY_NOTICES.md)

## 6. 定向与简要项目的补充判断

**Remotion官方Skills。** 当前目录已迁移到`skills/remotion-best-practices/...`；按旧`skills/remotion/rules`路径会失配。可参考SRT导入、确定性时间/层次规范；我们已有parser与稳定字幕层，不必替换。当前`transcribe-captions.md`明确采用`@remotion/whisper-webgpu`，需兼容GPU，不符合STOP，禁止照示例安装运行。仓库没有独立LICENSE、package未标license，SDK许可证又独立，按官方阅读文档处理，不能默认为MIT组件库。[transcribe-captions.md](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/skills/remotion-best-practices/remotion-captions/transcribe-captions.md)、[REFERENCE.md](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/skills/remotion-best-practices/remotion-license/REFERENCE.md)

**HyperFrames。** HTML/CSS/seekable GSAP→确定帧捕获→视频，不是素材Agent。CLI有缓存、resume、分段及软件/硬件选择；当前浏览器GPU默认为auto，编码GPU默认为false，纯CPU不应只关编码GPU，还须显式禁用browser-gpu。`assertSwiftShader`读取实际WebGL renderer并拒绝非软件后端，是有价值的防漂移检查思路；不代表每个默认路径都自动如此，也不意味着可替我们GPU STOP放行。它的本地路线可与云端/Studio分开，但这仍要引入HTML组合与另一渲染系统，暂不值得。[render.ts](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/packages/cli/src/commands/render.ts)、[assertSwiftShader.ts](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/packages/engine/src/utils/assertSwiftShader.ts)

**chengfeng-videocut-skills。** Skill只负责语义与受约束调用，Product Runtime拥有媒体、EDL、项目、唯一时钟及Studio，边界清楚。但当前契约要求具体release/能力、受管服务和健康/兼容分开检查，并有跨平台门禁；本仓没有必要为了借鉴其剪口播或字幕规则装另一个Runtime。Windows支持/预检源码不等于我们WSL→Windows集成已验证，不能绕过其版本安装边界。[runtime-and-product-contract.md](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/a33b43e08c34fa8beeb5e78498e852f4e80975a5/plugins/chengfeng-videocut/references/runtime-and-product-contract.md)

**OpenMontage / OpenChatCut。** 已读README、LICENSE和少量实际pipeline/validator或CLI源码；两者均AGPL，独立工程/时间线/provider边界与我们重叠。AGPL不等于禁止商业使用，但修改、分发、网络服务等义务须按具体集成方式核对，不能当MIT式任意拷贝。OpenMontage有可选本地FFmpeg/本地或付费生成provider，并非全部必须上GPU；不因provider文档有某模型名字就认定模型可用、价格有效或本机可运行。OpenChatCut的`cli/commands/render.ts`实际复用其服务器的Remotion导出，并非完全不同的底层渲染技术；但它消费自己的项目document/媒体存储，不是我们的AssetMatch/timeline消费者。未发现足以抵消迁移成本的本轮独特增量，停在简筛。

**anything2explainer / drama-skills / seedance2-skill。** 前者有图解模板和自检脚本，但非商业约束且表达方向容易回到全屏科普；后两者分别面向短剧创作/一致性与Seedance提示词，不能代替冻结Excel→真实素材的当前生产。MIT只覆盖相应原作工具/指南，不覆盖原著、模型、服务及示例素材；作者生成费用/性能均未采纳为本机承诺。没有借“生成式媒体”标签引入第二视频模型。

**跨平台与中文竖屏边界。** Python/Node与浏览器/FFmpeg路径理论上可覆盖WSL/Linux，Windows文件路径、libass字体、大小写和缓存位置仍要分别验证。shotcraft、Herk抽查卡均以横屏固定坐标为主，talkcraft声明支持竖屏但抽查demo也是横屏；不能把引擎可设1080×1920当作卡片已完成中文竖屏适配。ffmpeg-skill能fit/pad也不等于主体语义裁切已通过；video-use保留画幅的缩放仍须复核最终尺寸。我们已有中文字体与软件渲染证据可复用，新字体/blur/3D效果的导出成本仍是U。Herk自报Windows验证只适用于其记录版本，不外推本机。

维护判断仅依据固定commit日期、可读源码/测试及作者明确的已知坑；未进行issue复现，未把star数、最近提交或漂亮预览当成熟度证明。详细版本与许可证据见索引。

## 7. 三类真实镜头的纸面适配

### 7.1 新闻证据：原文片段先出现，关键句再聚焦

- **当前做法：** 本期第3镜7.233—10.7秒，用Felix真实标题截图contain＋来源短标注；已有`felix-excerpt.png`真实段落截图和capture.json，原页面HTTP200记录日期为11月2日，非微软公告/非公司统一政策。截图当前可核对，不假称本轮重新取证。
- **具体增量：** 借shotcraft的定位/停留/局部框选，用真实段落替代只显标题，让观众看见支持观点的那一行；先读清再退出，不扫描整页、不模拟鼠标点击新闻。
- **接线位置：** 仍由Brief表达“证据”、AssetMatch指定真实图片，Director给原timeline场景增加源像素ROI/关键帧；`RoutineRoot.Base`消费聚焦相机，稳定Caption仍在最上层。
- **最少新增：** 一个源像素坐标ROI、可选少量相机关键帧/停留；绑定实际渲染媒体（原件或已有renderPath派生件）的SHA、尺寸和坐标空间，不混用原图与竖裁派生件坐标。仅契约当前不支持的字段进入小版本扩展，不向Asset塞入本期观点文本。
- **复用：** 已有截图、sourceURL/hash、素材许可状态、crop/保护区、时间线、字体/字幕与Gate。不需要新截图服务或透明视频。
- **回退与验证：** ROI越界/分辨率不足则用完整原截图contain，缺截图则明确缺口，不重画公告。测像素清晰、关键句入画、字幕不冲突与时钟不变；人工核“是否确实支持该观点、是否读得完”。新闻截图公开使用许可仍单列，不由镜头效果洗白。

### 7.2 工具演示：真实录屏中找动作，不替它编造动作

- **当前做法：** 本期第2镜3.767—7.233秒和第5镜15.633—20.433秒，是实际编辑器输入/选择/滚动录屏，Base放入竖屏可见区域，关键词在下方；它不是已验证的AI产品自动执行。
- **具体增量：** 借cursor-flyover的目标与相机解耦；只跟实际录屏已经发生的选择/编辑区域，必要时短箭头或框，操作时让说明文字退出。Herk magnify不能直接承担这个功能。
- **接线位置：** AssetMatch保留源片段，Proposal返回已检查的主体/叠加区域，Director用同一timeline给Base指定ROI；OverlayLayer消费短解释。相机只作用背景视频，不作用字幕。
- **最少新增：** 与新闻共用ROI/关键帧语义；首轮不新增真实鼠标模拟、OCR、自动主体追踪或WebGL。图形overlay若必须加种类，扩展现有schema及validateOverlays，不并行造第二套标准。
- **回退与验证：** 找不到可读区域则contain保留全界面或承认缺真实操作素材，不造UI。检查9:16主体保留、最大放大倍率/源清晰度、读字停留、实际操作先后、音轨与字幕SHA不变；自然度由人观看。

### 7.3 观点口播：实景承担情境，文字只承担必要区分

- **当前做法：** 实景＋OverlayLayer关键字，按场景起止偏移自动入退场；复杂编排可以资源timeline人工供给。
- **具体增量：** 参考主句/陪衬句、tier2支持层和共享tokens，让“需要”和“学的重点变了”分时出现，上一项说完让位；不把每个抽象词做成全屏卡，不强制持续推镜。
- **接线位置：** Brief提出表达意图，Asset Agent仍先匹配有意义的实景，Director产出overlay时间和简短文案，OverlayLayer沿用蓝紫风格；转场Selector不因加字而增加特效。
- **最少新增：** 对确需强调的少数元素增加可审计的anchor引用（句ID、时刻、来源/精度），输出仍是现有fromFrame/toFrame；无可靠词锚就句级显示，不自动插值冒充字对齐。
- **回退与验证：** 无合适实景保留素材缺口；没有可靠锚点保留现有简短静态支持层或不加字。确定性核重叠、时长、保护区及正常字幕完整；人工核是否帮理解、抢人声或像广告。

## 8. 最小增量接入建议（本轮未实施）

| 生产者 | 必要新增/复用 | 消费者与边界 |
|---|---|---|
| Director首次Brief | 先复用visualIntent、overlayText、preferBase、requiresClearReading，必要时少量表达标签 | Asset Agent先匹配素材，不让搜到什么决定讲什么 |
| 既有Asset Agent | 复用source range、crop建议、overlayZones/protectedRects、许可与人工状态；没有证据就留空 | Director二次编排按实际素材过滤配方，不能把CLIP分数当主体理解 |
| Director二次编排 | 小配方索引：稳定ID、用途、输入需求、建议时间/强度、禁止场景、源码/许可与验证状态；首轮只2–3个配方 | `assembleTimeline`，最终仍是scene/overlay/transition，不建立配方自己的主时间线 |
| 相机/叠加参数生产者 | 仅在实验1批准后提源像素ROI及少量全局帧关键帧；仅在实验2批准后提anchor来源 | `RoutineRoot.Base`、`OverlayLayer`与overlay schema；当前文本契约严格，不可直接塞未知字段后宣称支持 |
| Gate | 复用解码、保护区、实际字形、原音频/SRT、控制帧与一次修复账本，增加ROI边界/落点及切点窗口证据 | 确定性问题一次修复复检；语义/构图/自然度没模型或人审则NOT_EVALUATED |

不新增数据库/Agent服务/第二素材事实源，不全量搬124或406卡。沿现有转场稳定ID和技术/人工状态分离的经验管理配方，但不把转场VERIFIED直接继承为配方VERIFIED。代码抽查、预览可看、1080×1920最终导出分别记证据。

**阶段缓存不等于局部重渲染。** 后续若要改某个组件仍可能全片重渲染，先只用20–30秒独立A/B输出降低成本。分段渲染会引入跨段转场、音轨、字幕和帧边界风险，不能作为本轮顺手建设项目。保留现有whole-picture缓存/probe续跑，暂无证据要求马上引入另一引擎的segment cache。

## 9. 最多三个后续实验候选（全部未执行）

共同素材基线优先为已获整体认可的《AI编程还需要学吗》0—25.4秒（762帧）。真实timeline已核：新闻7.233—10.7秒，录屏3.767—7.233及15.633—20.433秒；不会触碰第9镜完整原声。原第6句字幕结束25.1705秒、第7句开始25.5981秒，25.4秒处处于两句之间，避免26秒截入下一句。该本地成片/素材位于被忽略输出目录，不随报告上传。为每实验固定同一音频、字幕、BGM、尺寸/FPS、素材区间、切点与转场，仅改变指定变量；不得趁机执行下期BGM增益优化，否则A/B混杂。

| 优先级与假设 | 只改什么/最小实现与依赖 | 检查、成本、停止/回退、用户产物 |
|---|---|---|
| **1 真实证据聚焦**：原文关键句比标题＋普通推镜更能支持观点 | 同段25.4秒，两版第3镜都统一使用已有真实excerpt：A静态contain，B只增加ROI聚焦/框选，避免标题换段落与运动两个因素混杂；原成片仅作现成参考。无需外部服务，最多一个2D组件/原schema最小扩展 | 技术：原音轨/SRT/帧数、ROI入画、中文说明/英文原文可读、安全区、来源不变。人工：关键句是否支持观点、停留是否够、是否比A清楚。成本：独立25.4秒两版，复用原片素材/音频/字幕缓存但不声称A可直接复用原标题版；组件导出失败或模糊则一次回退contain，不换素材补洞。看A/B MP4及新闻段首/重点/退出帧，再决定是否值得推广 |
| **2 强调点与让位**：少量句内时序比整段关键词常驻更自然 | 仍用同段25.4秒原版；仅对1–2条已有短文字改入/落定/退场，不改底层镜头与转场。复用现有4种动画；优先使用已记录句级边界或人工核准锚点，不装新的ASR或借受限代码 | 技术：冻结文本/字幕与音轨不变、时间边界/保护区/正常字体。人工：声音说到时是否相应强调，是否抢注意力、是否更易理解。成本：只改JSON及很小anchor审计；无可靠锚点或需要改稿则停止该元素；失败回原时间。用户看同段A/B及锚点表，不以动画数量评分 |
| **3 切点窗口审核**：成对证据能否比接触表更早发现不自然衔接 | 对同段25.4秒只增加最终成片切点前后窗口/波形证据与审阅表，先不改变任何画面。复用既有FFmpeg/控制帧/日志；不运行外部Skill，不上传音频 | 技术：每个切点/短overlay实际窗口覆盖，区分视觉切换和音频剪接；未知主观项NOT_EVALUATED。人工：是否更容易定位具体问题。如果无问题，不为凑B版硬改；若发现一个真实问题，仅做一次局部配置修复再导出该25.4秒B版。误报泛滥、不能定位或需新增素材则停止，不建评分平台。用户看定位表、原窗口及至多一个修复A/B |

以上是计划级成本范围，不是本机新性能承诺；不承诺提高到某个分数。实验1与2分别进行，不能合并后把改善归因给某一因素。

## 10. 待决问题与最终取舍

- **建议复用候选：** shotcraft原作Apache代码/参数结构中适配真实截图的少数组件；video-use MIT的时间映射/审核工具思路；Herk原作许可允许的slots/tier/tokens组织。直接拷贝时逐项保留许可与归属，真正接入前做单组件实导出。
- **仅参考：** talkcraft语义拍、主/陪衬、让位及审核覆盖方法；anything2explainer一般自检方法。商业授权未取得前不移植它们的代码、配方文本或模板。
- **暂缓：** 独立HyperFrames渲染器、chengfeng Runtime/Studio、OpenMontage/OpenChatCut整平台；ffmpeg-skill全工具/MCP；Seedance/短剧和新增GPU/CPU视频模型方向。
- **待核清：** Remotion Skills独立许可范围、所选示例字体/音效/品牌素材权利；各版本是否能在我们4.0.539与SwiftShader下导出；中文竖屏长字/ROI源清晰度；需要强调到哪一级时间精度；新闻截图公开许可；Coverr回调403。不能通过技术测试替代这些决定。
- **未做：** 新安装、第三方动态预览重渲染、外部模型/API、付费服务、性能基准、全部卡片/Issue审计。作者Windows或CPU数字只作原项目证据，没算为我们实测。

**建议先阅读第1、7、9节，再决定是否只批准实验1。** 当前最有价值的变化是让真实证据和实际操作看得清、讲得明白；增加特效数量、重做Agent平台或换整套渲染器没有足够收益证据。
