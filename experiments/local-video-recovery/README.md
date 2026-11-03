# 本地视频恢复工具

最新状态：**GPU-INCIDENT-004，视频生成继续STOP。** run `20261029T073531Z-c17945661b35` 的480×832/17帧/30步诊断在23步后报CUDA illegal memory access，持有人确认再次黑屏并重启Windows，无latent/VAE/MP4。活动异常锁保留，禁止自动恢复/重试/模型切换。事故后只读取证与Qwen历史illegal instruction对照见docs/reports/GPU-INCIDENT-004.md及恢复报告第21节；dump精确路径读取拒绝，未改ACL，根因未定。旧命令/profile可枚举不等于有执行授权，不能继续运行任何GPU探针/生成或CPU诊断来自动放行。

独立试验工具，不接入VideoPipeline生产默认配置。初次评估和旧门禁证据保留在docs/reports/Local-Video-Recovery-20261029.md；本说明只列现行入口。TTS、Qwen、原Comfy环境和历史事故状态不修改。

## 分级门禁与持久日志（v0.3.1，现行）

`gate-policy.json`集中定义A/B/C。A只检查64×64 FP32，移除旧模型28GiB门槛，保留原有4GiB共享桌面保护余量和75°C停止线；利用率15%改为提醒，不把桌面短峰认定为重计算。缺dump、未证明根因、缺热点/PCIe传感器不单独阻断A。B另需A结果复核、供电资料、完整模型组件及预算、标准算子和单样本执行器；C的有限重复与生产授权分开。B最小接线已有代码与CPU检查，尚未通过GPU样本验证；最新一次B在模型加载前触发后端保护断言，已STOP且机会消耗，不能再次执行。C/生产没有执行入口。

审查模板使用`SATISFIED`（本级条件满足，不表示根因查明）。持有人已确认事故后无复发，随后单次A级CUDA验证PASS，见恢复报告第10节。持有人后续明确授权B：A保护锁经结果/归档SHA复核后原子重命名到stop-archive，原始字节及迁移凭据保留，未直接删除或绕过。持有人后续提供2200W型号并要求按转接假设继续，已将接线未知纳入这一次小配置的残余风险审查，不声称物理接线已验证。实际后续执行前刷新当前状态及监控，检查真实STOP，不能把历史审查记录长期当通行证。

### 无GPU启动、停止、归档

先启动原生Windows记录器，系统自动生成唯一runId，输出Windows路径和PID；其文件均在`C:\Users\admin\video-recovery\runs\<runId>\`，不依赖WSL文件或目录。记录器从该Windows目录的归档源码启动，使用内联启动命令，无执行策略修改。

```bash
python3 experiments/local-video-recovery/native-monitor.py --seconds 120 --name diagnostic
```

将返回的同一runId用于WSL记录（也会核对宿主launch.json中的ID）：

```bash
python3 experiments/local-video-recovery/recovery.py monitor --seconds 12 \
  --out orchestrator/output/local-video-recovery-20261029/runs/<runId> \
  --run-id <runId> \
  --host-log /mnt/c/Users/admin/video-recovery/runs/<runId>/host.jsonl
python3 experiments/local-video-recovery/native-monitor.py --stop-run <runId>
```

停止仅写Windows本地`stop.request`，记录器检查请求后保存`NORMAL_STOP`与结束时间；不结束其他进程。最长300秒也会自行结束。查看`host-state.json`确认已结束，再归档：

```bash
python3 experiments/local-video-recovery/archive-logs.py \
  --host-dir /mnt/c/Users/admin/video-recovery/runs/<runId> \
  --wsl-dir orchestrator/output/local-video-recovery-20261029/runs/<runId> \
  --out orchestrator/output/local-video-recovery-20261029/archives/<runId>.tar
