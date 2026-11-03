# Asset Agent 网络补库闭环 v1.0｜2026-10-29

本轮素材验收已收口：持有人观看两条候选后均反馈“OK”。`pixabay-215751`、`pixabay-26213`人工视觉审核现为 **approved**，仅适用于既有可用片段、9:16准备片与适用范围；**许可仍为verified_for_local_experiment，公开权利仍pending**。原14项→16项；当前视觉通过2项，其余14项仍待人工确认，公开授权confirmed仍为0。5条动态缺口中2条已有视觉确认素材，另3条缺口保留。Coverr额外回调403继续为未解决项。未重新下载、抽帧、编码、重算向量或重做成片。

统一预览：`orchestrator/output/asset-network-supplement-v1/index.html`。机器记录：该目录 `platform-validation.json`、`new-asset-catalog.json`、`candidate-asset-matches.json`、`remaining-gaps.json`、`manifest-sha256.json`。音视频/缓存/本地索引被Git忽略，不写入仓库。

## 事实及安全

仓库 `/home/chen/work/video-pipeline`，main，HEAD `cc562624f8d36cf06fde9e373e72e5451e973ce1`，本地origin/main同HEAD；未fetch，不声称服务器状态。既有GPU事故、素材库及生产入口未提交修改均保留，未提交/推送。本轮查阅AGENTS、PROGRESS、既有Asset/AssetMatch与CPU实践报告，复用原库，不建第二事实源。

根.env存在、已忽略、未跟踪；日志仅报告配置存在。安全加载按指定配置名取值，Unsplash只用Access Key的Client-ID认证，不使用Secret Key。API原始响应中的鉴权/签名查询值脱敏；URL及HTTP错误不回显密钥。Pexels没有配置凭据，保留先前受阻证据，不额外部署MCP或购买服务。

全程CPU：FFmpeg软件读取/解码与libx264；VideoSeek实际图/文会话均CPUExecutionProvider，usingGPU=false。未初始化CUDA、启动Wan或修改GPU/模型环境，事故STOP保持。

## 三个来源独立实测

| 来源 | 搜索 | 预览与下载 | 记录与限制 |
|---|---|---|---|
| Pixabay | 6次具体查询，响应保留并缓存24h；未批量囤积 | 已实际检查夜间办公、LED、疲惫办公、ChatGPT首页、微软楼宇等多帧；下载2条完整视频视觉流 | 普通HTTP HEAD/部分GET为403，标准FFmpeg无鉴权伪装读取成功；显式ffmpeg-copy取视觉流、去音轨、MP4封装，本地SHA不冒称远端原文件SHA |
| Coverr | 夜间工作查询3项；疲惫摘镜查询0项 | 1项API明确is_ai_generated=true，排除；1项真实金融图表操作六帧检查并完整下载、软件解码 | 原始API is_ai_generated=false，不代表本次真实操作演示；作者未知留null。下载用mp4_download，官方文档称无需额外动作；旧代码额外PATCH返回403，完整保留，未重试。已修正后续避免同一下载重复计数，不宣称PATCH成功 |
| Unsplash | 桌面笔记本图片查询3项 | 实际查看1张竖幅俯拍，下载regular图片1080×1619；下载回调GET为200 | API Access Key认证，作者Justin Morgan；API展示热链及摄影师/Unsplash署名；图片只补图片表达，不计动态缺口解决。无付费/Plus素材 |

准确的搜索、预览、下载状态与SHA见 `platform-validation.json`、各 `*-acquisition.json`。一次重复图片预览保留为独立访问证据，不作新增素材计数。Coverr/Unsplash下载验证文件保留在独立受忽略网络媒体目录及取得账本，`downloaded-validation-only.json` 明确未入正式库；不对不匹配素材强行建立本期AssetMatch。

下载前查来源ID/URL和已验证账本，下载后查SHA；重复fetch实测不再次请求网络。下载不是许可或人工审核通过。已保存有限失败，包括Pixabay170305抽帧无有效输出，未冒称预览成功，未自动重试。

## 两条最终候选

| 候选 | 对应原需求及可用范围 | 9:16实际构图 | 叠加与限制 |
|---|---|---|---|
| pixabay-215751，G3Remote | Day9镜1夜间工位，原片0–4秒；原片18.64秒，1920×1080/25fps | 实际裁切x300/y500/w1350/h580，保留手、键盘、电脑桌面；缩放并蓝紫留白，1080×1920/30fps，120帧 | 上方留白可叠重点，原片有人脸，必须使用绑定准备片；8个准备片抽样帧不含脸，不冒称全片人脸检测或人工作品验收 |
| pixabay-26213，MariodePante | 微软一期镜1楼宇资料，原片0–3秒；原片40.04秒，1920×1080/约29.97fps | contain保全整栋楼和Microsoft标识，1080×1920/30fps，90帧；已嵌入“资料：布加勒斯特｜2019年发布” | 上方可叠短标题，保留资料说明；2019是来源发布日期，不冒称拍摄日期/美国总部/本次VEO现场，商标建筑权利待审 |

