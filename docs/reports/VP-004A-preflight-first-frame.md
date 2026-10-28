# VP-004A｜Wan 首个真实场景镜头：资产预检与首帧待审

记录日期：2026-10-27。当前停点：**首帧人工确认＋大型权重下载审批**。本轮已生成首帧候选、完成环境及模型资产预检；尚未部署 ComfyUI、下载模型或运行 Wan。所有视频推理结果、峰值显存及真实推理耗时均待后续执行，不填假数据。

## 1. 交付与真实输入

- [第 1 镜首帧候选 PNG](../../orchestrator/output/day9-vp004a/shot-001-first-frame-v1.png)
- [首帧完整生成提示词](../../orchestrator/output/day9-vp004a/first-frame-prompt.txt)
- [首帧来源、尺寸与哈希](../../orchestrator/output/day9-vp004a/first-frame-record.json)
- [大型资产下载提案（固定版本、大小、哈希、完整 URL）](../../orchestrator/output/day9-vp004a/preflight/asset-download-proposal.json)
- [官方工作流 JSON 留档](../../orchestrator/output/day9-vp004a/preflight/official-wan22-5b-ti2v.json)
- [拟议 I2V 配置及完整正/负提示词，尚未执行](../../orchestrator/output/day9-vp004a/wan-i2v-proposed-config.json)
- [环境记录](../../orchestrator/output/day9-vp004a/environment-check.json)、[已存在 VAE 完整性检查](../../orchestrator/output/day9-vp004a/existing-vae-check.json)

真实输入：Day9 Excel、`orchestrator/output/day9/script.voiced.json`、VP-003A `visual-matrix.json`。Excel 与导入 JSON 的关联、哈希和逐字内容已在 VP-003A 检查；本轮复核冻结文件哈希，无修改。

第 1 镜原始画面描述：**开场-情绪｜【中文】一个人思考；夜晚工位｜【EN】solo founder thinking; night desk｜镜头：slow pan**。

原始旁白：上一次我讲的是，一人公司最容易踩的几个坑。但今天这条，我想直接讲一件事：如果不想走到那一步，其实是有“正确的做法”的。这里是小陈AI说。

实际配音 **12.295147392 秒**；原叠加文字为“大字：一人公司，真正的风险”。本轮首帧不烧入标题；后续 Wan 只占该镜的 3–5 秒，其余时间按已审矩阵用同图轻缓运动或文字承接，不压缩配音，不为填满整镜多生成视频。

第 5 镜继续正式采用 `orchestrator/output/day9-vp003a/shot-005-remotion.mp4`；R1 仅作历史对照。其文件和模板均未修改。

## 2. 首帧设计与检查

首帧使用 **内置 image_gen 工具**，不是本地 Wan 或 Z-Image 推理。本次只发送虚构工位场景的设计提示词，没有上传本人录音、音色参考、Excel、配音 JSON 或音频。生成 PNG 原样复制到项目的忽略输出目录，工具源文件保留。

构图采用单人侧后方、夜间窗景与工位，人物在中下部偏右；上方留出后续观点文字空间。主色为深蓝，显示器带克制蓝紫渐变，台灯提供少量暖色。显示器为无界面的空白画面，无字幕、标志或可读文字；没有伪造产品演示。人物为虚构角色，不暗示是持有人本人。

实际原图尺寸：**941×1672**，比例 **0.562799043**，非常接近 9:16，但不是数学上严格的 9:16。工具未按提示中的 1152×2048 输出；为保留候选原貌，本轮没有悄悄裁改。后续批准后，官方 I2V 节点会将同一首帧中心缩放到拟议的 **576×1024（严格 9:16）**。该尺寸归一尚未执行；首帧原图与模型输入派生图应分别保留。

已查看原图：单人及工位关系自然，屏幕没有明显伪字或 UI，主视觉不需要再增加元素。实际生成采用了“手扶下巴”的思考姿态，与提示中手臂自然放桌的细节有差异，但符合本镜思考主题。脸与手部分遮挡，不能据静图宣称完整手部解剖或动态稳定性已通过；后续须重点检查手与下巴接触处，拟议动作保持手部基本不动。

首帧 SHA-256：`ec62aa667f28279f69b4f7f1f0185332099bb794c1eb6ea4ab99a8c085e7393e`。

image_gen 没有暴露可核查的模型版本、seed 或服务器 GPU 峰值，记录中为 null。工具调用约 20.4 秒的墙钟时间包含工具处理，并不是本地 Wan 推理基准。本轮未自行补造这些参数。

## 3. AI Server 与 ComfyUI 现状

