# 小陈AI说常规制作流程固化 v1.0｜实现与验证

本轮完成默认配置、项目内统一CLI、阶段缓存/续跑、实景底层与通用叠加时序接线；不重做VP010，不建设平台，不接入封面或发布。

## 本地事实与复用结论

仓库 `/home/chen/work/video-pipeline`，main，HEAD `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`，相对本地origin/main领先9/落后0，未fetch、提交或推送。保留原README/PRD移动及既有脏工作区。遵循AGENTS、PROGRESS及VP008/009/010真实报告；实施范围先写入同目录 `Production-v1.0-implementation.md`，随后继续实现与真实运行。

VP007入口及core.direct只支持旧样片窄规则；VP010仍有定向路径、手工事实核查、网页/录屏采集与定制编排表。没有将这些包装成已自动化服务。复用现有Excel解析器、节奏规划、PCM读取、Asset/AssetMatch、GLBackground/EndpointGuard、转场选择/降级、VQ评估与boundedRepairs。原VP010音频与全帧扫描脚本仅新增request参数分支，保留原有默认行为，未执行原片重建。源SRT读取从已有Quality Gate抽出共享函数，加入缓存SRT/JSON一致性核对。

## 实现交付

| 交付 | 当前事实 |
|---|---|
| `orchestrator/config/production-v1.json` | 集中Excel契约、批准TTS参考配置及参数、句级字幕、安全区、BGM响度/循环、短转场、有限修复、机器路径引用；没有固定VP010视觉配额 |
| `production.local.example.json` / 本地production.local.json | 示例可复制；实际机器路径保存在受忽略本地文件，或用3个路径环境变量；不提交私人参考音频/密钥 |
| `production-runtime-lock.json` | 实测Node/FFmpeg/浏览器及已安装包版本、锁文件摘要；现有依赖精确固定，没有install/升级 |
| `orchestrator/src/production/cli.ts` | `npm --prefix orchestrator run produce -- ...`，接受Excel、episodeId、config/resources、out、resume和受限旧缓存导入 |
| `core.ts` | 阶段输入指纹、产物SHA、原子回执/状态、锁、配置回退复用、并行任务输出保护；不是数据库/服务 |
| `voice-runtime.py` / `voice.ts` | 已批准服务适配与单次预算、采集和句级解析分开缓存；缺路径/占用/尝试状态不合法时阻断，不部署模型，不自动拉伸/裁词中停顿 |
| `visual.ts` / `resources.ts` | 原文意图brief、现有契约/原片/分析帧校验、简单一镜一素材或已有真实定时时间线的二次编排；复杂语义由交互式Agent/人工供给 |
| `RoutineRoot.tsx` / `render-routine.mjs` | 同一scenes/captions/transitions上增加overlays；真实视频/图片/必要图解底层，独立叠加与字幕层；无本期新闻/素材ID硬编码 |
| `overlay-v1.schema.json` / `overlays.ts` | 元素ID、原文文字、全局帧区间、rect、字号、进/出动画；字幕安全区、主体保护区、时长及实际DOM溢出检查 |
| Quality接线 | 复用VQ检查与一次修复；GL故障一次硬切降级；实际低对比转场使用已有downgrade做一次硬切，不恢复同一弱效果反复重渲染；修复计划先持久化，恢复不重置预算 |
| `docs/Production-v1.0.md` | 已执行命令、日常短Prompt、完整阶段表、JSON资源包、故障/恢复说明、人工边界 |

历史VP010 renderer仍保留原样；新时序能力在新通用入口接线，并不宣称所有历史模板已升级。封面始终在清单中标注integrated=false。

## 已实际运行的验证

### 1. VP010完整输入与缓存

实际执行统一入口，重新导入原Excel，得到25镜、10行非空元数据，范围A1:K26，原旁白完整。C列存放标题/来源的真实表格曾触发过严谨边界检查，已把元数据标签规则集中进Excel配置，防止误将制作说明导入口播；异常镜号且带旁白则报错，不悄悄漏镜。

持有人选择原版的 `holder-selection.json`、视频SHA、原始输入保护清单、素材与分析帧SHA、实际视频帧数及既有技术报告绑定均检查。最终连续执行后12阶段全部REUSED，新增TTS请求0、下载0、完整视频渲染0。输出视频是原版字节一致的独立副本，没有套用新渲染器或默认音量后冒称“已验收”。

- 结果目录：`orchestrator/output/production-v1-validation/cache-run/`
- 已验证命令、当前输出：`delivery.json`、`execution.json`、`production-state.json`
- 原版及保护输入全部SHA保持一致，机器摘要见上级 `verification-summary.json`。

旧成片的Quality Gate仍是原6PASS/4WARN，使用有哈希绑定的历史证据；本轮只实测缓存FFprobe与来源完整性，没有伪称重新完整解码或新渲染134.97秒。

### 2. 非legacy入口真实短片

从VP010第2镜原始配音的确切样本区间构造独立单镜回归夹具；原Excel/配音不变、不生成新声音。资源包绑定新夹具Excel哈希、原句与实际句级时间、已有真实手部键盘视频、原许可/分析帧和本期匹配。

