# 小陈AI说｜常规视频制作流程 v1.0

统一入口是项目内 TypeScript CLI，不是新增Agent服务。输入冻结Excel、episodeId及可选覆盖配置/资源交接JSON，输出私人审阅版与阶段记录。规则模式如实标识，封面单独生成，不自动发布。

## 日常使用

在仓库根目录执行（参数中的相对路径均相对仓库根目录）：

```bash
npm --prefix orchestrator run produce -- --help
```

正常制作命令格式：

```bash
npm --prefix orchestrator run produce -- --excel "docs/scripts/本期分镜.xlsx" --episode "本期英文ID"
```

这里的文件名和ID是使用时填写的参数，不是仓内已有样例。输出默认在 `orchestrator/output/<episodeId>/production-v1/`。下文有本仓已实际执行的完整命令。

已有资源交接可附 `--resources <JSON路径>`；参数覆盖附 `--config <JSON路径>`。首次执行后继续工作时使用相同Excel/episodeId/输出目录并加 `--resume`，无需重新抄写上次config/resources/reuse参数；入口记录并恢复这些引用。自定义过输出目录仍须传相同 `--out`。

### 日常短Prompt

> 按AGENTS.md和docs/Production-v1.0.md制作本期小陈AI说。Excel：〈真实路径〉；episodeId：〈独立ID〉。冻结旁白，画面按内容适配实景/真实录屏及必要叠加。使用默认配置与统一入口；核实并补齐事实、素材及复杂编排JSON后resume，交付完整审阅版。不发布，封面单独处理。

Excel+短Prompt由交互式Codex按以上规则执行。**CLI本身没有无人值守新闻核查、网络素材搜索或视觉模型服务**；这些工作需要Codex/人工实际核实并补充JSON。不能仅给CLI一个素材不足的Excel，就声称会自动找到并理解所有素材。缺口会明确BLOCKED，不铺文字卡凑片。

## 默认配置与路径

- 总配置：`orchestrator/config/production-v1.json`，版本 `xiaochen-production/1.0`。
- 已有配置仍被引用：`music.json`、`xiaochen-visual.json`、`transition-selection.json`、`quality-rules.json`及已验证的转场目录。不复制另建素材/时间线体系。
- 机器路径：`orchestrator/config/production.local.json`，已加入gitignore；可参考同目录 `production.local.example.json`，填已有浏览器、已批准TTS服务目录及其Python环境。也支持 `VP_BROWSER_EXECUTABLE`、`VP_TTS_SERVICE_DIR`、`VP_TTS_PYTHON` 环境变量。密钥/参考音频不复制进仓库。
- 优先级：默认配置 → 本地路径覆盖 → `--config`覆盖；上述环境变量最终覆盖对应机器路径。未知配置键拒绝，不允许打开发布、Wan或无限修复。
- TTS只引用已验收 `local-assets/voice/experiments/day9-g4/locked-config.json` 中的音色/情绪参考与模型版本；参数集中于总配置。继承VP010原版的生成流程，不默认采用被否决的开头减速/换声实验，不自动裁词中停顿、不自动时间拉伸。
- 配音按原文生成，标点节奏沿用既有计划。字幕使用合成块样本审计与波形活动，句级精度，不宣称字词强对齐。跨镜未完成句等无法可靠划分的情形会报告对齐缺口。
- 1080×1920、30fps；字号、安全区、片尾停留集中配置。画面比例不固定为VP010统计值；实景底层优先，图解按需。
- BGM严格引用已确认 `AI科技新时代1.mp3` 的路径与SHA，保留许可待确认记录。新片根据实际人声/音乐LUFS计算基线，再以+3dB试听起点混音，独立轨道、1秒等功率循环交叉淡化、淡入淡出及峰值/人声残差检查。不将VP010的-14.3dB写成所有新片固定音乐音量。
- 普通切点优先硬切；非硬切必须由关系与阅读需求支持，仅使用已验证的参数/帧数。保守的动态频率和强度预算可配置，不强迫固定数量/比例。现有历史18帧默认由常规配置覆盖为短效果起点，未验证时长自动排除。
- 关键Node依赖在现有package/lock中固定为实际已安装版本，未安装或升级。Remotion隔离环境沿用既有精确版本。实测运行版本及锁文件摘要见 `production-runtime-lock.json`；TTS环境不重建。

## 阶段与当前自动化边界

