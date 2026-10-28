# VP-003A｜Day9 画面生产矩阵与 Remotion 最小验证

日期：2026-10-27。用途：私人非商业技术评估。输入以持有人本轮确认冻结的 Excel、标准化脚本、配音 JSON、完整试听和十镜 WAV 为准。G4 已由持有人验收；旧 JSON 中保留的历史听审状态不在本轮修改。

## 1. 结果与交付

已完成十镜画面生产方案，并用第 5 镜真实配音渲染蓝紫科技风动态观点卡。**本轮仅第 5 镜产出真实视频，其他九镜仍是画面方案，尚未生产素材。** 没有部署 Wan、生成 AI 图片、调用声音模型、公开发布或推送媒体。

- [第 5 镜 MP4](../../orchestrator/output/day9-vp003a/shot-005-remotion.mp4)
- [十镜结构化画面矩阵](../../orchestrator/output/day9-vp003a/visual-matrix.json)
- [最小时间线草案（第 5 镜已关联真实视频）](../../orchestrator/output/day9-vp003a/timeline.visual-draft.json)
- [技术验证](../../orchestrator/output/day9-vp003a/validation.json)、[成功渲染记录](../../orchestrator/output/day9-vp003a/render-run-03.json)、[日志](../../orchestrator/output/day9-vp003a/render-03.log)
- [实验源码与复现说明](../../experiments/day9-remotion/README.md)
- [中段关键帧](../../orchestrator/output/day9-vp003a/frames/middle.png)

配音总时间线为 **83.771565 秒**；各 WAV 时长合计 83.517234 秒，额外跨镜间隔 0.254331 秒。以实际音频为准，没有压缩到 Excel 建议的 32 秒。

## 2. 真实输入核对与复用

`experiments/day9-remotion/scripts/prepare.ts` 直接复用现有 `orchestrator/src/import/excel.ts` 读取真实 XLSX，将十个完整 ImportedShot 与冻结 `script.normalized.json` 深比较；同时验证 voiced 的源脚本哈希、十个音频哈希、实际采样帧数及全局时间连续性，全部通过。没有另建 Excel 解析器或改写旁白。

输入 SHA-256：
- `docs/day9一人公司3个必须提前做的正确选择.xlsx`：`2b3b0c66dbba66dbfd190beea91930907f08518ebdf995f5efb27f86bc9af72b`。
- `orchestrator/output/day9/script.normalized.json`：`4b9e3a438cc80b205b332a4d37aac00d9de5c2a67cdb492fce213942e5c2fa38`。
- `orchestrator/output/day9/script.voiced.json`：`fa1a3020df17c32a657af10fcaee97c6c18c7c219ae9853a4a1b65e43da3af6c`。

本轮前后 41 个受保护文件哈希一致，包括冻结的 14 个输入文件（Excel、两份 JSON、完整试听、十镜 WAV）及现有源代码、配置、依赖清单和根忽略规则。证据：[protected-inputs.before.json](../../orchestrator/output/day9-vp003a/protected-inputs.before.json)、validation.json；本轮未修改原 DSE 流程、旧 FFmpeg 合成器或任何已验收配音。

原表“屏幕裁切建议”导入值为“1秒/2秒/3秒”等时间文本，语义与列名不完全一致；本轮保留原值，不把它猜成裁切指令或正式时长。实验画幅按本轮明确要求设置为 9:16。

## 3. 十镜画面生产矩阵

制作取舍：**八镜优先 Remotion 文字卡/图解，一镜优先图片加运动，一镜优先图片底片并推荐少量 Wan 替换。** 没有哪个镜头在技术上必须依赖 Wan；第 1 镜最值得用 Wan 验证情绪价值，第 7 镜仅是可选第二候选。

| shotNumber | 实际 WAV 时长（秒） | 推荐画面类型 | 是否需要 Wan |
|---:|---:|---|---|
| 1 | 12.295147 | ai-image-with-motion-and-optional-wan | 推荐作唯一首轮 Wan 候选；不是成片必需条件 |
| 2 | 7.457506 | remotion-opinion-card | 不需要 |
| 3 | 8.779773 | remotion-opinion-card | 不需要；原表要求文字动画 |
| 4 | 9.420181 | remotion-diagram | 不需要 |
| 5 | 3.563220 | remotion-opinion-card | 不需要 |
| 6 | 9.700680 | remotion-diagram | 不需要 |
| 7 | 8.764218 | ai-image-with-motion | 当前不需要；首轮 Wan 成功后才考虑 |
| 8 | 9.753243 | remotion-diagram | 不需要 |
| 9 | 6.271610 | remotion-opinion-card | 不需要 |
| 10 | 7.511655 | remotion-end-card | 不需要 |

