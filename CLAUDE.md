# VideoPipeline 项目约定

## 项目是什么
AI 带货视频生产流水线：TypeScript 编排器调用本地模型服务
(GPT-SoVITS/ComfyUI/Whisper) + LLM API，全自动产出竖版带货短视频。
需求全部在 PRD.md 中，按 Phase 分阶段实施，当前从 Phase 1 开始。

## 每次会话开始前
1. 若是新 Phase 的首次会话：先读 PRD.md 第 3、4 节 + 当前 Phase 全文
2. 修改代码前先读相关现有文件，理解既有结构再动手

## 硬性技术约束（来自 PRD 3.1 节，不可违反）
- 编排层只用 TypeScript；AI 能力一律走 HTTP API，禁止调用 Python 子进程
- GPU 任务（ComfyUI）必须串行，需经全局 GPU 锁
- 路径只用 WSL Linux 侧（~/ 下），禁止 /mnt/c
- 配置和密钥走 .env 与 config/，代码零硬编码
- 不引入数据库、消息队列、ORM 等重型依赖；文件系统即状态存储

## 环境事实
- WSL2 Ubuntu, RTX 4090 48G(魔改), Node 22, 无图形界面
- 模型服务: GPT-SoVITS :9880 / ComfyUI :8188 / Whisper :8080
- LLM 走 OpenAI 兼容接口 (src/clients/llm.ts)，供应商由 .env 决定
- 运行命令: npm run pipeline / 类型检查: npx tsc --noEmit

## 工作方式
- 每完成一个需求项(如 F1.2)：跑 npx tsc --noEmit，通过后 git commit，
  commit message 带需求编号
- 遇到 PRD 未覆盖的设计决策：先陈述 2 个方案和推荐理由，等确认再实施
- 需要人工提供的资源（选择器/音频/视频素材）：不要造假数据蒙混，
  明确列出并在对应位置留 TODO 注释
- 修改 PRD 4.x 数据模型：必须先改 PRD.md 并说明原因
- 不做 Phase 范围之外的"顺手优化"

## 自测要求
每个 Phase 完成后，对照该 Phase 的验收标准逐条自测并输出结果表，
无法自动验证的项目（如需要真实模型服务）明确标注"需人工验证"。