| 阶段 | 入口实际行为 | 仍需补充的判断 |
|---|---|---|
| import | 复用现有解析器；可配置sheet/表头/末行，默认连续数字镜号+明确元数据标签；隔离标题、来源、说明，保持原文 | 结构含糊时提供明确endRow；不自动丢弃异常镜号旁白 |
| facts | 核对资源包与本Excel哈希、核查日期、具体事实/来源及冲突；新闻缺核查阻断TTS | Codex/人工实际浏览、核对数字/边界/观点，记录无法访问来源 |
| brief | 根据真实旁白与视觉意图写规则模式需求JSON；可独立于受阻事实阶段继续 | 不伪称模型已识别人物、焦点或构图 |
| voice-acquire | 接入现有获准IndexTTS2服务、固定参数、一次尝试，或复用绑定哈希的配音缓存 | 本轮验证使用缓存，未新调用TTS；新稿仍需实际听音验收 |
| voice | 单独缓存生成审计解析、波形句级字幕、已配音分镜 | 解析失败不重复TTS；无可靠时间证据时补实际时间戳 |
| assets | 校验Asset/AssetMatch及原片、分析帧SHA、许可、审核状态，输出交接 | 当前没有通用下载/视觉服务；实际搜索、许可判断、抽帧理解、录屏仍由Codex/人工准备 |
| timeline | 素材回来后二次编排；简单一镜一素材可自动定时，多素材/复杂语义读取已有同一timeline契约；核对完整旁白、字幕、余量 | 复杂分段提供真实音频定时的timeline；不自动套同一办公片或大量图解 |
| audio | 复用参数化的VP010混音实现，测响度、循环、保留独立音轨 | 能量比不能替代音乐/语音听感验收 |
| render | 共享GLBackground与现有隔离Remotion；通用实景底层+叠加+稳定字幕；GL故障至多一次硬切降级 | 新资源/参数未验证不能宣称通过 |
| compose | FFmpeg只合入一份混音音轨，保留画面帧数 | 不因转场扣短全片 |
| quality | 复用VQ评估/一次有限修复；实际导出、控制帧、DOM安全区、全帧扫描、原文字/时间和音频检查 | 语义替换、许可和主观观感不自动修改/判PASS；NOT_EVALUATED不算PASS |
| delivery | 产物清单、独立不可覆盖的视频文件、质量/修复记录，等待人工观看 | 封面单独做；不自动发布 |

VP010中人工挑选7段素材、真实网页截取、真实编辑器录屏、25镜的定制多片段安排没有被包装成通用自主Agent。新片复杂编排仍通过brief→proposal/matches→timeline交接；Script Agent负责脚本，本仓不改成选题平台。

## JSON交接

资源包必须用 `sourceExcelSha256` 绑定本期输入，路径可以是仓库相对路径或本地绝对路径。JSON键约定：

- `factCheck`：含checkedAt、materialConflicts、facts；新闻facts逐项给claim及sources URL。不能用空“已核查”标记代替证据。
- `assetCatalog`、`assetMatches`：沿用Asset/AssetMatch v0.1，允许匹配清单为数组或既有 `{matches:[...]}`。描述与帧证据真实，pending_human不提升为正式库。
- `visualBrief`、`assetProposal`：可选，复杂内容由交互式Agent/人工提供实际判断，不假称模型服务。
- `timeline`：可选，用于一镜多片段、全屏图解或特殊裁切等复杂安排；仍是现有scenes/captions/transitions契约，非第二套时钟。必须与本期实际配音字幕一致，素材区间足够。派生裁片需提供renderPath、renderSha256及renderDerivedFromSha256，不能依赖VP010旧模板里按素材ID硬编码的裁切特例。
- `voice`、`voiceSha256`、`voicedScript`、`captions`、`srt`：可选完整可靠配音缓存包，文本和哈希须对应本期；没有时调用已批准TTS流程。

真实、已运行的资源包样例：`orchestrator/output/production-v1-validation/fresh-fixture/resources.json`。它从VP010第二镜构造单镜回归输入和配音缓存，只用于接口验证，不冒充新的完整选题。

### 叠加元素时序

扩展同一timeline顶层 `overlays`，不会取代底层scenes，也不会修改字幕时间：

```json
{
  "id": "keyword-1",
  "sceneId": "shot-1",
  "text": "重新检验技能价值",
  "fromFrame": 15,
  "toFrame": 60,
  "rect": {"x":80,"y":180,"width":900,"height":180},
  "animation": {"type":"slide_up","inFrames":6,"outFrames":6}
}
```

以上为字段示例，sceneId必须对应实际场景。时钟为全片全局帧号，from含、to不含；支持none/fade/slide_up/scale。位置、字号、进出帧数可配置。自动从Excel生成关键词时仅剔除明确的装饰角标行，正常品牌口播/观点不改，必要AI披露仍走独立机制。校验 `overlay-v1.schema.json` 与TypeScript语义边界，检查字幕安全区、实际DOM溢出及叠加占屏面积。

