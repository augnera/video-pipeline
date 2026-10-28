# VP-009｜Day9 完整混合视觉成片

日期：2026-10-28。完整私人审阅版已交付，自动 Quality Gate 为 WARN。后续已收到持有人观看反馈：整体约60分，Remotion占比过多、部分转场不自然；详见文末记录。BGM与其他未明确评价项目不补造验收结论。未公开发布。

## 结果

- [完整成片 day9-full.mp4](../../orchestrator/output/day9-vp009/day9-full.mp4)：1080×1920、30fps、2514帧、83.8秒，十镜全覆盖。`sample.mp4` 是 Quality Gate 使用的同一文件数据，不是另一版本。
- [最终时间线](../../orchestrator/output/day9-vp009/timeline.json)、[逐镜审视 Markdown](../../orchestrator/output/day9-vp009/shot-review.md)、[完整逐镜审视 JSON](../../orchestrator/output/day9-vp009/shot-review.json)、[逐镜素材与转场清单](../../orchestrator/output/day9-vp009/shot-and-transition-list.json)。
- [Visual Brief](../../orchestrator/output/day9-vp009/visual-brief.json)、[Asset Proposal](../../orchestrator/output/day9-vp009/asset-proposal.json)、[转场候选及选择审计](../../orchestrator/output/day9-vp009/transition-selection-report.json)、[选择配置](../../orchestrator/output/day9-vp009/transition-selection-config.json)。
- [Quality Gate](../../orchestrator/output/day9-vp009/quality-report.json)、[修复记录](../../orchestrator/output/day9-vp009/repair-log.json)、[交付核验](../../orchestrator/output/day9-vp009/delivery-validation.json)、[全片17段抽帧总览](../../orchestrator/output/day9-vp009/review-contact.jpg)。
- [完整混音 WAV](../../orchestrator/output/day9-vp009/day9-mixed-audio.wav)、[BGM配置/响度/人声残差](../../orchestrator/output/day9-vp009/bgm-config.json)、[循环检查](../../orchestrator/output/day9-vp009/loop-validation.json)、[字幕原件副本](../../orchestrator/output/day9-vp009/subtitles.srt)。

完整配音原件83.771564626秒全部保留。画面向上取整为83.8秒，差0.028435374秒，小于1帧；未加速配音、移动字幕或截掉结尾。最终MP4只有一条混合音轨，素材视频全部静音、OpinionCard音轨关闭，没有两份旁白叠加。

## 开工核实与复用

真实仓库 `/home/chen/work/video-pipeline`；分支 `main`；HEAD `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`。相对本地 origin/main 落后0、领先9。原有大量未提交VP成果、README/PRD移动/删除和package修改保留，未checkout/reset/commit/push。[开工工作区](../../orchestrator/output/day9-vp009/repository-before.json)、[结束快照](../../orchestrator/output/day9-vp009/repository-after.json)。仓内未发现 AGENTS.md，遵循持有人消息中的长期要求，并读取 PROGRESS.md、VP-008报告、现有代码/调用链/测试与配置。

复用原 Excel 导入器重新只读读取真实十镜，并逐镜比对冻结 voiced.json 旁白；使用 VP-005A 实际音频时间线与45条字幕，没有使用Excel初稿约32秒的建议时长去压缩配音。复用 `visual-mvp` 的 Asset Agent `recommend`、`finalize`、Foundation图解、已验收OpinionCard、`PocMotionSample`/字幕层、VP-008 GL选择器、官方适配器及原Quality Gate；没有重建合成器/平台/素材索引。

运行环境沿用Node26.7.0、Remotion4.0.539、现有FFmpeg6.1.1、Chrome149，ANGLE SwiftShader离屏软件WebGL和CPU libx264。原依赖及锁文件哈希未变。GPU视频模型未启动，没有Wan、ComfyUI或付费生成API调用。

