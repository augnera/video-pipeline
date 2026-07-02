import { runPipeline } from "./pipeline.js";

// 用法: npm run pipeline -- "考前冲刺" 倒计时焦虑型 yue 3
const [topic = "AI作文批改", hookType = "倒计时焦虑型", lang = "yue", count = "2"] =
  process.argv.slice(2);

runPipeline({ topic, hookType, lang: lang as "yue" | "zh", count: Number(count) })
  .then(() => console.log("\n全部完成, 成片在 output/ 目录"))
  .catch((e) => { console.error(e); process.exit(1); });
