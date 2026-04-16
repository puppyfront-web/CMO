# OpenClaw 安装说明

这个 skill 用于在 `macOS` 或 `Windows` 上监听抖音直播间网页，在直播过程中播报礼物，并在直播结束后自动输出评论区潜在客户分析结果。

适用场景：

- 用手机开播
- 用 Mac 或 Windows 电脑打开抖音直播间网页
- 用 OpenClaw 调起这个 skill 做礼物播报和直播后潜客分析

## 前置要求

- `macOS` 或 `Windows`
- 已安装 `node`、`npm`、`python3`
- 可以正常打开抖音直播间网页

## 安装步骤

1. 把整个 skill 文件夹放到你的 OpenClaw 工作区 `skills/` 目录下：

```bash
skills/douyin-live-welcome-announcer-openclaw
```

2. 在 OpenClaw 工作区根目录执行：

macOS:

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
bash "$SKILL_DIR/scripts/setup.sh"
```

Windows PowerShell:

```powershell
$skillDir = "$PWD\skills\douyin-live-welcome-announcer-openclaw"
powershell -ExecutionPolicy Bypass -File "$skillDir\scripts\setup.ps1"
```

这一步会自动完成：

- 安装 Node 依赖
- 安装 Playwright Chromium
- 创建 `edge-tts` 专用虚拟环境
- 安装 `edge-tts`

## 启动方式

1. 运行：

macOS:

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "https://你的直播间链接"
```

Windows PowerShell:

```powershell
$skillDir = "$PWD\skills\douyin-live-welcome-announcer-openclaw"
powershell -ExecutionPolicy Bypass -File "$skillDir\scripts\run.ps1" "https://你的直播间链接"
```

必须传入你自己的真实直播间链接；不提供链接时，程序不会启动。

2. 等待浏览器打开后，登录抖音账号。

3. 程序会直接打开并只监控你提供的这个直播间页面；如果页面偏离这个链接，对应文本会被忽略。
4. 直播结束后，程序会在本地会话目录里输出评论采集和潜客分析结果。

## 直播后输出

每次直播结束后，会在本地生成一份会话目录，默认位于：

```bash
~/.douyin-live-welcome/sessions/
```

其中包含：

- `session.json`：本场直播会话元信息
- `events.jsonl`：原始互动事件流
- `users.json`：用户聚合结果
- `leads.json`：潜在客户名单
- `report.md`：可直接阅读的分析报告

## 重要提醒

打开直播间网页后，**一定要把网页本身的声音关闭或静音**。

原因：

- 网页直播声音会和礼物播报同时外放
- 容易出现回声、重叠、啸叫
- 会影响你判断礼物播报是否正常工作

建议做法：

1. 打开直播间页面后，先把网页播放器静音。
2. 只保留这个 skill 的礼物播报声音。

## 推荐配置

默认已经启用：

- `edge-tts` 优先
- 系统本地语音自动兜底
- 数字昵称按位播报

### 选择更好听的声音

如果你想先试听不同音色，再决定用哪一个 `edge-tts` 声音，建议先访问：

- [tts.wangwangit.com](http://tts.wangwangit.com/)

这个页面可以直接试听不同声音、语速和音高。你选好后，再把对应音色名称填到启动参数里，例如：

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
DOUYIN_EDGE_VOICE="zh-CN-XiaoxiaoNeural" \
bash "$SKILL_DIR/scripts/run.sh" "https://你的直播间链接"
```

常见可选中文声音包括：

- `zh-CN-XiaoxiaoNeural`
- `zh-CN-YunxiNeural`
- `zh-CN-YunyangNeural`
- `zh-CN-XiaoyiNeural`

例如：

- `小石头73337`

会读成：

- `小石头 7 3 3 3 7`

## 保底方案

如果 `edge-tts` 因为网络、依赖或接口波动暂时不可用，这个 skill 会自动回退到系统本地播报。

这意味着：

- 不会因为 `edge-tts` 短时失败就完全没声音
- 保底仍然走你系统当前默认输出设备
- Windows 下保底使用 PowerShell / System.Speech
- macOS 下保底使用系统 `say`
- 只要系统声卡和扬声器正常，礼物播报就还能继续工作

## 常用控制

启动后可在终端中输入：

- `p`：暂停播报
- `r`：恢复播报
- `s`：查看当前状态
- `q`：退出

## 常见问题

### 1. 打开网页后没有播报

先检查：

- 是否打开的是你自己的真实直播间页面
- 是否已经有用户真实进房
- 网页里是否能看到类似 `某某来了`

### 2. 能抓到用户但没有声音

先检查：

- 系统输出设备是否正常
- 系统音量是否打开
- 是否把礼物播报也一起静音了

### 3. 浏览器打开失败

可能是上一次残留的浏览器 profile 还在占用，可以先关闭旧的监听进程后再重启。

## OpenClaw 中的触发示例

你可以对 OpenClaw 说：

```text
用 douyin_live_welcome_announcer 帮我启动抖音直播间礼物播报
```

或者：

```text
帮我运行抖音直播礼物播报 skill，并监听我的直播间链接
```
