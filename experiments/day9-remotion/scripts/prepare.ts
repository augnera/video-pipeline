import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { importExcel } from "../../../orchestrator/src/import/excel.ts";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(project, "../..");
const output = resolve(root, "orchestrator/output/day9-vp003a");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const input = {
  excel: resolve(root, "docs/day9一人公司3个必须提前做的正确选择.xlsx"),
  normalized: resolve(root, "orchestrator/output/day9/script.normalized.json"),
  voiced: resolve(root, "orchestrator/output/day9/script.voiced.json"),
};
const normalized = JSON.parse(await readFile(input.normalized, "utf8"));
const voiced = JSON.parse(await readFile(input.voiced, "utf8"));
const excel = await importExcel(input.excel);
assert.equal(normalized.schemaVersion, "ip-script/1");
assert.equal(voiced.schemaVersion, "ip-script-voiced/1");
assert.equal(excel.source.sha256, normalized.source.sha256);
assert.deepEqual(excel.shots, normalized.shots, "真实 Excel 与冻结标准化内容有差异，停止");
assert.equal(voiced.voiceDelivery.inputScriptSha256, sha(await readFile(input.normalized)));
assert.equal(voiced.shots.length, 10);

type Decision = {
  visualType: string; method: string; wan: string; templateId: string | null;
  assets: string[]; prompt: string | null; review: string; beats: string;
};
// Editorial proposals only. Never change the official narration or invent media.
const decisions: Decision[] = [
  { visualType: "ai-image-with-motion-and-optional-wan", method: "AI 图片＋轻缓推移为完整底片；后续仅将其中 3–4 秒替换为 Wan 图生视频，余时由同图运动/文字承接", wan: "推荐作唯一首轮 Wan 候选；不是成片必需条件", templateId: "day9-night-desk-v1", assets: ["待生成/授权的单人夜间工位静态图；后续可选 3–4 秒 Wan 片段"], prompt: "竖幅 9:16，夜晚安静的独立工作室，一名独立创业者背影在工位思考，蓝紫色环境光，桌面克制整洁，画面左上及中部留文字空间，无可辨识品牌、无文字、无真实产品界面；图生视频仅缓慢侧移、细微呼吸，人物与手部稳定，不作激烈动作。", review: "不得暗示画面人物是本人；检查手部/屏幕伪字；12.30 秒需有节奏变化，保留原始开场旁白与品牌停顿", beats: "0–4s 夜间工位；4–8s 同图推近；余时叠加风险标题，品牌口播处降低视觉运动" },
  { visualType: "remotion-opinion-card", method: "Remotion 极简动态文字卡，用原旁白中的‘不是／而是’做对照强调", wan: "不需要", templateId: "day9-risk-contrast-v1", assets: ["本地字体、蓝紫背景、矢量分隔线"], prompt: null, review: "对照不能改写成未经确认的新观点；字号和对比足够，字幕与观点卡分离", beats: "先出现‘真正的风险’，随后按句意强调‘不是’和‘而是’，不新增口播" },
  { visualType: "remotion-opinion-card", method: "Remotion 错误一标题卡，熬夜／久坐／硬扛按原文次序逐项出现", wan: "不需要；原表要求文字动画", templateId: "day9-error-list-v1", assets: ["本地字体、三个抽象状态图标"], prompt: null, review: "不要把身体资源视觉化成医疗诊断；条目与旁白同步；保留原叠加文字", beats: "错误一标题→三种透支行为→末句停留" },
  { visualType: "remotion-diagram", method: "Remotion 顺序图解：身体→进度；用承托结构表达‘系统上限’，不画伪造数据曲线", wan: "不需要", templateId: "day9-body-before-progress-v1", assets: ["身体/进度两张文字节点、连接线、系统框架"], prompt: null, review: "图解只表达原文先后与支撑关系，不增加健康疗效或定量数据", beats: "先稳住身体→再谈进度→身体作为整体系统承托" },
  { visualType: "remotion-opinion-card", method: "本轮真实渲染：蓝紫科技观点卡，原始标题分层入场，抽象功能块逐层堆叠", wan: "不需要", templateId: "day9-feature-creep-v1", assets: ["已验收 shot-005.wav、本机文泉驿正黑、纯代码图形"], prompt: null, review: "功能越做越多必须清楚；抽象块不能伪装成真实产品 UI；不裁切/加速配音", beats: "0–0.75s 标题入场；0.65–2.0s 功能块堆叠；约1.84–2.72s关键词强调；尾部保持阅读" },
  { visualType: "remotion-diagram", method: "Remotion 将杂乱抽象节点收束成最小三步流程；用原文关键词表达流程，不伪造产品步骤", wan: "不需要", templateId: "day9-minimal-flow-v1", assets: ["抽象节点、连接线、‘最小／最顺／跑通’文字"], prompt: null, review: "不要把‘最小’误表达为省略验证；不得生成真实 UI；顺序变化须符合口播", beats: "完善表象→面对反馈→收束为最小可跑流程" },
  { visualType: "ai-image-with-motion", method: "优先一张待上线场景图片＋Remotion 缓慢推近和原文字卡；Wan 仅作为后续可选第二候选", wan: "当前不需要；首轮 Wan 成功后才考虑", templateId: "day9-launch-hesitation-v1", assets: ["待生成/授权的单人犹豫工作场景静态图，屏幕无可读界面"], prompt: "竖幅 9:16，独立创业者侧后方，清晨前的蓝紫色工作室，坐在电脑前犹豫停留，屏幕仅抽象柔光，不出现文字和可辨识产品界面，手部自然放置，构图留足标题空间，克制写实。", review: "避免反复显示虚构发布按钮；图片运动已经可表达犹豫，不为动而动；人物非本人", beats: "迟迟不上线标题→轻缓推近场景→验证判断的提示停留" },
  { visualType: "remotion-diagram", method: "Remotion 决策闭环图：上线→现实反馈→调整，用原叠加文字收束", wan: "不需要", templateId: "day9-reality-feedback-v1", assets: ["闭环节点、方向箭头、原文关键词"], prompt: null, review: "不能将上线表现为必然成功或营收增长；反馈符号不冒充真实用户数据", beats: "尽快上线→现实反馈→停止内耗，结束无限准备" },
  { visualType: "remotion-opinion-card", method: "Remotion 科技蓝紫收束卡，对‘方式／能力’做层级对比，不改变原句否定关系", wan: "不需要", templateId: "day9-method-not-ability-v1", assets: ["本地字体、两层标题和简洁强调线"], prompt: null, review: "原叠加文字逐字保留，不将能力不足改成能力不重要", beats: "问题在方式→不在能力→静稳停留" },
  { visualType: "remotion-end-card", method: "Remotion 结束卡，下一期标题＋原始‘关注我’，不增加新的推广口播", wan: "不需要", templateId: "day9-next-episode-v1", assets: ["原文标题、本地字体、三条抽象结构线"], prompt: null, review: "保留结尾完整性和关注引导；只作私人评估，不公开发布", beats: "下一期标题→三条做法结构线→关注我停留" },
];

