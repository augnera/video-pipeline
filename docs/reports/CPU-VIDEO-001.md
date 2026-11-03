# CPU-VIDEO-001｜Wan2.1 1.3B＋stable-diffusion.cpp 纯CPU验证

核查/执行日期：2026-11-03。**CPU部署及A/B技术链路通过；最新人工裁定：A不可用，B画面约60分但生成内容不符合要求，两条均未批准为正式素材。同配置重复可靠性未验证，暂不建议生产接入。现已停止，不追加生成。**

## 最新人工裁定（2026-11-03）

持有人上传A/B播放截图并反馈：“A明显不可用，B生成的东西不对，画面可以打60分”。A记录画质FAIL/素材拒绝；B记录画面约60/100、内容适配FAIL，未获正式素材批准。分项动态自然度未单独评价，不推断为通过。各run新增holder-review.json，绑定原视频SHA，未修改历史result、日志、视频或技术SUCCESS结果。

当前结论是纯CPU能完成生成链路，但本轮尚未取得经持有人认可的可用素材；不能把B较A改善写成画质合格，也不能仅据这组不同尺寸结果确定A异常的根因。未获新生成授权，不自动重试、调参或追加解码；全部GPU STOP、原始权重与事故记录保留。以下NOT_EVALUATED等为交付当时状态，以上述最新人工裁定为准。

## 范围与本地事实

- 仓库 `/home/chen/work/video-pipeline`，main，HEAD `cc562624f8d36cf06fde9e373e72e5451e973ce1`；本地origin/main领先/落后均0，未fetch、不声称已检查服务器最新状态。保留既有工作区修改、文件删除、事故证据和成片，未提交/推送。
- 已读AGENTS、PROGRESS、GPU-INCIDENT-004/005现行记录、恢复报告、恢复工具及模型清单。本轮明确授权独立纯CPU试验，不清除任何GPU/旧Wan异常STOP，不调用旧GPU恢复入口，不解除生产STOP。
- 隔离目录 `experiments/cpu-video-001/`；复用已有 `local-video-recovery/runlog.py` 的runId、带时区时间、逐条fsync及原子JSON落盘，不复制新的门禁平台。不改TTS/Qwen/Comfy环境、生产默认、驱动、BIOS、WSL配置或Windows代理，不停止其他服务。

## 资源、构建与CPU证据

Ryzen 9 9950X（16核、32逻辑处理器），WSL可见AVX2、AVX512、AVX512_BF16。WSL内存上限约124GiB，启动检查可用约120GiB，Swap32GiB且已用0；项目磁盘可用约575GiB。初始负载约0.15，无高负载任务；未停止任何业务。采用16个计算线程、8个编译任务。`/sys/class/hwmon`为空、未取得CPU温度传感器，温度标NOT_RECORDED，不编造数据。

固定上游 [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp) commit `3be23788fc0c9f35a2c24b1211caae11d4a54dbc`，源码未改。GGML commit `d49c49e1dd361ba3c0a77c90b5b1404b83969aa8`；完整子模块提交保存在 `evidence/submodules.txt`。读取实际检出AGENTS、CONTRIBUTING、README、docs/build.md、backend.md、wan.md、CLI帮助和相关实现后接线。无第二个模型、Web服务或生产接入。

独立Python venv仅安装CMake3.31.6、Ninja1.11.1.4，系统G++13.3.0及FFmpeg6.1.1未替换。配置Release，SD_CUDA/HIPBLAS/METAL/VULKAN/OPENCL/SYCL/MUSA和GGML对应GPU后端、RPC均显式OFF，CPU为ON，WebP/WebM关闭，仅编译sd-cli目标。GPU子选项可能仍有默认ON缓存值，但其父后端OFF，未编入GPU实现；以实际链接与设备证据共同判断。

