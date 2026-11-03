# 微信视频号：Windows MCP接线

目标仅为单条用户链接→现成Windows下载器→返回本地文件。无新的下载器、代理、素材后台或GPU依赖。

当前配置已使用官方Windows EXE原生stdio MCP，构建260907/x64及36项实际工具列表已验证；Windows主服务尚未启动，视频号页面状态/真实下载尚未通过。详细事实见 `docs/reports/Wx-Channels-MCP-Integration-20261102.md`。

## Windows手动操作

1. 已核实程序路径：`F:\工具\wx_video_download_v260907_windows_x86_64\wx_video_download.exe`，版本260907，PE x64。此前短路径不存在是历史事实；本次完整新路径存在。
2. 在该目录右键EXE→“以管理员身份运行”，保持程序窗口。官方README说明首次启动可能安装根证书、切换系统代理；当前包`proxy.system=true`。本次未代为启动主程序或覆盖已有代理，遇到冲突请反馈，不关闭防火墙。
3. 当前默认使用**该程序原生stdio MCP**，通过Windows本机API2022工作，不需要开启网页HTTP MCP开关。网页`http://127.0.0.1:2022/`→设置→MCP开关只针对HTTP MCP接入，非stdio前提；重启后该HTTP开关默认关闭。
4. 登录Windows微信，保持一个视频号页面打开；`get_wxchannels_status.available=true`才表示页面可用。本次后端实测TCP连接拒绝，尚未到微信页面连接校验。

## 接入/复查命令（WSL仓库根目录）

```bash
codex mcp get wx_channels
python3 orchestrator/tools/wx-channels/check.py probe --check-status --out orchestrator/output/wx-channels-check-next
```

probe只调用initialize/notifications/initialized/tools/list，不请求下载，不采集聊天/账号/浏览记录。JSON返回保存在输出目录；返回BLOCKED时工具未验证，不以配置成功视为连通成功。

本机为WSL NAT，Codex注册为直接启动官方Windows EXE：

```toml
[mcp_servers.wx_channels]
command = "/mnt/f/工具/wx_video_download_v260907_windows_x86_64/wx_video_download.exe"
args = ["mcp", "--api-base-url", "http://127.0.0.1:2022"]
```

该子进程是Windows程序，请求其Windows回环API，不依赖WSL到Windows的localhost互通，不开端口、不改网络模式或代理设置。原生MCP子命令仅连接主服务，**不传--standalone、不自行启动另一套服务**。普通HTTP MCP端点仍为2022/mcp，可选但未启用验证，不用WSL的127.0.0.1冒充Windows回环。

之前准备的`mcp-http-stdio.ps1`及Windows副本仅保留历史/可选回退，当前Codex不调用它。check.py默认native模式；显式`--transport http-relay`才使用旧桥。原生模式不需要PowerShell执行策略Bypass。

当前真实二进制已完成initialize、tools/list，serverInfo=dm/260907，共36项工具。实际校验的默认允许6项为`get_wxchannels_status/get_platform_status/get_config/fetch_content/download_content/get_download_task_detail`。全量列表包含删除/配置修改/批量或其他平台工具，但没有默认开放这些工具。schema核验确认download_dir、wait_for_completion及existing_action=skip存在。

probe逐条发送并等待响应，保持stdin打开直到最后一个请求结束；否则原程序EOF会取消正在进行的API请求，不能把context canceled误认成服务错误。实际顺序probe已取得Windows连接2022主动拒绝的原始错误。命令返回CONNECTED_TOOLS_VERIFIED仅表示协议/工具列表；另看backendReady及backendStatusResponse，不能当作已能下载。输出缺少JSON响应或超时会失败，不伪造工具结果。

## 下载目录及未来单条验收

- Windows：`C:\Users\admin\Downloads\wx-channels`
- WSL：`/mnt/c/Users/admin/Downloads/wx-channels`

目录已创建并读写验证。**未改应用全局download.dir**；实际260907工具schema已核实download_dir参数；后续对单条download_content显式传该Windows绝对目录。无需为改全局目录重启/重设应用配置。

收到真实链接后：status→fetch_content→复用job_id→download_content，使用 `existing_action=skip`、`wait_for_completion=true`（以运行构建实际schema为准），再检查任务详情/实际文件。不得用任务创建或MCP返回成功替代文件检查，不自动批量下载。

```bash
python3 orchestrator/tools/wx-channels/check.py verify-file \
  --windows-path 'C:\Users\admin\Downloads\wx-channels\实际文件名.mp4' \
  --out orchestrator/output/wx-channels-single-file-check.json
```

verify-file确认存在、非空、可读取，计算SHA-256并用已有ffprobe读取时长/分辨率/音视频流；不是完整解码质量或公开素材授权。下载来源、版权及选取由后续任务另行记录，不直接自动晋升正式素材。

## 维护及恢复

Codex原配置已备份在 `~/.codex/backups/config.before-wx-channels-*.toml`，摘要见本次输出`codex-config-before-summary.json`。不打印/提交配置全文；本次仅新增wx_channels，既有条目逐项保留。撤销接入可用 `codex mcp remove wx_channels`，勿用备份整体覆盖后续其他修改。

当前会话未必能热加载新增MCP；真实probe通过后，如会话工具列表仍无wx_channels，重新打开Codex会话再查看。手动重新连接不等同于已验证真实下载。
