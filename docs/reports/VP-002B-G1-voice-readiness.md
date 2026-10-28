# VP-002B-G1｜Day9 本人录音预检与 GPT-SoVITS 部署方案

检查日期：2026-10-27（Asia/Shanghai）。项目基线：`404f8d5`。本报告是 Gate 1 结果，**不是 Gate 2 部署或推理授权**。

## 结论与证据边界

10 段原始录音全部可完整解码；推荐先人工听审 `3.m4a` 的 0.80–5.95 秒、`2.m4a` 的 0.55–8.35 秒及 `1.m4a` 的 0.60–5.30 秒。这三段候选在所测窗口内均无满幅采样点，电平有余量，长度符合拟采用 API 的 3–10 秒参考要求。**它们是技术预选，尚未通过本人音色、背景声、混响和逐字稿听审，不能称为最终合格参考。**

服务器有约 48 GiB 显存，但没有找到已部署的 GPT-SoVITS 或其可复用权重。建议 Gate 2 采用固定官方代码版本的 **GPT-SoVITS v2ProPlus 零样本参考音频 TTS**，先做少量真实句子 A/B 测试，不训练、不微调。预计选择性模型下载约 1.892 GB，另加依赖下载；最终商业使用判断需保留各组件许可与实际权重来源记录。

本轮仅读取原始文件、CPU 音频分析、复用现有 CPU ASR、读取线上官方文档/文件元数据并写本报告。未安装依赖、下载模型、裁切落盘、启动服务、运行 GPU 推理、训练或修改业务代码；未提交或推送录音。音频解码仅输出到内存或 FFmpeg null sink。现有 `/local-assets/voice/` 忽略规则有效，`git ls-files 'local-assets/voice/**'` 为空。

未进行人耳播放听审。本报告的“无解码异常”不代表没有爆破音、口水音、混响、环境声或口误；ASR 也不能替代本人确认音色和内容。

## 1. 10 段录音质量检查表

输入目录：`local-assets/voice/raw/day9/`。全部为 AAC、48,000 Hz、双声道，音频流码率约 148 kb/s。双声道解码数据的左右相关系数均为 1.000000，平均合并到单声道的 RMS 变化约 0 dB，未发现明显相位抵消风险。M4A 为有损源，转换 WAV 不会恢复压缩中丢失的信息。

方法：`ffprobe -show_format -show_streams`；`ffmpeg -v error -xerror` 完整解码；`volumedetect`、`silencedetect=noise=-40dB:d=0.3`；`ebur128=peak=true`；从未限幅的 float32 PCM 计算 RMS、采样峰值与满幅计数。

“满幅点”是双声道合计 `abs(sample) >= 1.0` 的采样值个数；“近满幅”阈值为 `abs(sample) >= 0.99`。AAC 解码可产生轻微超调，因此满幅点是复核信号，**不是录制时模拟/数字削波已经成立的证明**。未做原始 ADC 波形鉴定。FFmpeg `volumedetect` 会转换到定点格式，不能用于精确计算超出 0 dBFS 的幅度，故同时保留浮点分析。

| 文件 | 时长 s | RMS dBFS | 综合响度 LUFS | 采样峰值 dBFS | 真峰值 dBTP，约 | 满幅/近满幅点 | 静音累计 s / 占比 | 解码/初步适用性 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1.m4a | 16.448 | -19.03 | -15.7 | -0.27 | -0.3 | 0 / 0 | 2.538 / 15.4% | 通过；整段超过 10 秒，选句后可候选 |
| 2.m4a | 8.939 | -20.78 | -17.4 | -2.77 | -2.8 | 0 / 0 | 1.919 / 21.5% | 通过；电平余量较好，优先候选 |
| 3.m4a | 12.160 | -19.99 | -16.7 | -1.95 | -1.9 | 0 / 0 | 2.294 / 18.9% | 通过；整段超过 10 秒，首句优先候选 |
| 4.m4a | 12.117 | -18.80 | -15.5 | -0.05 | 0.0 附近 | 0 / 4 | 2.794 / 23.1% | 通过；接近满幅、停顿较多，不作首选 |
| 5.m4a | 4.715 | -16.24 | -12.2 | +0.04 | +0.1 | 2 / 10 | 1.725 / 36.6% | 通过；有效语音较短且有超调，不作首选 |
| 6.m4a | 12.459 | -18.20 | -14.7 | +0.06 | +0.1 | 2 / 8 | 2.427 / 19.5% | 通过；整段过长，有超调，需听审 |
| 7.m4a | 10.944 | -17.15 | -13.7 | +0.01 | 0.0 附近 | 2 / 16 | 2.496 / 22.8% | 通过；整段略长，有超调，需听审 |
| 8.m4a | 11.029 | -16.87 | -13.5 | +0.15 | +0.2 | 8 / 12 | 1.584 / 14.4% | 通过；有超调及明显 ASR 疑点，不作首选 |
| 9.m4a | 9.088 | -16.54 | -13.2 | +0.13 | +0.1 | 26 / 28 | 1.613 / 17.7% | 通过；满幅点最多，需重点听审 |
| 10.m4a | 11.200 | -16.42 | -13.0 | +0.01 | 0.0 附近 | 2 / 22 | 1.637 / 14.6% | 通过；整段过长，句尾内容需核对 |

