# 微信视频号下载工具接入｜2026-11-02

## 结果

最新进展：已找到用户新放置的Windows EXE，实际验证 **260907/x64、原生stdio MCP初始化及36项工具列表**；Codex已改为直接调用官方EXE。**最新只读复查：主服务已运行，2022 API及MCP状态工具均响应；视频号页面available=false。系统代理当前由365vpn的57777接管，未自动调整。** 初次提供短路径不存在的证据保留；下面初始准备记录中“构建未定位/工具未验证”为当时事实，现以末尾追加进展为准。

持有人已提供新的完整路径，路径阻断解除；现等待持有人手动启动Windows主服务并登录微信/打开视频号页面。不会自动下载，仍须等待真实单条链接。

## 仓库及上游

- VideoPipeline：`/home/chen/work/video-pipeline`，main，HEAD `cc562624f8d36cf06fde9e373e72e5451e973ce1`；本地origin/main同HEAD，未推送提交0，未fetch不能代表远端服务器最新状态。既有未提交GPU/素材库/生产修改全部保留，未提交/推送。
- 下载器克隆到 `/home/chen/work/tools/wx_channels_download`（此前目录不存在），main，固定HEAD `124f044235bc706fe796c043a14ff442a150ae5d`，提交时间2026-09-15T10:06:02+08:00。源码工作区干净，无适用的额外AGENTS.md；已读VideoPipeline AGENTS/PROGRESS及上游README/LICENSE、MCP/API/配置/实际代码。
- 上游源码`main.go` AppVer为260907；网站列出v260830发布说明。**两者都不是用户构建包的已验证版本**。当前许可证为MIT加Commons Clause（不是纯MIT）；仅本地接线未复制业务实现、未建设对外收费下载服务。
- 读取实际`internal/api/routes.go`、`handler_mcp.go`、`internal/services/mcp.go`、`internal/mcpserver/http.go/protocol.go/tools.go/data_tools.go`、`cmd/mcp.go`及application配置：默认API `127.0.0.1:2022`，内置MCP默认关闭、开启只对当前进程生效，重启关闭。源码存在 `/api/mcp/status`、`/api/mcp/enable`、`/mcp`；也提供 `mcp --api-base-url`原生stdio子命令。
- 单链接相关源码工具为get_wxchannels_status、fetch_content、download_content、get_download_task_detail。download_content默认创建启动即返回，需要wait_for_completion并核查实物；工具支持download_dir/重复策略。上述仅源码能力，不把它计为构建实测。

## WSL/Windows连通性

- 运行时`wslinfo --networking-mode=nat`，Windows.wslconfig也是networkingMode=nat、autoProxy=false、firewall=true。WSL网关172.23.208.1，非mirror假设。
- WSL无代理本地探测127.0.0.1:2022连接拒绝，网关2022超时；Windows Get-NetTCPConnection未观察到2022监听，下载器/微信相关进程筛选未观察到运行结果。不能据此断言NAT或防火墙就是根因，服务本身未运行已足以阻断当前握手。
- Native Windows MCP probe真实执行返回JSON-RPC -32001、httpStatus=null，工具列表为空；`initial-native-probe/`保留完整连接结果和stderr。未模拟工具列表成功、未试造下载任务、无自动重试/后台轮询。
- 为避免开放服务：用Windows原生PowerShell作为stdio传输桥，只转发到Windows回环2022/mcp；WSL不需要访问Windows绑定LAN的地址。未启动第二HTTP监听器，未改WSL模式、代理、证书或防火墙，未启动下载器。该桥不是新下载器；所有工具由原程序处理。
- 桥支持当前源码中明确的JSON无状态HTTP响应，保留Mcp-Session-Id/协商版本，不宣称所有新旧构建/SSE均已验证。没有合适MCP时再查匹配构建已有HTTP API，不凭main臆造后备接口。

## 已完成的本地配置

- 使用OpenAI Docs技能核实Codex MCP接入；实际CLI0.166.0，`codex mcp add/get`存在。
- `~/.codex/config.toml`已私有备份（mode600）后通过CLI新增wx_channels，原配置逐项对比不变；没有覆盖其他MCP、模型或项目设置。
- 当前entry为stdio，Windows PowerShell启动 `C:\Users\admin\video-tools\wx-channels\mcp-http-stdio.ps1`；其内部使用官方HTTP MCP端点。与直接`url=http://127.0.0.1:2022/mcp`区别是发起HTTP的位置在Windows，不把NAT的WSL回环误当Windows回环。
- 默认enabled_tools仅保留单条所需6项，未默认开放删除/覆盖全局配置/批量账号和浏览记录/远端部署Worker等工具。当前只有配置注册成功，runtime工具列表未成功。
- Windows下载目录`C:\Users\admin\Downloads\wx-channels`已创建，WSL路径`/mnt/c/Users/admin/Downloads/wx-channels`通过临时标识文件写读、随后仅删除本次标识。应用全局下载目录**未修改/未证实**；未来在实际schema核实后传单任务目录。
- 已有`/usr/bin/ffprobe`，新增只读verify-file入口检查文件、字节数、哈希和媒体参数。对不存在文件的实际负向检查必须失败，不会写成功报告。