本轮运行编排明确 **rules / modelUsed=null**。导演规则读取旁白、字幕语义切点和已有素材事实，不宣称可调用模型自主理解。交互式图片查看只用于复核素材事实，不伪称生产模型服务。[本轮事实复核证据](../../orchestrator/output/day9-vp009/visual-review-evidence.json)。

## 出片前逐镜审视与缺口处理

现有正式索引只有4项：两段Mixkit办公实景、一张既有AI首帧、原第5镜Remotion输出。扫描的其他历史渲染/图片不因“文件存在”就变成有授权、可匹配的素材。[本地盘点](../../orchestrator/output/day9-vp009/local-inventory.json)。没有找到本人产品操作/上线/用户反馈录屏；没有拿演员电脑屏幕冒充真实产品操作，也没有生成虚构产品界面。

实际复核两段实景接触表及返回桌面片段11.7秒帧：可确认人物、眼镜、手部、桌面及动作，不能证明其身份、疾病、真实熬夜时长或已发布产品。选用范围互不重叠：

|素材|实际片段|画幅与匹配|授权/审核|
|---|---|---|---|
|AI首帧|开场0–2.5s；含过渡可见约2.8s|9:16近似原图，缓推/平移，随后切实景；不伪称视频动作|持有人授权本地复用，发布披露待审|
|mixkit-39839|0–4.267s、5.5–9.033s|实测10.844s足够；952×1130窗口保留人物/手部/显示器，蓝紫背景补足竖屏，不做激进满屏裁人|Free License本地实验许可有历史来源证据；作者未公开仍null，人工pending_human|
|mixkit-39854|2–7.233s、8.1–11.8s|实测12.012s足够；原生竖屏，前段摘眼镜/低头，后段回桌面；只作语义隐喻|同上，人工pending_human|
|第5镜|复用原OpinionCard组件自身动画时钟|保持原字形/层次/节奏，只关闭品牌及独立音轨|内部本地实验；冻结原MP4未改|
|其余语义缺口|本地SVG概念图解|分支、风险回路、阶梯基础、最小流程、门槛/时钟、验证断连、反馈回路、工作结构；明确不是产品UI|内部制作，人工视觉未评价|

逐镜安排：

|镜头|原旁白时间秒|实际画面来源/模板|片段数|
|---|---|---|---:|
|1|0.000–12.295|ai-night-desk-v1；mixkit-39839；branch|3|
|2|12.295–19.753|risk-switch|1|
|3|19.753–28.532|mixkit-39839；mixkit-39854|2|
|4|28.532–37.953|system-foundation|1|
|5|37.953–41.516|accepted-opinion-card|1|
|6|41.516–51.217|feedback-loop；minimal-flow|2|
|7|51.217–59.981|launch-barrier；validation-gap|2|
|8|59.981–69.734|reality-loop；mixkit-39854|2|
|9|69.734–76.006|method-system|1|
|10|76.260–83.772|daily-structure；closing|2|

17个视觉片段均有语义理由、实际区间、素材身份/来源/许可状态或图解模板；[JSON审视](../../orchestrator/output/day9-vp009/shot-review.json)保存逐条记录。素材时长和9:16构图不只检查文件存在：Agent验证许可、本地文件哈希、真实源区间与请求长度，现有画面证据/最终抽帧复核主体保留情况。

非阻断缺口：缺实际产品演示、真实用户反馈、本人工作录屏。已在本轮范围内以概念动态图解解决表达，不将它们写成已取得真实素材。全片图解共64.6秒，实景16.7秒，AI图片2.5秒。中段28.53–66.03秒连续以7段图解表达，结构不同但媒介类型集中，因此质量门保留VQ-02 WARN，不能自动宣称观看体验或发布质量通过。

## Visual Director 与转场

复用 VP-008 固定GL Transitions2.0.0目录及默认已验证参数；只允许VERIFIED、排除人工REJECTED与FAILED（TangentMotionBlur禁止）。本轮未获人工评价的9项均标 isTrial=true。保留7处硬切，使用9处GL过渡，数量不是验收目标。