可执行文件SHA：`3780fc93ca594cbb96e4e40181f3b26f57f4ee0ab880bf62d7c3d5088d0eb6cb`。ldd只有libgomp、libstdc++、libm、libgcc、libc/loader，没有GPU库；实际设备枚举只有CPU。命令明确 `--backend cpu --params-backend cpu --auto-fit off`，覆盖所有模块与权重放置。真实日志显示CPU初始化、文本/扩散/VAE参数和计算缓冲都在CPU，权重分配VRAM0。运行中的进程映射未发现CUDA/Vulkan/OpenCL/SYCL/HIP运行库，没有/dev/dxg、NVIDIA或DRI设备句柄。不是仅靠CUDA_VISIBLE_DEVICES证明。

引擎自动开启的“flash attention auto: CPU”是固定GGML的CPU实现，不是CUDA FlashAttention插件。没有编译/启用GPU后端或运行GPU查询。视频编码显式FFmpeg `-hwaccel none -c:v libx264 -pix_fmt yuv420p -threads 4`。

## 组件、来源和许可

**没有下载新的权重**，三个既有文件均重新读取SHA并匹配历史记录：

| 组件 | 来源与revision | SHA-256 | 大小 |
|---|---|---|---:|
| Wan2.1 T2V-1.3B BF16 | Comfy-Org/Wan-2.1 `123acf1cc74bccbb9bfff8ac1ee72edc08c2341d` | `6f999b0d6cb9a72b3d98ac386ed96f57f8cecae13994a69232514ea4974ad5fd` | 2838104528 |
| Wan2.1 VAE | 同上，split_files/vae/wan_2.1_vae.safetensors | `2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b` | 253815318 |
| UMT5 XXL scaled FP8 | Comfy-Org/Wan-2.2 `c4f60d30c55a624e35427060fdd217579a6c1d77` | `c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68` | 6735906897 |

引擎源码MIT，Wan原始权重/Comfy重打包模型卡Apache-2.0；UMT5原始google/umt5-xxl及重打包声明Apache-2.0，分别保存原文，不用代码许可证替代权重许可证。上游来源：