## 验证证据

证据目录：`orchestrator/output/wx-channels-setup-20261102/`（本地产物不入Git）。

- preflight.json：源码版本、网络模式、WSL访问及未定位构建事实。
- windows-readonly-check.json：PowerShell脚本语法解析无错误、提供路径不存在、下载目录存在及监听状态。
- initial-native-probe/：真实原生Windows请求失败，tools=[]，downloadAttempted=false。
- codex-config-before-summary.json：私有备份地址及旧MCP名称，不含凭据或配置全文。
- 配置存在、私有备份、Windows脚本副本SHA一致和语法解析通过不等于MCP工具已可用。

未更改生产默认视频链路、素材审核/许可、任何GPU STOP、驱动/模型；未新装Python/npm依赖，未重渲染视频。

## 待持有人操作及下一步

1. 给出本机真实EXE路径：资源管理器选中已解压程序→Shift+右键→复制为路径。收到后检查PE x64、SHA、构建版本和实际命令，再对照固定版本，不自动升级/启动第二下载器。
2. 使用该程序前按其官方说明手动管理员启动；注意首次启动可能安装根证书/设置代理。本轮没有授权盲目覆盖已有代理，因此未代为运行根启动命令。具体启动风险与当前构建先核实，遇到冲突准确报告。
3. 如该构建支持网页MCP：Windows打开 `http://127.0.0.1:2022/` →左下角设置→MCP→启用。保持程序运行；登录Windows微信并打开视频号页面。若没有对应菜单/端口，请反馈实际页面及构建版本，不直接套用main文档。
4. 重跑只读probe验证initialize和tools/list，读取实际schema/版本；需要时重新打开Codex会话加载新增服务器。先做状态检查，不下载。
5. 等待用户发真实单条分享链接；下载后查任务详情并执行verify-file确认非空/可读/时长与音视频流，返回Windows及WSL绝对路径。任务创建不算成功。不批量下载、不自动发布/入正式素材库。

具体命令和恢复说明：[接线README](../../orchestrator/tools/wx-channels/README.md)。

