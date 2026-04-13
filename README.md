# Skill Workspace

这个仓库用于维护多个可复用 skill。

## 目录约定

- `packages/`
  - 放各个 skill 的开发源码、测试和实现细节
- `skills/`
  - 放面向用户分发的 skill 包

## 当前内容

- `packages/douyin-live-welcome-announcer`
  - 抖音直播间欢迎播报的开发源码
- `skills/douyin-live-welcome-announcer-openclaw`
  - 给 OpenClaw 用户使用的分发版 skill

## 说明

后续如果继续增加 skill，直接按同样方式新增：

- 一个开发目录到 `packages/<skill-name>`
- 一个分发目录到 `skills/<skill-name>`
