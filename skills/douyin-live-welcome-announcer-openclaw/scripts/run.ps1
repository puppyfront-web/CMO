$ErrorActionPreference = "Stop"

param(
  [string]$LiveUrl = $env:DOUYIN_LIVE_URL
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir = Split-Path -Parent $ScriptDir
$RuntimeDir = Join-Path $SkillDir "runtime"

if ([string]::IsNullOrWhiteSpace($LiveUrl)) {
  throw "必须提供直播间链接，例如：powershell -ExecutionPolicy Bypass -File `"$SkillDir\scripts\run.ps1`" `"https://live.douyin.com/你的直播间`""
}

$Engine = if ($env:DOUYIN_TTS_ENGINE) { $env:DOUYIN_TTS_ENGINE } else { "auto" }
$EdgeVoice = if ($env:DOUYIN_EDGE_VOICE) { $env:DOUYIN_EDGE_VOICE } else { "zh-CN-XiaoxiaoNeural" }
$SayVoice = if ($env:DOUYIN_SAY_VOICE) { $env:DOUYIN_SAY_VOICE } else { "" }
$Template = if ($env:DOUYIN_TEMPLATE) { $env:DOUYIN_TEMPLATE } else { "感谢{nickname}送的{gift}，比心" }

Set-Location $RuntimeDir

npm run watch -- `
  --url $LiveUrl `
  --engine $Engine `
  --edge-voice $EdgeVoice `
  --say-voice $SayVoice `
  --template $Template