- [Wan原权重LICENSE](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/blob/37ec512624d61f7aa208f7ea8140a131f93afc9a/LICENSE.txt)。
- [Wan2.1重打包模型卡](https://huggingface.co/Comfy-Org/Wan-2.1/blob/123acf1cc74bccbb9bfff8ac1ee72edc08c2341d/README.md)。
- [UMT5重打包模型卡](https://huggingface.co/Comfy-Org/Wan-2.2/blob/c4f60d30c55a624e35427060fdd217579a6c1d77/README.md)。
- [UMT5原始模型卡](https://huggingface.co/google/umt5-xxl/blob/66cb9e7e85526fe440a945569e42c72fb6cbc0ad/README.md)。

UMT5不是仅因“Wan2.2文件名”而认定兼容：固定源码的name_conversion支持.scale_weight→.weight_scale，Linear识别缩放并为CPU走FP8→BF16计算路径；实际UMT5头有169个FP8、74个FP16、168个FP32项，包含缩放。实际加载并完成正负文本编码。Wan tokenizer词表编在固定源代码中，不另装分词器；旧恢复记录另有UMT5兼容佐证。VAE明确使用Wan2.1原件，没有以Wan2.2 VAE替代。真实日志权重类型为扩散BF16、VAE BF16，激活/算子按该引擎CPU实现，不能写成原Comfy的CPU FP32 VAE同一路径。

## 参数与一次性运行约束

正向原文：

> Photorealistic live-action footage of a quiet office desk in daylight. A closed laptop and a small green plant sit beside a window. Soft natural light, realistic wood grain, detailed leaves, natural colors, subtle slow camera movement. No people and no visible text.

负向原文：

> people, text, letters, logos, illustration, cartoon, anime, painting, blurry, distorted objects, watermark

无提示词扩写、LoRA或参考图。seed20261103、30步、Euler、discrete、CFG6、flow shift3、16fps。Euler/CFG6/shift3依据固定版本Wan1.3B示例，discrete依据Wan模型集成默认；CLI默认20步，本轮取30步，没有将普通权重当8步蒸馏模型。不是复用原Comfy uni_pc/simple/shift8参数语义。

源码geometry及latent转换支持尺寸16倍数、帧数4n+1；A256×448/17帧，B480×832/17帧，均合法。实测范围仅限实际完成的两种配置，不能把CLI参数校验外推为所有尺寸可用。

每次独立runId，原始stdout/stderr、带UTC时区阶段/输出记录每次写入立即fsync；stdbuf强制刷新原生引擎输出。资源每2秒保存进程组/子进程RSS与CPU ticks、系统可用内存/Swap/负载；没有记录环境密钥。记录源码/组件/可执行文件哈希、完整命令、参数、PID、时间和输出。

A截止1800秒，B截止3600秒。初始可用≥48GiB、现有Swap≤1GiB；连续三次采样可用内存<16GiB、自己进程组RSS>64GiB或Swap新增>2GiB即停止。它们是本次保守实验预算，不是模型官方硬性要求。异常/超时只终止自己的进程组，STOP及一次机会标记保留，不自动重试。复用落盘工具；新增两项无GPU测试验证JSON可解析和子孙进程组受控终止，不能证明断电/宿主故障时必然存活。

## A结果与B预算

A runId `20261103T051433Z-a2173d907cb0`，技术链路SUCCESS。421.245秒（约7分01秒），文本20.03秒、扩散344.02秒、VAE54.38秒；完整编码/解码17帧、256×448、16fps、真实1.0625秒。采样RSS峰15622508544字节（约14.55GiB），最低系统可用113620930560字节（约105.82GiB），Swap0，退出0；所有已记录原STOP哈希保持。

中间PNG观察：能辨认桌面、电脑、窗户和绿植，但颜色偏艳、边缘有彩色异常，笔记本为打开状态而非正向所述关闭。此为抽帧观察及提示词遵循局限，不代替人工观看，也不将技术出片认作真实材质合格。没有调色、放大或改参数掩盖。

B runId `20261103T052205Z-16eaff927d39`。A为2240个空间时间token，480×832/33帧为14040，按固定网络线性投影/MLP和二次自注意力计算量估算约10.59倍采样工作量，预计接近或超过60分钟，因此不选择33帧。任务允许短序列，选480×832/17帧，7800tokens，约4.59倍采样工作量；按A实测+VAE空间比例预计1794秒，1.5倍保守余量2691秒<3600秒，故执行一次B。估算不是性能承诺；同一种子改变尺寸后噪声形状不同，不是逐像素严格对照。

### B完成结果

| 项目 | A | B |
|---|---:|---:|
| 尺寸 | 256×448 | 480×832 |
| 帧数/FPS/真实时长 | 17 / 16 / 1.0625秒 | 17 / 16 / 1.0625秒 |
| 总耗时（含软件编码） | 421.245秒 | 1936.075秒（32分16秒） |
| 文本编码 | 20.03秒 | 19.84秒 |
| 30步采样 | 344.02秒 | 1713.45秒 |
| VAE解码 | 54.38秒 | 199.71秒 |
| 2秒采样进程组RSS峰值 | 14.55GiB | 27.74GiB |
| 最低系统可用内存 | 105.82GiB | 92.62GiB |
| Swap使用/新增 | 0 / 0 | 0 / 0 |
| 引擎退出 | 0 | 0 |

B完整输出17张480×832无损PNG，FFprobe及全片软件解码核验17帧、16fps、1.0625秒。视频SHA为 `4a8f6d2ca5a31a6fdaf940adbf0632583b829d918a52d49c5c1aae9cd4da0bb1`。A视频SHA及全部文件哈希详见各run/result.json、manifest.json。无模型重试、精度切换或追加第三样本。B改变空间尺寸，同种子不对应相同噪声；不能据此做逐像素因果对照。

B中间无损PNG抽看：木纹、叶片和光照比A更接近实景，A明显的过艳彩边未在该帧同样出现；仍为打开的笔记本，并出现类似品牌标记，没有完全遵循“closed laptop”和负向“logos”。这是交互式Codex抽帧观察，不是独立模型服务或人工验收。真实动态自然度、材质可信度及可用性等待持有人看片，不自动判PASS。A的异常已见于编码前PNG，不应仅归因为MP4编码；本轮未做原因定位对照或后期修复。

B解码时再次读取进程映射及设备句柄，仍无GPU库和GPU设备；实际VAE参数/计算均CPU。原3个模型文件、10项STOP记录和已验收成片SHA在收尾复核未变。两个机会标记保留，所有进程已退出，不清锁、不追加生成。

Windows宿主另有一次只读快照：可用内存约198GiB、整机CPU负载84%，不能把整机负载当作该模型独立占用。WSL hwmon为空，Windows ACPI温度接口返回“不支持”；原始及规范化返回均保存，温度NOT_RECORDED。RSS为每2秒采样的模型进程组之和，非精确内核瞬时最高值；软件编码耗时约0.33秒，没有单独取得编码器RSS峰值，不以模型RSS冒称已测量其独立峰值。

### 分级结论

- CPU部署：**完成**；固定版本、CPU-only编译、设备枚举、动态依赖、真实模块放置及运行映射证据完整。
- 首次技术出片：**A/B通过**，两个不同空间配置各一次，均在各自截止时间内完成。
- 人工画质评价：**NOT_EVALUATED**；抽帧观察与提示词遵循限制保留，不能写成正式实拍素材合格。
- 重复运行可靠性：**NOT_EVALUATED**；两个尺寸各一次不是同配置重复稳定性验证，更不能证明GPU硬件健康或确认事故根因。
- 生产可用性：**暂不建议接入默认生产依赖**。B约32分钟只生成约1.06秒，画质与动作仍需人审；可保留独立离线实验能力，继续使用已接受的CPU配音＋真实素材＋Remotion生产路线。

下一步只等待持有人观看A/B及首中尾PNG。若后续有新的单项诊断授权，再处理画质/提示词遵循问题；本轮不自动更换组件、增加帧数或再生成。

## 路径、命令与限制

- A Windows：`C:\Users\admin\Downloads\xiaochen-cpu-video\CPU-VIDEO-001\A\sample.mp4`，同目录有首/中/尾无损PNG、result和ffprobe，复制SHA验证。
- B Windows：`C:\Users\admin\Downloads\xiaochen-cpu-video\CPU-VIDEO-001\B\sample.mp4`，同目录有首/中/尾无损PNG、result、ffprobe、summary，复制SHA验证。
- WSL运行数据：`experiments/cpu-video-001/runs/<runId>/`；版本、构建、许可和预算证据：`experiments/cpu-video-001/evidence/`。大文件/本机路径清单均Git忽略，不提交模型和环境。
- [实验README及实际安装/运行/停止命令](../../experiments/cpu-video-001/README.md)，[实验CLI](../../experiments/cpu-video-001/run.py)。`--help`已保存。新机器要固定提交/子模块再构建，不能跟随main/master漂移。
- 故障先看result.json、stages.jsonl、stdout/stderr，再看resources.jsonl和encoding.stderr.log。向该run launcherPid发SIGTERM可受控停自己的进程组，不使用宽泛pkill。
- 首中尾与全部PNG保存；CLI未提供最终latent、VAE clamp前NaN/Inf/分布导出，明确UNAVAILABLE，不将PNG或编码后的有限值当成原始解码统计。
- 部署、技术出片、人工画质、重复运行可靠性、生产适用性分开记录。A/B是两种尺寸各一次，不构成同配置重复稳定性验证。不写正式素材库、不接生产默认、不自动发布。