官方来源（2026-11-02核查）：[仓库README](https://github.com/ltaoo/wx_channels_download)、[MCP说明](https://ltaoo.github.io/wx_channels_download/feature/mcp.html)、[MCP启用](https://ltaoo.github.io/wx_channels_download/feature/mcp/enable.html)、[Codex MCP](https://developers.openai.com/codex/mcp)。当前报告明确区分文档/源码能力与未完成的构建及实际服务验证。


## 追加：新路径实际构建与原生MCP验证

- 用户新路径 `F:\工具\wx_video_download_v260907_windows_x86_64\wx_video_download.exe` 对应WSL `/mnt/f/工具/wx_video_download_v260907_windows_x86_64/wx_video_download.exe`，存在、14,797,824字节，PE machine0x8664；SHA-256 `26a99c72dc1873982671426af2b60a20ceef9f7bb31e47fb7db42f94de45a818`。仅核验本地文件摘要，不冒称与发布方签名/官方校验值比对通过。
- 实际执行该包`version`返回260907；`mcp --help`确认存在`--api-base-url`和`--standalone`。二进制为打包文件，字符串探测未命中不能证明缺少功能；以实际运行结果为准。
- 不启动根命令/代理/证书服务、不使用standalone。通过该Windows EXE的`mcp --api-base-url http://127.0.0.1:2022`完成实际initialize→notifications/initialized→tools/list，返回dm/260907与36项工具。此次实际版本与源码版本号一致，不因此断言与main每项实现完全相同。
- 所需6工具及其实际schema已独立保存`actual-build-capabilities.json`：get_config/get_platform_status/get_wxchannels_status/fetch_content/download_content/get_download_task_detail。download_dir、job_id、wait_for_completion及existing_action=skip已验证。全库还包含其他平台/批量/删除/配置修改工具，默认enabled_tools未开放。
- 最初批量发请求后关闭stdin的状态调用出现context canceled，这是探针结束导致的取消，不作为服务根因。探针已按源码EOF行为改为顺序等待并在最后响应后关闭stdin；同一二进制只读状态调用真实返回Windows TCP2022主动拒绝。日志分别保留，未把取消与连接拒绝混淆，未创建任何下载任务。
- 真实证据：build-version-help.stdout.txt、build-native-stdio.stdout.jsonl、build-validation.json、native-backend-status.stdout.jsonl（早期取消）、native-serial-probe/mcp-responses.json及connection-result.json（顺序复检）。工具成功与backendReady=false分别记录。
- Codex wx_channels现在直接启动Windows原生EXE，args=[mcp,--api-base-url,http://127.0.0.1:2022]；再次私有备份并校验其他配置不变。WSL只负责启动Windows进程，其API请求发生在Windows本机，绕开NAT回环差异；无需自写HTTP桥/额外监听/防火墙或代理修改。先前PS桥保留为未使用的历史备用，生产配置不再依赖。
- 当前包config.yaml明确api.hostname=127.0.0.1/api.port=2022、download.dir=%UserDownloads%、proxy.system=true。未打印其他敏感配置，未修改原配置；下载仍拟使用每任务显式目录C:\Users\admin\Downloads\wx-channels，不用全局重启来改目录。
- 已提示持有人在新目录右键EXE“以管理员身份运行”，保持窗口，再登录Windows微信/打开视频号页面；启动可能安装证书/切换系统代理，遇冲突反馈而不是自动覆盖。**当前原生stdio模式不要求开启网页MCP开关**；网页设置→MCP仅HTTP接入需要。
- 当前完成：已核实构建与协议/工具接入；未完成：Windows API主服务/视频号页面可用和真实单条下载。未加载GPU/模型、未自动开始主服务、未下载/批量/发布。


## 追加：持有人启动后，API已通但系统代理冲突

- 用户启动日志显示API2022/代理2023启动、证书安装、设置系统代理，随后出现“System proxy has been modified, please restart the downloader”。此处证书/代理动作由持有人手动启动触发，本助手未修改系统配置。
- 再次只读实测：Windows下载器PID4356仍在运行，127.0.0.1:2022和2023均由其监听。原生MCP get_wxchannels_status正常返回structuredContent.available=false、isError=false：API后端已可达，未连接微信视频号页面。没有下载尝试。
- Windows Internet Settings当前ProxyEnable=1、ProxyServer=127.0.0.1:57777、无AutoConfigURL；57777监听PID31708/Process=365vpn。不是因为观察到clash-verge-service就归咎Clash。本次准确确定的是系统代理目前指向365vpn，而非下载器2023；未读取/输出账户、订阅、凭据或无关进程参数。
- 固定源码`internal/application/start.go`约445–480行每10秒比较当前代理与期望地址，不一致就打印该提示；该分支本身不退出服务器。因此提示不等于MCP故障或程序崩溃。无法单凭本次快照证明某个进程写注册表的准确时间，但当前代理归属及冲突明确。
- 证据：after-holder-start/connection-result.json及mcp-responses.json；proxy-conflict-readonly.json。原先API拒绝的历史证据保留，validation最新区分apiReachable=true、backendReady=false（页面未就绪）。
- 已询问持有人是否需要保留365vpn。未经选择不自动关VPN、改系统代理、重启下载器或新增转发/TUN。上游docs/config/proxy.md提供Clash配合规则，但本机当前代理进程为365vpn，不能直接假设该软件支持Clash全局脚本。若需共存先核实365vpn实际分流/上游能力，若允许暂时停用由持有人明确切换；不反复用重启抢系统代理。


## 追加：365vpn必须保留——只读共存评估

持有人明确选择“需要保留，先检查能否共存”。本轮只核查，不修改现有代理/VPN/微信、下载器配置，不停止进程、不安装工具/驱动、不下载视频。

- 实际365vpn路径F:\365VPN\365vpn.exe；系统代理继续保留127.0.0.1:57777。UI Automation仅只读观察其窗口控件，未触发操作，未得到可用的设置按钮标签。
- 阅读其已安装的静态前端JS（不是账号配置、订阅、Cookie或私有数据库）。自定义规则表单可匹配domain/dest_ip，动作选项仅direct/select。没有在该表单观察到任意本地HTTP host/port转发能力；这不证明隐藏后端/其他版本绝无此功能，也不能据此擅自调用私有接口改规则。
- 不能把域名设direct当成转发到下载器；添加上游proxy.upstreamProxy也只影响下载器收到请求后的出口，在系统代理仍为57777时不能自动引入微信流量。把全系统改到2023再链到365vpn会改变现有代理，当前未采用。
- 官方Clash共存方案需要Clash规则转到2023，365vpn当前配置界面不是该接口。来源：https://ltaoo.github.io/wx_channels_download/config/proxy.html 。该文档还提示TUN与其他VPN可有路由冲突，本轮不启用。
- 固定源码SunnyNet分支有OpenDrive/WeChatAppEx.exe进程代理，但涉及不同构建与驱动。核查v260907官方release API仅见普通/safe Windows资产，没有已明确命名的SunnyNet发行包；不将safe擅自等同SunnyNet，也未下载、换包或装驱动。查询不带v的tag先404，正确v260907元数据已保留，非下载失败重试。
- 结论：API/MCP已通，但在保持365vpn现状的约束下，**尚无已验证的微信流量→2023接线**，不可声称共存已完成，也不声称原则上不可能。后续最小信息是微信实际“网络/代理”设置界面是否存在单应用配置；如有再评估仅微信指向下载器，不碰其他应用。若没有，需另行审查按进程代理方案，当前不安装新驱动或重写下载器。
- 证据coexistence-readonly-assessment.json保留静态文件SHA、表单字段、UI无操作及评估限制；没有复制整个VPN应用或泄露凭据。用户当前无需关VPN或反复重启下载器。状态仍为等待微信页面流量接通，下载任务0。
