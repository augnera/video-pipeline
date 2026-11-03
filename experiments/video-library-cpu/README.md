# 素材库CPU实践验证

范围：复用Asset/AssetMatch v0.1及`local-assets/library/index.json`；VideoSeek仅为候选检索适配器，PySceneDetect建立SHA关联的时间片段缓存。所有原素材不动，无成片重渲染，无GPU/硬件解码。Argus只读参考结构，不部署Ollama。

执行顺序：核实固定源码/许可与CPU接线 → 隔离环境验证 → 已有素材SHA去重 → 多镜头片段检测/预览 → 10条真实需求前三候选核对 → 明确可用性及替代入口。未经证实的功能不计成功。

源码和环境位于受忽略`local-assets/experiments/video-library-cpu/`；报告与准确命令在`docs/reports/Video-Library-CPU-validation.md`（完成后写入）。素材目录/检索入口参见`docs/Asset-Library-v1.md`。
