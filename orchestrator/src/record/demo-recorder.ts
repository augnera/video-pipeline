import { chromium, type Page } from "playwright";
import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PRODUCT_URL = process.env.PRODUCT_URL ?? "https://dseai.hk";

/**
 * 按 demoStep ID 自动录制产品演示 (F1.4)。
 * 场景与 assets/selling-points.json 的 demoId 对应。
 * WSL2 下 headless 录制没有问题, 不需要图形界面。
 *
 * TODO(运营者): 下面 SELECTORS 与 SAMPLE_ESSAY 需人工提供后填入,
 * 未填时 recordDemo 会在启动浏览器前报错并列出缺项。
 */
const SELECTORS = {
  "essay-marking": {
    entry: "TODO: 作文批改功能入口, 如 text=作文批改",
    essayInput: "TODO: 作文输入框, 如 #essay-input",
    submit: "TODO: 提交批改按钮, 如 button:has-text('提交')",
  },
  "past-paper": {
    entry: "TODO: past paper 功能入口, 如 text=Past Paper",
    paperItem: "TODO: 试卷/题目列表中用于演示的那一项",
    explain: "TODO: AI 讲解触发按钮",
  },
} as const;

// TODO(运营者): 一段用于演示的 DSE 英文作文 (150-250 词, 会真实提交到产品页面)
const SAMPLE_ESSAY = "TODO: 示例作文文本";

const scenarios: Record<string, (page: Page) => Promise<void>> = {
  "essay-marking": async (page) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500); // 首屏停留
    await page.click(SELECTORS["essay-marking"].entry);
    await page.fill(SELECTORS["essay-marking"].essayInput, SAMPLE_ESSAY);
    await page.waitForTimeout(800);
    await page.click(SELECTORS["essay-marking"].submit);
    await page.waitForTimeout(8000); // 停留展示 AI 批改过程 (视频核心画面)
  },
  "past-paper": async (page) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.click(SELECTORS["past-paper"].entry);
    await page.click(SELECTORS["past-paper"].paperItem);
    await page.waitForTimeout(800);
    await page.click(SELECTORS["past-paper"].explain);
    await page.waitForTimeout(8000); // 停留展示 AI 逐步讲解
  },
};

/** 场景所需的人工资源仍是 TODO 占位时, 启动浏览器前给出可操作的报错 */
function assertResourcesReady(demoId: string) {
  const missing: string[] = [];
  const sel = SELECTORS[demoId as keyof typeof SELECTORS];
  if (sel)
    for (const [name, value] of Object.entries(sel))
      if (value.startsWith("TODO")) missing.push(`SELECTORS["${demoId}"].${name}`);
  if (demoId === "essay-marking" && SAMPLE_ESSAY.startsWith("TODO")) missing.push("SAMPLE_ESSAY");
  if (missing.length)
    throw new Error(
      `录屏场景 "${demoId}" 缺少人工提供的资源, 请在 src/record/demo-recorder.ts 填入:\n  - ${missing.join("\n  - ")}`,
    );
}

export async function recordDemo(demoId: string, outDir: string): Promise<string> {
  const scenario = scenarios[demoId];
  if (!scenario)
    throw new Error(`未定义的demo场景: ${demoId} (可用: ${Object.keys(scenarios).join(", ")}), 在 demo-recorder.ts 里添加`);
  assertResourcesReady(demoId);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 }, // 直接按竖版录, 省去后期裁切
    recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
    deviceScaleFactor: 2,
  });
  try {
    const page = await ctx.newPage();
    await scenario(page);
  } finally {
    await ctx.close();
    await browser.close();
  }

  // Playwright 用随机文件名保存, 重命名为可预测的路径
  const webm = readdirSync(outDir).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error(`Playwright 录屏结束但 ${outDir} 下没有 .webm 产物`);
  const out = join(outDir, `demo-${demoId}.webm`);
  renameSync(join(outDir, webm), out);
  return out;
}

// CLI 独立触发 (C5): npm run record -- <demoId> [输出目录]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [demoId = "essay-marking", outDir = "output/record-test"] = process.argv.slice(2);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(outDir, { recursive: true });
  recordDemo(demoId, outDir)
    .then((f) => console.log(`录屏完成: ${f}`))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
