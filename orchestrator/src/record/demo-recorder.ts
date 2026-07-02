import { chromium } from "playwright";
import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

/**
 * 按 demoStep ID 自动录制产品演示。
 * 把每个卖点对应的操作写成一个场景函数, 与 assets/selling-points.json 的 demoId 对应。
 * WSL2 下 headless 录制没有问题, 不需要图形界面。
 */
const scenarios: Record<string, (page: import("playwright").Page) => Promise<void>> = {
  // 示例: AI作文批改演示 —— 把选择器换成 dseai.hk 的真实元素
  "essay-marking": async (page) => {
    await page.goto(process.env.PRODUCT_URL ?? "https://dseai.hk");
    await page.waitForTimeout(1500);
    // await page.click("text=作文批改");
    // await page.fill("#essay-input", SAMPLE_ESSAY);
    // await page.click("button:has-text('提交')");
    await page.waitForTimeout(6000); // 停留展示AI批改过程
  },
  "past-paper": async (page) => {
    await page.goto(process.env.PRODUCT_URL ?? "https://dseai.hk");
    await page.waitForTimeout(6000);
  },
};

export async function recordDemo(demoId: string, outDir: string): Promise<string> {
  const scenario = scenarios[demoId];
  if (!scenario) throw new Error(`未定义的demo场景: ${demoId}, 在 demo-recorder.ts 里添加`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 }, // 直接按竖版录, 省去后期裁切
    recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await scenario(page);
  await ctx.close();
  await browser.close();

  // Playwright 用随机文件名保存, 重命名为可预测的路径
  const webm = readdirSync(outDir).find((f) => f.endsWith(".webm"))!;
  const out = join(outDir, `demo-${demoId}.webm`);
  renameSync(join(outDir, webm), out);
  return out;
}