### 第 1 镜（Excel 第 2 行）

- **原始旁白**：上一次我讲的是，一人公司最容易踩的几个坑。但今天这条，我想直接讲一件事：如果不想走到那一步，其实是有“正确的做法”的。这里是小陈AI说。
- **实际音频时长**：12.295147392 秒。
- **原始画面描述**：开场-情绪｜【中文】一个人思考；夜晚工位｜【EN】solo founder thinking; night desk｜镜头：slow pan
- **原始叠加文字**：大字：一人公司，真正的风险
- **推荐画面类型**：`ai-image-with-motion-and-optional-wan`；模板方案 ID：`day9-night-desk-v1`。
- **推荐制作方式**：AI 图片＋轻缓推移为完整底片；后续仅将其中 3–4 秒替换为 Wan 图生视频，余时由同图运动/文字承接。
- **是否需要 Wan**：推荐作唯一首轮 Wan 候选；不是成片必需条件。
- **所需素材**：待生成/授权的单人夜间工位静态图；后续可选 3–4 秒 Wan 片段。
- **提示词/制作规格**：竖幅 9:16，夜晚安静的独立工作室，一名独立创业者背影在工位思考，蓝紫色环境光，桌面克制整洁，画面左上及中部留文字空间，无可辨识品牌、无文字、无真实产品界面；图生视频仅缓慢侧移、细微呼吸，人物与手部稳定，不作激烈动作。
- **建议镜内节奏**：0–4s 夜间工位；4–8s 同图推近；余时叠加风险标题，品牌口播处降低视觉运动。
- **人工审核重点**：不得暗示画面人物是本人；检查手部/屏幕伪字；12.30 秒需有节奏变化，保留原始开场旁白与品牌停顿。

### 第 2 镜（Excel 第 3 行）

- **原始旁白**：一人公司真正的风险，不是你做错了什么，而是你迟迟没有切换到正确的做法。
- **实际音频时长**：7.457505669 秒。
- **原始画面描述**：判断-抽象｜【中文】文字动画；极简背景｜【EN】text animation; minimal typography｜镜头：fade
- **原始叠加文字**：大字：真正的风险
- **推荐画面类型**：`remotion-opinion-card`；模板方案 ID：`day9-risk-contrast-v1`。
- **推荐制作方式**：Remotion 极简动态文字卡，用原旁白中的‘不是／而是’做对照强调。
- **是否需要 Wan**：不需要。
- **所需素材**：本地字体、蓝紫背景、矢量分隔线。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：先出现‘真正的风险’，随后按句意强调‘不是’和‘而是’，不新增口播。
- **人工审核重点**：对照不能改写成未经确认的新观点；字号和对比足够，字幕与观点卡分离。

### 第 3 镜（Excel 第 4 行）

- **原始旁白**：第一个错误，是把身体当成可以透支的资源。熬夜、久坐、硬扛，觉得等产品出来了，一切都值得。
- **实际音频时长**：8.779773243 秒。
- **原始画面描述**：判断-抽象｜【中文】文字动画；极简背景｜【EN】text animation; minimal typography｜镜头：fade
- **原始叠加文字**：大字：错误一｜熬夜 + 硬扛
- **推荐画面类型**：`remotion-opinion-card`；模板方案 ID：`day9-error-list-v1`。
- **推荐制作方式**：Remotion 错误一标题卡，熬夜／久坐／硬扛按原文次序逐项出现。
- **是否需要 Wan**：不需要；原表要求文字动画。
- **所需素材**：本地字体、三个抽象状态图标。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：错误一标题→三种透支行为→末句停留。
- **人工审核重点**：不要把身体资源视觉化成医疗诊断；条目与旁白同步；保留原叠加文字。

### 第 4 镜（Excel 第 5 行）

