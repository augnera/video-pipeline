# 调研证据索引｜固定版本与实际阅读边界

核查日期2026-11-03。主报告：[决策与实验候选](VideoPipeline-OpenSource-Video-Research-20261103.md)。本索引只保存来源定位与研究摘要，不拷贝第三方源码、Skill或媒体。外部项目均未安装或运行；S为源码阅读，D为作者声明，R仅指我们既有项目运行证据。

## 1. 13个仓库版本

分支均按实际default branch或git symbolic-ref读取；commit固定，不跟随移动main。维护时间只证明该版本可定位，不证明质量。

| ID | 仓库/分支 | 固定commit | 该commit时间 | 许可证原文 |
|---|---|---|---|---|
| P01 | [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft/tree/1266a3ec4831289c4d893d42dd5102723658039a) / main | `1266a3ec4831289c4d893d42dd5102723658039a` | 2026-10-29T16:17:26Z | [Apache-2.0](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/LICENSE) |
| P02 | [browser-use/video-use](https://github.com/browser-use/video-use/tree/43cfc566833548093455c9d4a46bd69913b7e552) / main | `43cfc566833548093455c9d4a46bd69913b7e552` | 2026-10-08T22:16:59Z | [MIT](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/LICENSE) |
| P03 | [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill/tree/1ce2c186bf1dba96132d87274eee46df4f537e0e) / main | `1ce2c186bf1dba96132d87274eee46df4f537e0e` | 2026-10-31T22:51:23Z | [MIT](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/LICENSE) |
| P04 | [nateherkai/herk-edit-kit](https://github.com/nateherkai/herk-edit-kit/tree/10511e5af86fc47756ea89803b397422e2d89284) / main | `10511e5af86fc47756ea89803b397422e2d89284` | 2026-10-14T12:51:10Z | [MIT及独立使用声明](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/LICENSE) |
| P05 | [Vincentwei1021/video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft/tree/a7c29edfb2404612dde6a5a1c8aa94232e85625b) / main | `a7c29edfb2404612dde6a5a1c8aa94232e85625b` | 2026-10-12T05:29:08Z | [PolyForm Noncommercial及商业授权要求](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/LICENSE) |
| P06 | [remotion-dev/skills](https://github.com/remotion-dev/skills/tree/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271) / main | `c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271` | 2026-11-02T08:50:21Z | [无独立LICENSE/package license字段](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/package.json) |
| P07 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes/tree/3baf81f9a92615507f76fe8de33e489034ee77ec) / main | `3baf81f9a92615507f76fe8de33e489034ee77ec` | 2026-11-03T05:46:34Z | [Apache-2.0](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/LICENSE) |
| P08 | [Agentchengfeng/chengfeng-videocut-skills](https://github.com/Agentchengfeng/chengfeng-videocut-skills/tree/a33b43e08c34fa8beeb5e78498e852f4e80975a5) / main | `a33b43e08c34fa8beeb5e78498e852f4e80975a5` | 2026-09-20T12:07:02Z | [Apache-2.0](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/a33b43e08c34fa8beeb5e78498e852f4e80975a5/LICENSE) |
| P09 | [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage/tree/195eab24478dc9363326aec437aefc3701635ddf) / main | `195eab24478dc9363326aec437aefc3701635ddf` | 2026-10-28T21:45:26Z | [AGPL-3.0](https://github.com/calesthio/OpenMontage/blob/195eab24478dc9363326aec437aefc3701635ddf/LICENSE) |
| P10 | [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer/tree/735c79c8724e897e8971cd59dde7e5aa11e4d6ce) / main | `735c79c8724e897e8971cd59dde7e5aa11e4d6ce` | 2026-09-18T19:52:10+08:00 | [PolyForm Noncommercial及商业授权要求](https://github.com/Vincentwei1021/anything2explainer/blob/735c79c8724e897e8971cd59dde7e5aa11e4d6ce/LICENSE) |
| P11 | [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut/tree/7fa4b7903e7ebecf832a36249f0c0c755200cc17) / main | `7fa4b7903e7ebecf832a36249f0c0c755200cc17` | 2026-10-21T21:08:55+08:00 | [AGPL-3.0](https://github.com/0xsline/OpenChatCut/blob/7fa4b7903e7ebecf832a36249f0c0c755200cc17/LICENSE) |
| P12 | [zenstory-ai/drama-skills](https://github.com/zenstory-ai/drama-skills/tree/d8a9a9b5f5fa0e46dc2644d55879d1c984ff70e6) / main | `d8a9a9b5f5fa0e46dc2644d55879d1c984ff70e6` | 2026-11-02T00:30:34-08:00 | [MIT](https://github.com/zenstory-ai/drama-skills/blob/d8a9a9b5f5fa0e46dc2644d55879d1c984ff70e6/LICENSE) |
| P13 | [dexhunter/seedance2-skill](https://github.com/dexhunter/seedance2-skill/tree/516284d5bab58361bfdfed3cc96cee3e837d4c44) / main | `516284d5bab58361bfdfed3cc96cee3e837d4c44` | 2026-09-19T19:18:49+01:00 | [MIT](https://github.com/dexhunter/seedance2-skill/blob/516284d5bab58361bfdfed3cc96cee3e837d4c44/LICENSE) |

GitHub匿名API在后四项遇到403 rate limit，改用只读git协议取得commit、树及目标blob，成功读取；不是绕过站点访问控制、未使用凭据。没有把失败的API响应当作许可证或不存在的证据。原始研究缓存位于`/tmp/vp-research-20261103/`，不作为永久归档依赖，正式证据是本索引的固定源链接与必要SHA。

## 2. 重点结论对应源码

### P01 video-shotcraft

[pipeline.md](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/pipeline.md)；[SKILL.md](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/SKILL.md)；[library.json](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/gallery/api/library.json)；[final-review.md](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/final-review.md)；[package.json](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/template/package.json)；[Polish.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/_fixtures/Polish.tsx)；[Fixtures.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/_fixtures/Fixtures.tsx)；[Brand.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/_fixtures/Brand.tsx)；[ATTRIBUTION.md](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/shots/ATTRIBUTION.md)。

### P02 video-use

[render.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/helpers/render.py)；[transcribe.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/helpers/transcribe.py)；[grade.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/helpers/grade.py)；[test_render_captions.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/tests/test_render_captions.py)；[test_render_fps.py](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/tests/test_render_fps.py)；[pyproject.toml](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/pyproject.toml)；[SKILL.md](https://github.com/browser-use/video-use/blob/43cfc566833548093455c9d4a46bd69913b7e552/SKILL.md)。

### P03 ffmpeg-skill

[contract.md](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/docs/contract.md)；[_contract.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/_contract.py)；[test_contract.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/tests/test_contract.py)；[check.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/check.py)；[verify.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/verify.py)；[cropdetect.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/scripts/cropdetect.py)；[server.py](https://github.com/kajisho5/ffmpeg-skill/blob/1ce2c186bf1dba96132d87274eee46df4f537e0e/mcp/server.py)。

### P04 herk-edit-kit

[GUIDE.md](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/GUIDE.md)；[registry.json](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/registry.json)；[style.json](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/01-vox-explainer/style.json)；[t2-lb-magnify.html](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/01-vox-explainer/cards/tier2/t2-lb-magnify.html)；[t2-lb-spotlight.html](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/01-vox-explainer/cards/tier2/t2-lb-spotlight.html)；[t1-stat-quote.html](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/style-library/01-vox-explainer/cards/tier1/t1-stat-quote.html)；[preflight.mjs](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/scripts/preflight.mjs)；[validate-beat-sync.mjs](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/scripts/validate-beat-sync.mjs)；[VERIFICATION.md](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/docs/VERIFICATION.md)；[THIRD_PARTY_NOTICES.md](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/THIRD_PARTY_NOTICES.md)；[PIPELINE-USE-PERMISSION.txt](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/licenses/PIPELINE-USE-PERMISSION.txt)；[package.json](https://github.com/nateherkai/herk-edit-kit/blob/10511e5af86fc47756ea89803b397422e2d89284/package.json)。

### P05 video-talkcraft

[semantic_annotate.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/semantic_annotate.py)；[card_match.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/card_match.py)；[timestamps_cpu.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/timestamps_cpu.py)；[make_timing.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/make_timing.py)；[beat_lint.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/beat_lint.py)；[qa_extract.py](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/scripts/qa_extract.py)；[layout.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/references/layout.md)；[shot-design.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/references/shot-design.md)；[cinematography.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/references/cinematography.md)；[review-protocol.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/references/review-protocol.md)；[evidence-scroll-tour.tsx](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/template/cards/evidence-scroll-tour.tsx)；[focus-dim-spotlight.tsx](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/template/cards/focus-dim-spotlight.tsx)；[package.json](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/runtime/package.json)；[THIRD_PARTY_NOTICES.md](https://github.com/Vincentwei1021/video-talkcraft/blob/a7c29edfb2404612dde6a5a1c8aa94232e85625b/THIRD_PARTY_NOTICES.md)。

### P06 skills

[SKILL.md](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/skills/remotion-best-practices/SKILL.md)；[import-srt-captions.md](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/skills/remotion-best-practices/remotion-captions/import-srt-captions.md)；[transcribe-captions.md](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/skills/remotion-best-practices/remotion-captions/transcribe-captions.md)；[REFERENCE.md](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/skills/remotion-best-practices/remotion-license/REFERENCE.md)；[package.json](https://github.com/remotion-dev/skills/blob/c7cb2fdcacd134fb2ccb9b7a44f9ffa44e467271/package.json)。

### P07 hyperframes

[render.ts](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/packages/cli/src/commands/render.ts)；[launchCaptureBrowser.ts](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/packages/cli/src/capture/launchCaptureBrowser.ts)；[assertSwiftShader.ts](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/packages/engine/src/utils/assertSwiftShader.ts)；[shouldBlockRender.ts](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/packages/lint/src/shouldBlockRender.ts)；[package.json](https://github.com/heygen-com/hyperframes/blob/3baf81f9a92615507f76fe8de33e489034ee77ec/packages/cli/package.json)。

### P08 chengfeng-videocut-skills

[runtime-and-product-contract.md](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/a33b43e08c34fa8beeb5e78498e852f4e80975a5/plugins/chengfeng-videocut/references/runtime-and-product-contract.md)；[business-workflow-contract.md](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/a33b43e08c34fa8beeb5e78498e852f4e80975a5/plugins/chengfeng-videocut/references/business-workflow-contract.md)；[runtime-requirements.json](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/a33b43e08c34fa8beeb5e78498e852f4e80975a5/plugins/chengfeng-videocut/runtime-requirements.json)；[NOTICE.md](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/a33b43e08c34fa8beeb5e78498e852f4e80975a5/NOTICE.md)。

### P09 OpenMontage

[README.md](https://github.com/calesthio/OpenMontage/blob/195eab24478dc9363326aec437aefc3701635ddf/README.md)；[PROVIDERS.md](https://github.com/calesthio/OpenMontage/blob/195eab24478dc9363326aec437aefc3701635ddf/docs/PROVIDERS.md)；[pipeline_loader.py](https://github.com/calesthio/OpenMontage/blob/195eab24478dc9363326aec437aefc3701635ddf/lib/pipeline_loader.py)；[composition_validator.py](https://github.com/calesthio/OpenMontage/blob/195eab24478dc9363326aec437aefc3701635ddf/tools/analysis/composition_validator.py)；[provider_routing.py](https://github.com/calesthio/OpenMontage/blob/195eab24478dc9363326aec437aefc3701635ddf/tools/provider_routing.py)。

### P10 anything2explainer

[README.md](https://github.com/Vincentwei1021/anything2explainer/blob/735c79c8724e897e8971cd59dde7e5aa11e4d6ce/README.md)；[selfcheck.py](https://github.com/Vincentwei1021/anything2explainer/blob/735c79c8724e897e8971cd59dde7e5aa11e4d6ce/template/scripts/selfcheck.py)；[package.json](https://github.com/Vincentwei1021/anything2explainer/blob/735c79c8724e897e8971cd59dde7e5aa11e4d6ce/template/package.json)。

### P11 OpenChatCut

[README.md](https://github.com/0xsline/OpenChatCut/blob/7fa4b7903e7ebecf832a36249f0c0c755200cc17/README.md)；[render.ts](https://github.com/0xsline/OpenChatCut/blob/7fa4b7903e7ebecf832a36249f0c0c755200cc17/cli/commands/render.ts)；[timeline.ts](https://github.com/0xsline/OpenChatCut/blob/7fa4b7903e7ebecf832a36249f0c0c755200cc17/cli/commands/timeline.ts)；[package.json](https://github.com/0xsline/OpenChatCut/blob/7fa4b7903e7ebecf832a36249f0c0c755200cc17/package.json)。

### P12 drama-skills

[README.md](https://github.com/zenstory-ai/drama-skills/blob/d8a9a9b5f5fa0e46dc2644d55879d1c984ff70e6/README.md)；[content_quality_gate.py](https://github.com/zenstory-ai/drama-skills/blob/d8a9a9b5f5fa0e46dc2644d55879d1c984ff70e6/evaluations/content_quality_gate.py)。

### P13 seedance2-skill

[README.md](https://github.com/dexhunter/seedance2-skill/blob/516284d5bab58361bfdfed3cc96cee3e837d4c44/README.md)；[SKILL.md](https://github.com/dexhunter/seedance2-skill/blob/516284d5bab58361bfdfed3cc96cee3e837d4c44/SKILL.md)。

## 3. Shotcraft五条配方与预览对应

| 卡/变体 | 说明 | 实现 | 预览核查 |
|---|---|---|---|
| cursor-flyover | [配方](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/shots/camera/cursor-flyover.md) | [TSX](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/camera/cursor-flyover/CursorFlyover.tsx) | [静态海报已看](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/gallery/media/poster/cursor-flyover.jpg) |
| scanline-annotate-focus | [配方](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/shots/effects/scanline-annotate-focus.md) | [TSX](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/effects/scanline-annotate-focus/ScanlineAnnotateFocus.tsx) | [静态海报已看](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/gallery/media/poster/scanline-annotate-focus.jpg) |
| scroll-brake-moves / ChangelogScrollBrake | [配方](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/shots/data/scroll-brake-moves.md) | [TSX](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/data/scroll-brake-moves/ChangelogScrollBrake.tsx) | 已追踪library.json中的media URL；非本地组件渲染证据 |
| gauge-readout-moves / NeedleSweepSelftest | [配方](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/shots/data/gauge-readout-moves.md) | [TSX](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/data/gauge-readout-moves/NeedleSweepSelftest.tsx) | 已追踪library.json中的media URL；非本地组件渲染证据 |
| line-carry-transition | [配方](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/shots/transition/line-carry-transition.md) | [TSX](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/demos/transition/line-carry-transition/LineCarryTransition.tsx) | 已追踪library.json中的media URL；非本地组件渲染证据 |

配方时长核对：CursorFlyover常量240帧，ScanlineAnnotateFocus150，ChangelogScrollBrake150，NeedleSweepSelftest140，LineCarryTransition190。其世界坐标、停留、品牌/fixture依赖必须成套适配，不是通用的6帧切点效果。library.json记录124卡/150style/150preview；这些是登记数，不是我们可用性评级。其generatedAt早于部分条目的updatedAt，不能用顶层时间戳当成所有预览最新的证明。

额外核查了[作者已发布的Changelog预览](https://vincentwei1021.github.io/video-shotcraft/media/changelog-scroll-brake.mp4)：2026-11-03 UTC06:43取得，1736754字节，5秒，SHA-256 `0d6530fe05c6141a96118e3016ceb7007004cd5019c13003d5c4b5b4dd63e744`。只用CPU FFprobe读取，并以FFmpeg `-hwaccel none`在0.25、2.5、4.75秒抽PNG；实际查看首/中/尾，普通条目到v2.41目标行的构图与代码相符。这是读取已有媒体，不是运行作者组件、完整观看自然度或制作新视频；该发布URL可变，不能证明其字节与固定git commit严格绑定。另两条动态预览因研究体积限额未完整获取，仅以源码和目录定位，不记运行验证。预览与抽帧留在临时研究缓存，不提交媒体。

抽看talkcraft的evidence-scroll-tour与focus-dim示例源码，并查看前者静态thumb；示意合同/主持人占位不是新闻实证素材。未安装其runtime或下载ASR模型。

## 4. 许可分层判断

| 项目 | 原作代码/文档/配方 | 示例/声音/字体/品牌 | 模型或服务 |
|---|---|---|---|
| video-shotcraft | Apache-2.0，保留声明/变更记录 | ATTRIBUTION只提供各自范围的依据；参考作品公开不等于授权，品牌演示不作我们的素材 | 可本地Remotion；外部服务/音乐来源独立 |
| video-use | MIT原作 | 演示片/配乐/Helvetica等不能随代码一并推定授权 | ElevenLabs Scribe服务及上传另核；无需为我们的既有字幕新调用 |
| ffmpeg-skill | MIT原作 | 处理的媒体/字幕字体另核 | FFmpeg具体构建及组件许可另核；无需API不是素材授权 |
| herk-edit-kit | MIT＋教学kit使用声明，原作允许个人/商业视频 | THIRD_PARTY_NOTICES：品牌/Google Fonts/GSAP/样片不统一重许可 | HyperFrames Apache及其服务/依赖独立 |
| video-talkcraft | 非商业；商业使用须作者授权，文档卡片也不直接迁移 | Lucide等单独条款；主持人、音效归属另核 | ASR模型、Fish Audio等服务许可不由toolkit授予 |
| skills | 未见仓库独立LICENSE；作为指南阅读，具体代码复用待核 | 地图/字体/图标等示例依各自来源 | Remotion SDK及WebGPU ASR模型/依赖另核，后者不符合STOP |
| hyperframes | Apache-2.0原作 | GSAP、字体与媒体独立 | 云端托管不是Apache免费服务承诺 |
| chengfeng-videocut-skills | Apache-2.0＋NOTICE | 产品/用户素材归属不被Skill许可证覆盖 | Runtime发布资产/ASR路线另审，不执行安装器 |
| OpenMontage | AGPL-3.0，不等于禁止商业，也不等于MIT | 示例及模型输出不自动继承全部权利 | provider/model各自条款费用；文档价格仅作者自报 |
| anything2explainer | 非商业＋商业授权要求 | 所包字体有独立OFL条款，示例画面另核 | TTS或其他模型权利独立，未调用 |
| OpenChatCut | AGPL-3.0，具体集成义务另评 | assets/fonts/LICENSES.md存在；品牌和用户视频独立 | 外部provider不因项目开源自动获服务使用权 |
| drama-skills | MIT原作工具与指南 | 原著/角色/样片/商标独立 | 视频生成服务付费/许可另核，未使用 |
| seedance2-skill | MIT提示指南 | 参考图/音频/身份权利独立 | Seedance服务不是此仓库提供的开源模型或免费API |

本表是固定仓库所见许可与复用范围记录，不构成对任何未检查素材的授权确认。报告没有复制这些项目代码/配方文本或上传预览图片。

## 5. 本地事实与可复核入口

本地能力按`85892f178b8675b1e74c7ebfc190116c65de955b`快照读取。以下源码已同步，可在GitHub审阅；这次调研不改其行为。

| 文件 | 核查符号/限制 | 本轮读取SHA-256 |
|---|---|---|
| [orchestrator/src/production/cli.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/cli.ts) | import/facts/brief/voice/assets/timeline/audio/render/compose/quality/delivery；事实与复杂输入可能BLOCKED | `8245f1ff15e05c46f8b5e0600507799f45fda71e29840d3271938ce95142cc19` |
| [orchestrator/src/production/core.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/core.ts) | Engine.stage/loadConfig；显式fingerprint＋receipt/SHA，非镜头级缓存 | `4ccd3a12d63233fd65ad4549cace0c9e4f03b44c49c68e596e4af6dc8017a45f` |
| [orchestrator/src/production/visual.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/visual.ts) | intentBrief/assembleTimeline/stagePublic；多match需显式时间线 | `aafdc48cf6a4355cfa6081b9b6b52f2bc0000adb89a65f0267a809e239159a5a` |
| [orchestrator/src/production/asset-library.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/asset-library.ts) | localAssetProposal；先本地后discover，无批量自动入库 | `33ef3c4d54d4b87f3a574748eb7473d9b520a68f4d8a3370dacb3f247a9d91eb` |
| [orchestrator/src/asset-library/library.py](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/asset-library/library.py) | allowed/propose/record_timeline；审核与公开权利分开 | `898aebeac6aa5886f41f73cb20f99eb68705d2e62d6ad1bdfd9aaa941ac85833` |
| [orchestrator/src/asset-library/network.py](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/asset-library/network.py) | 各来源搜索/下载/回调与去重；未读取.env值 | `7578c3ad6a4f7e74f1537256d3b857c77f2331881c4d291be2614ef8c163cc28` |
| [orchestrator/src/asset-library/videoseek.py](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/asset-library/videoseek.py) | retrieve；CPU会话证据与结果回到现有库 | `7924792d97df672d437acd9dd77e1e1a424046466489da3911ede23d53f6da94` |
| [orchestrator/contracts/overlay-v1.schema.json](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/contracts/overlay-v1.schema.json) | text/rect/全局帧时钟，strict additionalProperties:false | `98a120c35d3394194068660be7eee0ec46189be7c6bcf8cd693e40e2c56d7a0c` |
| [orchestrator/src/production/overlays.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/overlays.ts) | validateOverlays/overlayProgress；时间、安全区、主体保护 | `127fe7e3548be678c5e5f0970c58d1ac6123b773158bf99810ff525ad858db12` |
| [experiments/gl-transitions-vp008/src/RoutineRoot.tsx](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/experiments/gl-transitions-vp008/src/RoutineRoot.tsx) | Base/OverlayLayer/Caption；图像ROI消费端尚缺 | `86a40347ef8c1c8e961511f6e8a382025d2ff3a4e58d79460dfb91d890cd9c9a` |
| [orchestrator/src/transitions/select.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/transitions/select.ts) | relationOf/selectTransitions；按实际元数据规则过滤 | `31a0c3b0dc760a877955eeb05e568722390aae888ef2580fa476a101435ae449` |
| [orchestrator/src/production/media.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/media.ts) | renderPicture/compose；部分导出后的probe-only与一次GL降级 | `7a2dfd6e42cd84551595650d9750969a6b8e590f9487e3f9d7b3596cfefcf716` |
| [orchestrator/src/production/quality.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/quality.ts) | inspectQuality/qualityAndRepair；一次修复，仍可触发完整画面导出 | `f9fe5ac911da0817b0c028383376e22947e71faefe65c587aa492decbf17b17f` |
| [orchestrator/src/episode-production/frame_scan.py](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/episode-production/frame_scan.py) | flickerAesthetics明确NOT_EVALUATED | `2b753e64189f24de2821626d11288adf445bf9a47ab06d935ccd57ae0d9c1b33` |
| [orchestrator/src/production/voice.ts](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/src/production/voice.ts) | alignGenerated；句级来源非字级强对齐 | `8244be62a92f87c43a3488a9bc0b7ca8c91e1ab06096f74d7bce96a355d02710` |
| [orchestrator/config/production-v1.json](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/orchestrator/config/production-v1.json) | CPU配音、蓝紫/字幕/音乐与转场、Wan STOP；未改默认 | `5f8789cd0b2716b6921b89de255176f7e723e9d81fd216f00d79a998bbc90cd7` |
| [docs/reports/VP-008-Transitions-Library.md](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/docs/reports/VP-008-Transitions-Library.md) | 既有技术统计，不外推观感 | `2316dd4d8b4a2655096e41a423342d9fdaead9a37458b0190f876bb404d47434` |
| [docs/reports/VP-009-Day9-Full.md](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/docs/reports/VP-009-Day9-Full.md) | 77%图解、18帧转场及约60分反馈 | `dadaacc2710d3fb6d367f8f159e743dcdcf3428300138492a2b8f662d5d6fabc` |
| [docs/reports/VP-010-Microsoft-Skills.md](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/docs/reports/VP-010-Microsoft-Skills.md) | 约65分人工裁定及实际素材/转场证据 | `78ed439ca69eafde9674f06d9d2d3dcb631bb169f3e8f4443c8b5b9d10805603` |
| [docs/reports/Production-v1.0-validation.md](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/docs/reports/Production-v1.0-validation.md) | 旧缓存/短片/中断恢复实际范围 | `7009a9679a06ad539ae52a275f7a99d44bb403ef53c4bec3f097e6b1d6899be2` |
| [docs/reports/AI-Programming-20261103-Video.md](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/docs/reports/AI-Programming-20261103-Video.md) | 新一期既有视频与截图、人工基本合格记录 | `0cd9372efcf6f323d9ad0ece4ca4f416f0c25ae9bcb62800b479166359638501` |
| [docs/reports/CPU-VIDEO-001.md](https://github.com/augnera/video-pipeline/blob/85892f178b8675b1e74c7ebfc190116c65de955b/docs/reports/CPU-VIDEO-001.md) | CPU视频A/B实际耗时和未获素材验收 | `9ac08703faad21a9dce5e76c9b6735f0059af274dd0c689ebcf8279f806abd8c` |

已有本地输出仅只读查看：本期timeline的0—25.4秒（762帧）场景时钟、真实Felix excerpt与capture来源。未渲染A/B、没有新配音/ASR，也没有执行外部项目测试。为此前成果集中推送做的本地回归（生产12/视觉25/素材15/契约12，导入10于隔离真实fixture）不算外部项目兼容性或本报告实验验证。

后续若要落字同步，必须记录时间锚点出处、精度与未命中处理；若要局部重渲染，必须另证明跨片段转场/音轨/SRT时钟一致，不能把本文建议写成已实现。
