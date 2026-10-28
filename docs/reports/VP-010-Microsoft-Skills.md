# VP-010｜微软离职邀约与技能保值

本期使用独立 episodeId `microsoft-veo-skills-20261028`，Day9 返工暂停，原成片与既有验收输入保持不变。仅供持有人私人审阅，未发布。技术检查与人工观看分别记录，主观评价保持 `NOT_EVALUATED`。

## 仓库与复用

- 仓库：`/home/chen/work/video-pipeline`；分支 `main`；HEAD `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`；相对本地 `origin/main` 为落后0、领先9。未推送、未提交、未重置工作区。
- 本地未发现 AGENTS.md，遵循会话提供的长期复用要求。已读取 PROGRESS、VP-008/009报告及实际导入、配音、素材契约、GL选择、渲染与Quality Gate调用链。开工脏工作区见 `repository-before.json`；保留原有README/PRD移动、package.json等修改。
- Node26.7.0、Remotion4.0.539、React19.2.3、TypeScript5.9.3、FFmpeg6.1.1；复用VP-008隔离环境，未升级依赖、替换FFmpeg或修改驱动。
- 复用现有Excel解析器、IndexTTS2锁定配置、Asset/AssetMatch v0.1、VP-008确定性选择器、GLBackground/EndpointGuard、现有Remotion合成与VQ-01～08。全片检查延用VP-009的FFmpeg解码、稀疏抽帧与字幕像素代理。
- 新增差额在 `orchestrator/src/episode-production/` 及现有隔离Remotion工程的 `src/microsoft-skills.tsx`。未建设平台、数据库、后台或第二套时间线。

## 导入、内容及事实边界

Excel真实路径：`docs/scripts/微软离职邀约_技能保值_分镜脚本.xlsx`。仅导入Sheet的A1:K26（25镜），后续10行非空标题、来源及制作说明单列为metadata。25镜原文共658字符，未增删改写旁白；31条句级字幕拼接后与原文完全一致。原估算126.3秒仅记录，不用于压缩新配音。

核查日期：2026-10-28。逐项记录见 `fact-check.json`，网页响应/截图证据见 `sources/`：

