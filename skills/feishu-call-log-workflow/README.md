# Feishu Call Log Workflow

用于把一段客户通话录音自动整理成：

1. 本地转写文本
2. 一篇飞书纯脑图文档
3. 一行飞书电子表格记录

适合 OpenClaw 全局安装后长期复用。

## 产出表结构

固定写入 8 列：

1. `日期`
2. `客户名`
3. `电话`
4. `客户类别`
5. `需求`
6. `对接阶段`
7. `打电话录音脑图`
8. `备注`

规则：

- `打电话录音脑图` 只放飞书脑图文档链接
- `备注` 放重要但不适合塞进基础字段的信息，例如风险、限制、顾虑、明确的后续动作、技术边界

## 安装

在仓库根目录执行：

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/install-global.sh"
bash "$SKILL_DIR/scripts/setup.sh"
```

安装完成后，OpenClaw 会在全局技能目录发现它：

```bash
~/.openclaw/workspace/skills/feishu-call-log-workflow
```

## 首次使用前

需要本机具备：

- `python3`
- `ffmpeg`
- `lark-cli`
- OpenClaw 可用环境

并完成飞书授权。至少要能创建文档和写电子表格。

## 默认飞书表规则

- 如果已经保存过默认表链接，后续静默复用
- 只有用户明确要求换表，才替换默认表
- 如果当前没有默认表：
  - 可以指定一个已有飞书表
  - 也可以让 workflow 自动创建一个新表
- 一旦创建或指定成功，会保存到：

```text
~/.openclaw/skill-state/feishu-call-log-workflow/config.json
```

## 正常工作流

主流程节点是：

1. `resolve-sheet`
2. `transcribe-audio`
3. `extract-fields`
4. `build-mindmap`
5. `create-feishu-doc`
6. `append-sheet-row`

说明：

- `skill` 是 OpenClaw 的入口
- `stages` 是正常工作流节点
- OpenClaw/LLM 当前负责 `extract-fields` 和 `build-mindmap`
- 脚本负责本地转写、飞书写入、状态持久化

## 给同学的推荐使用方式

在 OpenClaw 中直接表达类似需求：

- “分析这个录音并写入飞书表”
- “把这段客户电话整理成表格和脑图”
- “继续写入默认客户通话表”
- “换成这个新的飞书表再继续写”

如果要显式说明表格切换，可以直接附上新的飞书表 URL。

## 文档命名规则

脑图文档默认使用：

`客户名-行业-日期`

兜底规则：

- `客户名-通话脑图-日期`
- `行业-通话脑图-日期`
- `通话脑图-日期`

## 扩展能力

如果后续要插入新能力：

- 主流程必经节点：看 [stages/README.md](/Users/tutu/Documents/New%20project/skills/feishu-call-log-workflow/stages/README.md:1)
- 可选扩展节点：看 [extensions/README.md](/Users/tutu/Documents/New%20project/skills/feishu-call-log-workflow/extensions/README.md:1)

推荐做法：

- 推理类能力做成 agent/LLM 节点
- 工具类或同步类能力做成 extension 或子 workflow

## 常用文件

- 入口说明：[SKILL.md](/Users/tutu/Documents/New%20project/skills/feishu-call-log-workflow/SKILL.md:1)
- 安装说明：[INSTALL.md](/Users/tutu/Documents/New%20project/skills/feishu-call-log-workflow/INSTALL.md:1)
- 工作流契约：[workflow.md](/Users/tutu/Documents/New%20project/skills/feishu-call-log-workflow/workflow.md:1)
- 内置执行提示词：[PROMPT.md](/Users/tutu/Documents/New%20project/skills/feishu-call-log-workflow/PROMPT.md:1)

## 关于 Prompt

`PROMPT.md` 现在不是单纯给人复制粘贴的参考模板，而是这条 workflow 的内置执行契约。

也就是说：

- 每次运行 `feishu-call-log-workflow` 都默认按这份 prompt 的规则执行
- 用户不需要每次重复提供它
- 如果以后修改字段口径、脑图规则、备注策略，应该优先更新 `PROMPT.md`
