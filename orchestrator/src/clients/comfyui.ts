import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const BASE = process.env.COMFYUI_URL ?? "http://localhost:8188";

/**
 * 用法:
 * 1. 在 ComfyUI 网页里跑通工作流 (如 LatentSync 对口型)
 * 2. 设置里开启 Dev Mode -> 用 "Save (API Format)" 导出 JSON 到 workflows/
 * 3. 打开该 JSON, 找到需要每次替换的节点输入 (音频路径/底板视频路径等),
 *    记下 "节点ID.inputs.字段名", 填进下面 patches
 */
export async function runWorkflow(opts: {
  workflowFile: string; // e.g. workflows/lipsync.json
  patches: Record<string, unknown>; // { "12.inputs.audio": "/abs/path/narration.wav" }
  outPath: string; // 保存产出视频的本地路径
}): Promise<string> {
  const workflow = JSON.parse(readFileSync(opts.workflowFile, "utf-8"));
  for (const [path, value] of Object.entries(opts.patches)) {
    const [nodeId, , field] = path.split(".");
    workflow[nodeId].inputs[field] = value;
  }

  const clientId = randomUUID();
  const ws = new WebSocket(`${BASE.replace("http", "ws")}/ws?clientId=${clientId}`);
  await new Promise((ok) => ws.once("open", ok));

  const res = await fetch(`${BASE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!res.ok) throw new Error(`ComfyUI ${res.status}: ${await res.text()}`);
  const { prompt_id } = (await res.json()) as { prompt_id: string };

  // 等待执行完成: executing 事件里 node=null 且 prompt_id 匹配
  await new Promise<void>((resolve, reject) => {
    ws.on("message", (raw) => {
      if (raw instanceof Buffer && raw[0] !== 0x7b) return; // 跳过预览二进制帧
      const msg = JSON.parse(raw.toString());
      if (msg.type === "executing" && msg.data.node === null && msg.data.prompt_id === prompt_id) resolve();
      if (msg.type === "execution_error" && msg.data.prompt_id === prompt_id)
        reject(new Error(JSON.stringify(msg.data)));
    });
  });
  ws.close();

  // 从 history 找到输出文件并下载
  const hist = (await (await fetch(`${BASE}/history/${prompt_id}`)).json()) as any;
  const outputs = hist[prompt_id].outputs;
  for (const node of Object.values<any>(outputs)) {
    const files = node.gifs ?? node.videos ?? node.images ?? [];
    for (const f of files) {
      if (!/\.(mp4|webm|mov)$/.test(f.filename)) continue;
      const q = new URLSearchParams({ filename: f.filename, subfolder: f.subfolder ?? "", type: f.type });
      const file = await fetch(`${BASE}/view?${q}`);
      writeFileSync(opts.outPath, Buffer.from(await file.arrayBuffer()));
      return opts.outPath;
    }
  }
  throw new Error("工作流完成但未找到视频输出, 检查工作流是否有保存视频节点");
}