| 检查项 | 本轮只读结果 | 判断 |
|---|---|---|
| ComfyUI HTTP | `127.0.0.1:8188/system_stats` 连接被拒绝 | 当前标准端口未启用 |
| 公共程序目录 | `/home/chen/ai-models/` 只有 GPT-SoVITS、IndexTTS2；`/home/chen/ai-models/ComfyUI` 和 `/home/chen/ComfyUI` 均不存在 | 已检查位置没有部署，不把全盘其他未知位置当作已穷尽 |
| 公共服务目录 | 只有两个 TTS 服务与 gpu.lock | 尚无 ComfyUI 公共服务配置 |
| Docker | 三个 PostgreSQL 容器及一个 ETL 接收服务，没有 ComfyUI/Wan 容器 | 不影响或调整既有容器 |
| GPU | 已有 TTS `/health` 返回 CUDA 就绪、总显存 49140 MiB，约 48GiB | 与已记录的 RTX 4090 48GB 环境相符 |
| GPU 快照 | 已用 12977 MiB，空闲 35642 MiB，温度 33°C，利用率 12% | 是查询时快照，不是 Wan 峰值显存或性能测试 |
| nvidia-smi 直读 | 沙箱提示 OS 阻止 NVML 访问 | 使用现有服务的只读 health 获取 GPU 快照；没有据此判断 GPU 故障，也未修改驱动 |
| 磁盘 | 约 676G 可用 | 容量有余量，仍需控制依赖缓存及下载范围 |
| 既有 TTS | 9880、9881 均 ready；IndexTTS2 仍是 G4-SHOT10、剩余尝试 0 | 未请求推理、启停、重配或释放这些服务 |

仓库 `install-comfyui.sh` 会改系统依赖、安装 Manager 并建议宽监听，不能直接用于当前公共架构；本轮仅阅读，未执行。仓内 `config/workflows.json` 仍只有 lipsync TODO，没有可用 Wan 配置。

资产复用检查覆盖 `/home/chen/comfyui-models/`、`/home/chen/ai-models-data/`、Hugging Face hub 缓存、ModelScope 缓存及预期模型目录。HF 的 Wan 缓存只有一个 refs/main，没有完整 blob；本地有零字节下载 lock，这些不是已下载权重。详情见 [asset-search.json](../../orchestrator/output/day9-vp004a/preflight/asset-search.json)、[wan-cache-files.json](../../orchestrator/output/day9-vp004a/preflight/wan-cache-files.json)。没有迁移或删除既有资产。

`Z-Image-Turbo` 目录有两个既有权重文件，本轮不部署或判断其完整可运行性，不为首帧重复下载这类模型；本次图片不能作为该本地模型效果或速度的验证证据。

## 4. 最小模型选择、完整性与下载审批清单

