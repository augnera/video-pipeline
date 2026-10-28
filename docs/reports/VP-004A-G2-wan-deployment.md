# VP-004A-G2｜Wan 公共服务部署记录：权重传输截断后停止

日期：2026-10-27。**当前状态：按持有人“权重不符合预检即停止”的条件停止；没有启动 ComfyUI 或运行 Wan，也没有生成 MP4。** 首帧已由持有人确认，本轮未修改。

## 1. 结果与阻断

固定主模型下载连接提前结束。目标文件应为 **9,999,658,848 bytes**，实际只收到 **4,138,864,354 bytes（约 4.139 GB）**，精确大小校验失败。下载程序以非零退出，没有将临时文件晋升为正式 safetensors；没有把未验证权重交给模型加载器。

这是**不完整的下载文件**，尚无证据表明官方模型版本、远端权重哈希或许可发生变化。本轮事前重新读取官方固定 revision 元数据，三项资产名称、大小、LFS SHA 及 model card 与预检全部一致。网络传输提前结束的具体根因尚未确定，不能直接归因于 GPU、模型损坏或某个代理限额。

原始不完整文件保留在：

`/home/chen/ai-models-data/wan/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors.part`

partial SHA-256：`feaddf758036741b76d4765a778d767e0bb4bb2b405979533cd11100839d187a`。该值**只用于以后确认本地续传前缀未变**，不是完整模型校验通过的证据。

下载失败后没有自动重试、重新下载整文件、换模型、换来源或扩大依赖修复。文本编码器尚未开始下载。本次服务调用与推理次数均为 **0**，推理耗时、峰值推理显存和视频产物均为 null。

## 2. 下载授权复核

执行前已复核 `docs/reports/VP-004A-preflight-first-frame.md` 和其中的固定清单。权重源为 `Comfy-Org/Wan-2.2`，revision `c4f60d30c55a624e35427060fdd217579a6c1d77`。

| 资产 | 预检大小 | 完整 SHA-256 | 本轮状态 |
|---|---:|---|---|
| `wan2.2_ti2v_5B_fp16.safetensors` | 9,999,658,848 bytes | `456f901338bd9eadbded3828b819109a9b68e8a525ca5cf8d0049a69fcfeca1e` | 已收部分，未通过完整性校验 |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | 6,735,906,897 bytes | `c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68` | 未开始下载 |
| `wan2.2_vae.safetensors` | 1,409,400,960 bytes | `e40321bd36b9709991dae2530eb4ac303dd168276980d3e9bc4b6e2b75fed156` | 复用原位置；未重复下载、移动或删除 |

批准的两项完整权重合计 **16,735,565,745 bytes**，低于本轮 16.736 GB 上限；实际接收模型正文为 4,138,864,354 bytes。没有下载额外模型。PyTorch 及 CUDA 用户态依赖属于已批准的独立部署环境，不是新增模型权重，也不是系统 NVIDIA 驱动。

来源和许可复核记录：[approval-recheck.json](../../orchestrator/output/day9-vp004a/g2/approval-recheck.json)，完整下载 URL/许可原文留在前轮 [资产提案](../../orchestrator/output/day9-vp004a/preflight/asset-download-proposal.json)及 preflight 目录。固定模型卡仍声明 Apache-2.0、原文逐字节未变；没有发现新的许可限制。

现有 VAE 继续使用 `/home/chen/comfyui-models/Wan2.2-TI2V-5B/split_files/vae/wan2.2_vae.safetensors`。后续外部路径映射已准备，不会搬进业务仓或要求重复下载。

## 3. 已完成与未完成

| 项目 | 实际状态 |
|---|---|
| 首帧确认 | 已记录持有人通过；原 PNG 哈希仍为 `ec62aa667f28279f69b4f7f1f0185332099bb794c1eb6ea4ab99a8c085e7393e` |
| 程序目录 | `/home/chen/ai-models/ComfyUI` 已获取固定源码 `426f5eea52a7ece1dd599fff4cb6cd1f352ddd24`（v0.43.0） |
| 权重目录 | `/home/chen/ai-models-data/wan` 已建立；主模型只有 .part，无正式已验证主权重 |
| 服务目录 | `/home/chen/ai-services/comfyui` 已建立；配置、日志、首帧副本及独立环境放此处 |
| Python 环境 | 新建独立 Python 3.12.3 venv，sys.prefix 确认只指向该服务目录 |
| PyTorch 安装阶段 | torch 2.8.0+cu128、torchvision 0.23.0+cu128 已完成安装；下载失败停止时该安装进程已经正常结束 |
| 当前依赖一致性 | pip check 退出 0，输出 No broken requirements found |
| 完整 ComfyUI 依赖 | **未安装完成**：尚未安装 requirements.txt 全量依赖或应用最终 constraints，不能把当前 pip check 视为完整服务就绪 |
| NumPy 实际值 | 2.5.2，来自初始 torch 安装解析；constraints 中的 2.2.6 仅为待实施计划，不冒充已应用 |
| 新环境 CUDA | 尚未实际导入/验证，不以既有 TTS 的 CUDA 状态替代 |
| GPU 互斥/单次保护 | 服务脚本已准备，拟沿用共享 gpu.lock、限制唯一固定工作流；**尚未运行或做运行时验证** |
| API 工作流 | 已将原生模型/采样结构整理为 API 图并留档；尚未经过运行服务的 object_info / validate_prompt 验证 |
| 服务监听 | 未启动；8188 无监听。计划仍为 127.0.0.1:8188 |
| Wan 生成 | 未提交任何 prompt，0 次候选、0 次自动重试 |

