# PRD：AI 带货视频生产线（VideoPipeline）

版本：v1.1 ｜ 日期：2026-07-02 ｜ 状态：待开发
本文档面向 Claude Code 分阶段实施。每个阶段（Phase）独立可交付、可验收，按顺序执行。

变更记录：
- v1.1：脚本生成从 Claude 专用客户端改为 OpenAI 兼容的通用 LLM 客户端
  （src/clients/llm.ts，支持千问/豆包/Claude 经 .env 切换）；明确 .env 加载方式
  （node --env-file，密钥不入 shell 环境）；CLAUDE.md 已随仓库提供；
  新增国产模型粤语质量风险项。涉及：架构图、3.1/3.2、F1.1、N5、第 7/8 节。
- v1.0：初版。

---

## 1. 背景与目标

### 1.1 背景
dseai.hk 是面向香港 DSE 考生的 AI 备考 SaaS。当前需要大量短视频素材用于
Instagram Reels / YouTube Shorts / 小红书获客，人工制作成本高、速度慢。
本项目在本地 AI 服务器（RTX 4090 48G 魔改 / 16 核 / 256G 内存 / WSL2 Ubuntu）上
搭建一条全自动的带货视频生产流水线。已有起步代码仓库 `video-pipeline`（TS 编排器 +
Docker 模型服务），本 PRD 在其基础上演进为可日常生产的系统。

### 1.2 业务目标
- G1：单条视频从脚本到成片的全自动生产时间 ≤ 15 分钟（不含人工审核）
- G2：每日 1 小时人工投入下，稳定产出 3-5 条双语（粤语/普通话）成片
- G3：每条成片自动记录生产元数据，发布数据可回填，形成 hook 有效性闭环
- G4：架构上预留"多产品/多客户"扩展点，未来可服务外部客户带货（Phase 5）

### 1.3 非目标（Out of Scope，v1 不做）
- 自动发布到各平台（各平台 API 限制多，v1 人工上传）
- 视频画质增强/超分
- 真人实拍素材管理
- 多用户系统、权限、计费

## 2. 用户与使用场景

唯一用户是运营者本人（技术背景：TypeScript 熟练，Python 不熟）。
核心场景：
- S1 批量生产：早上输入本周主题，系统夜间批量产出 10-20 条候选成片
- S2 快速单条：热点出现时，20 分钟内产出一条借势视频
- S3 数据复盘：每周查看各 hook 类型的完播/转化表现，更新 hook 库权重

## 3. 系统架构（约束，不可偏离）

```
┌─────────────────────────────────────────────────┐
│  编排层 orchestrator（TypeScript / Node 22）       │
│  CLI + 任务队列 + 各服务HTTP客户端 + ffmpeg合成      │
└──────┬──────────┬──────────┬──────────┬─────────┘
       │          │          │          │
  LLM API      GPT-SoVITS  ComfyUI    Whisper
  (脚本生成,     :9880       :8188      :8080
  OpenAI兼容:   (TTS粤/普)  (对口型+     (字幕)
  千问/豆包/               B-roll)
  Claude可切换)
       │
  Playwright（产品录屏，TS 原生）
```

### 3.1 技术约束
- C1：编排层只用 TypeScript；所有 Python/AI 能力必须通过 HTTP API 访问，
      禁止在编排层引入 Python 子进程调用
- C2：GPU 任务必须串行执行（48G 显存，Wan 2.2 单任务占 30G+），
      编排层需实现全局 GPU 锁
- C3：所有文件路径使用 WSL2 Linux 侧路径（~/ 下），禁止 /mnt/c
- C4：模型服务地址、密钥全部走 .env，代码中零硬编码；.env 通过
      node --env-file=.env 加载，禁止把任何 API 密钥 export 到 shell
      环境（避免影响 Claude Code 的订阅计费路由）