所有文件 ffprobe 与严格完整解码退出码均为 0，解码错误输出为空，容器时长与解码样本时长一致（表格四舍五入）。合计 **109.098667 秒**。与 Excel 建议合计 32 秒明显不同；不能按旧建议时长强行压缩录音，也不能仅据时长证明读对了文本。

20 ms RMS 窗口的第 10 百分位约 -64.91 至 -71.21 dBFS，显示有很低电平的区间，但它包含静音/录音端门限处理，**不能当作真实环境噪声底或 SNR**。LUFS 用于相对电平观察，短片段不作为发布响度达标证明。

### 静音区间与重点复核位置

以下是 -40 dB、至少 0.3 秒的低电平区间；它们可能是正常句间停顿，不应自动全部删除。时间单位为秒，保留三位小数。

| 文件 | 低电平区间 | 额外复核位置 |
|---|---|---|
| 1 | 0–0.757；5.063–5.456；5.493–5.899；8.872–9.200；13.411–14.066 | 全段峰值靠近满幅；候选首句有更好余量 |
| 2 | 0–0.665；4.333–4.843；8.194–8.939 | 正常句间停顿；开头“一人”需听审 |
| 3 | 0–0.947；1.835–2.166；5.824–6.159；11.478–12.160 | 保留“第一个错误”之后的自然停顿 |
| 4 | 0–0.672；2.021–2.457；3.818–4.119；5.045–5.577；9.075–9.481；11.670–12.117 | -0.05 dBFS 峰值，需确认是否有可闻失真 |
| 5 | 0–0.423；1.306–1.757；3.864–4.715 | 约 2.293 秒出现解码后满幅点 |
| 6 | 0.210–1.024；6.440–7.073；8.186–8.565；11.858–12.459 | 约 1.557 秒满幅；开头 0–0.210 秒不满足静音阈值，需听审是否为操作声 |
| 7 | 0–0.539；1.540–1.881；3.868–4.208；7.025–7.418；10.061–10.944 | 约 3.158 秒满幅 |
| 8 | 0–0.421；4.774–5.237；10.330–11.029 | 约 0.851 秒满幅；约 3–5 秒“决策/现实”转写疑点 |
| 9 | 0–0.380；2.651–3.057；8.262–9.088 | 约 0.735、1.035 秒满幅；后者有连续 12 个时间采样位置，仍不能据此认定录制削波 |
| 10 | 3.398–3.817；7.503–7.877；10.198–10.568；10.727–11.200 | 约 1.102 秒满幅；开头无已检测长静音，剪辑需防切字；句尾“唷”待核对 |

本轮不做归一化、降噪、修复削波或裁切输出。后续若制作参考 WAV，只处理新副本；适量衰减可以避免格式转换再次溢出，但不能修复录制时已经存在的失真。

## 2. 分镜与录音对应表

权威文本来自 `orchestrator/output/day9/script.normalized.json` 的 `shots[].narration`。仅按文件编号与 `shotNumber` 建立初步关联，未修改 JSON。

为降低猜测，本轮复用已存在的 `faster-whisper-small`，明确指定 **CPU / int8 / 4 线程 / 本地权重 / 禁止自动下载**，无初始脚本提示，`language=zh`、`beam_size=5`、`condition_on_previous_text=False`、`vad_filter=True`。ASR 只是辅助证据。原始 ASR 含简繁混用，表中原样记录（仅用空格连接分段），不擅自转换成 Excel 文案。时间戳有误差，不能直接当作精准剪辑边界。