场景可用 `protectedRects` 指定主体/重要界面区域，叠加不准相交。该区域来自真实抽帧理解/人工判断，当前不自动识别主体。首次技术样片的下方叠加覆盖前臂，已在独立修订样片上移至上方空区，并保留旧试验；没有为通过而假称具备主体检测模型。

## 缓存、续跑与恢复

- `production-state.json`记录阶段状态、指纹、产物路径/SHA及阻断；`execution.json`记录本次实际执行/复用事件；`current-result.json`指示当前是否DELIVERED，不能仅凭目录已有MP4判定本次成功。
- 每阶段产物放在自己的指纹目录；完成回执独立保存，支持中断恢复、配置回退时复用先前版本。输入Excel哈希/episodeId改变，须用新输出目录，不能覆盖旧成片。
- 配音采集与句级时间解析分开缓存。字幕/解析失败不会重新调用TTS；音乐变更只影响对应音频/合成/检查，画面未变时复用渲染。渲染源码、实际时间线及必要配置变化会失效相关缓存。
- 缓存SHA不符直接报CACHE_INTEGRITY，不通过重生成掩盖篡改。需要更换源/配置时显式修正交接并保留旧产物；同名旧交付不可覆盖，新交付按内容SHA命名。
- 出口有进程锁；仍活跃的进程不得强抢，死进程锁可以恢复。不要删除正在运行的锁或清理正式素材。
- 新闻冲突/素材不足时会BLOCKED，独立brief等继续完成。根据状态中的required路径补JSON，再带 `--resources` resume。
- 已批准TTS服务路径缺失或9881被其他任务占用，准确阻断，不终止别人服务；自己启动的服务完成后停止。尝试已开始/失败且无完整可信产物时不自动重发；先检查服务状态/审计，不重置尝试预算。
- 若画面已导出而探针中断，picture-export回执绑定画面SHA、请求及源码；resume只补一次探针，不重渲染画面。该恢复已在单镜短片上通过真实进程中断验证。
- 渲染故障保留attempt目录；仅GL故障允许一次硬切降级，非GL故障不盲目全片重试。修复前后与复检分别记录；问题超出边界时保留结果并报告。
- 退出码0为完整私人审阅交付（可有WARN/NOT_EVALUATED），2为已记录的依赖阻断/技术未过，1为参数、输入或完整性等执行错误。主观和许可不会被0退出码“验收”。

### 本仓实际验证命令

以下命令已执行，当前直接续跑会复用缓存，不重新制作VP010：

```bash
npm --prefix orchestrator run produce -- --excel "docs/scripts/微软离职邀约_技能保值_分镜脚本.xlsx" --episode microsoft-veo-skills-20261028 --reuse orchestrator/output/microsoft-veo-skills-20261028-vp010 --out orchestrator/output/production-v1-validation/cache-run --resume
```

`--reuse`是旧产物冻结验证/导入模式，检查持有人选版、Excel/配音/视频及原技术证据绑定，不把旧成片说成通用新渲染器新出片。它不回溯套用默认视觉/音乐参数，不与 `--config`或`--resources`混用；改编旧片应使用新资源包和独立输出。

不再传reuse的恢复命令也已验证（其引用已存档）：

```bash
npm --prefix orchestrator run produce -- --excel "docs/scripts/微软离职邀约_技能保值_分镜脚本.xlsx" --episode microsoft-veo-skills-20261028 --out orchestrator/output/production-v1-validation/cache-run --resume
```

非legacy路径的单镜短片也已运行，配音复用原样本但实际执行通用编排、混音、Remotion导出、合成、检查及交付：

```bash
npm --prefix orchestrator run produce -- --excel orchestrator/output/production-v1-validation/fresh-fixture/input.xlsx --episode production-v1-smoke --resources orchestrator/output/production-v1-validation/fresh-fixture/resources.json --out orchestrator/output/production-v1-validation/fresh-run --resume
```

已有必要测试入口：

```bash
npm --prefix orchestrator run test:production
```

## 当前人工事项与不包含内容

新闻核查、素材获取/理解/许可、复杂语义多片段安排仍需交互式Codex或人工提供真实证据；参考声线和情绪只沿用批准配置，听感最终由持有人裁定。VP010人工约65分、可以发的结论不消除素材/BGM许可未确认项。

封面本次不自动接入，交付清单明确 `integrated:false`。可以单独制作封面，但不能声称本CLI已经全包。不得自动发布，不启动Wan，不建设独立平台。
