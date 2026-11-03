# 本地视频素材库CPU实践验证

2026-10-29；仓库`/home/chen/work/video-pipeline`，main / `cc562624f8d36cf06fde9e373e72e5451e973ce1`，本地origin/main无领先落后，未fetch，不声称服务器最新。原.gitignore/进度/恢复工具及事故报告未提交改动保留。本轮不启动CUDA、DirectML、GPU推理/硬件解码、Qwen、Wan或压力测试，不改驱动/环境，不重新制作历史成片。

结论：**VideoSeek固定版本的核心CPU索引和本机Agent API可用于补充召回，最小适配入口已实测；不建议替代现有Asset档案或设为生产必需依赖。PySceneDetect可提供待核查切点，本库实测存在漏检与误检，不宜自动替换可用片段。** 原Asset事实/来源/许可/审核/使用历史仍由VideoPipeline维护，VideoSeek的SQLite/Lance只是可删后从原档案重建的检索缓存，不是第二套素材事实源。本轮没有新建管理界面/独立业务服务或向量平台。

## 已有能力与本轮最小差额

复用了两个真实asset-catalog、原Asset/AssetMatch v0.1、历史实际抽帧和时间线、既有ffprobe/FFmpeg、Production-v1的Visual Brief和叠加契约。此前VP007推荐器仅有office/fatigue等窄规则；VP010素材获取脚本是固定列表；统一CLI缺素材时只输出空proposal。先完成JSON复用档案、本地检索和使用历史，再把可替换HTTP检索放在旁边，不改真实素材来源。细节见[素材库规范](../Asset-Library-v1.md)。

实际候选14项：9条网络实景视频、1条项目真实录屏、1条既有Remotion观点卡、1张既有AI首帧、2张新闻网页图片。VideoSeek视频库实际索引11条，3张图片保留原库；没有为20—50目标凑数下载素材。多版本录屏、已生成裁切片和暂存同字节副本列在盘点，不重复当新素材。源片均保持原位。

## 固定来源、许可与依赖

