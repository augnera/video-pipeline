# VideoPipeline 进度

## VP-009｜Day9 完整混合视觉成片

- 状态：已收到持有人观看反馈，整体约60分（原话“60分钟”）；Remotion部分太多、部分转场不自然，需要改进。自动Quality Gate WARN仍为技术记录，未公开发布。
- 10镜→17段，1080×1920 /30fps /2514帧 /83.8秒；原83.771564626秒配音和45条字幕原文/时间完整保留，帧取整差28.435ms。
- 现有四项索引素材复核；两段实景各取两个不重叠片段，AI首帧2.5秒后切动态；第5镜复用原动画并隐藏品牌，其余缺口用明确的概念图解补齐，不伪造真实产品UI。
- 沿用VP008 VERIFIED目录和规则模式选择审计，9处试用GL过渡、7处硬切，强效果1处；实际背景对照检查通过。
- BGM AI科技新时代1.mp3，+3dB为本轮默认试听（非人工已验收），4次复用/1秒交叉淡化；AAC-18.9LUFS/-3.2dBTP，无削波；弱语音窗口最小优势6.52dB，保留WARN。
- Gate自动8PASS/2WARN/0FAIL；后续人工整体反馈约60分。图解64.57秒约77%，真实实景16.73秒约20%，图解占比与部分转场自然度已被持有人指出；其他未评价项仍待定。39测试及类型检查通过，全片空白/近黑/纯黑边和45条字幕实际字形检查通过。
- 修复非GL错误被目录名误判导致硬切问题；恢复Director计划后重渲染，初始失败证据保留。独立探针冷启动超时后核验并复用同次成功全片导出的真实控制帧，不伪称新浏览器通过。
- 原输入及VP008成果哈希未变，未升级依赖，未启动Wan/GPU模型、重下载素材或发布。
- 成片：[day9-full.mp4](orchestrator/output/day9-vp009/day9-full.mp4)
- 报告：[VP-009](docs/reports/VP-009-Day9-Full.md)
- 下一步建议：优先补真实匹配素材、降低图解占比；简化转场并先做局部对照。已记录反馈，未自行重渲染全片。


## VP-008｜GL Transitions 库与 Visual Director

- 状态：本轮可审核交付完成，等待持有人观看；人工视觉评价 NOT_EVALUATED，未发布。
- 本文件开工时不存在，本次新建。
- 本地基线：`main` / `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`；领先已核对的 origin/main 9 提交。原未提交成果、移动/删除状态均保留，未提交/推送。
- GL Transitions 2.0.0 / 官方源码适配1.0.0，固定 commit `0efa1651dfdbc0cdbd57f4cda55f12d8b3dbc0c5`。隔离锁定依赖，原生产 package/lock 不变。
- 全量125种已处理：VERIFIED124、FAILED1（TangentMotionBlur端点残留）、BLOCKED0、待验证0；人工NOT_EVALUATED125、其他评级0。10卷图鉴及完整索引已输出。
- 规则 Visual Director 按元数据过滤/评分/重复与强度约束，JSON衔接现有时间线；自动调用仅VERIFIED，未评价效果标试用；正式模式保守。
- 最终样片18.2秒、1080×1920/30fps/546帧，SimpleZoom → DirectionalWipe → ZoomWipeLeft；音轨逐字节复用原+3dB档；保护输入哈希全未变。
- 既有8项Quality Gate加GL扩展共9项自动PASS；主观/人工仍NOT_EVALUATED。33项必要/回归测试、类型检查、5种真实素材组合、真实失败降级与复现测试通过。
- 边界：未启动Wan/GPU推理，未改原始配音、字幕、Excel、BGM策略，未下载素材或扩展完整Day9，未公开发布。
- 报告：[VP-008](docs/reports/VP-008-Transitions-Library.md)
- 样片：[sample.mp4](orchestrator/output/day9-vp008/sample.mp4)
- 图鉴：[preview-index.md](orchestrator/output/day9-vp008/preview-index.md)
- 下一步：仅等待人工观看和效果评级；结束本轮执行。


## 2026-10-28｜VP-010 微软离职邀约与技能保值：私人审阅成片