```

`<runId>`替换为启动输出的实际ID。归档不删原件、不清STOP、不覆盖旧归档；未完成且进程已经退出时可显式加`--allow-incomplete`，保留原始未完成状态。进程仍运行则拒绝最终归档。

### 日志与排查顺序

1. 先看WSL `run.json`与`stages.jsonl`、全局`local-assets/experiments/video-recovery-20261029/STOP.json`；再看Windows `host-state.json`、`STOP.json`或`bootstrap-error.json`。缺结束时间或停在RUNNING视为未完成，不补写假成功。
2. 看WSL `launcher-stdout.log`、`launcher-stderr.log`；有CUDA子进程时看其独立`stdout.log`、`stderr.log`，这些原始字节实时持久化。没有启动子进程时不伪造它的日志或模型阶段。
3. 看Windows `stdout.log`、`stderr.log`、`host.jsonl`和`events-before.json`/`events-after.json`；事件含时间、Provider、ID、RecordId、原始XML。被强制终止时after文件可能不存在，这本身就是缺口。
4. 用同runId/UTC时间对齐两侧。`metricSupport`明确支持状态，显存结温、热点、PCIe计数为UNAVAILABLE/null，不以核心温度代替。

`run.json`记录环境/发行包、源码摘要、模型版本参考、完整本工具参数、PID、起止时间与产物。没有记录其他服务完整命令行或环境变量。Windows stdout/stderr使用WriteThrough文件流和AutoFlush，JSONL每条Flush(true)；WSL记录fsync，CUDA子进程使用`-u`和O_DSYNC标准输出文件。主机断电/驱动卡死存活性没有因此得到证明。

无GPU验证命令：

```bash
python3 experiments/local-video-recovery/log-validate.py --out orchestrator/output/local-video-recovery-20261029/log-check-<new-id>
python3 -m unittest discover -s experiments/local-video-recovery -p 'test_*.py' -v
python3 experiments/local-video-recovery/recovery.py assess --stage A --review orchestrator/output/local-video-recovery-20261029/gate-refinement/review-v2.json
```

模拟事件只写测试目录STOP，不污染真实故障锁；正常CPU进程和受控终止CPU进程均保留完整输出与最后真实阶段。上述日志验证命令全部不运行GPU计算；B唯一一次子进程在bootstrap断言失败，上述模型/采样阶段未开始，不能把代码存在说成首次出片。

## B级单样本准备与恢复

- `prepare-wan21.py`只准备两项缺失组件，固定Comfy-Org/Wan-2.1 revision `123acf1cc74bccbb9bfff8ac1ee72edc08c2341d`；已存在文件先核验，不重复下载。UMT5原文件不改动，嵌入分词器与官方Wan2.1文件SHA相同；CPU eager小片段检查通过，完整文本编码仍未验证。
- `wan21-profile.json`：256×448、17帧、16fps、8步、cfg6、shift8、uni_pc/simple、seed20261029；扩散BF16，TE CPU FP32计算/VAE CPU FP32，禁用非eager后端、编译/CUDA graphs/异步卸载/pinned-memory。约1.0625秒的小配置只测运行，不评价常规画质。
- `wan21-child.py`复用固定Comfy加载/文本编码/采样/VAE核心和系统FFmpeg，无HTTP服务；VAE一次直接解码，避免OOM自动分块重试。`recovery.py monitor --stage B --sample-request`沿用原监控、输出、STOP及GPU合作锁；在进程启动前持久化一次性消耗标记，失败不重试或换模型。
- 预算空闲显存≥14GiB是按2.65GiB权重+4GiB激活/math注意力余量+2GiB上下文/分配器余量+4GiB桌面余量向上取整的规划值，**不是实测峰值**；主机可用内存≥48GiB。单子进程总时限240秒，另有分阶段限时，280秒监控覆盖前置和退出后窗口；75°C/运行中4GiB保护不变。
- 当前准备runId `20261029T053922Z-92112f18def3`，文件位于 `orchestrator/output/local-video-recovery-20261029/stage-b/<runId>/`，含assets、许可、CPU检查、固定request、readiness-review、gate-decision与result。实际子进程启动1次、采样0次，暂无MP4，机会已消耗；见result.json和sample/stderr.log。

已有真实只读检查命令：

```bash
python3 experiments/local-video-recovery/recovery.py assess --stage B \
  --review orchestrator/output/local-video-recovery-20261029/stage-b/20261029T053922Z-92112f18def3/readiness-review.json
