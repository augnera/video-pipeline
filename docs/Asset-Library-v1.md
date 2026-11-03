# 小陈AI说素材库 v1.0

默认路线：真实动态视频/真实录屏作为底层，Remotion按真实旁白时钟叠加关键词、数字和必要解释。完整图解按表达需要使用；本地AIGC视频继续STOP，不是素材准备或出片依赖。

本库是现有Asset/AssetMatch v0.1的JSON复用层，不是新Agent平台或数据库。`local-assets/library/index.json`保存原Asset数组、SHA关联的复用档案和历史引用；原项目Asset档案、素材与时间线不改。`orchestrator/config/asset-library-v1.json`集中入口和少量匹配规则，`asset-library-curation-v1.json`是本轮真实抽帧检查形成的首批复用建议，不是自动识别结果。附加字段由`orchestrator/contracts/asset-reuse-v1.schema.json`最小校验，Asset/AssetMatch原契约保持。

先由Director提出画面需求，再检索本地档案；必要时调用可替换VideoSeek CPU检索，结合原档案过滤。拿到候选后Director二次编排并绑定原Asset/AssetMatch。没有合适候选时输出具体缺口，不使用不相干实景、文字卡或静态缩放凑时间。真正AI操作/上线/产品功能必须有实际录屏，普通键盘素材仅作工作情境。

## 日常入口

在仓库根执行，输入和输出路径可绝对或相对根目录；Python3需已有jsonschema、ffprobe，不启动模型。运行记录及预览是受忽略本地产物，不上传素材。

```bash
# 校验现有档案、SHA合并别名、探测真实媒体、复用历史时间线使用记录
npm --prefix orchestrator run assets -- build
npm --prefix orchestrator run assets -- status
npm --prefix orchestrator run assets -- preview --out orchestrator/output/asset-library-v1

# 简单本地语义检索（规则模式，不使用文件名为画面造描述）
npm --prefix orchestrator run assets -- search --query '手写笔记' --seconds 3 --out orchestrator/output/asset-search-notes

# Director实际需求JSON → 既有Asset/AssetMatch/Proposal交接
npm --prefix orchestrator run assets -- match --brief /absolute/visual-brief.json --out /absolute/reuse-proposal

# 无匹配后生成少量明确需求队列；此命令不联网下载
npm --prefix orchestrator run assets -- supplement --proposal /absolute/reuse-proposal/asset-proposal.json --out /absolute/network-gaps.json

# 取得单个实际素材及抽帧、来源/许可后入库；字节相同只加引用，不再复制媒体
npm --prefix orchestrator run assets -- ingest --asset /absolute/asset-v0.1.json --reuse-record /absolute/reuse-record.json

# 明确审核意见单独留证，不把技术通过、来源存在或Agent看过当持有人批准
npm --prefix orchestrator run assets -- review --decision /absolute/review-decision.json

# 只在本期实际时间线完成后记使用；相同timeline SHA+sceneId幂等
npm --prefix orchestrator run assets -- record-use --timeline /absolute/final-timeline.json
```

`build`只扫描配置列出的素材/录屏/渲染暂存目录。抽帧、暂存复制按SHA登记，不删除、移动或重存视频。未知字节列为未编目辅助/派生文件，不能凭名字判断可用。已知笔记裁切片关联原SHA及既有渲染器来源，不作为独立新授权原片。增加其他素材目录/实际档案时修改配置；不要扫描声音参考、模型、GPU事故证据或整个磁盘。

网络补充流程：先读`network-gaps.json`，交互式Agent通过官方允许的页面/API检查少数候选、具体许可和作者；下载单个确实匹配的文件，再做ffprobe/抽帧理解及`ingest`。不得运行历史`acquire-stock.py`当通用搜库器：它是VP010固定列表脚本。当前`supplement`只有缺口清单，不是自动网络搜索/下载服务；遇登录/访问限制保留缺口。新闻截图按事件scope管理，不作为通用已授权库存。

## 最小画面需求

复用既有Visual Brief requests，可增添显式画面约束。`concepts`为Director给出的画面方向；存在时优先于旁白中偶然词汇。中文旁白不可改，英文CLIP查询是单独的可审查翻译，不能写回旁白。

```json
{
  "episodeId":"next-episode",
  "mode":"rules",
  "modelUsed":null,
  "fps":30,
  "requests":[{
    "requestId":"work-detail",
    "shotNumber":7,
    "narration":"此处填写本期冻结原句",
    "goal":"手部键盘工作情境，不伪称AI实际运行",
    "concepts":["keyboard_work"],
    "mustShow":["keyboard_work"],
    "durationSeconds":3,
    "noVisibleFace":true
  }]
}
```

时长优先用实际配音的from/to及fps或明确durationSeconds，未给时长不猜整段覆盖。只从已有usableSegments中选足够长的片段。新闻素材需显式eventScope匹配记录scopeEpisodeId。`mustShow`用于actual_ai_execution、actual_product_deployment等硬约束；库内没有这些内容时不让CLIP相似图像替代。