- C5：每个阶段的产物必须可通过 CLI 独立触发和测试
- C6：脚本生成必须走 OpenAI 兼容接口（src/clients/llm.ts），供应商由
      LLM_BASE_URL / LLM_MODEL / LLM_API_KEY 三个环境变量决定，
      业务代码不感知具体是千问、豆包还是 Claude

### 3.2 现有代码基础（Claude Code 需先阅读）
```
video-pipeline/
├── docker-compose.yml          # gpt-sovits + whisper 服务
├── install-comfyui.sh          # ComfyUI 原生安装
└── orchestrator/
    ├── src/clients/{llm,sovits,comfyui,whisper}.ts       # 四个API客户端骨架
    │                 # llm.ts 为 OpenAI 兼容通用客户端(原 claude.ts 已废弃)
    ├── src/record/demo-recorder.ts                       # Playwright录屏
    ├── src/compose/composer.ts                           # ffmpeg合成模板
    ├── src/pipeline.ts + src/index.ts                    # 串行流水线 + CLI
    └── assets/{selling-points,hooks}.json                # 卖点库 + hook库
```

## 4. 数据模型（全局契约，所有阶段共用）

### 4.1 VideoScript（脚本对象）
```typescript
interface VideoScript {
  id: string;                    // 生成时分配, 格式: YYYYMMDD-序号
  hookType: string;              // 对应 hooks.json 中的 type
  lang: "yue" | "zh";
  hookLine: string;              // 3秒钩子台词
  narration: string;             // 口播正文, 120-180字
  demoSteps: string[];           // 卖点库 demoId 列表
  ctaLine: string;
  subtitleKeywords: string[];
  brollPrompt?: string;          // Phase 3: B-roll 生成提示词
  templateId?: string;           // Phase 3: 合成模板ID, 默认 "standard-v"
}
```

### 4.2 Job（任务对象，Phase 2 引入）
```typescript
interface Job {
  id: string;
  script: VideoScript;
  status: "pending" | "tts" | "lipsync" | "recording"
        | "subtitling" | "composing" | "review" | "done" | "failed";
  stageOutputs: Partial<{        // 每阶段产物路径, 用于断点续跑
    audio: string; talkingHead: string; screencast: string;
    srt: string; final: string;
  }>;
  error?: string;
  createdAt: string; updatedAt: string;
}
```
持久化：`output/jobs/<id>.json`（单文件 JSON，不引入数据库）。

### 4.3 Metrics（数据回流表）
`output/metrics.csv` 列：
`id,date,hookType,lang,topic,hookLine,templateId,platform,publishDate,views,avgWatchPct,clicks,signups,notes`
生产时自动写入前 7 列，发布后人工回填。

## 5. 分阶段需求

---

### Phase 1：核心链路 MVP（预计 2-3 天）

目标：单条视频端到端跑通，`npm run pipeline` 一条命令出片。

| ID | 需求 | 优先级 |
|----|------|--------|
| F1.1 | 完善 llm.ts：JSON 解析失败自动重试 1 次（已有正则截取兜底），仍失败则报错并保存原始返回到 output/errors/；在至少一个已配置供应商（千问或豆包）下实测通过，且切换供应商仅需改 .env 不改代码 | P0 |
| F1.2 | 完善 sovits.ts：音色配置抽到 config/voices.json（支持粤/普两个音色条目：参考音频路径+prompt_text），失败重试1次 | P0 |
| F1.3 | 完善 comfyui.ts：workflows/ 下的 JSON 节点 patch 配置抽到 config/workflows.json（工作流文件→需替换字段的映射），执行超时 10 分钟报错 | P0 |
| F1.4 | demo-recorder.ts：实现 dseai.hk 的 2 个真实录屏场景（essay-marking / past-paper），选择器由运营者提供后填入 | P0 |
| F1.5 | composer.ts：修复字幕路径转义的边界情况；输出前检查产物时长在 20-60 秒之间，越界告警 | P1 |
| F1.6 | 全链路日志：每步开始/结束/耗时输出到控制台 + output/<id>/pipeline.log | P1 |