- **原始旁白**：正确的做法是：先稳住身体，再谈进度。在一人公司里，身体不是条件之一，而是整个系统的上限。
- **实际音频时长**：9.420181406 秒。
- **原始画面描述**：错误一｜延展
- **原始叠加文字**：大字：正确的做法｜先身体，后进度
- **推荐画面类型**：`remotion-diagram`；模板方案 ID：`day9-body-before-progress-v1`。
- **推荐制作方式**：Remotion 顺序图解：身体→进度；用承托结构表达‘系统上限’，不画伪造数据曲线。
- **是否需要 Wan**：不需要。
- **所需素材**：身体/进度两张文字节点、连接线、系统框架。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：先稳住身体→再谈进度→身体作为整体系统承托。
- **人工审核重点**：图解只表达原文先后与支撑关系，不增加健康疗效或定量数据。

### 第 5 镜（Excel 第 6 行）

- **原始旁白**：第二个错误，是产品功能越做越多。
- **实际音频时长**：3.563219955 秒。
- **原始画面描述**：错误二｜大字卡
- **原始叠加文字**：大字：错误二｜功能越做越多
- **推荐画面类型**：`remotion-opinion-card`；模板方案 ID：`day9-feature-creep-v1`。
- **推荐制作方式**：本轮真实渲染：蓝紫科技观点卡，原始标题分层入场，抽象功能块逐层堆叠。
- **是否需要 Wan**：不需要。
- **所需素材**：已验收 shot-005.wav、本机文泉驿正黑、纯代码图形。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：0–0.75s 标题入场；0.65–2.0s 功能块堆叠；约1.84–2.72s关键词强调；尾部保持阅读。
- **人工审核重点**：功能越做越多必须清楚；抽象块不能伪装成真实产品 UI；不裁切/加速配音。

### 第 6 镜（Excel 第 7 行）

- **原始旁白**：表面看是在完善产品，其实是在拖延面对真实反馈。正确的做法是：只保留最小、最顺、最能跑通的流程。
- **实际音频时长**：9.700680272 秒。
- **原始画面描述**：错误二｜延展
- **原始叠加文字**：大字：正确的做法｜最小可跑流程
- **推荐画面类型**：`remotion-diagram`；模板方案 ID：`day9-minimal-flow-v1`。
- **推荐制作方式**：Remotion 将杂乱抽象节点收束成最小三步流程；用原文关键词表达流程，不伪造产品步骤。
- **是否需要 Wan**：不需要。
- **所需素材**：抽象节点、连接线、‘最小／最顺／跑通’文字。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：完善表象→面对反馈→收束为最小可跑流程。
- **人工审核重点**：不要把‘最小’误表达为省略验证；不得生成真实 UI；顺序变化须符合口播。

### 第 7 镜（Excel 第 8 行）

- **原始旁白**：第三个错误，是迟迟不上线。因为不上线，你就不用面对用户，也不用验证那些不确定的判断。
- **实际音频时长**：8.764217687 秒。
- **原始画面描述**：错误三｜场景卡
- **原始叠加文字**：大字：错误三｜迟迟不上线
- **推荐画面类型**：`ai-image-with-motion`；模板方案 ID：`day9-launch-hesitation-v1`。
- **推荐制作方式**：优先一张待上线场景图片＋Remotion 缓慢推近和原文字卡；Wan 仅作为后续可选第二候选。
- **是否需要 Wan**：当前不需要；首轮 Wan 成功后才考虑。
- **所需素材**：待生成/授权的单人犹豫工作场景静态图，屏幕无可读界面。
- **提示词/制作规格**：竖幅 9:16，独立创业者侧后方，清晨前的蓝紫色工作室，坐在电脑前犹豫停留，屏幕仅抽象柔光，不出现文字和可辨识产品界面，手部自然放置，构图留足标题空间，克制写实。
- **建议镜内节奏**：迟迟不上线标题→轻缓推近场景→验证判断的提示停留。
- **人工审核重点**：避免反复显示虚构发布按钮；图片运动已经可表达犹豫，不为动而动；人物非本人。

### 第 8 镜（Excel 第 9 行）

