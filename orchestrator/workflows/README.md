把 ComfyUI 导出的 API 格式工作流 JSON 放这里:
1. ComfyUI 设置 -> 开启 Dev mode
2. 跑通工作流后点 "Save (API Format)"
3. 保存为 lipsync.json (对口型) / broll.json (Wan生成)
4. 打开JSON找到音频/视频输入节点的ID, 更新 pipeline.ts 里的 patches