完整初始环境包清单：[new-environment-at-stop.json](../../orchestrator/output/day9-vp004a/g2/new-environment-at-stop.json)；安装日志：[install-torch.log](../../orchestrator/output/day9-vp004a/g2/install-torch.log)；pip check 原文：[pip-check-at-stop.txt](../../orchestrator/output/day9-vp004a/g2/pip-check-at-stop.txt)。pip check 伴随默认 cache 目录不可写的提示，没有依赖冲突；未为此修改系统目录或全局配置。

### 已准备但未执行的生成配置

- 已验收首帧原文件保持不变，只复制相同字节到服务 input 目录；模型节点内标准缩放到 576×1024。
- 576×1024、97 帧、24fps，约 4.042 秒；seed=42，steps=20，cfg=5，uni_pc/simple，denoise=1，shift=8。
- 按本轮要求将原预检“横移”改为**缓慢推进**；人物维持坐姿与思考状态，轻微头肩变化，城市夜灯自然变化，不新增人/物，不出现屏幕文字，无音轨/字幕。
- 首次执行前选择原生 VAEDecodeTiled（512px、overlap64、temporal16、overlap4）减少解码峰值显存；没有等 OOM 后再换方案，也没有因此增加模型。
- 准备复用仓内既有 `orchestrator/src/clients/comfyui.ts` 的 `runWorkflow()` 调用和下载逻辑，以独立工作目录配置 Wan 图，不改旧 DSE 配置。

配置与完整正/负提示词：[generation-config.json](../../orchestrator/output/day9-vp004a/g2/generation-config.json)；待验证 API 图：[workflow.api.json](../../orchestrator/output/day9-vp004a/g2/workflow.api.json)。这些是计划，不代表实际运行参数或视频效果已验收。

## 4. 既有资产和服务保护

- 66 个受保护文件哈希未变；原始配音、Excel、normalized/voiced JSON、第 5 镜模板与原版 MP4 均未改动。
- GPT-SoVITS 和 IndexTTS2 两个既有虚拟环境的完整包名/版本清单前后相同。
- 两个 TTS 服务 health 均为 ready；IndexTTS2 尝试数仍为 1、剩余额度 0，没有新增声音推理。
- 没有改系统 Python、系统 NVIDIA 驱动、其他项目环境或既有模型服务。没有安装 Manager、自定义 Wan 节点或其他视频模型。
- 没有部署 Web 素材后台、生成其他镜头、修改 Day9 时间线或公开上传任何私人素材。

证据：[stop-record.json](../../orchestrator/output/day9-vp004a/g2/stop-record.json)、[other-environments.before.json](../../orchestrator/output/day9-vp004a/g2/other-environments.before.json)、[protected-inputs.before.json](../../orchestrator/output/day9-vp004a/g2/protected-inputs.before.json)。本轮只新增本报告与忽略的实验记录；业务代码未修改。

## 5. 最短下一步：仅在持有人允许恢复后续传

只读 HEAD 诊断（没有下载响应正文）返回 **206**：

`Content-Range: bytes 4138864354-4138864354/9999658848`，`Accept-Ranges: bytes`。

这说明固定来源支持请求指定偏移，为最小恢复方案提供依据，但没有证明任意长连接不会再截断。

建议下一次授权只做同两项资产的**有界分块断点续传**：

1. 先重新核对固定 revision/源文件大小及本地 partial SHA；原 partial 不丢弃、不从头重复下载。
2. 从偏移 **4,138,864,354** 继续主模型，剩余 **5,860,794,494 bytes**；每块检查 HTTP 206、Content-Range 起止及总长，若服务忽略 Range 返回 200，则在读取正文前停止。
3. 主模型凑齐后必须对完整 9,999,658,848 字节做批准 SHA-256 校验，成功后才改正式文件名。
4. 再下载原批准的 UMT5 编码器，采用同样的大小与完整 SHA 校验。两项剩余模型正文合计 **12,596,701,391 bytes**；加已收到的部分仍为原批准总量 16,735,565,745 bytes，不增加模型范围。
5. 两项权重通过后再完成原计划独立环境安装、pip check、CUDA 与服务启动验证，确认 GPU 互斥覆盖整个工作流，再执行唯一候选。任何依赖冲突、额外大型资产、GPU 异常或失败需扩大修复范围时继续按原停止条件报告。

这不是新的模型选型或重新生成首帧。本轮未执行以上续传和后续安装，等待持有人允许恢复；未完成的 MP4、GPU 峰值、耗时及画面稳定性验收不会以计划数据充数。