```

该审查在供电资料未提供时返回hardware_power_review缺项；最新审查已按本次受控范围结案，但全局STOP及一次性消耗标记会阻止再次运行。下列是本轮已使用的历史命令，**不要重跑，不可用它绕过已消耗次数**：

```bash
python3 experiments/local-video-recovery/recovery.py monitor --stage B --seconds 280 \
  --run-id 20261029T053922Z-92112f18def3 \
  --review orchestrator/output/local-video-recovery-20261029/stage-b/20261029T053922Z-92112f18def3/readiness-review.json \
  --sample-request orchestrator/output/local-video-recovery-20261029/stage-b/20261029T053922Z-92112f18def3/sample-request.json \
  --out orchestrator/output/local-video-recovery-20261029/stage-b/20261029T053922Z-92112f18def3/sample \
  --host-log /mnt/c/Users/admin/video-recovery/runs/20261029T053922Z-92112f18def3/host.jsonl
```

此命令已执行一次，在模型加载前因注意力后端断言失败，当前不要重跑或清STOP。失败源码和两侧日志已归档。策略设置顺序及调用级优先列表现已修复，7项无CUDA回归通过；真实GPU启动仍待新的受控试验验证，不能重跑已消耗次数的旧任务。B成功退出后还要用`validate-wan21-output.py <sample-request.json>`核实尺寸、帧数及全解码，复核宿主前后事件；不能以子进程退出直接宣布首次出片通过。原生产Wan STOP不受试验归档/接线影响。

## 注意力策略回归（仅CPU）

`attention_policy.py`在所有相关Comfy模块导入后施加math-only并保留保护断言；同时约束Comfy大输入优先列表、Wan/T5路由和逐调用状态，不只设置全局开关。child会先记录施加前/后状态和bootstrap_completed，才允许权重加载。

```bash
CUDA_VISIBLE_DEVICES=-1 PYTHONDONTWRITEBYTECODE=1 \
  local-assets/experiments/video-recovery-20261029/venv/bin/python -B \
  experiments/local-video-recovery/check-attention-policy.py \
  --out orchestrator/output/local-video-recovery-20261029/attention-fix/<new-check-id>
```

该命令禁用CUDA初始化、不加载权重，只做真实Comfy CPU导入/CPU注意力回归，以及从固定源码提取GPU包装函数后的CPU控制流检查。7项已实测通过；实际显卡启动与内核选择NOT_EVALUATED。当前旧B的STOP与单次消耗标记仍有效，不能重跑上面的历史采样命令；下一次受控试验须有新的审查，先核验真实启动检查，再加载权重。


## 修复版已用命令与当前状态

新run输出和准确运行/验证命令见恢复报告第14节，不能复用其已存在目录或次数标记。真实attention_policy_checked/bootstrap_completed已先于权重加载通过；随后文本/扩散/采样/VAE/编码均完成。尚无profiler逐kernel证据，不外推其他配置。

先看`stage-b/current-run.json`指向的result.json、sample/video-validation.json和sample/preview-frame.png。持有人视觉评价待定，画质原因未查明。STOP不自动清除、归档不删除来源，不自动启动下一次运行。当前无需再修改后端或安装依赖来“验证”本轮成功。


## 30步单因素对照（已执行、不可重跑）

新增wan21-profile-30step.json仅steps与原profile不同；recovery.py只接受两个固定profile的精确内容，不能任意改尺寸/步数。当前并不提供额外自动尝试授权。实际命令、参数差异、clamp前证据、对应帧和归档见报告第18节及stage-b/20261029T065718Z-764c987d402f/。

本次不调用已取消的cpu-reference-decode.py；该入口明确拒绝执行。check-cpu-import.py只用于无权重/无解码的导入回归，不能被当成模型试验成功或忽略STOP的依据。后续如需新试验，须新的明确范围和现场审查；不能复用已消耗目录/次数标记。