await mkdir(output, { recursive: true });
const inputHashes = Object.fromEntries(await Promise.all(Object.entries(input).map(async ([k, p]) => [k, { path: p, sha256: sha(await readFile(p)) }])));
const matrix = { schemaVersion: "day9-visual-plan/0.1", status: "proposed-for-review", inputs: inputHashes,
  shots: voiced.shots.map((s: any, i: number) => {
    assert.equal(s.narration, normalized.shots[i].narration);
    return { shotNumber: s.shotNumber, sourceRow: s.sourceRow, narration: s.narration,
      actualAudioDurationSeconds: s.voiceover.durationSeconds, visualDescription: s.visualDescription,
      overlayText: s.overlayText, ...decisions[i] };
  }) };

// Draft captions intentionally span a whole shot. They are NOT word alignment.
const timeline = { schemaVersion: "day9-timeline/0.1", status: "draft-not-final-subtitle-alignment",
  scope: "private-noncommercial-technical-evaluation", inputs: inputHashes,
  timing: { unit: "seconds", ranges: "half-open", subtitleTime: "absolute-video-time", authority: "voiced PCM sample frames",
    gapPolicy: "Only use the explicit gapBeforeSeconds; retained WAV silence is already included. Visual holds through the external gap. No extra 600ms." },
  totalDurationSeconds: voiced.voiceDelivery.totalDurationSeconds,
  shots: await Promise.all(voiced.shots.map(async (s: any, i: number) => {
    assert.equal(sha(await readFile(s.voiceover.audioPath)), s.voiceover.audioSha256);
    assert.equal(s.voiceover.durationFrames / s.voiceover.sampleRate, s.voiceover.durationSeconds);
    return { shotNumber: s.shotNumber, startSeconds: s.voiceover.timelineStartSeconds,
      durationSeconds: s.voiceover.durationSeconds, gapBeforeSeconds: s.voiceover.gapBeforeSeconds,
      audioPath: s.voiceover.audioPath, audioSha256: s.voiceover.audioSha256,
      audioSampleRate: s.voiceover.sampleRate, startSampleFrame: voiced.voiceDelivery.timeline[i].startFrame,
      durationSampleFrames: s.voiceover.durationFrames, visualType: decisions[i].visualType,
      assetPath: null, templateId: decisions[i].templateId, visualStatus: i === 4 ? "experiment-render-pending" : "planned-not-produced",
      overlayText: s.overlayText, subtitles: [{ text: s.narration, startSeconds: s.voiceover.timelineStartSeconds,
        endSeconds: s.voiceover.timelineEndSeconds, timingStatus: "shot-envelope-only-needs-subdivision-and-review" }] };
  })) };