| 文件 → shotNumber / Excel行 | 原始旁白（权威文本） | CPU ASR（非权威文本） | 比对结论 |
|---|---|---|---|
| 1.m4a → 1 / 2 | 上一次我讲的是，一人公司最容易踩的几个坑。但今天这条，我想直接讲一件事：如果不想走到那一步，其实是有“正确的做法”的。这里是小陈AI说。 | 上一次我講的是 藝人公司最容易踩了幾個坑 但今天這條我想直接講一件事 如果不想走到那一步 其實是有正確的做法的 這裡是小陳AI說 | 内容主题支持关联；“一人/艺人”“踩的/踩了”及品牌名须听审；未确认逐字一致 |
| 2.m4a → 2 / 3 | 一人公司真正的风险，不是你做错了什么，而是你迟迟没有切换到正确的做法。 | 藝人公司真正的風險不是你做錯了什麼 而是你遲遲沒有切換到正確的做法 | 主题支持关联；“一人/艺人”待核对，不能认定本人读错 |
| 3.m4a → 3 / 4 | 第一个错误，是把身体当成可以透支的资源。熬夜、久坐、硬扛，觉得等产品出来了，一切都值得。 | 第一个错误是把身体当成可以透支的资源 熬夜久坐硬扛 觉得等产品出来了一切都值得 | 去掉标点后词面一致；仍需人工确认音质与实际读法 |
| 4.m4a → 4 / 5 | 正确的做法是：先稳住身体，再谈进度。在一人公司里，身体不是条件之一，而是整个系统的上限。 | 正確的做法是先穩住身體再談進度 在一人公司裡身體不是條件之一 而是整個系統的上限 | 简繁、标点差异为主；未发现明显内容差异，仍待听审 |
| 5.m4a → 5 / 6 | 第二个错误，是产品功能越做越多。 | 第二個錯誤是產品功能越做越多 | 简繁、标点差异为主；仍待听审 |
| 6.m4a → 6 / 7 | 表面看是在完善产品，其实是在拖延面对真实反馈。正确的做法是：只保留最小、最顺、最能跑通的流程。 | 表面看是在完善產品 其實是在拖延面對真實反饋 正確的做法是 只保留最小最順最能跑通的流程 | 简繁、标点差异为主；仍待听审 |
| 7.m4a → 7 / 8 | 第三个错误，是迟迟不上线。因为不上线，你就不用面对用户，也不用验证那些不确定的判断。 | 第三个错误是迟迟不上线 因为不上线你就不用面对用户 也不用验证那些不确定的判断 | 去掉标点后词面一致；仍待听审 |
| 8.m4a → 8 / 9 | 正确的做法是：尽快上线，把决策交给现实。上线不是成功，但它能帮你停止内耗，结束无限准备。 | 正確的做法是盡快上線,把節冊交給限時 上線不是成功,但它能幫你停止內耗 結束無限準備 | “决策交给现实/节册交给限时”明显疑点；可能为 ASR 误识别，须听审，禁止据此改文案 |
| 9.m4a → 9 / 10 | 真正把一人公司拖垮的，从来不是能力不够，而是一直在用错误的方式硬撑。 | 真正把一人公司拖垮的,从来不是能力不够,而是一直在用错误的方式硬撑。 | 标点差异为主；仍待听审 |
| 10.m4a → 10 / 11 | 下期我会把这三条“正确的做法”，拆成我每天正在用的一套工作结构。关注我，别错过下一期。 | 下期我会把这三条正确的做法 拆成我每天正在用的一套工作结构 关注我别错过下一期唷 | 句尾多识别“唷”，可能为真实语气词或 ASR 幻觉，须本人核对 |

没有把“ASR 识别到相同主题”写成“Excel 与录音逐字一致”。真正用于 `prompt_text` 的文本必须与**实际裁切音频**一致；若本人确实读了不同词，应记录真实参考文本，不改权威旁白。

## 3. 推荐参考音频

