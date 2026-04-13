$ErrorActionPreference = "Stop"

param(
  [string]$LiveUrl = $env:DOUYIN_LIVE_URL
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir = Split-Path -Parent $ScriptDir
$RuntimeDir = Join-Path $SkillDir "runtime"

if ([string]::IsNullOrWhiteSpace($LiveUrl)) {
  $LiveUrl = "https://live.douyin.com/"
}

$Engine = if ($env:DOUYIN_TTS_ENGINE) { $env:DOUYIN_TTS_ENGINE } else { "auto" }
$EdgeVoice = if ($env:DOUYIN_EDGE_VOICE) { $env:DOUYIN_EDGE_VOICE } else { "zh-CN-XiaoxiaoNeural" }
$SayVoice = if ($env:DOUYIN_SAY_VOICE) { $env:DOUYIN_SAY_VOICE } else { "" }
$Template = if ($env:DOUYIN_TEMPLATE) { $env:DOUYIN_TEMPLATE } else { "欢迎 {nickname} 来到直播间" }

Set-Location $RuntimeDir

npm run watch -- `
  --url $LiveUrl `
  --engine $Engine `
  --edge-voice $EdgeVoice `
  --say-voice $SayVoice `
  --template $Template