验收标准：
- A1：`npm run pipeline -- "AI作文批改" 倒计时焦虑型 yue 1` 无人工干预产出
  output/<id>/final.mp4，竖版 1080x1920、有配音、有字幕、有数字人画中画
- A2：中途任一服务不可用时，错误信息明确指出是哪个服务、哪个环节
- A3：单条总耗时 ≤ 15 分钟（B-roll 除外）

给 Claude Code 的启动指令（复制即用）：
> 阅读仓库根目录的 PRD.md 第 3、4 节和 Phase 1，然后阅读 orchestrator/src 全部
> 现有代码。按 F1.1-F1.6 逐项实施，遵守 3.1 节技术约束。每完成一项跑
> `npx tsc --noEmit` 确认无类型错误。完成后列出我需要人工准备的资源清单。

---

### Phase 2：批量生产与可靠性（预计 3-4 天）

目标：支持夜间无人值守批量跑 10-20 条，失败可断点续跑。

| ID | 需求 | 优先级 |
|----|------|--------|
| F2.1 | Job 队列：实现 4.2 的 Job 模型，新命令 `npm run batch -- <计划文件.json>`，计划文件含多个 {topic, hookType, lang, count} | P0 |
| F2.2 | 断点续跑：`npm run resume` 扫描 output/jobs/ 中非 done/failed 的任务，从 stageOutputs 已有产物的下一阶段继续 | P0 |
| F2.3 | GPU 锁：进程内互斥锁保证 ComfyUI 任务串行；TTS/Whisper 可与之并行 | P0 |
| F2.4 | 失败隔离：单条失败不中断批次，标记 failed 并继续下一条；批次结束输出成功/失败汇总 | P0 |
| F2.5 | 磁盘守卫：批次开始前检查剩余磁盘 < 50G 则拒绝启动 | P1 |
| F2.6 | 通知：批次完成后将汇总写入 output/batch-reports/<日期>.md | P2 |

验收标准：
- A1：一个含 10 条任务的计划文件夜间跑完，早上可见 ≥8 条成片和批次报告
- A2：跑批中途 kill 进程后 `npm run resume` 能继续，不重复已完成阶段
- A3：人为停掉 whisper 容器，对应任务标记 failed，其余任务正常完成

---

### Phase 3：素材与模板系统（预计 3-4 天）

目标：视频不再千篇一律——B-roll 素材库 + 多合成模板 + hook 库进化。

| ID | 需求 | 优先级 |
|----|------|--------|
| F3.1 | B-roll 库：`npm run broll -- <提示词文件>` 调 ComfyUI Wan 2.2 工作流批量生成 3-5 秒竖版片段，存 assets/broll/，附 index.json（文件、提示词、标签、时长） | P0 |
| F3.2 | 脚本层为每条脚本输出 brollPrompt 与标签；合成时按标签从 B-roll 库匹配开头钩子片段，无匹配则回退为纯数字人开场 | P0 |
| F3.3 | 模板系统：composer 重构为读取 config/templates/<id>.json 的声明式模板（片段顺序、画中画位置尺寸、字幕样式），内置 standard-v（现有）、demo-first（录屏开场）、talking-only（纯口播）三个模板 | P0 |
| F3.4 | hook 库进化命令：`npm run hooks:report` 读取 metrics.csv，按 hookType 汇总 avgWatchPct/clicks，输出排名并提示应扩充/淘汰的类型 | P1 |
| F3.5 | 同脚本双语：`--bilingual` 参数下同一脚本自动产出粤语+普通话两条成片（共用录屏与B-roll，仅重跑TTS/对口型/字幕） | P1 |

验收标准：
- A1：同一主题跑 3 条，分别使用不同模板，肉眼可见结构差异
- A2：双语模式产出两条成片总耗时 < 单独跑两条的 70%
- A3：hooks:report 能基于回填数据输出 hook 类型排名

---