- Day9返工暂停；独立episode `microsoft-veo-skills-20261028`，未覆盖Day9/VP-008/009。保留main HEAD `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`及原脏工作区；未提交或推送。
- 真实附件 `docs/scripts/微软离职邀约_技能保值_分镜脚本.xlsx`：仅A1:K26导入25镜，后续10行非空内容存为元数据；原文顺序不变。
- 核对微软官方、年报/SEC及GeekWire：约6万为符合条件人数、27%基于历史223000员工分母，非实际离职；只涉及参与团队与规定四国。原Reuters访问失败如实记录，AI投入不画为替代因果。
- 已有获准IndexTTS2配置生成本稿新配音134.145533秒；31条真实合成句级/波形字幕，不宣称字词强制对齐。未复用Day9旁白。
- 完整私人审阅MP4：134.966667秒、1080×1920、30fps、4049帧（含0.8秒片尾）。34段视觉，动态实景45.22%、真实录屏41.76%、新闻资料5.11%、全屏图解7.90%。真实VSCode编辑，不冒充AI测试/微软内部系统。
- 初始3处效果经真实编码帧Gate检查，将同蓝底章节间低对比擦除局部8帧降为硬切；最终31硬切（93.94%）+2叠化（6帧）。保留原候选审计及一次降级记录。
- BGM指定 `AI科技新时代1.mp3`，+3dB本轮试听未获人工选档；6次铺接/1秒等功率淡化，AAC约-19LUFS/-3.9dBFS，无削波。22–25与45–48秒能量差提醒待试听。BGM授权待核实。
- Quality Gate：自动6 PASS/4 WARN/0 FAIL；主观NOT_EVALUATED。两类问题各修复一次（长字幕字号、单切点硬切），复检通过。原件SHA保持，25镜与31字幕覆盖、全帧解码/空帧黑边代理检查通过；22项选择/Gate测试通过，10素材28匹配契约通过。
- 许可：5条Mixkit Free，2条机房Restricted仅私人非商业审阅，不可直接公开/商业发布；新闻短标题无整页公告伪造；素材人工审核均pending_human。重复使用与2.6秒源区间边缘重叠如实记录。
- 一次辅助控制帧浏览器冷启动88秒超时；严格核对原真实控制帧与未改变的源码、时钟、修复范围及SHA后复用，最终编码帧重检；未把超时当成功。未启动Wan/ComfyUI或新GPU模型、未升级依赖、未发布。
- 成片：[microsoft-skills-review.mp4](orchestrator/output/microsoft-veo-skills-20261028-vp010/microsoft-skills-review.mp4)
- 报告：[VP-010-Microsoft-Skills.md](docs/reports/VP-010-Microsoft-Skills.md)
- 下一步：停止制作，等待持有人一次完整观看，裁定视觉、转场、配音与音乐，不自动扩展或发布。


### VP-010｜开头配音局部修订

- 持有人反馈前5秒不连贯，并明确授权保留视频重做配音。仅原文前两句重新连续生成，使用原已获准IndexTTS2音色/配置；句间安全分段、保音高减速适配已有字幕窗口，未生成新画面。
- 新完整视频：[microsoft-skills-audio-revised.mp4](orchestrator/output/microsoft-veo-skills-20261028-vp010/opening-audio-revision/microsoft-skills-audio-revised.mp4)；[约8秒试听](orchestrator/output/microsoft-veo-skills-20261028-vp010/opening-audio-revision/opening-revised-8s.mp4)。
- H.264码流SHA与旧版完全相同，画面、烧录字幕、总时长134.97秒及4049帧不变；7.185533秒后原配音样本一致，7.25秒后混音PCM一致；BGM轨/增益不变，AAC真峰值-3.8dBFS、全解码通过。旧版及原件保留。
- ASR作为辅助线索，不宣称听感通过；新开头自然度及“保值”发音待持有人试听。生成后停止本次启动的已有TTS服务；无Wan/视频生成、无发布。


### VP-010｜持有人选版裁定

- 持有人试听新开头后反馈“效果还没有前一版好，用前一版了”。正式沿用换配音前的 [microsoft-skills-review.mp4](orchestrator/output/microsoft-veo-skills-20261028-vp010/microsoft-skills-review.mp4)。
- 新配音实验版标记人工REJECTED，文件保留对照，不继续修改；选版记录为本期 `holder-selection.json`。不推断发布质量或许可已通过。


## 2026-10-28｜根目录AGENTS.md项目规则固化

- 已新增 [AGENTS.md](AGENTS.md)。本轮只固化规则及索引，没有修改制作逻辑、重做视频、生成封面、启动模型、升级依赖或推送远端。
- 开工核实：仓库 `/home/chen/work/video-pipeline`，`main`，HEAD `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`；相对本地 `origin/main` 领先9、落后0，未请求远端更新。已有脏工作区及历史产物保留。
- 已读取本进度、现有 `docs/README.md`、VP-008/009/010报告及导入、VP-007、Day9全片、VP-010、转场、Quality Gate实际入口。现有README仍包含早期带货/SoVITS/ComfyUI方案，AGENTS明确其不代表当前默认链路或模型启动授权。
- **持有人最新人工裁定：VP-010视频及配套封面约65分，基本满足要求、可以发。** 正式选版仍为换配音前的完整视频，新开头实验不采用；此裁定覆盖先前“等待人工观看”的观感状态，但不删除历史检查、素材/BGM许可待确认记录，也不是本轮自动发布指令。
- **封面状态：** 持有人确认本次已单独生成配套封面；现有读取的制作报告/入口未证明封面已接入自动流水线，本轮不虚构其仓内文件路径或生成命令。
- 规则已覆盖冻结内容、事实边界、实景底层与必要叠加、内容适配转场、Asset/AssetMatch、实际音频时钟、安全区、Wan STOP、既有TTS、技术/人工/许可分离及一次有限修复。
- 文档核验：AGENTS列出的具体文件和命令入口均按本地存在性及源码核实；仅文档变更，不将本轮核对称作新一次视频渲染或全链路测试。
- **仍待固化：** 常规制作集中默认配置v1.0、任意合约内Excel/episodeId的统一入口与完整续跑、通用叠加元素出现/退出时序契约、自动封面接入。现有VP-007窄规则入口、分散配置及VP-010人工素材/编排步骤不能冒充已完成这些能力。
- 下一步：本次规则交付后停止；后续如继续“常规视频制作流程固化v1.0”，应复用上述真实能力补齐必要差额，不重做VP-010或新建平台。


