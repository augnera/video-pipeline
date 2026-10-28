# VP-003A Day9 第 5 镜 Remotion 实验

独立于原 DSE 编排器。仅供私人非商业评估，不上传配音、字体副本或 MP4。
固定 Remotion 4.0.539 / React 19.2.3，使用已有 Chromium；不部署模型。

实验产物和记录：`../../orchestrator/output/day9-vp003a/`。
完整结论：`../../docs/reports/VP-003A-visual-plan.md`。

## 首次准备

在实验目录执行（已存在的依赖无需重复安装）：

```bash
npm ci --cache /tmp/vp003a-npm-cache
npm run prepare:inputs
```

prepare 复用原有 Excel 导入器，并逐项对照冻结脚本；不改原始输入。
`public/` 和 `src/generated/` 由本实验 gitignore 排除，不能提交私人 WAV。

本机 TTC 字体不能直接作为浏览器字体加载。本次用已有系统 fontTools 抽出第一个字体为 TTF，未改字形，也未安装字体工具。首次准备后，从仓库根目录执行：

```bash
python -B - <<'PY'
from pathlib import Path
from fontTools.ttLib import TTFont
p = Path('experiments/day9-remotion/public/wqy-zenhei.ttf')
if not p.exists():
    font = TTFont('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', fontNumber=0)
    font.save(str(p))
    font.close()
PY
```

字体来源和许可在 `public/font-copyright.txt`；转换哈希记录在输出目录 `font-conversion.json`。没有复制或使用本机微软雅黑。

## 检查与渲染

在实验目录执行：

```bash
npm run lint
npm run render:experiment
npm run validate:experiment
```

render 默认复用 `/home/chen/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`，可用 `VP003A_CHROME` 指定已有兼容浏览器。软件渲染 swangle，CPU libx264，并发 2；不使用模型或 NVIDIA 编码器。已有 MP4 会拒绝覆盖。失败日志保留，最终成功记录为 `render-run-03.json`。

validate 完整解码、比较压缩前后音频时序、检查帧数/尺寸、抽帧及验证 41 个受保护文件哈希。首次运行写不可覆盖的验证产物；已完成后阅读 `validation.json`，不要反复运行覆盖现有记录。

需要本地预览时：

```bash
node --require ./scripts/loopback.cjs node_modules/@remotion/cli/remotion-cli.js studio src/index.ts --no-open --port=9320
```

仅绑定 127.0.0.1；CLI 的 Network 提示不代表实际宽监听。loopback preload 只适配当前锁定版本的内部入口。本轮完成后关闭本次 Studio。

## 范围

- 只渲染一镜；标题来自 `大字：错误二｜功能越做越多`，仅将排版指令与正文分离。
- 音频完整原速入场，无额外音高、增益或停顿修饰。成片 AAC 编码不改变原 WAV。
- 关键词视觉强调采用已有 ASR 粗略时间，不宣称词级字幕对齐。
- 时间线草案的字幕是整镜原文覆盖区间，后续仍需分句和人工审核。
- 后续将视觉 MP4 内嵌声音静音，使用冻结音频源；不可重复混入同一旁白。