时间范围均相对原始 M4A，从文件零点计时。本轮只在内存分析候选窗口，没有生成切片。切点依据低电平区间和 ASR 语句线索，最终需听审微调到完整词边界。3–10 秒限制来自所核实的 [TTS 实现](https://github.com/RVC-Boss/GPT-SoVITS/blob/b4570b876f5c086819ba84e3215472733c6a7b70/GPT_SoVITS/TTS_infer_pack/TTS.py)。

| 优先级 | 原文件 / 范围 | 时长 | 窗口实测依据 | 候选参考文本（尚待听审确认） | 人工核对 |
|---|---|---:|---|---|---|
| A | `3.m4a`，0.80–5.95 s | 5.15 s | RMS -18.76 dBFS；采样峰值 -1.95 dBFS；满幅点 0；包含第一句，首尾留在低电平边界附近 | 第一个错误，是把身体当成可以透支的资源。 | 必须：首字、句尾、口水/爆破音、混响、是否代表常用声线 |
| B | `2.m4a`，0.55–8.35 s | 7.80 s | RMS -20.19 dBFS；峰值 -2.77 dBFS；满幅点 0；电平余量较好，保留句中自然停顿 | 一人公司真正的风险，不是你做错了什么，而是你迟迟没有切换到正确的做法。 | 必须：尤其“一人/艺人”；边界不切字；背景声与自然度 |
| C | `1.m4a`，0.60–5.30 s | 4.70 s | RMS -19.59 dBFS；峰值 -2.18 dBFS；满幅点 0；该窗口比整段峰值余量好，避开后续品牌名读法 | 上一次我讲的是，一人公司最容易踩的几个坑。 | 必须：确认“踩的/踩了”“一人/艺人”；实际读法可能不同，不能直接填 Excel 文本 |

这些推荐依据实际波形电平、静音边界、解码完整性与内容线索，**没有根据文件大小或长度直接断言音色质量**。首轮优先 A/B；C 作为备选。若听审发现所有候选均有明显房间混响或噪声，先补录干净的完整 5–8 秒普通话句子，再申请继续，不自动运行分离/降噪模型。

## 4. GPT-SoVITS 当前部署状态与客户端兼容性

### 本机状态

| 检查 | 实际结果 / 证据 |
|---|---|
| GPU | `nvidia-smi --query-gpu=...`：RTX 4090；总显存 49,140 MiB；已用 2,977 MiB；空闲 45,642 MiB；驱动 610.88；温度 33°C。瞬时快照，不是推理测试 |
| 内存、磁盘 | `free -h`：WSL 可见约 124 GiB 内存；`df -h .`：Linux 分区剩余约 705G |
| SoVITS 服务 | `ss -ltn` 无 9880/9874 监听；GET `127.0.0.1:9880/openapi.json` 连接失败，HTTP 000 |
| Docker | 当前 default context 的容器和镜像清单均未发现 GPT-SoVITS；未启动任何容器 |
| 安装目录 | 预期 `/home/chen/GPT-SoVITS`、项目 `models/` 与 `voice-ref/` 不存在；仓内只有客户端与部署模板 |
| 权重 | 在 `/home/chen/work`、常用 HF/ModelScope 缓存、`miniforge3/envs` 和 `/mnt/h/Models` 的受限目录深度检查中未发现 SoVITS、GPT、CN-HuBERT、中文 RoBERTa 相关模型资产；这不排除未检查磁盘或其他主机有旧资产 |
| 现有 ASR 资产 | 已找到并复用 `/home/chen/.cache/huggingface/hub/models--Systran--faster-whisper-small/snapshots/536b0662742c02347bc0e980a01041f333bce120`；这是 ASR 权重，不是 SoVITS 权重 |
| 现有 Python | 本轮分析用 `/home/shared/projects/.venv/bin/python`，已有 NumPy、faster-whisper，无 torch；不应把共享分析环境直接升级为生产 TTS 环境 |

### 既有代码可复用与差额

现有 `orchestrator/src/clients/sovits.ts` 实现 POST `/tts`、参考音频路径/逐字稿、`zh/yue`、`cut5`、WAV 保存和失败重试。它与拟采用固定版本的 [api_v2.py 请求契约](https://github.com/RVC-Boss/GPT-SoVITS/blob/b4570b876f5c086819ba84e3215472733c6a7b70/api_v2.py) **字段级兼容，尚未做实际服务联调**。

- 服务端须显式选择 `version: v2ProPlus` 和对应 GPT/SoVITS 权重；`api_v2` 是 API 名称，不表示自动选择 v2ProPlus。默认 YAML 的 `custom` 仍指向 v2；配置优先级须核实。[官方配置](https://github.com/RVC-Boss/GPT-SoVITS/blob/b4570b876f5c086819ba84e3215472733c6a7b70/GPT_SoVITS/configs/tts_infer.yaml)
- 客户端的 `speed_factor: 1.05` 是旧带货固定速度；本人音色首测建议 1.0，对比时固定种子和其他参数。首测可直接用 HTTP 请求，不改旧 DSE 客户端。
- 显式 `streaming_mode: false`、`media_type: wav`；返回需确认音频 Content-Type、WAV 可解码、时长和非静音。现有客户端未做这些完整校验，也没有显式 HTTP 超时。
- 现有 `config/voices.json` 的 `prompt_text` 为 TODO，`/workspace/voice-ref/...` 是容器内路径。原生安装应使用其可读的实际 Linux 路径；容器方案则需要真实只读挂载。不能把宿主机路径无条件传给容器。
- 旧 `docker-compose.yml` 用未固定的社区 `latest`，API 启动 command 仍为注释，不能直接把启动 WebUI 当作 API 已可用。Gate 2 不建议直接执行整个 compose，以免同时部署 Whisper。
- 新个人 IP 测试不走 `runPipeline()`，避免触发 DSE LLM、对口型、录屏或合成。后续若修改客户端，只新增必要配置，保留旧调用行为；本轮未改代码。

## 5. 模型安装、权重和许可需求

### 推荐方案与替代方案

建议：WSL Linux 侧独立 Python 环境 + 官方固定源码 + v2ProPlus + `api_v2.py`，仅监听 `127.0.0.1:9880`。编排端仍用 TypeScript HTTP。WebUI 非首测必需；Whisper HTTP 服务、数据库、LLM、训练脚本也非必需。

替代方案：先用普通 v2，减少说话人编码器依赖，便于定位兼容性问题；但本人相似度仍需实测，不能保证比 ProPlus 更好。若 ProPlus 资源或许可核验受阻，再由持有人裁决是否回退，不能自动扩展到其他 TTS 模型。选择 ProPlus 的依据是官方已提供对应配置与少样本音色路径，而不是本机已经验证质量。[官方版本说明](https://github.com/RVC-Boss/GPT-SoVITS#v2pro-release-notes)

本次核实源码 revision：`b4570b876f5c086819ba84e3215472733c6a7b70`，提交日期 2026-10-19。选定版本必须再次核对依赖安装结果后固定，不跟随 `main/latest` 自动漂移。

依赖类别：Python 3.10/3.11；兼容的 torch/torchaudio CUDA wheel；NumPy<2、librosa、Transformers、FastAPI/Uvicorn、PyYAML、音素/分词前端及 ONNX Runtime 等。官方测试矩阵包含 Python 3.11 / PyTorch 2.7.0 / CUDA 12.8，可作为候选组合，需验证当前固定源码和 wheel 兼容。宿主机已有 FFmpeg；独立环境可能还需 libsndfile、构建工具和 OpenCC 构建依赖。WSL 继续复用 Windows GPU 驱动，不安装 Linux NVIDIA 内核驱动。[官方环境表](https://github.com/RVC-Boss/GPT-SoVITS#tested-environments)、[固定版 requirements](https://github.com/RVC-Boss/GPT-SoVITS/blob/b4570b876f5c086819ba84e3215472733c6a7b70/requirements.txt)

不能把完整 `requirements.txt` 中的工具依赖误解为全部需要下载模型。Gate 2 可先按官方环境安装包，再记录锁定清单；不启用 ASR/UVR/训练功能，不下载它们的模型。中文前端的 G2PW 具有缺文件自动下载分支，必须提前准备、核验资源并禁用或阻断未批准的运行期联网。[中文前端](https://github.com/RVC-Boss/GPT-SoVITS/blob/b4570b876f5c086819ba84e3215472733c6a7b70/GPT_SoVITS/text/chinese2.py)、[G2PW 加载代码](https://github.com/RVC-Boss/GPT-SoVITS/blob/b4570b876f5c086819ba84e3215472733c6a7b70/GPT_SoVITS/text/g2pw/onnx_api.py)

### 选择性下载清单（本轮只读文件元数据）

GPT-SoVITS 权重仓 revision：`8f8857563c040d542de108a2c18b0425abd6c9c5`；G2PW 分发仓 revision：`0c47645e02a7bc3688d7b263b0042c81e3cd82cd`。大小为远端文件元数据，未下载或加载文件。

| 文件/组件 | 远端大小 | 用途 |
|---|---:|---|
| `s1v3.ckpt` | 155,284,856 B | ProPlus 配置使用的 GPT 语义模型 |
| `v2Pro/s2Gv2ProPlus.pth` | 200,125,741 B | SoVITS 生成器 |
| `sv/pretrained_eres2netv2w24s4ep4.ckpt` | 107,528,697 B | Pro 系列说话人编码器 |
| `chinese-hubert-base/pytorch_model.bin` | 188,811,417 B | 参考语音特征提取 |
| `chinese-roberta-wwm-ext-large/pytorch_model.bin` | 651,225,145 B | 中文文本特征 |
| 上述主权重合计 | **1,302,975,856 B，约 1.303 GB** | 五个主权重 |
| `G2PWModel.zip` | **588,856,634 B，约 0.589 GB** | 中文多音字前端；需解压 |
| 合计，不含小配置与依赖包 | **1,891,832,490 B，约 1.892 GB / 1.762 GiB** | 另需 tokenizer/config/preprocessor 等小文件 |

不需要训练用 `s2D*` 判别器、v3/v4/v5 声码器、超分模型或全部历史版本。不能整仓无选择拉取。[权重文件元数据](https://huggingface.co/api/models/lj1995/GPT-SoVITS/tree/8f8857563c040d542de108a2c18b0425abd6c9c5?recursive=true&limit=1000)、[G2PW 文件元数据](https://huggingface.co/api/models/XXXXRT/GPT-SoVITS-Pretrained/tree/0c47645e02a7bc3688d7b263b0042c81e3cd82cd?recursive=true&limit=1000)

### 个人创作和未来商业使用

| 组件 | 公开许可依据 | 本轮结论 |
|---|---|---|
| GPT-SoVITS 源码 | [官方 MIT LICENSE](https://github.com/RVC-Boss/GPT-SoVITS/blob/b4570b876f5c086819ba84e3215472733c6a7b70/LICENSE) | MIT 允许商业使用，分发代码时保留版权/许可 |
| 官方预训练模型分发仓 | [模型卡标注 MIT](https://huggingface.co/lj1995/GPT-SoVITS) | 未见“仅研究/非商业”限制；实际下载仍需保存逐文件来源和随附许可，不能把代码 MIT 自动套到任意第三方音色 |
| 中文 RoBERTa | [HFL 模型卡 Apache-2.0](https://huggingface.co/hfl/chinese-roberta-wwm-ext-large) | 允许商业使用，按 Apache 条款保留所需许可/NOTICE |
| CN-HuBERT | [TencentGameMate 模型卡 MIT](https://huggingface.co/TencentGameMate/chinese-hubert-base) | 公开标注允许商业使用；保存分发文件和上游关系 |
| ERes2NetV2 | [ModelScope 原模型](https://modelscope.cn/models/iic/speech_eres2netv2w24s4ep4_sv_zh-cn_16k-common)、[元数据 API](https://modelscope.cn/api/v1/models/iic/speech_eres2netv2w24s4ep4_sv_zh-cn_16k-common) 返回 `Apache License 2.0` | 原模型许可支持商用；还需核验实际重打包权重与该来源的对应关系 |
| G2PW 分发包 | [分发仓模型卡/API](https://huggingface.co/api/models/XXXXRT/GPT-SoVITS-Pretrained) 标注 MIT；[G2PW 上游](https://github.com/GitYCC/g2pW) | 本轮未下载 ZIP，未检查包内逐组件许可；不能把仓级标记视作完整包内许可审计 |

**可进入个人创作的部署验证准备；从已查公开许可证看，没有发现一概禁止商用的条款，但不把整套模型未来商用写成无条件保证。** Gate 2 下载后补齐固定文件清单、来源、哈希、包内 LICENSE/NOTICE；若发现非商业或不明许可组件则停止并报告。本人录音和音色由持有人明确授权；这与模型许可证是两件事。本任务的本人录音声明不扩展为第三方音色授权。

## 6. 预计显存、磁盘占用

| 资源 | 预算与边界 |
|---|---|
| 推理显存 | 按 FP16、batch=1、短句零样本试验，先预留 **6–10 GiB**，操作预算 **12 GiB**；是保守工程估算，不是本机实测或官方保证，包含中文前端/ONNX 可能的额外分配；超预算停止而非并发抢占 |
| 当前显存 | 空闲快照 45,642 MiB，容量上有余量；不能替代 torch CUDA、依赖和真实加载测试 |
| 模型下载 | 约 1.892 GB + 小配置；不要整仓下载 |
| 依赖下载 | torch/CUDA wheels 及其他包估算 **3–8 GB**，取决于已缓存 wheel、所选版本与分发方式；尚未解析完整安装计划 |
| 稳态磁盘 | 模型解压、独立环境和源码估算 **10–20 GiB**；安装时连同缓存、G2PW ZIP 建议批准 **30 GiB** 上限，接近上限即停并报告 |
| 原始录音 | 共约 2 MB；参考 WAV 和首轮测试产物通常很小，不以此作为环境总空间估计 |

当前剩余约 705G 足够容纳这份预算。GPU 推理时长、峰值显存和最终音色质量均待 Gate 2 实测；本轮没有运行 GPU 或以推测填实测数据。

## 7. 最短真实声音克隆测试步骤（待授权执行）

1. 持有人听审 A/B/C 候选，确认至少两个参考窗口与**真实逐字参考文本**；确认本人音色用途。特别核对 1/2 的“一人”、1 的“的/了”、8 的“决策/现实”和 10 末尾语气词。
2. 固定官方源码 revision 和上述权重 revision，在 `/home/chen/` 下独立目录准备 Python 环境；仅下载已批准文件，记录哈希、大小、许可。不给运行期前端隐式联网下载留缺口。
3. 仅从原文件生成新的参考 WAV（建议 mono、32 kHz、PCM16；ProPlus 内部按需要重采样，准确输入要求以固定版本确认）。保留原 M4A 与哈希；不做强降噪或无依据的响度归一化。wav 结果重新检查时长、峰值及听审边界。
4. 配置服务的 `custom` 指向 v2ProPlus、GPT `s1v3.ckpt`、SoVITS `s2Gv2ProPlus.pth`、BERT、CN-HuBERT 路径；FP16、batch=1。服务仅监听 localhost；读取 OpenAPI 验证契约，日志记录已加载的实际版本，防止静默回退默认 v2。
5. 用两个参考各生成同一条**与参考内容不同的 Day9 原文**，例如 shot 5“第二个错误，是产品功能越做越多。”；固定 `speed_factor=1.0`、seed、`streaming_mode=false`。首轮只做 2 条；若需比较 seed，在本次授权上限内加 2 条，最多 4 条。
6. 每条保存请求参数、原始 WAV、时长/峰值/静音、模型版本、耗时与 GPU 峰值显存。本人盲听 A/B，从相似度、自然度、错读、停顿、杂音五项给出可否继续；不得把 HTTP 200 当作声音克隆成功。
7. 未获本人听审通过，不生成 Day9 全文、不训练、不接素材/视频流程；记录失败原因，回到下一次裁决。

以下仅为未来执行的请求形态，**本轮未执行**：

```json
{
  "text": "第二个错误，是产品功能越做越多。",
  "text_lang": "zh",
  "ref_audio_path": "<服务端可读的已核对参考WAV绝对路径>",
  "prompt_text": "<与裁切音频逐字一致、本人已确认的参考文本>",
  "prompt_lang": "zh",
  "text_split_method": "cut5",
  "speed_factor": 1.0,
  "batch_size": 1,
  "seed": 42,
  "streaming_mode": false,
  "media_type": "wav"
}
```

## 8. Gate 2 具体执行建议

建议授权单名称：**VP-002B-G2｜固定版本 GPT-SoVITS 本地部署与 2–4 条本人音色 A/B 测试**。

| 子步骤 | 交付与停点 |
|---|---|
| G2.1 参考确认 | 两个经过本人听审的参考窗口、逐字稿、用途确认；未齐不生成测试音频 |
| G2.2 环境与许可清单 | 固定 revision、选择性模型下载、逐文件 SHA-256、许可文件、依赖版本；超出下载/磁盘预算或许可不清时停 |
| G2.3 参考副本与 API | 新参考 WAV、明确服务端路径、localhost API、明确加载版本；不改原录音和旧 DSE 流程 |
| G2.4 小样测试 | 2–4 条真实句子、音频质量检查、耗时与峰值显存、本人 A/B 主观评分；未通过不扩到全量 |

默认不包含：训练/微调、Day9 全文配音、服务开机自启、局域网暴露、Web 管理后台、Wan、视频合成。若为了复用客户端需要调整参数或路径，应在 Gate 2 施工范围写明最小兼容改动；不能顺带重构 DSE。

## 9. 需要持有人批准或确认的事项

1. 确认优先采用 **v2ProPlus 原生独立环境**，或选择普通 v2 基线；建议前者，普通 v2 作为故障定位备选，不能自动下载多个版本。
2. 批准选择性下载约 **1.892 GB 模型**、必要依赖约 **3–8 GB** 和 **30 GiB 安装磁盘预算**；包内许可核验是下载后的明确停点。
3. 批准创建独立 Python 环境、参考 WAV 副本和本地 API 配置，并允许启动仅 localhost 的服务；本轮未做。
4. 确认 A/B 两个实际片段和准确参考逐字稿；人工听审是目前最小质量阻断，不需要重新提供已在仓内的录音。
5. 批准单任务 GPU 小样推理，最多 4 条、显存操作预算 12 GiB；出现超预算/异常先停，不训练、不同步扩到全文。
6. 明确本人声音用于“小陈AI说”个人内容及未来商业内容的授权范围。商业分发前保存完整权重与组件许可记录；若后续引入第三方音色，另行核实。

## 附录 A：本轮命令与复核方法

以下命令模板逐一作用于 1–10 文件，未覆盖源文件：

```bash
ffprobe -v error -show_format -show_streams -of json local-assets/voice/raw/day9/1.m4a
ffmpeg -nostdin -v error -xerror -i local-assets/voice/raw/day9/1.m4a \
  -map 0:a:0 -f f32le -acodec pcm_f32le pipe:1
ffmpeg -nostdin -hide_banner -i local-assets/voice/raw/day9/1.m4a \
  -af 'volumedetect,silencedetect=noise=-40dB:d=0.3' -f null -
ffmpeg -nostdin -hide_banner -i local-assets/voice/raw/day9/1.m4a \
  -af 'ebur128=peak=true' -f null -
nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,driver_version,temperature.gpu --format=csv
docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}'
docker image ls --format '{{.Repository}}:{{.Tag}}\t{{.Size}}'
ss -ltn
df -h .
free -h
git check-ignore local-assets/voice/raw/day9/1.m4a
git ls-files 'local-assets/voice/**'
```

float32 PCM 由 Python `subprocess` 收入内存，用 `array`/既有 NumPy 计算，**不是编排层新增 Python 子进程**。使用 `python -B` 避免写入字节码。候选窗口复核使用 `ffmpeg -i <原文件> -ss <起点> -t <时长> -f f32le pipe:1`，没有生成参考文件。ffmpeg 版本：6.1.1-3ubuntu5。

CPU ASR 使用已存在的 faster-whisper 包和本地 small snapshot，核心调用如下；原始录音没有上传任何外部服务：

```python
model = WhisperModel(
    "/home/chen/.cache/huggingface/hub/models--Systran--faster-whisper-small/"
    "snapshots/536b0662742c02347bc0e980a01041f333bce120",
    device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True,
)
segments, info = model.transcribe(
    input_file, language="zh", beam_size=5,
    condition_on_previous_text=False, vad_filter=True,
)
```

本轮先运行含 `word_timestamps=True` 的一遍，再以关闭单词时间戳的一遍汇总文本；内容疑点一致。单词对齐和分段边界可能跨静音或略越文件结尾，因此没有把它当作最终对齐结果。没有加载 torch/CUDA 或 GPU 模型。

## 附录 B：输入完整性

标准化脚本 SHA-256：`4b9e3a438cc80b205b332a4d37aac00d9de5c2a67cdb492fce213942e5c2fa38`。

脚本记录的 Excel SHA-256：`2b3b0c66dbba66dbfd190beea91930907f08518ebdf995f5efb27f86bc9af72b`。

以下为原 M4A SHA-256，分析前后核对一致：

| 文件 | SHA-256 |
|---|---|
| 1.m4a | `09da526bd5980b2607d214aeca9f77ba1ae527fd5c17eb6dea393fe551b9f07e` |
| 2.m4a | `262ba4e742a76dc782d2e374cb07f65c01408ec30d0e18c78192e81274684b3a` |
| 3.m4a | `e286b018ea3ef0bde35b2a3ca8b38d84a5dd2fdd027d5b20d69895603dfd4709` |
| 4.m4a | `4746ee0664db33c10f69a2f720310c29282ddc891c064ab767483e79421427dc` |
| 5.m4a | `7717e6ee9f204b3f287a4e86bf367acbc4ba3b2bee30e11e6a8f06b5db954cee` |
| 6.m4a | `69cf0002d9b4c9b849d5bb137f99522a169037d1ed4d52f396320dd9149d5fa7` |
| 7.m4a | `5399d9f084f60b167effc136f54a28476feb43a128cd147c6e83c0be4adfd515` |
| 8.m4a | `a3de32b376833c9a222234d212f4bb297710abfdcc90fe93c8707096592e1f4e` |
| 9.m4a | `c3d8b7afb294c56b621f8fdc7b290569ffcb5934eb1aec9608eda9ec690e6705` |
| 10.m4a | `5caa0df2322f5eb870da8a0cae480b7129b4e63722c3a219b214dcbe80540786` |

Gate 1 到此结束；以上 Gate 2 步骤均为待批准方案。
