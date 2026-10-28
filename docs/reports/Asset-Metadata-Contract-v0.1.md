# Asset Metadata Contract v0.1

适用范围：VideoPipeline 内部文件索引与实验暂存区；无数据库、公共接口或素材后台。

## Asset

结构契约：[asset-v0.1.schema.json](../../orchestrator/contracts/asset-v0.1.schema.json)。真实样例：[asset-catalog.json](../../orchestrator/output/day9-vp006-poc/asset-catalog.json)。

| 字段 | 约定 |
|---|---|
| assetId / sha256 | 稳定身份与原文件字节哈希；同 SHA 复用 ID，不重复入索引 |
| sourceType | 原始获取来源：local_library / web_stock / ai_generated / user_provided；下载到本地的网素材仍是 web_stock |
| mediaType / localPath | video / image；路径相对仓库根目录；音频独立配置，不混入该契约 |
| sourceUrl / creator | 原始官方页、个人创作者；未知为 null，不能用发布平台冒充作者 |
| license / licenseStatus | 保存名称、来源链接、核验日期、适用范围、限制、证据文件；不由平台名推定可用 |
| durationSeconds / width / height / fps | 实测值；图片 durationSeconds、fps 为 null |
| description / actions | 实际画面可见事实，不靠文件名/标题生成描述 |
| mood / tags | 检索线索；情绪推测要显式标识，不作为客观事实 |
| usableSegments | 视频原时间轴 start/end；起止递增且不超过实测时长；图片为空数组 |
| reviewStatus | pending_human / approved / rejected；AI 分析完成不等于人工通过 |
| analysis | 模型、分析时间、输入帧路径/时间点/哈希、facts、inferences、uncertainty |
| generation | AI 生成时保存已有模型/提示词/参数；未暴露模型版本或 seed 保留 null；非 AI 素材可为 null |
| aspectRatio | 实测 width/height；可选派生值 |

Asset 不允许 projectId、episodeId、shotNumber、旁白等业务字段。字段使用 additionalProperties=false 限定；未知信息不得填造。

## AssetMatch

结构契约：[asset-match-v0.1.schema.json](../../orchestrator/contracts/asset-match-v0.1.schema.json)。真实样例：[asset-matches.json](../../orchestrator/output/day9-vp006-poc/asset-matches.json)。

必备字段为 projectId、episodeId、shotNumber、assetId、segmentStart、segmentEnd、matchReason、cropMode、matchStatus。视频起止时间针对素材源，不是成片时间。图片两时间字段为 null。同一 assetId 可以关联多个镜头和项目。matchStatus=proposed 不等于人工批准。

可选业务注释：narration、visualGoal、visualStyle、licenseStatusAtMatch、humanReviewStatus、sourceTypeAtMatch。来源/许可快照供复核，Asset 中的来源和许可证据仍是权威记录；实际实验编排时间写在 sample-timeline 中。

匹配失败保留 rejected 理由；缺少素材则写 gaps，不编造没有文件的 Asset。动态图解是 Remotion 代码表达，尚未导出为独立媒体，不能伪装成素材文件入索引。

## 校验及入库边界

使用现有 jsonschema 校验器，另做时间区间、引用完整性、SHA 去重校验。代码与 12 项测试在 [contracts](../../orchestrator/contracts/README.md)。原始 Asset 与匹配关系分开校验；测试包括跨项目复用、缺字段、伪造图片时长、未知引用、越界、重复 SHA、未审核准入等。

本轮目录是实验暂存区。所有新索引记录均待人工审核，不进入正式素材库。formal_library_eligible 辅助检查要求人工 approved 且有本地实验授权证据；它不构成公开发布授权。