依据显式语义关系、前后视觉类型、阅读需求、时长和重复/强度约束，未伪造主体/焦点/方向识别。重要原观点卡及最终CTA需要阅读，保守硬切。方向信息缺失时使用上游验证默认值并在审计中列为未知。

配置：18帧转场；最小动态转场间隔4.5秒；强效果间隔8秒；强效果最多floor(16×0.1)=1，实际只有CircleIris1处；单效果最多2次、连续相同最多1次。显式限制集中在本片配置，其余沿用VP-008。没有按镜头编号轮换或随机抽库。[候选/排除原因/评分/约束审计](../../orchestrator/output/day9-vp009/transition-selection-report.json)。

|前后视觉|切点秒|选择|持续帧|语义|评价|
|---|---:|---|---:|---|---|
|visual-1→visual-2|2.500|glt:SimpleZoom|18|detail|试用|
|visual-2→visual-3|6.767|hard_cut|0|conclusion|硬切|
|visual-3→visual-4|12.300|glt:Fade|18|continuation|试用|
|visual-4→visual-5|19.767|glt:CircleIris|18|chapter_change|试用|
|visual-5→visual-6|23.300|hard_cut|0|progression|硬切|
|visual-6→visual-7|28.533|glt:ZoomWipeLeft|18|conclusion|试用|
|visual-7→visual-8|37.967|hard_cut|0|chapter_change|硬切|
|visual-8→visual-9|41.500|hard_cut|0|progression|硬切|
|visual-9→visual-10|45.867|glt:DirectionalWipe|18|progression|试用|
|visual-10→visual-11|51.200|glt:ColorPhase|18|chapter_change|试用|
|visual-11→visual-12|55.833|glt:RandomSquares|18|continuation|试用|
|visual-12→visual-13|59.967|hard_cut|0|conclusion|硬切|
|visual-13→visual-14|66.033|glt:ZoomInOut|18|detail|试用|
|visual-14→visual-15|69.733|hard_cut|0|conclusion|硬切|
|visual-15→visual-16|76.267|glt:ColorCoords|18|chapter_change|试用|
|visual-16→visual-17|81.800|hard_cut|0|continuation|硬切|

转场仅在原切点周围重叠18帧，D+D−D=D；总帧数始终2514，字幕/音频不参与背景缩放、扭曲、甩动或模糊。源范围之外最多夹持9帧（0.3s），没有长冻结补时。默认不显示“小陈AI说”“情景示意”等常驻角标；正常字幕中的品牌口播保留；AI素材披露机制独立待审。

## BGM 与完整音频

使用持有人固定 `local-assets/music/bgm/AI科技新时代1.mp3`，本轮没有明确接受档位记录，依施工单默认 **+3dB试听**，holderAccepted=false。沿用baseline-17.3dB加3dB，音乐stem-14.3dB、master-1.5dB。原音乐/配音文件未改。

实际解码音乐27.454708秒；4次复用，3处1秒等功率交叉淡化：26.454708–27.454708、52.909417–53.909417、79.364125–80.364125秒；开头淡入0.5s、结尾淡出1s。没有宣称节拍对齐。接缝相邻样本差约0.0082/0.0268，100ms局部RMS变化约-0.80/-1.57dB，没有硬切式数值断裂；音乐听感自然度仍待试听。

实测完整混音WAV -18.9LUFS、-3.3dBTP；最终AAC -18.9LUFS、-3.2dBTP，无削波。独立音乐轨扣除后，与原旁白经过既有采样/声道/总线处理的参考差最大1.49011612e-07，在PCM量化误差内；原WAV哈希保持。只混入一份人声。

VQ-06保留WARN：3秒窗口最小人声/音乐RMS差6.52dB，低于8dB提醒阈值，窗口起点17、43、47、48、49秒。能量比例不能直接判定可懂度或遮盖，因此不擅改指定+3dB档，也不宣称清晰度已获人工验收。请重点试听这些位置。[完整窗口数据](../../orchestrator/output/day9-vp009/bgm-config.json)。