| 事实 | 核查结果及来源 |
|---|---|
| 自愿离职方案、参与团队和国家 | [微软官方说明](https://blogs.microsoft.com/blog/2026/10/26/introducing-a-voluntary-exit-offer/)支持规定参与团队、美国/加拿大/英国/印度等适用边界。官方博客未给出约6万数字。 |
| 约6万人 | [GeekWire报道](https://www.geekwire.com/2026/microsoft-makes-new-voluntary-exit-offer-to-more-than-a-quarter-of-its-workforce-including-some-execs/)为资格覆盖人数，接受人数未知，不能画成6万人已经离职。 |
| 约27% | [微软2026年报](https://www.microsoft.com/investor/reports/ar26/)及[SEC文件](https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm)支持2026-06-30员工223000历史基数；60000/223000约26.91%，不是实际离职比例。 |
| AI投入及成本背景 | GeekWire报道提供投入背景，不证明AI替代了本次方案涉及岗位。Excel原Reuters链接无法直接访问（401），未声称已核实Reuters原文。 |

普通HTTP与浏览器/检索工具可访问性不同，失败响应保留；微软官方页面后经正常浏览器访问200并截取真实标题，无绕过登录。新闻图片只保留真实短标题，非虚构公告、邮件或产品测试。机房为通用资料，不称微软内部现场。第5镜的边界提醒之后及第6～25镜属于作者分析，不冒充微软官方因果结论。未发现需要静默改稿的实质冲突。

## 新配音、字幕与BGM

只启动已有获准IndexTTS2服务进行本稿单次完整生成，使用原已验收音色/情绪参考及固定参数，无新模型部署或音色试验。成功后停止本次启动的服务。未启动Wan、ComfyUI或GPU视频推理；已有TTS的运行不等同启动新视频模型。

- 新配音 `voice/full-raw.wav`：134.145533秒，22050Hz单声道；已保留原始文件与请求、配置、生成审计。
- 字幕31条：使用真实合成分句样本边界，加波形活动范围定位句级起止。ASR仅作交叉核对，不宣称字词级强制对齐。识别器对“保值/保持”“复用/附用”等存在不确定性，最终发音仍需试听；没有据此改原文。
- 成片4049帧，134.966667秒，含24帧片尾停留；配音未机械加速，原始采样内容保留。扣除0.8秒片尾后，帧取整误差约0.021秒。
- Excel中的“AI新时代1.mp3”未找到，未按相似名称另选音乐；使用持有人指定的 `AI科技新时代1.mp3`，解码27.454708秒，SHA-256 `e1244055c4ef7ecb41f4b7901d3321846dc21fda0d53ecded90bca56f22ab806`。
- +3dB为本轮默认试听起点，**未获持有人人工选档验收**。基础音乐增益-17.3dB，本轮-14.3dB，沿用总线-1.5dB。6次铺接、1秒等功率交叉淡化、0.5秒淡入、1秒淡出；不是节拍对齐声明。
- 混音及AAC约-19LUFS；AAC真峰值-3.9dBFS，无削波。独立音乐轨扣除后，人声参考残差最大约1.49×10⁻⁷，保留原配音。最弱3秒语音/音乐RMS差约6.47dB，低于既有8dB提醒阈值：保留WARN和具体窗口，需人工听弱语音清晰度，不偷偷改成其他档位。
- BGM来自剪映历史音乐，许可待核实，只限本轮私人试听；未选长版本后段人声音乐。

## 全片视觉规划与素材

先输出25镜意图brief，再依据实际素材完成二次编排，共34个视觉片段。规则模式，未配置可调用的Visual Director/Asset Agent模型服务；不将脚本中的本期编排表冒充自主模型决策。素材描述依据本会话实际查看的抽帧，模型准确标识不可得处如实记录；Quality Gate未调用视觉评价模型。

| 实际时间线类别 | 时长 | 占比 |
|---|---:|---:|
| 真实动态素材 | 61.033秒 | 45.22% |
| 真实操作录屏 | 56.367秒 | 41.76% |
| 新闻网页标题资料 | 6.900秒 | 5.11% |
| 全屏图解/章节/文字 | 10.667秒 | 7.90% |

实景与真实录屏合计86.98%，达到本轮≥60%目标；全屏图解7.90%，低于30%。普通字幕和实景短叠加不计为全屏图解。全部类别、边界、帧数可追溯至 `timeline.json` 与 `visual-distribution.json`，没有将Remotion合成引擎计成图解。

- 7条Mixkit原片，逐页检查可见许可证、下载官方公开720p链接、FFprobe测量、SHA去重并抽取关键帧。不是批量抓库。素材原作者未在页面明确暴露处填写null，不将平台冒充个人作者。
- 5条办公手部/纸笔/便签为Mixkit Free License；2条机房（23282、7887）为Restricted License，仅许可个人非商业用途，本次私人非商业审阅使用。**不可直接作为账号公开/商业发布素材**，需替换或另取许可。原条款与页面均本地保留。
- 真实录屏来自正版VSCode网页编辑器，实际键盘输入、选择与滚动本期核查目标、比例代码、需求与交付、方法复盘文档。不是伪造产品UI，没有AI执行、微软内部系统、持有人个人经历或界面保存操作声明。源类型为local_library，不冒称持有人提供。
- 录屏墙钟包含浏览器启动，未直接当视频时码；对实际解码8/24/36/52/70秒检查文档，保守选择四段可用范围。失败及不可读的早期采集不进入成片。
- 笔记本原片顶部220px裁除，渲染派生文件独立记录；便签只用前3.567秒，结束帧单独检查，后段人脸不使用。原片不改。其余横屏以手/键盘主体为裁切重点；720p素材竖屏放大和细节清晰度仍需人工观看。
- 索引10项（7视频+1真实录屏+2新闻标题图），Asset/AssetMatch分离，28条匹配关系通过v0.1结构和范围校验。均pending_human，不提升为正式素材库。
- 保留重复使用提醒：相同长录屏及键盘素材分不同区间、多镜复用，未复制为不同ID或循环铺满；全部源区间合计有2.6秒边缘重叠，见 `asset-reuse-report.json`。重复素材观感仍需人工验收。

## 转场选择与技术范围

沿用VP-008原库，不重新登记一套效果。为本期短时长隔离验证Fade6/8帧、DirectionalWipe8/10帧：4次真实CPU导出/完整解码、端点颜色与中间进度检查通过。初始校准360×640，初始3个切点在1080×1920全片真实导出后另与同源硬切控制帧比较。未把18帧验证直接外推为短时长通过。

最终33个切点：31硬切（93.94%），2个Fade（各6帧）；强效果0次，不连续轮换特效，不使用RandomSquares、ColorCoords、旋转、粒子或强扭曲。界面阅读段保护为硬切。非硬切均为技术VERIFIED、人工NOT_EVALUATED的试用效果。初始章节间DirectionalWipe虽通过技术校准，但本片前后蓝底相近，实际画面与硬切控制帧差异仅0.331，未达既有Gate阈值2，因此本片局部降级，未篡改全库技术状态或人工评级。

每切点效果、帧数、默认参数、规则依据、候选排除、余量和硬切降级见 `transition-selection-report.json`。同输入可复现，未按镜号轮换。重叠发生在既有切点窗口中，不扣除总时长；字幕独立稳定层。短转场采用已验证的首尾闭合进度，避免末帧跳变。

## 检查与有限修复

首次DOM手机安全区探测发现最长字幕下沿1860px，超出1820px限制。仅将超过34字符的字幕44px缩至40px，文字和时间不变；停止未完成的首轮渲染，保留日志，执行一次全片重渲染与31条字幕复检。随后VQ-03实际画面检查触发一次局部硬切降级：仅重渲染1854–1861共8帧，FFmpeg按帧拼回原时间线并重新编码画面流，4049总帧数保持不变；不再次完整Remotion重渲染。未将“技术库可用”当作“这次选用合适”。DOM布局原始证据补充接入既有Gate，未更改已通过的构图。两类问题各修复一次，无素材更换、语义更改或原件改动。修复记录在 `repair-log.json`。

最终Quality Gate为 **WARN：确定性检查6 PASS、4 WARN、0 FAIL、0 NOT_EVALUATED**；10项主观观看评价仍全部NOT_EVALUATED。四项WARN分别为：新闻标题静态图超过约3秒、连续同类视觉类型计数、22–25/45–48秒弱语音能量差、同一素材多段使用。不能把这些提醒自动改写为观看通过。

最终4049帧完整解码通过，25镜覆盖、31条字幕原文与时间范围、独立人声音轨残差、安全区和图解中心通过；全帧代理未检测到空帧、近黑帧或实黑边，31条字幕都有原生像素字形。最终两处叠化与硬切控制帧MAD约16.15/16.96，实际效果存在；两处都位于句间字幕空隙，字幕转场IoU不适用，未虚报为主动字幕扭曲测试通过。听感、闪烁观感与自然度仍需人工。

一次辅助控制帧重抓取遇到Remotion root-component的88秒超时，日志保留在 `quality-evidence/auxiliary-probe-error.json`，没有无限重试，也没有把它写成新浏览器成功。对未受8帧局部修复影响的两个切点，核对渲染源码哈希、原/新镜头与字幕时钟、修复区间不相交及既有控制PNG SHA后复用真实控制帧；最终编码帧重新提取比较。该可复核复用不影响完整MP4交付，环境冷启动限制仍记录。

完整Remotion导出后端为Chrome149/ANGLE SwiftShader/CPU libx264，纯画面导出431.829秒，全渲染及控制帧流程508.829秒；另一次8帧局部修复保留独立回执。未调用GPU视频模型。

自动结果、真实帧证据及仍待人工项目以最终 `validation.json`、`frame-scan.json`、`quality-report.json` 为准。技术通过不代表自然、好看或发布合格。人工观看应重点检查录屏阅读、横片竖裁、短章节阅读、重复手部素材、声线和弱语音音乐平衡。

## 交付与复现

输出目录：`orchestrator/output/microsoft-veo-skills-20261028-vp010/`。

- 完整私人审阅：`microsoft-skills-review.mp4`（亦有sample.mp4）。
- 标准化/已配音分镜：`script.normalized.json`、`script.voiced.json`；实际句级字幕：`subtitles.srt`。
- 全片规划/交接：`visual-brief.json`、`asset-proposal.json`、`timeline.json`。
- 逐镜审视：`shot-review.json`；素材：`asset-catalog.json`、`asset-matches.json`、`render-derivatives.json`及sources。
- 视觉/转场统计：`visual-distribution.json`、`transition-selection-report.json`、`transition-distribution.json`、`asset-reuse-report.json`。
- 技术与人工Gate：`validation.json`、`frame-scan.json`、`quality-report.json`、`repair-log.json`；预览：`review-contact.jpg`。

已有素材准备完后可依次运行（仓库根目录）：

```bash
python orchestrator/src/episode-production/assemble.py
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/episode-production/select.ts
python orchestrator/src/episode-production/audio.py
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/transitions/render.ts --out=orchestrator/output/microsoft-veo-skills-20261028-vp010 --entry=src/microsoft-skills.tsx
python orchestrator/src/episode-production/validate.py
python orchestrator/src/episode-production/frame_scan.py
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/episode-production/quality.ts
```

DOM布局补充探测使用隔离工程的 `scripts/probe-vp010.mjs`（需在该工程目录运行，沿用loopback预加载），不是重新制作通用18秒样片。已完成选择器/Quality Gate相关22项必要测试，0失败；原Asset契约校验另执行。

如原编排再次触发同一低对比转场问题，先运行既有Quality Gate保存证据，再从隔离工程运行 `scripts/repair-cut-vp010.mjs` 执行一次局部降级，随后重跑validate/scan/quality。该入口拒绝同一问题二次修复。最终交付直接使用已降级的最终时间线。

完成后停止，不发布，等待持有人一次完整观看。剩余问题是人工观感、声线/字幕感知同步、BGM及Restricted资料的公开使用授权，不将这些项目标为技术自动通过。


## 开头配音局部修订（持有人授权保留视频、重做配音）

新完整文件：`opening-audio-revision/microsoft-skills-audio-revised.mp4`；便捷试听：`opening-audio-revision/opening-revised-8s.mp4`。旧完整成片及原始配音、字幕、时间线、BGM均保留。

仅重新生成原文前两句：微软向6万人发出离职邀约。你的技能，还能保值多久？沿用已获准IndexTTS2音色、情绪参考、种子和推理参数，改为同一连续文本块，单次生成后停止本次启动的已有TTS服务。未启动Wan、未生成或重渲染画面。

原始新开头5.201秒，为保留已有烧录字幕及切点，只在已核实的句间低能量位置分成两句，使用FFmpeg atempo保留音高减速适配原窗口（第一句约0.718倍速、第二句约0.838倍速），不是加速旁白。仅剪去开头确定为静音的0.15秒，不剪词中辅音或元音。两句的实测活动范围见修订validation，句级估计而非字词强制对齐；自然度仍需持有人听取。

修订配音只写入0–7.185533秒，之后原配音PCM样本逐一相同；7.25秒后混音PCM也与旧版完全一致。原BGM独立轨、增益和循环接缝不变。采用视频流复制重新封装，H.264码流SHA完全相同，字幕像素及所有画面不变，仍为134.966667秒/4049帧。新AAC真峰值-3.8dBFS，完整解码通过，无削波。修订质量记录独立存于 `opening-audio-revision/validation.json` 与 `quality-report.json`，不将旧成片Gate冒充新音轨复检。

新音轨的听感、句间连接及“保值”发音待人工试听；ASR仍识别为“保持”，这是识别不确定性，不是自动认定发音错误，也没有改字幕。只限私人审阅，不发布。


## 持有人最终选版

持有人试听后裁定：“效果还没有前一版好，用前一版了”。因此选用换配音前的 `microsoft-skills-review.mp4`；`opening-audio-revision/microsoft-skills-audio-revised.mp4` 标记为人工不采用，仅保留对照，不覆盖或删除文件。选版及SHA记录在 `holder-selection.json`。本裁定仅针对版本选择，不扩张为全片发布质量、BGM音量或素材许可已通过。停止修改。