- **原始旁白**：正确的做法是：尽快上线，把决策交给现实。上线不是成功，但它能帮你停止内耗，结束无限准备。
- **实际音频时长**：9.753242630 秒。
- **原始画面描述**：错误三｜总结
- **原始叠加文字**：大字：正确的做法｜尽快上线
- **推荐画面类型**：`remotion-diagram`；模板方案 ID：`day9-reality-feedback-v1`。
- **推荐制作方式**：Remotion 决策闭环图：上线→现实反馈→调整，用原叠加文字收束。
- **是否需要 Wan**：不需要。
- **所需素材**：闭环节点、方向箭头、原文关键词。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：尽快上线→现实反馈→停止内耗，结束无限准备。
- **人工审核重点**：不能将上线表现为必然成功或营收增长；反馈符号不冒充真实用户数据。

### 第 9 镜（Excel 第 10 行）

- **原始旁白**：真正把一人公司拖垮的，从来不是能力不够，而是一直在用错误的方式硬撑。
- **实际音频时长**：6.271609977 秒。
- **原始画面描述**：认知收束卡（科技蓝紫）
- **原始叠加文字**：大字：问题在方式，不在能力
- **推荐画面类型**：`remotion-opinion-card`；模板方案 ID：`day9-method-not-ability-v1`。
- **推荐制作方式**：Remotion 科技蓝紫收束卡，对‘方式／能力’做层级对比，不改变原句否定关系。
- **是否需要 Wan**：不需要。
- **所需素材**：本地字体、两层标题和简洁强调线。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：问题在方式→不在能力→静稳停留。
- **人工审核重点**：原叠加文字逐字保留，不将能力不足改成能力不重要。

### 第 10 镜（Excel 第 11 行）

- **原始旁白**：下期我会把这三条“正确的做法”，拆成我每天正在用的一套工作结构。关注我，别错过下一期。
- **实际音频时长**：7.511655329 秒。
- **原始画面描述**：结束卡
- **原始叠加文字**：大字：下一期｜我的工作结构
- **推荐画面类型**：`remotion-end-card`；模板方案 ID：`day9-next-episode-v1`。
- **推荐制作方式**：Remotion 结束卡，下一期标题＋原始‘关注我’，不增加新的推广口播。
- **是否需要 Wan**：不需要。
- **所需素材**：原文标题、本地字体、三条抽象结构线。
- **提示词/制作规格**：无需模型提示词；按上述 Remotion 制作方式和原始叠加文字排版。
- **建议镜内节奏**：下一期标题→三条做法结构线→关注我停留。
- **人工审核重点**：保留结尾完整性和关注引导；只作私人评估，不公开发布。

所有时间段和画面节奏均为导演方案，不冒充已测得的词级对齐。模板 ID 目前除第 5 镜外仅是方案命名，不代表相应组件已经实现。AI 图片/Wan 提示词也是待执行的拟议输入，不是现成素材。

## 4. Remotion 最小实验与环境验证

### 4.1 官方 Skill 与环境