预览文件为 `pixabay-215751-portrait.mp4`、`pixabay-26213-portrait-disclosed.mp4`。两条均全软件解码、尺寸/帧率/帧数检查；实际抽帧核查主体与中文字形。上方建议归一化x=.08/y=.08/w=.84/h=.10，即约x86/y154/w907/h192；各记录保存实际坐标，不同布局不盲目套用。字幕安全区y1648–1820独立保留。主体保护矩形、准备片SHA/原素材SHA、源时钟零点、可用覆盖区均写入复用记录。

`candidate-asset-matches.json`保持各自sourceEpisodeId、shotNumber及冻结旁白，并附准备片与叠加建议；不是把两个项目拼成新的成片。Asset仍只记录素材事实；AssetMatch保留具体项目关系，matchStatus=proposed。原片不改、不移动、不重复裁切存为新原Asset。

## 剩余3条缺口

1. **Day9镜3，身体透支/疲惫，3秒。** 旧需求为摘眼镜，尚无合适不露脸连续动作。旁白并未限定摘镜，可由Director改编为久坐后起身、扶腰或放下鼠标休息等真实情境；不必是产品操作。现有普通打字不能自行证明疲惫，本轮未改编、未计解决。
2. **Day9镜8，尽快上线/交给现实，4秒。** 保留“实际部署”目标就必须真实录屏：部署进度和结果可追溯。可另行改编为成品交付/用户反馈的真实过程，不改变旁白含义，但不得称其为上线演示。需要Director重新给目标和证据，本轮原缺口保留。
3. **微软镜8，借助AI开始完成工作，4秒。** 保留“AI生成报告”演示就必须真实AI操作与结果，ChatGPT首页、普通金融图表均不合格。旁白允许非演示的资料图片加必要解释，但只能算图片/图解替代，不能记作动态视频缺口解决。现阶段真实操作仍缺。

本轮未改冻结10需求、旁白、字幕、Excel、历史成片或生产TTS/BGM配置。

## 默认流程与接线

`production-v1.json.assets`现在引用网络配置，先由现有Asset库匹配，再针对缺口读取Director明确提供的`queryEnglish`/`stockSearchQuery`：视频查Pixabay、Coverr；图片查Unsplash。没有具体画面查询词就记录DIRECTOR_QUERY_REQUIRED，不把抽象旁白直接拿去搜。

统一复用`assets:web discover`，每源每需求最多3项、首批1页；先实际预览/审核，再显式fetch与ingest，automaticDownload=false。不让搜索结果替Director编排，不自动囤积。新增源码/网络配置已加入生产阶段指纹，避免沿用旧接线缓存。规则模式mode=rules/modelUsed=null；实际交互式抽帧观察与CPU CLIP召回分别记录，未虚构无人值守视觉服务。

准备片通过同一asset-proposal→既有生产timeline→stagePublic接线，校验原SHA、派生SHA、零点与可用覆盖；不重建平行时间线，不移动字幕。现有RoutineRoot的cover不能直接安全消费横屏contain建议，因此仅两条实际完成9:16准备的候选携带renderPath；其他候选仍不可自动判productionReady。

## 验证与复用结果

- 元数据规则：原5/10候选→7/10候选，三缺口保持；并非人工接受率。
- VideoSeek：13视频SHA绑定映射，实际CPU索引完成13项，随后重跑10需求/前三候选，最终7条有合格候选、3缺口。耗时及会话证据见 `videoseek-final/index-result.json`、`verified-videoseek/retrieval-results.json`，CLIP不是完整动作理解。
- 增量索引初次0文件未被计为成功。定位固定上游对symlink目录的增量发现遗漏，使用其已有register_library_videos并按已有video_ids选择入口处理，保留两次0项记录；未改上游、未复制原媒体。历史CPU验证输出不覆盖。
- 生产实际localAssetProposal接线用原10需求的派生副本验证7/3，并进入缺口机制；为遵守持有人停止搜索，副本移除外搜词，准确记录网络请求0。真实三源请求已有独立证据，不再扩大搜索。
- 素材/网络测试15项、生产10项、原契约12项PASS；含脱敏、Access Key独占、403单次失败、重复下载阻断、缺少导演查询、不合法回调、准备片时钟/覆盖保护。不以测试代替真实媒体证据。
- 未新增生产使用记录，原36条历史使用保留。预览不伪装成新一期正式使用。主体动态自然度、构图审美、最终匹配及公开使用授权均待持有人，NOT_EVALUATED不计PASS。

## 许可核查（2026-10-29）

