param([Parameter(Mandatory=$true)][string]$OutputDirectory)
# Best-effort read/copy only; no elevation, ACL, registry or dump settings changes.
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if (Test-Path -LiteralPath $OutputDirectory) { throw 'Refuse to overwrite evidence' }
[IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$result=@{utc=(Get-Date).ToUniversalTime().ToString('o'); paths=@(); exported=@(); errors=@()}
$start=[datetime]'2026-10-27T19:35:00';$end=[datetime]'2026-10-27T20:05:00'
foreach ($dir in @('C:\Windows\LiveKernelReports','C:\Windows\Minidump','C:\ProgramData\Microsoft\Windows\WER\ReportQueue')) {
  $listingErrors=$null
  $files=@(Get-ChildItem -LiteralPath $dir -Recurse -File -ErrorAction SilentlyContinue -ErrorVariable listingErrors)
  $result.paths+=@{path=$dir; files=@($files|Select-Object FullName,Length,LastWriteTime); readErrors=@($listingErrors|ForEach-Object {$_.Exception.Message})}
  foreach ($f in @($files | Where-Object {$_.Extension -eq '.dmp' -and ($_.Name -match '20261027|102726' -or ($_.LastWriteTime -ge $start -and $_.LastWriteTime -le $end))})) {
    try {
      $target=Join-Path $OutputDirectory (([guid]::NewGuid().ToString())+'-'+$f.Name)
      Copy-Item -LiteralPath $f.FullName -Destination $target -ErrorAction Stop
      $result.exported+=@{source=$f.FullName;copy=$target;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash;timeMatchOnly=$true}
    } catch {$result.errors+=$_.Exception.Message}
  }
}
try {
  $f=Get-Item -LiteralPath C:\Windows\MEMORY.DMP -ErrorAction Stop
  $result.memoryDump=@{path=$f.FullName;length=$f.Length;lastWrite=$f.LastWriteTime}
  if ($f.LastWriteTime -ge $start -and $f.LastWriteTime -le $end) {
    $target=Join-Path $OutputDirectory 'MEMORY.DMP';Copy-Item -LiteralPath $f.FullName -Destination $target
    $result.exported+=@{source=$f.FullName;copy=$target;sha256=(Get-FileHash $target -Algorithm SHA256).Hash;timeMatchOnly=$true}
  }
} catch {$result.memoryDumpError=$_.Exception.Message}
foreach ($log in @('System','Application')) {
  try {
    $events=@(Get-WinEvent -FilterHashtable @{LogName=$log;StartTime=$start;EndTime=$end} -ErrorAction Stop | Where-Object {$_.ProviderName -match 'nvlddmkm|WHEA|Windows Error Reporting|WER-SystemErrorReporting|Kernel-Power|Display'})
    $events|ForEach-Object {$_.ToXml()}|Set-Content -LiteralPath (Join-Path $OutputDirectory ($log+'-incident.xml.txt')) -Encoding UTF8
    $result[$log+'Events']=$events.Count
  } catch {$result.errors+=$_.Exception.Message}
}
$result.status=if ($result.exported.Count -gt 0) {'DUMP_CANDIDATES_EXPORTED_NOT_DIAGNOSED'} else {'NO_INCIDENT_DUMP_OBTAINED'}
$json=$result|ConvertTo-Json -Depth 7
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'export-result.json'),$json,[Text.UTF8Encoding]::new($false))
$json