优先选择 **Wan2.2-TI2V-5B 原生 I2V 路径**。官方说明其统一支持图/文生视频；相比双专家 14B，本镜的轻微动作更适合先以已有 5B VAE 和较小下载范围验证。不是将 5B 说成已通过本地真实效果测试。[Wan 官方说明](https://github.com/Wan-Video/Wan2.2/tree/1ea34ff48f87168174e12956e200b1d908b1c5ff)、[ComfyUI 原生工作流](https://docs.comfy.org/tutorials/video/wan/wan2_2)。

固定权重来源：`Comfy-Org/Wan-2.2`（原 `Comfy-Org/Wan_2.2_ComfyUI_Repackaged` 的规范化名称），完整 revision **`c4f60d30c55a624e35427060fdd217579a6c1d77`**，与既有 VAE 下载 metadata 的 revision 相同。只选择下列三文件，不下载整个仓库。

| 资产 | bytes | 十进制 GB | 状态 |
|---|---:|---:|---|
| `wan2.2_ti2v_5B_fp16.safetensors` | 9,999,658,848 | 9.999658848 | 缺失，等待下载批准 |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | 6,735,906,897 | 6.735906897 | 缺失，等待下载批准 |
| `wan2.2_vae.safetensors` | 1,409,400,960 | 1.409400960 | 复用，已验 SHA-256 |

**需新下载两项合计 16,735,565,745 bytes = 16.735565745 GB（约 15.586 GiB）。当前尚未获本轮大型权重下载批准，未执行下载。** 完整三项合计 18.144966705 GB，其中 VAE 的 1.409400960 GB 已有，不重复下载。

完整 SHA-256：

- `wan2.2_ti2v_5B_fp16.safetensors`：`456f901338bd9eadbded3828b819109a9b68e8a525ca5cf8d0049a69fcfeca1e`；[固定下载来源](https://huggingface.co/Comfy-Org/Wan-2.2/resolve/c4f60d30c55a624e35427060fdd217579a6c1d77/split_files/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors)。

- `umt5_xxl_fp8_e4m3fn_scaled.safetensors`：`c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68`；[固定下载来源](https://huggingface.co/Comfy-Org/Wan-2.2/resolve/c4f60d30c55a624e35427060fdd217579a6c1d77/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors)。

- `wan2.2_vae.safetensors`：`e40321bd36b9709991dae2530eb4ac303dd168276980d3e9bc4b6e2b75fed156`；[固定下载来源](https://huggingface.co/Comfy-Org/Wan-2.2/resolve/c4f60d30c55a624e35427060fdd217579a6c1d77/split_files/vae/wan2.2_vae.safetensors)。

既有 VAE 位于 `/home/chen/comfyui-models/Wan2.2-TI2V-5B/split_files/vae/wan2.2_vae.safetensors`，本轮完整流式 SHA-256 与官方 revision 的 LFS SHA 完全一致；不仅是文件大小相符。没有移动 VAE。

许可记录：固定权重仓 model card 声明 Apache-2.0；Wan 官方源码固定提交 `1ea34ff48f87168174e12956e200b1d908b1c5ff` 的 LICENSE.txt 为 Apache 2.0；UMT5 上游 Google 模型卡亦声明 Apache-2.0。ComfyUI 程序为 GPL-3.0，工作流模板为 MIT；需要保留各自许可和来源，不把程序、权重与工作流混称为同一许可。原文/说明分别留档在 preflight 的 repackaged-model-card.md、wan-LICENSE.txt、umt5-model-card.md、comfy-LICENSE.txt、workflow-LICENSE.txt。模型卡声明不代表能忽略输入素材权利，本轮仍按私人评估执行。[Wan 固定许可](https://github.com/Wan-Video/Wan2.2/blob/1ea34ff48f87168174e12956e200b1d908b1c5ff/LICENSE.txt)、[Google UMT5 模型卡](https://huggingface.co/google/umt5-xxl)。

若批准部署，建议目录：

- 程序 `/home/chen/ai-models/ComfyUI/`；候选源码提交 `426f5eea52a7ece1dd599fff4cb6cd1f352ddd24`，尚未安装或兼容性实测。
- 新增权重 `/home/chen/ai-models-data/wan22-ti2v-5b/`。
- 配置、独立 Python 环境及日志 `/home/chen/ai-services/comfyui/`；监听 `127.0.0.1:8188`。
- 用 extra_model_paths 配置引用现有 VAE 的原位置，不迁移、不删旧目录、不把模型放业务仓。

源码、依赖也需空间；ComfyUI 当前 requirements 涉及 torch/torchvision、transformers、tokenizers、sentencepiece、safetensors、aiohttp、av、前端及原生运行库等，已存 `preflight/comfy-requirements.txt`。这不是已安装锁文件。独立环境的具体 torch/CUDA wheel 版本和完整依赖锁，需在后续安装前结合当前驱动、Python 及官方环境完成复核，不能复制修改已有 TTS 环境。

新增权重外，预留约 8–15GB 环境/缓存和少量输出；工程磁盘预算合计约 25–40GB，下载缓存可能增加临时占用。没有把这些依赖包误计为两项已核准的大型模型。本轮没有安装任何依赖。

## 5. 官方 I2V 工作流核对与 9:16

固定模板仓 `Comfy-Org/workflow_templates` 提交 **`3c2199b9362457b12b9c60c6cc303501526ebd62`**，文件 `templates/video_wan2_2_5B_ti2v.json`；SHA-256 为 `23c93b88adecbdf5bcf4c5438117070fe757f30aca373dd6a2eb488d2c6a585a`。

工作流含完整原生节点：UNETLoader、CLIPLoader、VAELoader、CLIPTextEncode、ModelSamplingSD3、Wan22ImageToVideoLatent、KSampler、VAEDecode、CreateVideo、SaveVideo、LoadImage。该路径没有额外 CLIP Vision 权重或第三方自定义节点需求。**官方工作流存在，不等于本机已跑通。**

必须注意：官方模板的 LoadImage 节点 id=56、mode=4，默认处于 bypass；要启用并接入确认首帧才能真正做 I2V，不能未接图便冒称图生视频。官方 JSON 是 UI 图，不能直接当 `/prompt` API 的输入图；后续需导出/转换为 API 格式，核对本地 object_info 的节点 schema，再执行。模板默认例图、提示词与随机 seed 都需要改为本任务明确固定值，不启用模型自动下载。

固定 ComfyUI 源码的 `Wan22ImageToVideoLatent`（留档 comfy-nodes-wan.py:1418 起）规定宽高 step=32，帧数按 4n+1；节点内部会中心缩放首帧。[固定节点源码](https://github.com/Comfy-Org/ComfyUI/blob/426f5eea52a7ece1dd599fff4cb6cd1f352ddd24/comfy_extras/nodes_wan.py)。因此拟用：

| 参数 | 拟议值，未执行 |
|---|---|
| 原生输出 | **576×1024，严格 9:16**，宽高均为 32 的倍数 |
| 时长 | 97 帧、24fps，编码片长约 4.042 秒，处于 3–5 秒要求内 |
| 数量 | batch=1，仅第 1 镜一次候选 |
| seed | 42，固定，不使用模板 randomize |
| KSampler | steps=20，cfg=5，uni_pc，simple，denoise=1，沿用官方模板主要参数 |
| ModelSamplingSD3 | shift=8，沿用模板 |
| 文本编码器 | 建议 CPU 放置，降低与现有驻留模型的显存竞争，待本地 schema/性能验证 |
| 声音与字幕 | 不添加，不调用 TTS；输出无音轨/字幕的场景片段 |
| 运动 | 只轻微呼吸和肩部变化，手保持稳定，镜头极慢横移，不转头、不手势、不切镜 |

官方原生示例的 1280×704 / 704×1280 不是严格 16:9 / 9:16，不能写成严格比例。本轮选择低于原生 720P 的 576×1024 首测，减少显存和首次验证成本；它的画质、纵向构图表现尚未实测，不保证必然达到发布标准，也不预先上采样冒充高分辨率生成。

完整拟议正/负提示词均在 wan-i2v-proposed-config.json，明确保留同一个人、桌面、灯光、空白显示器，只做微动作和极慢镜头移动。首帧未经持有人确认前，该配置不执行。

## 6. GPU、性能预算与资源保护

Wan 官方参考代码给出：TI2V-5B 在 offload、dtype 转换和 T5 CPU 等条件下可用至少 24GB 显存的显卡运行；其 5 秒 720P 参考效率为单消费级 GPU 小于约 9 分钟。这是官方路径的参考条件，**不是本机 ComfyUI 的显存峰值或耗时**。[固定官方说明](https://github.com/Wan-Video/Wan2.2/blob/1ea34ff48f87168174e12956e200b1d908b1c5ff/README.md)。ComfyUI 文档还描述其原生卸载可进一步减少显存，但不能用页面宣传数值替代本机测试。

首轮工程预算：新增推理显存暂按约 24–32GiB 安排、保留至少 2–4GiB 余量；576×1024/97 帧/20 步可先为推理预留 **2–10 分钟**，冷加载和诊断另留时间。这是粗略规划范围，不是实测承诺。当前空闲约 34.81GiB，容量看有机会，但驻留模型、激活、VAE 解码峰值、offload 策略和魔改卡稳定性仍需真实测试。

后续部署必须加入简单协作保护：

1. 复用 `/home/chen/ai-services/gpu.lock`，保护整个工作流执行和必要模型加载；不能只锁 POST /prompt，因为返回时 GPU 工作可能尚未开始。
2. 启动推理前读空闲显存、温度、利用率；资源不足快速拒绝。先让文本编码器走 CPU/采用原生 offload，不绕过保护强跑。
3. 不能擅自停止或卸载现有 TTS/其他项目；若实际不够，停止报告，由持有人裁决运行窗口。
4. 记录单次生成墙钟耗时、峰值整卡显存及可获得的进程/张量统计，保留日志；不建复杂跨项目调度平台。
5. 运行期禁止未批准的模型自动下载；若节点提示额外资产，停止核对，不临时扩模型范围。

## 7. 当前完成、未完成与停止原因

| 交付 | 本轮状态 |
|---|---|
| 首帧候选及完整提示词 | 已生成、保存、目视检查；等待持有人确认 |
| Wan 资产/来源/固定版本/许可/大小 | 已查明；VAE 已验证，缺两项约 16.736GB |
| 官方 I2V 图及拟议参数 | 已留档、静态核对；本机未运行 |
| ComfyUI 公共服务 | 尚未部署/启动 |
| Wan 3–5 秒视频 | **未生成**：首帧关口和下载审批均未通过 |
| 视频稳定性、手脸变形、Remotion 背景可用性 | 需真实视频后逐帧及媒体探测验收，当前不能宣称通过 |
| GPU 峰值显存、真实推理耗时 | **未实测，null**；不会用预算或图片生成时间代替 |

本轮仅新增本报告及忽略输出目录中的图片、提示词、metadata、许可/工作流/小型源码留档和预检记录；没有修改业务代码或模型服务。63 个受保护文件哈希均未变化，包括配音、原始脚本、第 5 镜模板与原版 MP4。没有提交或推送。

需要持有人下一步裁定：

1. 首帧的场景、人物状态、明暗和构图是否通过；若不通过，只按具体反馈修图，不运行 Wan。
2. 是否批准上表**两项固定权重**合计 16.735565745GB 的下载。后续部署遵循既定公共目录与独立环境架构；既有 VAE 不重复下载，额外模型/超范围资产另报。

按本轮要求停在这里，等待首帧确认与下载批准，不自动生成视频、其他镜头或 Day9 完整成片。