- [Pixabay API](https://pixabay.com/api/docs/)：24h缓存/限流/禁止系统性下载；[内容条款](https://pixabay.com/service/terms/)支持按条件编辑使用，另有品牌、人物、建筑等第三方权利限制。两候选本地实验许可有记录，公开用途pending。网页直接访问403与浏览器核查依据分别保存，不声称保留了不存在的原HTML。
- [Coverr API](https://api.coverr.co/docs/)、[鉴权](https://api.coverr.co/docs/auth/)、[下载规则](https://api.coverr.co/docs/videos/)：API展示须来源品牌可点击标识；mp4_download本身计下载，其他复用才需PATCH。API说明关于商业用途与[内容许可](https://coverr.co/license)的措辞范围待确认，不根据平台名称自动判商业使用通过。本次不公开展示其素材搜索库。
- [Unsplash文档](https://unsplash.com/documentation)、[API指南](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)、[许可](https://unsplash.com/license)：公共访问用Access Key；API展示用原hotlink、摄影师及Unsplash署名；实际选择下载触发download_location（本次200）。普通免费图片许可与API展示义务分开记录，品牌等额外权利不能自动消除。

## 实际命令与续跑

仓库根目录执行，凭据留在被忽略.env，勿放命令行。输出用独立目录，历史输入不覆盖：

```bash
npm --prefix orchestrator run assets:web -- keys
# 默认本地→缺口外搜入口；本轮已停止搜索，此命令留供下期明确需求使用
npm --prefix orchestrator run assets:web -- discover --brief <director-brief.json> --out <new-output>
# 只核查接线，不发网络请求
npm --prefix orchestrator run assets:web -- discover --brief <director-brief.json> --out <new-output> --plan-only
# 单个平台搜索（下一期有明确缺口时使用）
npm --prefix orchestrator run assets:web -- search --source pixabay --query 'hands typing laptop night' --out <new-search.json>
# 看过真实多帧并填写preview_accepted+证据后，才下载；重复来源/字节会复用
npm --prefix orchestrator run assets:web -- fetch --candidate <accepted-candidate.json> --out <receipt.json>
# 本轮两条已有真实资产/复用记录，重复入库按SHA幂等
npm --prefix orchestrator run assets -- ingest --asset orchestrator/output/asset-network-supplement-v1/pixabay-215751-asset.json --reuse-record orchestrator/output/asset-network-supplement-v1/pixabay-215751-reuse.json
npm --prefix orchestrator run assets -- ingest --asset orchestrator/output/asset-network-supplement-v1/pixabay-26213-asset.json --reuse-record orchestrator/output/asset-network-supplement-v1/pixabay-26213-reuse.json
npm --prefix orchestrator run assets -- match --brief orchestrator/output/video-library-cpu-validation/ten-real-needs.json --out <new-match-output>
npm --prefix orchestrator run test:assets
npm --prefix orchestrator run test:production
```

预览/检查、9:16制作的实际FFmpeg参数见输出各`*-command.json`与`*-layout-validation.json`。源片若普通HTTP已报403不自动重试换身份；本轮Pixabay显式使用标准FFmpeg读取已留证，不作为通用规避策略。签名URL被脱敏后不能当下载凭据重用，准确报BLOCKED，按官方接口重新取得短时授权需后续任务允许。

初次交付时两条候选等待观看；持有人现已反馈OK，最新验收与后续边界见下节。未要求补录或自动发布。


## 持有人视觉验收收口（2026-10-29）

- 原文裁定：“持有人已观看两条候选，均反馈‘OK’。”依据保存为输出 `holder-review/holder-decision.json`，具体两个审核决定由现有`assets review`入口执行，原人工状态/许可/片段/构图和Coverr错误摘要另存`pre-review-state.json`。
- 当前素材目录为 `local-assets/library/index.json` 与输出 `reviewed-asset-catalog.json`；原 `new-asset-catalog.json`、各取得/入库文件是历史pending_human原始记录，保留不倒改。已有build会保留canonical中的明确reviewDecision，不把历史入库状态覆盖成未审核。
- 原片与准备片SHA、源范围0–4秒/0–3秒、9:16布局和动画叠加区域、主体/字幕保护区、新闻资料披露及事件scope均保持。人工视觉通过不扩大至整段18.64秒/40.04秒原片、其他构图或任何新项目使用情境。
- `candidate-asset-matches.json`人工视觉字段为approved；matchStatus仍proposed，持有人认可素材不等于授权重新编排或制作成片。两个Asset自身license对象/licenseStatus及附属publicRights整对象与审核前逐项相等，未写入新的公开许可核验时间。
- 当前素材预览、统一预览与VideoSeek的SHA映射审核元数据已更新；向量基于同一原片，不需重新计算。原CPU召回结果保留为历史，新的元数据匹配见`holder-review/current-metadata/`，仍7条匹配/3条缺口。实际校验记录见`holder-review/validation.json`。
- Coverr403错误及统计回调记录原字节保留，未解决、未重试。此前下载成功不抵消该未解决记录。本轮不检索新素材，不访问平台、不启动GPU/模型或临时服务、不重做成片、不提交推送。后续如需公开视频仍须独立确认素材/BGM等授权；本轮素材视觉验收至此结束。