普通resources路径实际执行了导入→事实范围判别→brief→配音缓存采集/解析→素材校验→二次编排→测响度混音→通用Remotion→单音轨合成→Quality Gate→交付。生成115帧/3.833333秒审阅短片，并完成续跑。自动结果11PASS、0WARN、0FAIL、1NOT_EVALUATED；没有全屏图解，因此原VQ04图解实际布局项保持NOT_EVALUATED，未计PASS。主观评价仍未自动验收。

- `fresh-fixture/`：可复现输入、资源包及源样本证据。
- `fresh-run/delivery.json`：指向 `review-a78bf12d6cc6.mp4` 等实际完整短片及检查记录。
- 配音是缓存，新的已批准TTS服务POST分支本轮未调用，不能把缓存交接通过写成一次新的TTS生成验证。

### 3. 画面已导出后的真实中断与恢复

在上述短片画面成功导出、探针尚未完成时，主动中断本任务子进程（测试行为，非生产故障），保留picture-export回执。CLI准确BLOCKED，保留依赖阶段。

随后resume只运行一次probesOnly，校验请求/源码/视频SHA后完成探针、合成与交付。ledger记录 `pictureReusedWithoutRerender=true`、`probeOnlyAttempts=1`，画面SHA前后一致：`afa576d780bcc0071e7b9f830343a97afd84dc9ac9f3a9b39d287fdce743b9f5`。没有重新渲染短片画面，更没有重做VP010完整视频。

证据：`interruption-test.json`、`interruption-resume.log`、对应render阶段的attempts.json、picture-export.json、probe-only.log。

### 4. 通用叠加时序实际导出

另生成4秒/120帧、1080×1920/30fps静音技术短片：真实键盘视频底层+独立字幕+两条不同时段叠加（slide_up、fade）。在0/14/15/24/53/59/60/71/72/81/111/112/119等实际帧检查元素存在/退出，15组实际DOM记录、安全区与完整解码通过；已用公布JSON Schema核对实际元素，帧扫描字幕字形通过。

首次下方叠加覆盖前臂，实际看帧后将第二条移至上方空区，加入明确主体保护矩形，保留旧试验，不声称自动检测了主体。

- 当前有效：`overlay-demo-final/picture.mp4`、`validation.json`、`render-evidence.json`、`frame-scan.json`。
- 旧 `overlay-demo/` 只保留排障对照，不标作推荐结果。
- 这不是新一条选题成片，不包含新配音/音乐，也不是全库转场复验。新通用入口的GL能力沿用共享组件及VP008验证，未重新跑全库或新加强效果。

### 5. 声音和时间解析适配

用VP010实际完整生成审计与原WAV测试新句级解析器：31条原文完整，所有起止时间与旧字幕JSON最大差0秒。没有比例估算或字词强制对齐。

原混音脚本request分支另用8秒原配音缓存+34秒测试时线验证：按实际LUFS得到音乐增益-15.7dB（不是强用旧片-14.3），2次音乐铺接，1秒等功率交叉淡化，AAC真峰值-4.8dBFS，无削波；人声独立参考残差约1.27×10⁻⁷，最弱有效3秒能量差约11.58dB。只为参数化及循环接线做音频测试，不改完整VP010。

### 6. 真实阻断、测试与类型检查

原VP010输入不提供资料资源包时，facts和assets准确BLOCKED，brief独立完成/复用，voice-acquire为WAITING，没有启动TTS或填补大量图解，退出码2。证据 `blocked-run/current-result.json`、`blocked.log`。

新增10项必要测试涵盖：元数据边界/异常漏镜、默认配置约束、音频改动不触发配音、配置回退缓存、中断恢复、缓存被篡改、并发锁/输入身份、叠加全局时钟与主体/字幕区、SRT原文/时间、低对比硬切一次预算等组合场景。既有Excel10项、转场/Quality22项回归均通过；生产模块及关联依赖针对性TypeScript无报错，Python适配器语法检查通过。未用测试数量替代实际短片、缓存及中断证据。

## 哪些仍未自动化或未新实测

- 新闻检索、事实支持判断、素材获取/许可/实际画面理解、真实录屏内容准备、复杂多片段导演安排仍由交互式Codex或人工完成并供给JSON。CLI做可靠交接与核验，不虚构无人值守模型服务。
- 本轮没有对新稿实际发起TTS、没有新下载素材、没有重渲染VP010全片；TTS服务适配代码已接，但本轮运行证据是既有配音缓存及生成审计解析。新稿仍须实际生成/试听，首次服务不可用会准确阻断。
- 新低对比修复包装通过必要测试、复用原downgrade；VP010本期低对比真实降级仍以原报告为证，没有为此再制造整片返工。
- 画面好看、自然、声线和继续观看意愿仍由持有人确认；源素材/BGM待确认授权不因技术通过消失。
- 封面自动接入未实施，单独生成封面是现有边界；不自动发布。

本轮不是只整理文档：配置、CLI、阶段回执/锁/缓存、实际普通路径合成、通用时序、检查和真实恢复均已有运行证据。制作规范、日常短Prompt、故障说明本身属于文档交付。停止于可审核交付，不扩展平台。
