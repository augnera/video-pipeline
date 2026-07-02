/**
 * 各服务客户端共用的 fetch 包装:
 * - 网络层失败 (服务未启动/端口不通) 时, 错误信息明确指出是哪个服务、哪个地址 (验收 A2)
 * - HTTP 非 2xx 时带上服务名、状态码和响应体
 */
export async function serviceFetch(
  service: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const cause = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e);
    throw new Error(`${service} 无法连接 (${url}): ${cause} —— 请确认该服务已启动`);
  }
  if (!res.ok) {
    throw new Error(`${service} 返回 ${res.status} (${url}): ${(await res.text()).slice(0, 500)}`);
  }
  return res;
}