### Phase 4：审核台与发布辅助（预计 4-5 天）

目标：把每日 1 小时人工时间用在刀刃上——快速审、快速导出、数据好回填。

| ID | 需求 | 优先级 |
|----|------|--------|
| F4.1 | 本地审核台：`npm run review` 启动本地 Web 服务（Fastify + 单页前端），列出 status=review 的成片，支持播放、查看脚本、通过/打回（打回填原因，写入 Job） | P0 |
| F4.2 | 字幕快改：审核台内可直接编辑 SRT 文本并一键重新烧录（只重跑合成阶段） | P0 |
| F4.3 | 平台导出：通过审核的成片一键导出三平台版本到 output/publish/<平台>/（封面帧抽取、文件名规范、附带自动生成的标题+话题标签文案 txt） | P1 |
| F4.4 | 数据回填：审核台提供 metrics 表格编辑页，回填后写回 metrics.csv | P1 |
| F4.5 | 周报：`npm run weekly` 生成周报 md（产量、通过率、打回原因分布、hook 排名、下周建议） | P2 |

验收标准：
- A1：从打开审核台到完成 5 条视频审核+导出 ≤ 15 分钟
- A2：字幕修改到重新出片 ≤ 2 分钟
- A3：审核台仅监听 localhost，无鉴权需求

---

### Phase 5：多产品/客户模式（预留，暂不排期）

方向性需求（实施前需补充详细 PRD）：
- 产品配置化：selling-points / voices / 录屏场景 / 品牌元素按 products/<客户>/ 目录隔离，CLI 增加 --product 参数
- 客户素材接入：支持客户提供的实拍视频片段入库，与 AI 素材混剪
- 交付报表：按客户维度的产量与数据报表，作为抽佣结算依据
- 合规检查：脚本生成后自动过一遍禁词/夸大宣传检查（教育行业+广告法词表）

---

## 6. 非功能性需求

- N1 性能：单条成片（不含B-roll生成）≤ 15 分钟；B-roll 单条 ≤ 10 分钟
- N2 可靠性：批量任务成功率 ≥ 80%（外部服务正常时）
- N3 可观测：所有阶段耗时记录在 Job 中，周报可输出各阶段平均耗时
- N4 安全合规：脚本 system prompt 中固化"禁止承诺具体成绩等级"约束；
  数字人形象与克隆音色必须有书面授权记录（存 docs/authorizations/）
- N5 成本：外部 API 仅 LLM 脚本生成，供应商可切换（千问/豆包/Claude），
  单条脚本成本应 < HK$0.5（国产模型通常可 < HK$0.1）

## 7. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 社区模型服务 API 字段变动 | 客户端调用失败 | 所有客户端参数走 config，README 记录已验证版本号 |
| 魔改 4090 长时间跑批过热 | 降频/宕机 | Phase 2 加入 nvidia-smi 温度轮询，>85°C 暂停队列 |
| Whisper 粤语识别错字 | 字幕质量 | 流程上强制 review 状态，Phase 4 提供快改 |
| 国产 LLM 粤语脚本不够地道 | 香港受众观感 | 上线前同 prompt 三供应商各出 10 条盲评；粤语/普通话可按语种配置不同供应商（llm.ts 支持） |
| 平台判定 AI 内容限流 | 分发效果 | 模板保留人工润色空间；标题文案人工终审 |

## 8. 给 Claude Code 的通用工作约定

CLAUDE.md 已随仓库提供（内容与本节一致），要点：
1. 本项目遵循 PRD.md，实施前先读第 3、4 节
2. 技术约束 C1-C6 不可违反
3. 每个 Phase 完成后运行 `npx tsc --noEmit` 与该阶段验收标准自测
4. 不引入数据库、消息队列等重型依赖；单机文件系统即状态存储
5. 新增配置一律放 config/ 或 assets/，禁止硬编码
6. 修改 4.x 数据模型字段需先在 PRD.md 中更新并说明原因