|组件|固定版本 / 许可|实际接入与边界|
|---|---|---|
|[VideoSeek](https://github.com/6v17/VideoSeek/tree/c9e13d699714e13df99579cc88ffaf532e1371c6)|project1.0.93，commit `c9e13d699714e13df99579cc88ffaf532e1371c6`；AGPL-3.0，保留LICENSE/NOTICE|只读独立源码；核心服务/Agent API实测，不安装桌面PySide6/VLC。其修改、再分发或对外服务需按具体许可证处理；本轮不公开部署。|
|[PySceneDetect](https://github.com/Breakthrough/PySceneDetect)|PyPI固定0.7.2；BSD-3-Clause|隔离venv；ContentDetector27/min_scene_len15，OpenCV软件解码，API实际执行。|
|[Argus](https://github.com/discoposse/argus/tree/de0265ea651c24535b62c2435730e25803a3ddb3)|commit `de0265ea651c24535b62c2435730e25803a3ddb3`；MIT|仅阅读captioner结构，借鉴短描述、时间戳帧、tags、visible_text与不确定性；未安装Argus/Ollama或运行其模型。|
|CLIP检索模型|VideoSeek官方release `openai-clip.zip`；ViT-B/32 ONNX|原OpenAI仓库[MIT许可](https://github.com/openai/CLIP/blob/main/LICENSE)及模型卡保存；上游导出脚本默认openai/clip-vit-base-patch32，但release包没有单独许可文本或原权重revision/hash，转换链未独立密码学证明，仅用于本次本地CPU评估，不作分发/公开服务授权结论。|

模型包393,259,399字节，SHA256 `7001ee89cd2f61e8d14b4608a671e71b92d6312f7fc0ded1b90ad9ddc6f1cf82`。实际模型/词表逐文件SHA见`retrieval-model-provenance.json`。未下载原素材/视频生成模型，未调用付费接口。第三方源码、模型与venv全部在受忽略的`local-assets/experiments/video-library-cpu/`。

Python3.12.3；onnxruntime1.23.0 CPU wheel、opencv-python4.13.0.92、numpy2.2.6、lancedb0.34.0、faiss-cpu1.13.2、fastapi0.136.0、uvicorn0.44.0。全量传递依赖固定于`experiments/video-library-cpu/requirements.lock.txt`，pip check通过。没有安装torch、CUDA包或DirectML。首次安装误写了不存在的regex版本，安装日志保留；核查PyPI后固定2026.9.29。解析器最初为scenedetect选了OpenCV5，已在此独立venv中改为匹配上游的4.13并移除重复headless包，未改共享环境。

## CPU后端与真实耗时

`cpu-preflight.json`、`cpu-actual-sessions.json`和`api-cpu-actual-sessions.json`记录：实际视觉和文本会话均为`['CPUExecutionProvider']`，backend=CPU，usingGPU=false。ORT提供者列表还有AzureExecutionProvider，但未选择它。不能仅凭health.provider=clip_onnx证明CPU，故另存真实会话证据。

上游默认prefer_gpu=true，不能直接沿用。试验设置每个模型profile prefer_gpu=false及inference_ep=cpu，环境`VIDEOSEEK_INFERENCE_EP=cpu`；最终启动脚本同时强制`VIDEOSEEK_FORCE_HW_DECODE=0`、CPU线程限制，不导入torch。初次索引同样是Linux+experimental_hw_decode=false的软件路径，真实日志记录CPU会话；未开启D3D11VA。PySceneDetect以`cv2.CAP_FFMPEG`打开，并显式指定和断言`CAP_PROP_HW_ACCELERATION=VIDEO_ACCELERATION_NONE`，OpenCL=false；预览FFmpeg命令全部`-hwaccel none`。

|工作|CPU模式下的墙钟耗时|证据|
|---|---:|---|
|11视频首次索引|15.211秒；含模型加载总16.561秒|index-result.json；完整index stdout/stderr|
|10需求检索与档案过滤|约1.214秒（最终入口）|adapter-final/retrieval-results.json；各需求另有耗时|
|11源视频＋1条已有18.2秒混剪参考容器检测|8.146秒|scene-index.json；scenes stdout/stderr|

这些是本机有限小库实测，不是大库吞吐、整机稳定性、模型画质或视频理解评分。热缓存检索与首次模型加载不能混为同一指标。

## 路径、API与失败行为

选择WSL：项目和素材本来就在WSL，CPU wheel可用，避免Windows DirectML依赖。原素材以SHA文件名软链接进入`selected-media/`，不复制原片；`selected-assets.json`映射VideoSeek API路径、原路径和原Asset SHA。适配器只接受映射内的API原样路径，复核原文件、链接文件及分析帧SHA，不按搜索显示名猜路径。

API在本次临时`http://127.0.0.1:18765/api/v1`实际运行，health index_ready=true；libraries/videos/agent-starter及search成功。Windows原生PowerShell到同一localhost实测HTTP200，通过`\\wsl.localhost\Ubuntu\...`读取原片得到SHA `9f2fc19e...ffd631ed`、4,085,078字节，与WSL一致；不将本机结果外推到其他机器网络模式。`-File`首次被现有脚本策略拒绝，保留错误；随后按此前既有内存脚本方式执行只读代码，没有修改ExecutionPolicy。

公开Agent API主要用于已建索引检索/取帧/导出，不提供公开入库路由：POST/libraries实测405，空search返回400。原索引建立用固定源码已有`add_library`＋`scan_target_libraries`服务函数，以11个软链接原片实测成功，非伪称HTTP自动入库。该内部接线受版本影响，必须固定commit；不能宣称任意升级兼容。硬字幕OCR/对话检索、VLM标签理解本次未建立；health相应能力false，没有为本轮拉起额外模型。

API仅本次临时服务，无自启动；先验证一轮，再为最终显式CPU会话记录实现重启了本次服务，两个会话日志和停止记录均保留。结束后仅停止本次PID，服务关闭的实际访问错误保留，不重试、不恢复，不停止无关服务。缺服务时有现有元数据规则降级入口，不假装CLIP已调用。最终关闭状态见api-final-stop.json及api-after-stop.json。

## PySceneDetect：实测结果和契约映射

9条视频检测为单段；mixkit-7887输出2段、work-editor输出4段；另对原18.2秒混剪参考片输出2段。不会把单镜头素材按固定秒数切碎，也不把参考成片当新的授权原素材。

实际查看`scene-contact.jpg`后：机架约3秒分界仍是连续运动，未证实换镜；编辑器主要检测到启动/界面变化，没有分出其内部多个文档动作；参考片原切点为2/3.5667/8.7667秒，检测仅有约3.533秒一处，漏掉短切和部分动画过渡。这些候选边界不自动视为已审可用片段。`scene-review.json`记录逐项限制，原usableSegments不被覆盖。

`scene-index.json`每段记录原SHA、start/end、帧号、关键帧路径/时间/SHA、不确定性和pending_human。借鉴Argus的short_caption/tags/visible_text结构，但检测器没有输出描述时保留description=null，不伪造模型分析。段预览归档在scene-previews；适配器通过SHA带回相关sceneCandidates，明确sceneConstraintApplied=false（尚未人工确认）。实际选片仍求原usableSegments与检索范围交集，写回既有AssetMatch的segmentStart/End。不能因CLIP命中一帧就放宽整段动作或原禁用后段。

## 10条真实需求与前三候选核查

原句/分镜编号/来源脚本均在`ten-real-needs.json`。下表时长是Director为验证提取的连续短视觉片段需求，不是改动旁白或完整时间线；英文查询为显式可审查翻译。每条API请求保存原body/response，不启用文本扩写。抽样每候选区间6帧，全部30项经交互式Codex实际view_image检查；这与持有人最终人工审核不同，后者仍NOT_EVALUATED。

|需求/真实分镜|API前三候选（原顺序）|核对与结果|
|---|---|---|
|1 Day9镜1：夜晚工位，4秒|39839 / 39854 / 4938|前两段有人物头脸且夜晚未证实；第三是手部打字。默认不露脸夜工需求缺口，AI静态图不冒充动态实景。|
|2 Day9镜3：疲惫摘镜，3秒|39839 / 39854 / 1781|排名1只在办公，排名2动作抬手符合部分疲惫线索但首3秒仅前半段，且头脸门禁未过；排名3无疲惫动作。保留缺口，不把部分动作判完整。|
|3 Day9镜8：真实产品上线，4秒|work-editor / opinion-card / 23282|编辑器、观点卡、机房均不是真实上线操作；拒绝强配。|
|4 微软镜4：数据中心环境，4秒|23282 / 7887 / opinion-card|前两段实景匹配，能覆盖时长；只能通用环境，非微软内部。Restricted仅限私人审阅；卡片不匹配。|
|5 微软镜7：手部键盘细节，3秒|1781 / 4907 / 39854|前两段匹配工作情境，contain保全手与键盘，可叠加短关键词；第三人物镜头不适合细节需求。不能宣称AI实测。|
|6 微软镜13：文档查看/修改，4秒|work-editor / 39854 / 1781|仅真实录屏可作候选，阅读清晰度与具体文字需输出尺度复核，部分适配；不能证明结论可靠或AI生成。其余仅一般办公。|
|7 微软镜18：笔记积累方法，3秒|42655 / 50112 / 1781|手写笔记动作贴合；取便签和打字不等同手写。历史裁切片关联原源，不重复入库。|
|8 微软镜21：便签整理，3秒|50112 / 42655 / 1781|首段取便签匹配一般整理情境，只用原已审0–3.567秒，后段人脸禁用；不能把情境画面称为知识积累效果证明。|
|9 微软镜8：AI实际生成报告，4秒|work-editor / opinion-card / 39854|均没有实际AI操作证据，缺口；图像相似度不能让真实录屏自动变AI演示。|
|10 微软镜1：实际微软楼宇外景，3秒|23282 / 7887 / 1781|机房/键盘都不是指定建筑，缺口，不冒充新闻现场。|

API候选经过滤，5/10有私人审阅候选，5/10缺口；文档UI是部分适配，不称全项通过。所有原资产仍pending_human、全部公开授权待确认；本次不作“5条正式可发布”的结论。5条候选已生成静音、低分辨率3—4秒片段预览，记录派生SHA及原SHA/源区间，不重复保存整份原片。原图解/录屏占比、成片自然度没有重新验收。

元数据降级用同10需求也得到5匹配/5缺口。实践中发现旁白“代码”等偶然词会让规则将编辑器压过明确手部需求，已修正为显式concepts优先并加回归检查，保存初始与修正结果。未拿测试集手调CLIP阈值去凑成功率；CLIP分数约0.19—0.33仅供本次模型内部排序，不代表百分制画质、动作完成率或授权。

## 可执行入口与恢复

现有环境已准备好。不要使用生产模型venv，不安装上游完整桌面依赖，不自动升级。

```bash
# 已有原档案 → 本地库/预览，详见Asset-Library-v1
npm --prefix orchestrator run assets -- build
npm --prefix orchestrator run assets -- preview --out orchestrator/output/asset-library-v1

# 独立CPU检查/索引；已有缓存由上游复用，不下载素材
local-assets/experiments/video-library-cpu/venv/bin/python experiments/video-library-cpu/probe.py check
local-assets/experiments/video-library-cpu/venv/bin/python experiments/video-library-cpu/probe.py index

# 需要检索时在独立终端前台运行，用完Ctrl+C；不自动开启/公开服务
local-assets/experiments/video-library-cpu/venv/bin/python experiments/video-library-cpu/probe.py serve --port 18765

# 从真实需求查询，带回原Asset/AssetMatch/Proposal与切点候选
npm --prefix orchestrator run assets:videoseek -- --brief orchestrator/output/video-library-cpu-validation/ten-real-needs.json --mapping orchestrator/output/video-library-cpu-validation/selected-assets.json --cpu-evidence orchestrator/output/video-library-cpu-validation/api-cpu-actual-sessions.json --scene-cache orchestrator/output/video-library-cpu-validation/scene-index.json --out orchestrator/output/my-new-asset-query

# 独立软件切镜；原片不改，输出预览与SHA绑定缓存
local-assets/experiments/video-library-cpu/venv/bin/python experiments/video-library-cpu/scene_index.py

# 无服务时基于同一档案的降级检索，不冒称VideoSeek搜索成功
npm --prefix orchestrator run assets -- match --brief orchestrator/output/video-library-cpu-validation/ten-real-needs.json --out orchestrator/output/my-metadata-fallback
```

匹配入口不改写时间线、不自动发布。`serve`生成本次CPU实证；适配器只允许loopback，拒绝缺索引/改变的原片或抽帧。上游原始索引和路径映射都仅为缓存；损坏时留失败日志、从原库重建。需要新模型、升级或另机接入时重新核实CPU提供者，不能拿旧cpu-evidence证明另一实例运行CPU。

## 验证、缺口和推荐

已有Asset库测试覆盖字节变更、ID/SHA去重、重复/拒绝、源时长、新闻scope、公开许可隔离、叠加安全与显式画面需求优先；既有生产/契约测试均通过。生产localAssetProposal真实接线用同10需求运行，未调用TTS或渲染。新VideoSeek适配入口已真实HTTP检索并输出既有契约JSON，API失败行为、Windows访问和服务关闭已实测；并未只靠mock或安装成功。

预览生成首次发现区间缓存名遗漏end导致3/4秒图覆盖，已保留首轮superseded记录并修正为assetId+start+end+frameIndex，重新CPU抽帧、检查全部有效帧SHA；没有原素材受影响。技术PASS不提升主观评价或许可状态。

推荐保留“本地档案优先→可选VideoSeek CPU召回→实际区间检查→Director二次编排”。PySceneDetect仅在长复合素材和疑似换镜时运行；对短单镜头不批量机械切碎。库小、需求明确时元数据检索已够快，VideoSeek最有价值的是补视觉近似候选，而不是取代内容/授权判断。本轮未新增网络素材：5个真实缺口涉及夜工/不露脸动作、真实上线/AI操作或指定新闻楼宇，优先真实录屏/具体授权新闻资料；不下载更多一般办公素材来掩盖缺口。

完整交付：`orchestrator/output/video-library-cpu-validation/index.html`为10需求/30候选/5片段预览索引；`ten-needs-reviewed.json`为逐项实际核查；`adapter-final/`为最终真实检索交接；`scene-index.json`、`scene-review.json`为切镜候选及限制；`selected-assets.json`为11原视频来源/许可清单，完整14项见素材库预览及asset-catalog。所有源码/参数/原始HTTP响应/CPU耗时/失败与哈希可追溯。未自动发送或发布，所有GPU生成STOP保留。

补充构图接线限制：实际核查`RoutineRoot.tsx`后，通用实景分支仍固定objectFit=cover，只读取objectPosition；screen_recording分支已有contain。素材库建议的contain并不等于已自动接入渲染。横屏手部/机房候选标记productionReady=false/preparationRequired，Director需提供SHA绑定的竖屏准备片（现有renderPath/renderSha256/renderDerivedFromSha256接线可复用）或以后最小接入该布局。本轮未改渲染器，不把候选推荐称为正式9:16构图通过。录屏区域不默认放叠加，避免把UI上方当空白；实际空白必须按最终输出复核。此限制已写回复用档案，而不是藏在报告之外。