音乐来源仍记“剪映历史音乐，持有人提供”，授权pending_verification；仅私人审阅，不由“常用”推断公开商业授权。股票素材/AI披露/作者信息缺失等既有状态亦未擅自提升。

## Quality Gate 与有限修复

最终自动结果 **8 PASS、2 WARN、0 FAIL、0 NOT_EVALUATED**；人工/主观评价均为NOT_EVALUATED，整体WARN，publicationReady=false。

|规则|自动结果|证据/限制|
|---|---|---|
|VQ-01 静态停留|PASS|开场图片含重叠约2.8秒，内部缓推/平移|
|VQ-02 视觉类型|WARN|中段7段连续图解，不能据不同模板自动认定不单调|
|VQ-03 转场实际接线|PASS|编码帧对比同源hard-cut控制帧，非仅检查配置；字幕字形独立|
|VQ-04 布局/安全区|PASS|实际DOM字形Range/SVG边界；Foundation沿用像素法；原第5镜观点卡保留原版左对齐，未伪称居中|
|VQ-05 常驻角标|PASS|开关关闭且渲染接线；源素材烧录标识仍需人工看|
|VQ-06 BGM/人声|WARN|无削波、旁白保留；弱语音窗口需试听|
|VQ-07 素材匹配/重复|PASS|两段源视频各使用两次且区间不重叠，许可/哈希/长度匹配|
|VQ-08 字幕/音频时间|PASS|十镜、45条原文与时间、完整配音、总帧与覆盖连续|
|VQ-03-GL 选择安全|PASS|合法VERIFIED、精确参数、重复/强度/间隔、时钟不变|
|VQ-09-FULL 全片复核|PASS|全片解码/逐帧扫描、循环连续性、字幕实际字形存在|

全片2514帧扫描：未发现空白/近黑帧或近零纯黑边；没有>1s异常静音。最大完全相同帧连续9帧，未检出长时间整帧冻结。45条字幕各自真实中点帧在原生928×124字幕区检出白字像素，原文字与时间由冻结输入比对保证；不是OCR或字词重新强对齐。字幕精度继续保留原短句/ASR时间估计限制。[逐帧/字幕检查](../../orchestrator/output/day9-vp009/frame-scan.json)、[技术验证](../../orchestrator/output/day9-vp009/validation.json)。

已实际查看[全片接触表](../../orchestrator/output/day9-vp009/review-contact.jpg)和源素材接触表；图解标题、主体与字幕区域没有抽帧可见的裁切/覆盖，构图美感、局部闪烁可接受度和继续观看意愿仍不自动判PASS。

修复链留痕：

1. 首次构建音频URL缺少staticFile前缀，修正资源接线；未改原配音。
2. 降级分类器误匹配堆栈里的gl-transitions目录名，把非GL错误当GL，原质量门以“计划与实际不符”拦截。改为只匹配实际错误首行，新增回归测试；恢复Director计划并重新导出全片一次。保留修复前成片/时间线/失败Gate，不把它当最终GL版。
3. 独立浏览器控制帧复检遇根组件冷启动88秒超时。复用本次**成功全片导出时实际生成**的9对控制帧：校验源码时间早于该次导出、保护输入哈希、切点/素材组合与原导出记录一致，并明确记录这是事后完整性核验，不伪称新浏览器运行通过。[控制帧来源证明](../../orchestrator/output/day9-vp009/quality-evidence/probe-run.json)。
4. 极小缩略图会丢失中文亮色笔画，改用原生字幕区逐条实测；选帧检查关闭FFmpeg输出补帧，不改视频/字幕。实际45条检查通过。

