# VideoPipeline v1.0｜GitHub交付检查

范围：源代码、集中配置与锁文件、AGENTS、PROGRESS、制作指南、历史技术/验证报告，以及渲染依赖所需的小型第三方源码/适配包和许可证。生成视频、声音参考、模型、下载素材、缓存均不属于此次GitHub代码交付。

## 已完成的推送前核查

- 原工作分支main，原HEAD `404f8d5d64c14b56815bd9cec2856e0bc63ccb81`；origin为 `https://github.com/augnera/video-pipeline.git`。已fetch核实origin/main，无远端分歧。
- 检查全部已跟踪文件、待提交文本及历史自有文本，未发现真实凭据或被跟踪的敏感文件。凭据扫描只记录命中文件位置，不输出凭据值；.env.example为示例模板。
- 已补齐ignore：local-assets、实验public渲染暂存、生成输入/缓存、环境覆盖、本地配置、音视频、模型权重、node_modules。实际声音/BGM/输出目录及本地路径配置的忽略规则均检查。
- 发现9个未推送提交中曾错误加入node_modules，虽后续移除，直接push仍会上传依赖历史。仅重建尚未发布的9个提交，去掉其中node_modules；作者/日期/消息保留，已发布origin/main不变。原历史完整保留在本地分支 `backup/pre-production-v1-publish-20261028-232916`，不推送该备份分支；不要使用push --all。
- 清理后的源码树与原HEAD源码树完全一致，真实索引及工作区未改变。详细映射保留在本地忽略的 `orchestrator/output/github-publish-v1/unpublished-history-cleanup.json`；原提交未丢失。
- 第三方GLSL源码及11KB官方适配包是被锁文件引用的代码依赖，不是视频素材/模型。已核对包内容，并一并保留上游LICENSE及THIRD-PARTY-NOTICES。11MB下载字体和所有public本地媒体不提交。
- 上游固定源码和复制的许可证声明原字节保留；.gitattributes仅关闭这些路径的既有空白告警，不改shader或许可证。本方文件仍检查空白。
- 原README/PRD迁入docs的现有改动按实际文件保留；不恢复为当前默认工作流。

## 提交与远端状态

本条记录是检查完成时的检查点，不提前宣称提交/推送成功；实际结果以随后Git返回、远端引用核对及最终交付记录为准。

## 未提交内容

- 原始新稿 `docs/scripts/微软离职邀约_技能保值_分镜脚本.xlsx` 本轮保留本地，未作为代码/配置/文档交付暂存；原有已跟踪Day9测试输入不改。
- 私人声音参考/合成声音、模型、BGM/下载素材、录屏、渲染视频/图片/字体、验证产物、node_modules及本地路径配置由ignore排除，仍保存在本机。
- 因此GitHub此次保存的是可审核源码/配置/文档，不是本机视频与素材的完整异地备份。克隆后仍需恢复获准本地资源及运行验证产物；不能将缺失文件假称已上传。
