# Native Windows loopback transport only. All tools are implemented by the existing downloader.
param([ValidateRange(1,65535)][int]$Port=2022)
$ErrorActionPreference='Stop'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$sessionId=$null
$protocolVersion=$null
while($null -ne ($line=[Console]::ReadLine())) {
    if([string]::IsNullOrWhiteSpace($line)){continue}
    $rpc=$null
    try {
        $rpc=$line | ConvertFrom-Json
        if($rpc.jsonrpc -ne '2.0' -or !$rpc.method){throw 'Invalid JSON-RPC request'}
        $request=[Net.HttpWebRequest]::Create("http://127.0.0.1:$Port/mcp")
        $request.Proxy=$null # This request only; no system or user proxy configuration changes.
        $request.Method='POST'
        $request.ContentType='application/json'
        $request.Accept='application/json, text/event-stream'
        $request.Timeout=660000
        $request.ReadWriteTimeout=660000
        if($sessionId){$request.Headers['Mcp-Session-Id']=$sessionId}
        if($protocolVersion){$request.Headers['MCP-Protocol-Version']=$protocolVersion}
        $bytes=[Text.Encoding]::UTF8.GetBytes($line)
        $request.ContentLength=$bytes.Length
        $stream=$request.GetRequestStream();try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
        $response=$request.GetResponse()
        try {
            if($response.Headers['Mcp-Session-Id']){$sessionId=$response.Headers['Mcp-Session-Id']}
            if($response.StatusCode -eq 202 -or $response.StatusCode -eq 204){continue}
            if($response.ContentType -notlike 'application/json*'){throw 'Unsupported response type; expected downloader stateless JSON MCP. Do not claim SSE compatibility.'}
            $reader=[IO.StreamReader]::new($response.GetResponseStream(),[Text.Encoding]::UTF8)
            try{$body=$reader.ReadToEnd()}finally{$reader.Dispose()}
            $parsed=$body | ConvertFrom-Json
            if($rpc.method -eq 'initialize' -and $parsed.result.protocolVersion){$protocolVersion=$parsed.result.protocolVersion}
            [Console]::WriteLine(($parsed | ConvertTo-Json -Depth 100 -Compress));[Console]::Out.Flush()
        } finally {$response.Dispose()}
    } catch {
        # Do not print upstream body/config/token values. Keep stdout JSON-RPC only.
        $code=$null
        if($_.Exception.Response){$code=[int]$_.Exception.Response.StatusCode}
        [Console]::Error.WriteLine("wx_channels native loopback MCP unavailable; HTTP=$code; type=$($_.Exception.GetType().Name). Start downloader and enable MCP; no retry performed.")
        if($rpc -and $rpc.PSObject.Properties['id']){
            [Console]::WriteLine((@{jsonrpc='2.0';id=$rpc.id;error=@{code=-32001;message='Windows downloader MCP unavailable or incompatible';data=@{httpStatus=$code;port=$Port}}} | ConvertTo-Json -Depth 8 -Compress));[Console]::Out.Flush()
        }
    }
}
