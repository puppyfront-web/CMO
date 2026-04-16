# Feishu Call Log Workflow

用于把一段客户通话录音自动整理成：

1. 本地转写文本
2. 一篇飞书纯脑图文档
3. 一篇需求文档
4. 一份飞书报价表
5. 一行飞书电子表格记录

## 表结构

固定写入 10 列：

1. `日期`
2. `客户名`
3. `电话`
4. `客户类别`
5. `需求`
6. `对接阶段`
7. `打电话录音脑图`
8. `备注`
9. `需求文档`
10. `报价表`

规则：

- `打电话录音脑图` 只放脑图文档链接
- `备注` 放高价值补充信息
- `需求文档` 放需求文档链接
- `报价表` 放飞书报价表链接

## 安装

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/install-global.sh"
bash "$SKILL_DIR/scripts/setup.sh"
```

## 首次使用前

需要本机具备：

- `python3`
- `ffmpeg`
- `lark-cli`
- OpenClaw 可用环境

并完成飞书授权。

## 默认飞书表规则

- 如果已经保存过默认表链接，后续静默复用
- 只有用户明确要求换表，才替换默认表
- 如果当前没有默认表：
  - 可以指定已有飞书表
  - 也可以让 workflow 自动创建新表

状态文件：

```text
~/.openclaw/skill-state/feishu-call-log-workflow/config.json
```

## 主要文档

- `SKILL.md`
- `INSTALL.md`
- `workflow.md`
- `PROMPT.md`
- `context/README.md`
- `context/stage-context.json`

## 关于 Prompt

`PROMPT.md` 不是给人手动复制粘贴的参考模板，而是这条 workflow 的全局执行契约。

每次运行这条 workflow 时，都默认按 `PROMPT.md` 的规则生成：

- 字段提取
- 脑图
- 需求文档
- 报价飞书表

## Context Engineering

这条 workflow 现在按 stage 配置 Context Engineering，而不是只靠一个总 Prompt。

加载顺序：

1. `PROMPT.md`
2. `context/stage-context.json`
3. 当前 stage 对应的 `context/<stage>.md`
4. 当前 stage 允许读取的输入 artifacts

推荐运行时 artifacts：

- `sheet-target.json`
- `transcript.txt`
- `analysis.json`
- `mindmap.mmd`
- `mindmap-doc.json`
- `demand.md`
- `demand-doc.json`
- `quotation-sheet-data.json`
- `quotation-sheet.json`
- `sheet-row.json`
- `feishu-sheet.json`

## 文档命名规则

- 脑图：`客户名-行业-日期`
- 需求文档：`客户名-行业-需求文档-日期`
- 报价表：`客户名-行业-报价表-日期`
