# Generate enterprise CXO briefing video: TTS narration + Chrome slide capture + ffmpeg compose

function Format-SrtTime([double]$seconds) {
  $ts = [TimeSpan]::FromSeconds($seconds)
  return "{0:D2}:{1:D2}:{2:D2},{3:D3}" -f $ts.Hours, $ts.Minutes, $ts.Seconds, $ts.Milliseconds
}

function Invoke-Quiet([scriptblock]$Command) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & $Command 2>&1 | Out-Null
  $ErrorActionPreference = $prev
}

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SlideDir = Join-Path $Root "slides"
$Out = Join-Path $Root "output"
$Tmp = Join-Path $Out "tmp"
$Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Ffmpeg = (Get-Command ffmpeg).Source
$Ffprobe = (Get-Command ffprobe).Source

if (-not (Test-Path $Chrome)) {
  $Chrome = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path $Chrome)) { throw "Chrome or Edge required for slide capture" }

Remove-Item $Out -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $Tmp -Force | Out-Null

Add-Type -AssemblyName System.Speech

$script = Get-Content (Join-Path $Root "script.json") -Raw | ConvertFrom-Json
$segments = @()
$srtLines = @()
$srtIndex = 1
$timeOffset = 0.0

Write-Host "=== Step 1: Narration + slide capture ===" -ForegroundColor Cyan

foreach ($seg in $script) {
  $id = $seg.id
  $wavPath = Join-Path $Tmp "$id.wav"
  $htmlPath = Join-Path $SlideDir "$id.html"
  $pngPath = Join-Path $Tmp "$id.png"

  if (-not (Test-Path $htmlPath)) { throw "Missing slide: $htmlPath" }

  Write-Host "  $id"

  $tts = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $tts.SelectVoice("Microsoft Zira Desktop")
  $tts.Rate = 1
  $tts.SetOutputToWaveFile($wavPath)
  $tts.Speak($seg.narration)
  $tts.Dispose()

  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $durRaw = & $Ffprobe -v error -show_entries format=duration -of csv=p=0 $wavPath 2>$null
  $ErrorActionPreference = $prevEap
  $duration = [double]$durRaw
  if ($duration -lt 1) { $duration = [double]$seg.duration_hint }

  $fileUrl = "file:///" + ($htmlPath -replace '\\', '/')
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & $Chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1080 `
    --screenshot="$pngPath" $fileUrl 2>&1 | Out-Null
  $ErrorActionPreference = $prevEap
  Start-Sleep -Milliseconds 600

  if (-not (Test-Path $pngPath)) { throw "PNG capture failed: $id" }

  $startTs = Format-SrtTime $timeOffset
  $endTs = Format-SrtTime ($timeOffset + $duration)
  $caption = ($seg.caption -split '\|') -join "`n"
  $srtLines += "$srtIndex", "$startTs --> $endTs", $caption, ""
  $srtIndex++

  $segments += [PSCustomObject]@{ Wav = $wavPath; Png = $pngPath; Duration = $duration }
  $timeOffset += $duration + 0.4
}

Write-Host "=== Step 2: Compose clips ===" -ForegroundColor Cyan
$clipPaths = @()
for ($i = 0; $i -lt $segments.Count; $i++) {
  $seg = $segments[$i]
  $clipPath = Join-Path $Tmp ("clip_{0:D2}.mp4" -f $i)
  $dur = $seg.Duration + 0.35
  $fadeOut = [math]::Max(0.1, $dur - 0.4)
  Invoke-Quiet { & $Ffmpeg -y -loop 1 -i $seg.Png -i $seg.Wav -c:v libx264 -tune stillimage -pix_fmt yuv420p `
    -c:a aac -b:a 192k -t $dur -shortest `
    -vf "scale=1920:1080,fade=t=in:st=0:d=0.3,fade=t=out:st=${fadeOut}:d=0.35" $clipPath }
  if (-not (Test-Path $clipPath)) { throw "Clip compose failed: clip_$i" }
  $clipPaths += $clipPath
}

$concatFile = Join-Path $Tmp "concat.txt"
$clipPaths | ForEach-Object { "file '$($_.Replace('\','/'))'" } | Set-Content $concatFile -Encoding ASCII
$rawVideo = Join-Path $Out "VCPCORE-CXO-E2E-Raw.mp4"
Invoke-Quiet { & $Ffmpeg -y -f concat -safe 0 -i $concatFile -c copy $rawVideo }
if (-not (Test-Path $rawVideo)) { throw "Concat failed" }

Write-Host "=== Step 3: Burn captions ===" -ForegroundColor Cyan
$srtPath = Join-Path $Out "captions.srt"
[System.IO.File]::WriteAllText($srtPath, ($srtLines -join "`r`n"), [System.Text.UTF8Encoding]::new($true))
$finalVideo = Join-Path $Out "VCPCORE-CXO-E2E-Briefing.mp4"
$srtEsc = $srtPath -replace '\\', '/' -replace ':', '\:'
Invoke-Quiet { & $Ffmpeg -y -i $rawVideo -vf "subtitles='$srtEsc':force_style='FontName=Segoe UI,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00101828,Outline=2,Shadow=1,MarginV=42,Alignment=2'" -c:a copy $finalVideo }
if (-not (Test-Path $finalVideo)) { throw "Caption burn failed" }

Write-Host ""
Write-Host "DONE: $finalVideo (~$([math]::Round($timeOffset,0))s)" -ForegroundColor Green