for (let i = 0; i < timeline.shots.length; i++) {
  const s = timeline.shots[i], prev = timeline.shots[i - 1];
  assert.ok(Math.abs(s.startSeconds - (prev ? prev.startSeconds + prev.durationSeconds : 0) - s.gapBeforeSeconds) < 1e-9);
}
assert.ok(Math.abs(timeline.shots.at(-1)!.startSeconds + timeline.shots.at(-1)!.durationSeconds - timeline.totalDurationSeconds) < 1e-9);

const shot = voiced.shots[4];
assert.equal(shot.shotNumber, 5);
assert.equal(shot.overlayText, "大字：错误二｜功能越做越多");
assert.equal(shot.narration, "第二个错误，是产品功能越做越多。");
const writeStable = async (p: string, value: unknown) => {
  const text = JSON.stringify(value, null, 2) + "\n";
  try { await access(p); assert.equal(await readFile(p, "utf8"), text, `拒绝覆盖不同产物 ${p}`); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; await writeFile(p, text, { flag: "wx" }); }
};
await mkdir(resolve(project, "public"), { recursive: true });
await mkdir(resolve(project, "src/generated"), { recursive: true });
const copyVerified = async (src: string, out: string) => {
  try { await access(out); assert.equal(sha(await readFile(src)), sha(await readFile(out)), `拒绝覆盖不同素材 ${out}`); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; await copyFile(src, out, 1); }
};
await copyVerified(shot.voiceover.audioPath, resolve(project, "public/shot-005.wav"));
await copyVerified("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", resolve(project, "public/wqy-zenhei.ttc"));
await copyVerified("/usr/share/doc/fonts-wqy-zenhei/copyright", resolve(project, "public/font-copyright.txt"));
await writeStable(resolve(project, "src/generated/shot-005.json"), { shotNumber: 5,
  narration: shot.narration, overlayTextRaw: shot.overlayText,
  overlayHeading: "错误二", overlayLines: ["功能", "越做越多"],
  overlayDirectiveHandling: "大字： is a style directive; ｜ is rendered as a visual separator; content is unchanged.",
  audioDurationSeconds: shot.voiceover.durationSeconds, audioSha256: shot.voiceover.audioSha256,
  animationTiming: { source: "existing shot-005 ASR word timestamps, rough visual accents only", functionSeconds: 1.84, growthSeconds: 2.22 } });
await writeStable(resolve(output, "visual-matrix.json"), matrix);
await writeStable(resolve(output, "timeline.draft.json"), timeline);
console.log(`真实 Excel 对照通过，10 镜已校验；第 5 镜 ${shot.voiceover.durationSeconds}s → ${Math.ceil(shot.voiceover.durationSeconds * 30)} frames @30fps。`);
console.log(`矩阵和时间线草案：${output}`);
