import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 全链路日志 (F1.6): 每步开始/结束/耗时 → 控制台 + output/<id>/pipeline.log。
 * logFile 省略时只输出控制台 (用于分配 id 之前的脚本生成阶段)。
 */
export interface Logger {
  info(msg: string): void;
  error(msg: string): void;
  /** 包裹一个流水线环节: 记录开始/结束/耗时, 失败时记录环节名后原样抛出 */
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export function createLogger(logFile?: string): Logger {
  if (logFile) mkdirSync(dirname(logFile), { recursive: true });

  const write = (level: "INFO" | "ERROR", msg: string) => {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    (level === "ERROR" ? console.error : console.log)(line);
    if (logFile) appendFileSync(logFile, line + "\n");
  };

  return {
    info: (msg) => write("INFO", msg),
    error: (msg) => write("ERROR", msg),
    async step(name, fn) {
      const t0 = Date.now();
      const secs = () => ((Date.now() - t0) / 1000).toFixed(1);
      write("INFO", `▶ ${name} 开始`);
      try {
        const result = await fn();
        write("INFO", `✔ ${name} 完成, 耗时 ${secs()}s`);
        return result;
      } catch (e) {
        write("ERROR", `✘ ${name} 失败, 耗时 ${secs()}s: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
      }
    },
  };
}
