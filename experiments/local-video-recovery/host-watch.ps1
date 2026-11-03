param([Parameter(Mandatory=$true)][string]$OutputPath, [int]$Seconds=30, [string]$SinceUtc='', [string]$RunId='legacy-monitor')
# Read-only host telemetry. Run natively on Windows for independence from WSL.
$ErrorActionPreference='Stop'
if ($Seconds -lt 5 -or $Seconds -gt 300) { throw 'Seconds must be 5..300' }
if (Test-Path -LiteralPath $OutputPath) { throw 'Refuse to overwrite evidence' }
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($OutputPath)) | Out-Null
$streams=@()
foreach($name in @('stdout.log','stderr.log')) {
  $s=[IO.FileStream]::new((Join-Path ([IO.Path]::GetDirectoryName($OutputPath)) $name),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read,4096,[IO.FileOptions]::WriteThrough)
  $w=[IO.StreamWriter]::new($s,[Text.UTF8Encoding]::new($false));$w.AutoFlush=$true
  $streams+=@{file=$s;writer=$w}
}
[Console]::SetOut($streams[0].writer);[Console]::SetError($streams[1].writer)
$file=[IO.FileStream]::new($OutputPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
$writer=[IO.StreamWriter]::new($file,[Text.UTF8Encoding]::new($false))
$start=Get-Date
$logger=Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
$eventStart=$start.AddSeconds(-30)
if ($SinceUtc) { $eventStart=[datetime]::Parse($SinceUtc).ToLocalTime() }
$smi=(Get-Command nvidia-smi.exe -ErrorAction Stop).Source
$statePath=Join-Path ([IO.Path]::GetDirectoryName($OutputPath)) 'host-state.json'
$state=@{runId=$RunId;pid=$PID;startedAt=$start.ToUniversalTime().ToString('o');endedAt=$null;status='RUNNING';params=@{seconds=$Seconds;sinceUtc=$SinceUtc;outputPath=$OutputPath};artifacts=@{telemetry=$OutputPath;stdout=(Join-Path ([IO.Path]::GetDirectoryName($OutputPath)) 'stdout.log');stderr=(Join-Path ([IO.Path]::GetDirectoryName($OutputPath)) 'stderr.log')}}
function Save-State {
  $bytes=[Text.Encoding]::UTF8.GetBytes(($state|ConvertTo-Json -Depth 6))
  $tmp=$statePath+'.tmp'
  $f=[IO.FileStream]::new($tmp,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::Read)
  try {$f.Write($bytes,0,$bytes.Length);$f.Flush($true)} finally {$f.Dispose()}
  if (Test-Path -LiteralPath $statePath) {[IO.File]::Replace($tmp,$statePath,$statePath+'.previous')} else {[IO.File]::Move($tmp,$statePath)}
}
function Save-Events([string]$Name) {
  $errs=$null
  $ev=@(Get-WinEvent -FilterHashtable @{LogName='System';StartTime=$eventStart} -ErrorAction SilentlyContinue -ErrorVariable errs | Where-Object {$_.ProviderName -match 'nvlddmkm|WHEA|WER-SystemErrorReporting' -or ($_.ProviderName -eq 'Display' -and $_.Id -eq 4101) -or ($_.ProviderName -eq 'Microsoft-Windows-Kernel-Power' -and $_.Id -eq 41)} | Select-Object RecordId,Id,ProviderName,@{N='utc';E={$_.TimeCreated.ToUniversalTime().ToString('o')}},@{N='rawXml';E={$_.ToXml()}})
  $r=@{runId=$RunId;utc=(Get-Date).ToUniversalTime().ToString('o');events=$ev;errors=@($errs|Where-Object {$_.FullyQualifiedErrorId -notmatch 'NoMatchingEventsFound'}|ForEach-Object {$_.Exception.Message})}
  $b=[Text.Encoding]::UTF8.GetBytes(($r|ConvertTo-Json -Depth 7))
  $f=[IO.FileStream]::new((Join-Path ([IO.Path]::GetDirectoryName($OutputPath)) $Name),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
  try {$f.Write($b,0,$b.Length);$f.Flush($true)}finally{$f.Dispose()}
}
Save-State
Save-Events 'events-before.json'
try {
  while (((Get-Date)-$start).TotalSeconds -lt $Seconds) {
    $sample=@{runId=$RunId;utc=(Get-Date).ToUniversalTime().ToString('o'); eventSinceUtc=$eventStart.ToUniversalTime().ToString('o'); kind='host'; error=$null; loggerPid=$PID; loggerParentPid=$logger.ParentProcessId; sessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId; metricSupport=@{memoryUsed='SUPPORTED';coreTemperature='SUPPORTED';powerDraw='SUPPORTED';utilization='SUPPORTED';recoveryAction='SUPPORTED';memoryJunctionTemperature='UNAVAILABLE';hotspotTemperature='UNAVAILABLE';pcieErrorCounters='UNAVAILABLE'}}
    try {
      $p=[Diagnostics.Process]::new()
      $p.StartInfo=[Diagnostics.ProcessStartInfo]::new($smi,'--query-gpu=uuid,memory.used,temperature.gpu,power.draw,utilization.gpu,gpu_recovery_action --format=csv,noheader,nounits')
      $p.StartInfo.UseShellExecute=$false; $p.StartInfo.CreateNoWindow=$true
      $p.StartInfo.RedirectStandardOutput=$true; $p.StartInfo.RedirectStandardError=$true
      $p.Start() | Out-Null
      if (!$p.WaitForExit(3000)) { $p.Kill(); throw 'host NVML timeout' }
      if ($p.ExitCode -ne 0) { throw 'host NVML failed' }
      $sample.gpu=$p.StandardOutput.ReadToEnd().Trim()
      $parts=$sample.gpu -split ','
      $keys=@('memoryUsed','coreTemperature','powerDraw','utilization','recoveryAction')
      for($j=0;$j -lt $keys.Count;$j++){if($parts[$j+1].Trim() -match 'N/A|Not Supported'){$sample.metricSupport[$keys[$j]]='UNAVAILABLE'}}
      $sample.memoryJunctionTemperatureC=$null;$sample.hotspotTemperatureC=$null;$sample.pcieErrorCounters=$null
      $eventError=$null
      $events=@(Get-WinEvent -FilterHashtable @{LogName='System';StartTime=$eventStart} -ErrorAction SilentlyContinue -ErrorVariable eventError)
      if ($eventError -and $eventError[0].FullyQualifiedErrorId -notmatch 'NoMatchingEventsFound') { throw $eventError[0] }
      $sample.deviceEvents=@($events | Where-Object {
        $_.ProviderName -match 'nvlddmkm|WHEA|WER-SystemErrorReporting' -or
        ($_.ProviderName -eq 'Display' -and $_.Id -eq 4101) -or
        ($_.ProviderName -eq 'Microsoft-Windows-Kernel-Power' -and $_.Id -eq 41)
      } | Select-Object RecordId,Id,ProviderName,@{N='utc';E={$_.TimeCreated.ToUniversalTime().ToString('o')}},Message,@{N='rawXml';E={$_.ToXml()}})
    } catch { $sample.error=$_.Exception.Message }
    $writer.WriteLine(($sample | ConvertTo-Json -Depth 6 -Compress)); $writer.Flush(); $file.Flush($true)
    [Console]::Out.WriteLine(($sample | ConvertTo-Json -Depth 6 -Compress)); [Console]::Out.Flush()
    if ($sample.error) { [Console]::Error.WriteLine($sample.error); [Console]::Error.Flush() }
    if ($sample.error -or $sample.deviceEvents.Count -gt 0) {
      $state.status='STOP_INCOMPLETE'
      $stopPath=Join-Path ([IO.Path]::GetDirectoryName($OutputPath)) 'STOP.json'
      $stopBytes=[Text.Encoding]::UTF8.GetBytes(($sample|ConvertTo-Json -Depth 7))
      $sf=[IO.FileStream]::new($stopPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
      try {$sf.Write($stopBytes,0,$stopBytes.Length);$sf.Flush($true)}finally{$sf.Dispose()}
      break
    }
    if (Test-Path -LiteralPath (Join-Path ([IO.Path]::GetDirectoryName($OutputPath)) 'stop.request')) {$state.status='NORMAL_STOP';break}
    Start-Sleep -Seconds 2
  }
  if ($state.status -eq 'RUNNING') {$state.status='COMPLETED'}
} catch {$state.status='STOP_INCOMPLETE';$state.error=$_.Exception.Message;[Console]::Error.WriteLine(($_|Out-String));[Console]::Error.Flush();throw}
finally { $state.endedAt=(Get-Date).ToUniversalTime().ToString('o');Save-State;Save-Events 'events-after.json';$writer.Dispose(); $file.Dispose();foreach($stream in $streams){$stream.writer.Flush();$stream.file.Flush($true);$stream.writer.Dispose()} }