已检查并采用 [Remotion 官方 Agent Skills 入口](https://www.remotion.dev/docs/ai/skills)指向的 [remotion-dev/skills](https://github.com/remotion-dev/skills)。读取固定提交 `30d4553ecd46fbc5212fd0ff006ae43af522158b` 的 `skills/remotion-best-practices/SKILL.md`，版本 4.0.539，及项目创建、画面布局、compositions、markup、字体、音频、渲染参考。

采用规则包括：新项目放独立子目录、用 useCurrentFrame/interpolate 驱动动画、public/staticFile 引用媒体、按真实音频长度设置帧数、显式等待本地字体加载、检查实际关键帧。Skill 源文件留档于输出目录 [official-skill/](../../orchestrator/output/day9-vp003a/official-skill/)，未安装全局 Skill。官方文档：[浏览器复用](https://www.remotion.dev/docs/options/browser-executable)、[命令行渲染](https://www.remotion.dev/docs/cli/render)。

| 项目 | 实际值/验证 |
|---|---|
| 实验目录 | `experiments/day9-remotion/`，自己的 package.json / package-lock / node_modules |
| Node / npm | v26.7.0 / 11.19.0；生成项目的 engines 允许 >=24，实际安装、检查、渲染通过 |
| Remotion | 4.0.539，所有 @remotion 包版本一致；React / React DOM 19.2.3；TypeScript 5.9.3 |
| 新依赖范围 | 官方 blank 模板及同版本 @remotion/media、@remotion/fonts；原 orchestrator 依赖未变化 |
| 磁盘 | 实验 node_modules 约 340 MB；没有下载 Chromium、字体或 AI 模型 |
| 浏览器 | 复用现有 Chrome for Testing 149.0.7827.55，`chromium-1228/chrome-linux64/chrome` |
| 计算方式 | swangle 软件绘制、CPU libx264，并发 2；没有 NVIDIA 视频编码或模型推理 |
| 中文字体 | 复用 `/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc`，用已有 fontTools 4.63.0 抽取首字体为 TTF |
| 字体检查 | FontFace 加载成功；CDP 确认品牌、错误二、功能、越做越多均由 WenQuanYi Zen Hei 实际绘制，无字体回退 |
| Studio | `127.0.0.1:9320/Day9Shot05` 实际加载，页面错误为空；检查完成后关闭 |
| 监听保护 | 版本固定的 loopback preload 限制本实验服务器到 127.0.0.1；ss 实测确认，没有改 node_modules 源文件 |
| 本地验证 | 实验 ESLint 与 TypeScript（含准备/渲染/验证脚本）通过；旧 orchestrator tsc --noEmit 和 23 项测试通过 |

实际问题及处理：

1. 默认 npm cache 位于受限目录，最初 npm view 报 EROFS；后续显式用 `/tmp/vp003a-npm-cache`，未改用户全局 npm 配置。
2. 模板未声明 ESM，准备脚本首次 top-level await 编译失败；仅在独立实验 package.json 加入 type=module 后通过。
3. 第一次渲染无法从 `.ttc` 推断格式；第二次显式 truetype 后浏览器仍拒绝集合字体。使用**已有** fontTools 将本地集合中的首字体导出为独立 TTF，第三次成功。未改系统字体，未新增字体依赖。两次失败日志/记录保留，没有覆盖历史结果。
4. Chromium 不支持 Remotion 的新共享内存截图扩展，日志明确回退为编码截图，实际 107 帧完整产出；这是复用浏览器的性能降级，不是渲染失败。
5. headless 日志包含缺失 UPower DBus 服务及受限 NSS 持久库提示；本地素材加载、字体、AAC/H.264 和解码均通过，没有为消除提示修改系统或浏览器全局目录。
6. 官方模板安装的 npm audit 记录 **10 项 high、0 critical**，链路包含 zod 与其依赖方；[npm-audit.json](../../orchestrator/output/day9-vp003a/npm-audit.json) 已保存。没有运行 audit fix --force 或扩大升级范围；当前只用于临时本地离线素材渲染，未部署面向网络的应用。后续若建设长期服务，应单独处理这份依赖风险清单。

### 4.2 实际画面与时长

原叠加文字 `大字：错误二｜功能越做越多` 完整留存在输入 JSON；渲染时仅把“大字：”作为排版指令，将“｜”作为分隔线，正文排成“错误二 / 功能 / 越做越多”，未改旁白或观点。背景使用蓝紫渐变、低对比网格和三层抽象功能块，不是真实产品界面；未制作虚构 UI。

标题在开头逐层入场并保持可读；功能块逐层叠加，强调线约在 1.84 秒开始，依据既有 ASR 的关键词时间做粗略视觉强调。**这不是逐字字幕，也没有声称完成强制对齐。** 音频从 0 秒原速播放，保留原始头尾静音，无附加音高、增益、速度或停顿处理，无 BGM 干扰本次同步验证。

| 测量项 | 结果 |
|---|---|
| 冻结第 5 镜 WAV | 3.563219955 秒，22050Hz、mono PCM16 |
| 视频 | H.264 / yuv420p，1080×1920，30fps，107 帧 |
| 视频流时长 | 3.566667 秒；ceil(audioDuration×30)，比 WAV 多 3.447ms，不截断旁白 |
| MP4 容器时长 | 3.584000 秒；AAC 流 3.584000 秒，尾部编码分帧填充与视频帧时长不同 |
| 成片声音 | AAC 192kbps 目标、48000Hz；原 WAV 未覆盖，成片编码不等于 WAV 无损封装 |
| 成功渲染耗时 | 19.677089 秒，包含打包、字体/音频加载、107 帧渲染和封装；不含安装、两次失败及后续检查 |
| 完整解码 | ffmpeg -xerror 视频/音频均通过 |
| 音频对照 | 解码回 22050Hz 后估计偏移 0 样本，相关度 0.997655；2.5–3.18 秒结尾语音相关度 0.994267 |
| 文件大小 | 393628 bytes |
| MP4 SHA-256 | `d8f6150f51c6aa000fefc30a5d092de9aca060ad308579b539e4417570a97fcd` |

相关度验证的是嵌入声音的时序与覆盖，不能代替主观听审或证明发音正确。源 WAV/冻结输入哈希没有变化。视频与容器的不同尾部时长是编码粒度差异，后续混剪必须按原始全局时间线放置画面，不能逐个累加 MP4 容器时长造成漂移。

已查看 0.6 秒、2 秒、3.333 秒三个实际 MP4 抽帧：无缺字、越界或主体重叠；主标题 184/142px，距左右至少 88px，画面高对比且晚帧保持阅读。CDP 字体证据：[platform-font-check.json](../../orchestrator/output/day9-vp003a/platform-font-check.json)。最终运动节奏、视觉风格及主观同步仍待持有人观看。

## 5. 最小 Timeline JSON 草案

[完整十镜草案](../../orchestrator/output/day9-vp003a/timeline.visual-draft.json) 的 schemaVersion 为 `day9-timeline/0.1`，只服务当前 Day9：没有角色、章节、多轨或通用框架字段。

- 每镜包含 shotNumber、startSeconds、durationSeconds、gapBeforeSeconds、audioPath/哈希、visualType、assetPath/templateId、overlayText、subtitles。
- 秒值来自冻结 voiced；同时保留音频采样率和整数 startSampleFrame/durationSampleFrames 以便无漂移回算。这里的 sample frame 不是视频帧。
- 字幕使用原始 narration，时间为视频全局绝对秒、半开区间；当前一镜一个完整原文覆盖区间，标记 `shot-envelope-only-needs-subdivision-and-review`。不能直接用这份长句覆盖草案宣称移动端成品字幕已完成。
- 第 5 镜 assetPath 已指向真实 MP4；其他镜头 assetPath=null，模板仅为方案 ID，明确 planned-not-produced。
- 每个 WAV 自带保留静音，只有第 10 镜前额外补入 0.254331 秒；保留既有 gap，不盲加 600ms。外部间隔的画面延续前镜。
- 视觉素材 MP4 的内嵌声音必须静音，由 audioPath 或整条冻结 preview 作为唯一旁白来源，防止双重配音。第 5 镜的独立视频局部 0 秒映射到全片 37.952608 秒。

第 5 镜条目的真实数据节选：

```json
{
  "shotNumber": 5,
  "startSeconds": 37.952607709750566,
  "durationSeconds": 3.563219954648526,
  "gapBeforeSeconds": 0,
  "audioPath": "/home/chen/work/video-pipeline/local-assets/voice/experiments/day9-g4/shots/shot-005.wav",
  "visualType": "remotion-opinion-card",
  "assetPath": "/home/chen/work/video-pipeline/orchestrator/output/day9-vp003a/shot-005-remotion.mp4",
  "templateId": "day9-feature-creep-v1",
  "subtitles": [
    {
      "text": "第二个错误，是产品功能越做越多。",
      "startSeconds": 37.952607709750566,
      "endSeconds": 41.51582766439909,
      "timingStatus": "shot-envelope-only-needs-subdivision-and-review"
    }
  ]
}
```

本轮没有修改 `script.normalized.json` 或 `script.voiced.json`，没有实现全片字幕对齐和混剪。下一步如做渲染适配，需读取这份草案并验证资产存在、片段覆盖时长与音轨策略；不能把草案本身当作成片验收。

## 6. 实际执行命令与记录

工作目录为仓库根，除明确注明者。主要实际执行命令：

```bash
node --version
npm --version
npm view remotion version engines dist.unpackedSize --cache /tmp/vp003a-npm-cache
npm view @remotion/cli version engines --cache /tmp/vp003a-npm-cache
fc-list :lang=zh family file
npx --yes --cache /tmp/vp003a-npm-cache create-video@4.0.539 --yes --blank --no-tailwind experiments/day9-remotion
```

实验目录中实际安装/检查：

```bash
npm install --save-exact @remotion/media@4.0.539 @remotion/fonts@4.0.539 --cache /tmp/vp003a-npm-cache
npm audit --json --cache /tmp/vp003a-npm-cache
npm run lint
node node_modules/@remotion/cli/remotion-cli.js versions
node --require ./scripts/loopback.cjs node_modules/@remotion/cli/remotion-cli.js studio src/index.ts --no-open --port=9320
```

准备/渲染/验证实际调用（仓库根）：

```bash
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs experiments/day9-remotion/scripts/prepare.ts
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs experiments/day9-remotion/scripts/render.ts
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs experiments/day9-remotion/scripts/validate.ts
```

字体抽取实际执行 `TTFont('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', fontNumber=0).save(...)`，完整复现命令见实验 README，实际哈希见 font-conversion.json。脚本 render.ts 保存完整 Node/CLI/浏览器/编码参数与时间；validate.ts 调用 ffprobe、ffmpeg 完整解码、PCM 时序对照和三个抽帧，并验证受保护文件哈希。另用已有 Playwright 对本地 Studio 做字体/页面检查，没有新增浏览器测试环境或下载浏览器。

旧编排器目录执行：

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test src/import/excel.test.ts src/voice/*.test.ts
```

结果 23/23 通过，记录为输出目录 `orchestrator-tests.tap`。另执行 git diff --check 及 git check-ignore：私人 WAV 副本、字体副本和 MP4 均被忽略，没有提交或推送；根 .gitignore 未修改。新增实验源代码不包含音频二进制。

本轮新增文件范围：本报告；`experiments/day9-remotion/` 的官方脚手架、固定依赖锁、OpinionCard、Root、准备/渲染/验证脚本和实验说明；忽略目录中的矩阵、草案、视频、日志、关键帧与校验记录。未修改旧业务源文件。

## 7. 下一阶段 Wan 最小验证建议（本轮不执行）

建议只做**第 1 镜的一张静态底片＋一次 3–4 秒图生视频验证**：

1. 先审第 5 镜视觉风格及十镜矩阵，再由持有人批准 Wan 阶段；不预先批量出十镜。
2. 只读复核 `/home/chen/comfyui-models/` 既有资产、实际文件完整性、ComfyUI 节点及可用 API 工作流。上次审计只确认该 Wan 子目录的 VAE，不能认为完整模型已齐，也不能据此重复下载。不得迁移或删除既有资产。
3. 若需要新的程序/权重，先固定版本、许可、下载清单、空间和显存预算，另行授权；遵循公共 AI Server 目录与 localhost HTTP 架构。GPU 单任务保护必须覆盖整个生成过程。
4. 第 1 镜使用本报告拟议的夜间工位图片，先验收静态构图，再采用非常轻微推移。一次生成记录 seed、模型/工作流哈希、提示词、耗时、峰值显存、实际画幅/帧率/时长和缺陷，不把这些拟议指标写成已实测。
5. 单段仅覆盖全镜 12.295 秒中的 3–4 秒，其余用同图运动及文字承接；不加速、不截断配音，不要求模型一次生成整镜。
6. 检查人物/手部稳定、屏幕伪字、运动合理性、裁为 9:16 后留字空间及实际情绪增益；与静图运动版本对比。只有收益明确才考虑第 7 镜的第二候选，否则保留图片运动，不扩散 Wan 工作量。

## 8. 完成、未完成、阻断与评审点

已完成：真实 Excel 对照、十镜矩阵、最小时间线草案、第 5 镜完整可解码 MP4、中文实际字体验证、音频完整性/时序对照、耗时记录、既有测试回归及输入冻结保护。

未完成（按本轮边界保留）：其他九镜媒体、AI 图片、Wan 部署与推理、十镜正式字幕分句对齐、全片混剪。没有未解决的实验渲染阻断；字体问题已修复，依赖 audit 风险记录保留。IndexTTS2 当前仍限私人非商业评估，样片不得公开发布，此边界没有因画面渲染而改变。

需要持有人评审：

1. 第 5 镜蓝紫风格、标题层级、抽象功能块和整体运动是否合适，音画是否自然。
2. 是否认可“八镜 Remotion、一镜图片运动、一镜少量 Wan 候选”的分配。
3. 是否接受先仅做第 1 镜的 Wan 最小验证，以及字幕草案后续需要正式分句对齐。

本轮在交付后停止，等待评审，不自动进入 Wan 或全片生产。
