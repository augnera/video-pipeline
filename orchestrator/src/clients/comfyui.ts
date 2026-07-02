import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { serviceFetch } from "./http.js";

const BASE = process.env.COMFYUI_URL ?? "http://localhost:8188";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 执行超时 10 分钟 (F1.3)

/**
 * 工作流的节点 patch 映射配置在 config/workflows.json (F1.3):
 * 1. 在 ComfyUI 网页里跑通工作流 (如 LatentSync 对口型)
 * 2. 设置里开启 Dev Mode -> 用 "Save (API Format)" 导出 JSON 到 workflows/
 * 3. 打开该 JSON, 找到需要每次替换的节点输入 (音频路径/底板视频路径等),
 *    把 "节点ID.inputs.字段名" 填进 config/workflows.json 对应条目的 inputs
 */
interface WorkflowEntry {
  file: string;
  inputs: Record<string, string>; // 逻辑输入名 → "节点ID.inputs.字段名"
  timeoutMs?: number;
}

function loadEntry(name: string): WorkflowEntry {
  const config = JSON.parse(readFileSync("config/workflows.json", "utf-8")) as Record<
    string,
    WorkflowEntry
  >;
  const entry = config[name];
  if (!entry?.file || !entry?.inputs)
    throw new Error(`config/workflows.json 缺少工作流 "${name}" 的完整配置 (file + inputs)`);
  return entry;
}

export async function runWorkflow(opts: {
  workflow: string; // config/workflows.json 中的键, 如 "lipsync"
  inputs: Record<string, unknown>; // 逻辑输入名 → 实际值 (音频/视频路径等)
  outPath: string; // 保存产出视频的本地路径
}): Promise<string> {
  const entry = loadEntry(opts.workflow);
  // 先校验映射配置, 再读工作流文件 —— 让运营者先看到可操作的配置指引
  for (const key of Object.keys(opts.inputs)) {
    const path = entry.inputs[key];
    if (!path)
      throw new Error(`config/workflows.json 工作流 "${opts.workflow}" 未定义输入 "${key}" 的节点映射`);
    if (path.startsWith("TODO"))
      throw new Error(
        `config/workflows.json 工作流 "${opts.workflow}" 的输入 "${key}" 仍是 TODO 占位, 请按 _readme 填入真实节点ID`,
      );
  }
  const workflow = JSON.parse(readFileSync(entry.file, "utf-8"));

  for (const [key, value] of Object.entries(opts.inputs)) {
    const path = entry.inputs[key];
    const [nodeId, , field] = path!.split(".");
    if (!workflow[nodeId]?.inputs || field === undefined)
      throw new Error(`工作流 ${entry.file} 中找不到节点映射 "${path}" (输入 "${key}"), 请核对导出的 JSON`);
    workflow[nodeId].inputs[field] = value;
  }

  const clientId = randomUUID();
  const ws = new WebSocket(`${BASE.replace("http", "ws")}/ws?clientId=${clientId}`);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", (e) =>
      reject(new Error(`ComfyUI WebSocket 无法连接 (${BASE}): ${e.message} —— 请确认该服务已启动`)),
    );
  });

  let prompt_id: string;
  try {
    const res = await serviceFetch("ComfyUI", `${BASE}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });
    ({ prompt_id } = (await res.json()) as { prompt_id: string });

    // 等待执行完成: executing 事件里 node=null 且 prompt_id 匹配; 超时报错 (F1.3)
    const timeoutMs = entry.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`ComfyUI 工作流 "${opts.workflow}" 执行超时 (>${timeoutMs / 60000} 分钟)`)),
        timeoutMs,
      );
      const done = (fn: () => void) => { clearTimeout(timer); fn(); };
      ws.on("message", (raw) => {
        if (raw instanceof Buffer && raw[0] !== 0x7b) return; // 跳过预览二进制帧
        const msg = JSON.parse(raw.toString());
        if (msg.type === "executing" && msg.data.node === null && msg.data.prompt_id === prompt_id)
          done(resolve);
        if (msg.type === "execution_error" && msg.data.prompt_id === prompt_id)
          done(() => reject(new Error(`ComfyUI 工作流执行出错: ${JSON.stringify(msg.data)}`)));
      });
      ws.on("close", () => done(() => reject(new Error("ComfyUI WebSocket 连接中断"))));
    });
  } finally {
    ws.close();
  }

  // 从 history 找到输出文件并下载
  const hist = (await (await serviceFetch("ComfyUI", `${BASE}/history/${prompt_id}`)).json()) as any;
  const outputs = hist[prompt_id].outputs;
  for (const node of Object.values<any>(outputs)) {
    const files = node.gifs ?? node.videos ?? node.images ?? [];
    for (const f of files) {
      if (!/\.(mp4|webm|mov)$/.test(f.filename)) continue;
      const q = new URLSearchParams({ filename: f.filename, subfolder: f.subfolder ?? "", type: f.type });
      const file = await serviceFetch("ComfyUI", `${BASE}/view?${q}`);
      writeFileSync(opts.outPath, Buffer.from(await file.arrayBuffer()));
      return opts.outPath;
    }
  }
  throw new Error("ComfyUI 工作流完成但未找到视频输出, 检查工作流是否有保存视频节点");
}