[完整修复记录](../../orchestrator/output/day9-vp009/repair-log.json)、[修复前证据](../../orchestrator/output/day9-vp009/quality-before-repair/quality-report.json)、[最终实际导出](../../orchestrator/output/day9-vp009/day9-render.json)。shader真正失败仍只允许一次硬切降级重试；本次修复后的最终导出首轮成功，未再降级。无法确定的素材/语义、审美、BGM偏好不自动改写。

最终renderMedia实际耗时288.792秒；该次包含加载与布局/控制帧导出共395.388秒，软件渲染并发2。没有将首次失败和冷启动排障时间冒充为性能改善。

39项必要/原回归测试通过，隔离TypeScript检查通过；覆盖完整时钟、语义切分不依赖分镜编号、源区间不足拒绝、后段片段复用、动态间隔、非法效果/参数、故障分类和有界降级等。真实全片/控制帧/音频/逐帧证据另存，不以测试数量替代成片。[测试日志](../../orchestrator/output/day9-vp009/tests.log)、[类型检查](../../orchestrator/output/day9-vp009/typecheck.log)。

## 复现入口与改动范围

仓库根目录：`bash orchestrator/src/full-day9/run.sh`。有plan/audio/render/validate/frame_scan/Quality Gate顺序，失败停止。详细入口与产物见 `orchestrator/src/full-day9/README.md`。

必要差额：新增项目内完整语义编排/图解/混音检查；原Agent增加可选过程图解回调和推荐源起点；原GL背景提取复用，原渲染/降级入口支持指定输出与入口；原Gate支持真实DOM布局证据和本轮单档位话术。Asset/AssetMatch契约未改，没有平行时间线、独立服务或管理后台。

所有冻结输入及VP-008成果哈希未变，[输入复核](../../orchestrator/output/day9-vp009/protected-after.json)。没有修改原Excel、旁白、字幕或BGM原文件；原有未提交成果未覆盖。没有素材重下载、重新配音、AI视频生成、模型/驱动/CUDA修改或公开发布。

## 已完成与未完成

已完成：真实十镜审视、现有许可/源区间/构图检查、可在当前范围解决的概念图解补齐、17段完整编排、VP-008选择审计、完整MP4、原字幕/配音保留、+3dB完整音乐循环与混音、Quality Gate/有界修复记录、完整报告和进度更新。

未完成：缺少真实产品上线/用户反馈/本人日常录屏；这些没有被伪造成真实素材。尚无+3dB正式听感验收、全片主观观看评价或公开发布授权审查。中段媒介集中和弱语音BGM窗口保留WARN。

## 阻断

无阻止本轮私人完整成片交付的剩余技术阻断。既有素材人工审核、AI披露与BGM授权状态未解决，不能视为可自动公开发布。新独立探针冷启动存在环境限制，但同次成功成片的实际控制帧已用于完整质量复核，并留下来源核验记录。

## 下一步

完成后停止。等待持有人观看完整成片，重点裁定中段图解密度、转场自然度和上述弱语音窗口的音乐平衡；不自动扩展施工或发布。


## 持有人观看反馈（交付后补记）

原话：“看了，两个问题 1.Remotion的部分太多， 2.转场有些不是很自然，整体打60分钟”。本记录将“60分钟”理解为整体60分，原话完整保留。[结构化记录](../../orchestrator/output/day9-vp009/holder-review.json)。

核对实际时间线：图解64.57秒，占约77.0%；实景16.73秒，占约20.0%；AI图片2.5秒。9处动态转场均为18帧（0.6秒）。这说明先前技术闭环成立，但不能将素材缺口主要交给图解，也不能只凭效果可渲染就认定切点自然。未根据笼统反馈把具体效果擅自标成REJECTED。

下一轮建议：先补匹配且授权可用的真实动态素材，再重排全片；Remotion只承担必要的逻辑解释、对比和总结。转场以硬切和少量轻效果为主，按具体镜头关系验证自然度；先做局部对照，再决定全片重渲染。当前仅记录裁定与改进依据，没有启动新渲染、改动原成片或更改BGM档位。
