# Skill Workspace

这个仓库用于维护多个可复用 skill。

## 架构模式

整个项目现在按 `skills -> agents -> workflows` 的模式组织：

- `skills/`
  - 单独管理可复用能力、运行时、脚本、输入输出契约
- `agents/`
  - 负责调用 skill，形成面向具体任务的智能体入口或阶段角色
- `workflow.md`
  - 定义一个业务流程如何由一个或多个 agent 串联 skill 完成

目标结构不是把所有逻辑都塞进一个 prompt，而是：

- `skill` 管能力边界
- `agent` 管调用方式、角色分工和 handoff
- `workflow` 管阶段编排、artifact contract 和业务闭环

标准工作流约定：

- 可以只有一个 entry agent，也可以拆成多个 specialized agents
- agent 之间优先通过稳定 artifacts 或结构化输出交接
- workflow 文档需要写清楚：
  - 当前 agent topology
  - handoff contract
  - 运行时 artifacts
  - 当前实现映射

## 目录约定

- `packages/`
  - 放各个 skill 的开发源码、测试和实现细节
- `skills/`
  - 放面向用户分发的 skill 包
- `openclaw.skills.json`
  - 仓库级 DSL 索引，列出当前所有可单独打包分发的 OpenClaw 包
- `scripts/package-openclaw-dsl.py`
  - 通用 DSL 打包脚本
- `scripts/install-openclaw-dsl.py`
  - 通用 DSL 安装脚本

## 当前内容

- `packages/douyin-live-welcome-announcer`
  - 抖音直播间礼物播报、评论采集和潜客分析工作流的开发源码
- `packages/bill-processing-os`
  - 票据结构化录入工作流的开发源码
- `skills/douyin-live-welcome-announcer-openclaw`
  - 给 OpenClaw 用户使用的礼物播报与直播后潜客分析分发版 skill
- `skills/bill-processing-os-openclaw`
  - 给 OpenClaw 用户使用的票据结构化录入分发版 skill
- `skills/customer-call-analyzer-openclaw`
  - 客户通话录音转写、结构化提取、写入飞书的分发版 skill
- `skills/feishu-call-log-workflow`
  - 录音转写、脑图、需求文档、报价表和飞书写表的标准化 workflow skill

## 当前工作流

当前已经整理为有独立工作流入口文档的链路：

- `skills/douyin-live-welcome-announcer-openclaw/workflow.md`
  - 抖音直播监控、礼物播报、评论采集、直播后潜客分析
- `skills/customer-call-analyzer-openclaw/workflow.md`
  - 通话录音转写、客户字段提取、详情文档、飞书写表
- `skills/feishu-call-log-workflow/workflow.md`
  - 通话录音转写、脑图、需求文档、报价表、飞书写表

## 说明

后续如果继续增加 skill，直接按同样方式新增：

- 一个开发目录到 `packages/<skill-name>`
- 一个分发目录到 `skills/<skill-name>`
- 一个 `skills/<skill-name>/dsl.json`
- 在 `openclaw.skills.json` 中登记

## DSL 分发

当前推荐的客户交付模式：

1. 内部统一维护这个总仓库
2. 每个 workflow 或 skill 作为一个独立 DSL 包分发
3. 客户只安装自己需要的那个 DSL 包

### 打包一个 workflow

```bash
python3 scripts/package-openclaw-dsl.py douyin-live-welcome-announcer-openclaw
python3 scripts/package-openclaw-dsl.py feishu-call-log-workflow
```

默认产物会生成到：

```text
dist/openclaw/
```

### 从 DSL 包安装到 OpenClaw

```bash
python3 scripts/install-openclaw-dsl.py dist/openclaw/douyin-live-welcome-announcer-openclaw-0.1.0.dsl.tgz
python3 scripts/install-openclaw-dsl.py dist/openclaw/feishu-call-log-workflow-0.1.0.dsl.tgz
```