## 2026-10-28｜小陈AI说常规制作流程固化 v1.0

- 已实现：`orchestrator/config/production-v1.json`集中默认配置；`orchestrator/src/production/cli.ts`统一入口（npm --prefix orchestrator run produce），接收Excel/episode/config/resources/out/resume及受限历史缓存导入；机器路径受忽略本地配置/环境变量，现有关键依赖精确固定，无升级。
- 复用旧Excel/节奏/PCM、Asset/AssetMatch、转场选择/downgrade、GLBackground、VQ评估/boundedRepairs；未新建服务、后台或数据库。VP010混音/扫描仅补request分支，既有默认保留。
- 12阶段JSON状态/指纹/产物SHA、锁、独立阶段回执和配置回退缓存；配音生成与字幕解析分开缓存。画面导出后探针中断，可核验picture-export回执只续探针一次，不重跑画面；质量修复预算持久化，不因中断重置。
- 实测：VP010原Excel25镜/10元数据/31字幕重新核对，原保护输入及人工选中原版SHA不变；最终第二次运行12阶段全REUSED，0新TTS/下载/完整渲染。原版缓存复用不是宣称通用新渲染器重出片。
- 实测：从VP010第2镜原配音构造冻结单镜回归，普通resources路径生成3.833秒/115帧真实实景+通用叠加+字幕+BGM短片，自动11PASS/0FAIL/1NOT_EVALUATED（无图解的布局项不计PASS）。主动中断画面成功导出后的探针，resume只补探针，画面SHA不变。
- 实测：4秒/120帧静音技术片验证两条叠加的出现/退出/位置/动画，15组DOM探针及安全区/主体显式保护区通过。首次底部叠加遮前臂已在独立试验上移并保留旧对照，不声称自动识别主体。
- 实测：31句真实生成审计解析与旧字幕时间最大差0；参数化混音34秒音频实验验证测响度、两次铺接、独立人声残差、无削波。新增10项必要测试及既有Excel10、转场/Quality22回归通过，生产模块针对性类型检查及Python语法检查通过。
- 阻断验证：无资料资源包时facts/assets准确BLOCKED，brief可继续，TTS不启动，不以图解填满。复杂事实/素材理解/许可、录屏内容与多片段导演判断仍由交互式Codex或人工补JSON；本轮新TTS POST适配未调用，不伪称新生成已验证。
- 已交付规范/命令/日常短Prompt/恢复说明：[Production-v1.0.md](docs/Production-v1.0.md)；实测及边界：[验证报告](docs/reports/Production-v1.0-validation.md)；证据：`orchestrator/output/production-v1-validation/verification-summary.json`。
- 根AGENTS索引与能力状态已更新。封面仍单独生成，自动接入待办；BGM/素材未确认授权记录保留；未发布、未恢复Wan、未重做VP010、未提交推送。
- 下一步：按新短Prompt和CLI制作后续有明确输入/资料的审阅版；本轮完成后停止，不扩展封面流水线或平台。


## 2026-10-28｜v1.0 GitHub源码交付检查点

- 已核实main/远端/全部工作区及9个未推送提交，fetch后origin/main无分歧；未发现被跟踪的敏感文件或真实凭据。
- 修补ignore排除本地资源、实验public、环境/本地配置、模型和音视频；只按文件清单暂存源码、配置/锁、规则/指南/报告，不使用git add .。
- 未发布历史曾包含node_modules；已在保留本地原历史备份分支 `backup/pre-production-v1-publish-20261028-232916` 后仅清理未发布提交。原最终源码树、索引与工作区不变，不改远端历史，不推送备份分支。
- 检查证据与未提交范围：[GitHub交付检查](docs/reports/Production-v1.0-GitHub-delivery.md)。本检查点不提前记推送成功，结果待正常提交/推送及远端核对。


### v1.0 GitHub源码交付已核实

- 功能提交 `7b0fb25c83ea8a02a787bdce14e56f01c245c905`（feat: establish production v1 workflow with resumable stages）已正常快进推送origin/main，git ls-remote核对一致；[GitHub提交](https://github.com/augnera/video-pipeline/commit/7b0fb25c83ea8a02a787bdce14e56f01c245c905)。
- 341个文件的本次变更包含源码、配置/锁、规则、指南、报告及小型开源代码依赖；未上传私人声音、模型、BGM、素材、音视频、缓存、字体或node_modules。历史依赖误提交仅清理未发布部分，本地原历史备份仍保留。
- 本机微软脚本Excel未暂存，其他本地资源由ignore排除；GitHub仅保存源码/配置/文档，并非视频及素材的异地备份。此次追加仅记录已核实推送，不重写功能提交；最新远端提交以最终交付核对为准。