初始软约束：同一候选编排每素材最多2次，不连续相同；近3个登记期数使用次数扣分、封顶2次。不把历史修订版/缓存登记顺序说成实际发布日期；无发布时间证据。语义合格先于去重/多样性，允许因无替代素材产生缺口，不强行凑复用率。配置可调整，不把本轮数量当永久配额。

## 叠加和裁切

复用档案composition记录输出归一化坐标的建议区域、保守主体保护区及字幕区。建议基于实际看过的抽帧和contain/留白布局；不是模型检测出的精确主体框。返回overlaySuggestions包含与既有overlay-v1兼容的像素rect和protectedRects；文字、出现/退出帧、动画由Director依据实际音频填写。

本轮只输出建议，不静默改变已有画面。换cover裁切、需要阅读UI、存在头脸或主体跨画面运动时必须检查实际输出帧；默认不自动选未经不露脸裁切评估的素材。右/左空白不是永久空白。已有通用叠加渲染能力沿用Production v1，不新增渲染器。

## 许可与审核

`verified_for_local_experiment`仅代表已有本地试验范围记录，不等于商业公开发布授权。原来源、sourceType、作者、许可条款/日期/证据文件SHA均保留；下载文件仍为web_stock。取得时间未记录时acquiredAt=null，不拿文件mtime或许可核验日填成取得时间。

`records[sha].publicRights`单独区分confirmed/pending/rejected；公开自动调用还必须reviewStatus=approved、许可证据完整。当前14项全为pending_human，公开授权全待确认，无自动提升正式素材。许可/审核拒绝项从自动选择排除；“对本需求不匹配”仅记录在候选审计中，不把文件永久判为坏素材。

review decision需sha256、reviewer、reviewedAt、reviewStatus、evidenceFiles；公开确认另需publicRightsStatus、licenseSourceUrl、allowedUse。Restricted/private-only不会因一份审核JSON自动变成公开许可，需先解决具体许可依据。首次入库强制pending_human。Asset本身与本期AssetMatch仍分离。

## 生产接线和恢复

`production-v1.json.assets`已接入统一CLI：缺素材交接时先调用本地检索并保存local-reuse-brief/asset-proposal/asset-catalog/asset-matches。无缺口也要Director按实际时长、裁切、阅读需求二次编排，再以既有--resources绑定JSON并resume；这不是要求持有人逐镜批准，而是现有复杂编排JSON交接步骤。没有服务会自动补真实产品操作。实际voice完成/缓存可用时复用其时长；音频未就绪时不猜时长。缓存指纹包括库索引、库策略和检索代码。

若索引缺失运行build；文件/抽帧SHA变化则停止使用该候选并重新核查，不修改原记录来掩盖差异；来源冲突列integrityIssues阻止自动使用。使用记录与局部新增资产保存在同一索引，重复build不清空。源片、历史时间线和已验收成片保留原位。

VideoSeek为可选隔离检索适配器，关闭服务后规则检索仍可运行；配置、准确CPU命令、接口限制及实测结果见`docs/reports/Video-Library-CPU-validation.md`。不将CLIP分数当视频理解或质量评分。封面、公开发布和本地AIGC视频不在本流程内。

日常短Prompt：

> 按AGENTS.md、Production-v1.0和Asset-Library-v1制作本期。先由Director根据冻结旁白提出真实画面需求，Asset Agent先查本地库，必要时用已验证的VideoSeek CPU适配器补召回；只为明确缺口少量搜索或真实录屏。保留来源/许可/使用记录，二次编排底层视频＋必要叠加；不以相似度代替动作核查，不启动本地AIGC，不发布。

当前明确限制：`RoutineRoot`实景分支目前固定cover，尚未消费库内contain建议；录屏分支已有contain。横屏主体保全建议只作Director输入，不是自动构图承诺。候选`productionReady=false`，`preparationRequired`指出需用既有renderPath/源SHA绑定的派生片接线或另行最小支持；本任务不修改渲染器、不重做成片。录屏默认不提供“空白”叠加区，须看最终画面后再定位置。

## 网络补充接线（2026-10-29）

默认入口现在先使用本地Asset库，缺口再按Director的具体画面查询搜索Pixabay/Coverr（视频）或Unsplash（图片）。`npm --prefix orchestrator run assets:web -- discover --brief <brief.json> --out <new-out>` 可执行同一机制；`--plan-only`不联网。缺少queryEnglish/stockSearchQuery只报需求，不把抽象旁白直接搜索。每源每查询最多3项，先多帧/实际预览，后显式下载入库，不自动扩张库存。

`.env`不入Git；Unsplash只使用Access Key。403/额度/签名URL限制逐源保留，不绕过、不自动重试。下载、实际匹配、人工审核、公开许可独立记录；图片不计动态缺口解决。准备片复用源时钟零点及覆盖区，带原SHA/派生SHA校验，经原AssetProposal→现有生产timeline交接。具体命令、三源实测和两条候选见[补库报告](reports/Asset-Network-Supplement-v1.md)。
