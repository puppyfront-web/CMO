# OpenClaw 安装说明

这个 skill 用于在 OpenClaw 中运行本地票据结构化录入工作流。

当前第一阶段适用场景：

- 输入是一个 JSON / Markdown / 纯文本 / 图片 / PDF 票据源文件，或者一个包含这些文件的目录
- 需要本地完成路由、解析、抽取、校验、复核/新类型分流
- 需要生成可回放 artifacts 和真实 `.xlsx` 文件输出

## 前置要求

- `macOS` 或 `Linux`
- 已安装 `node`、`npm`
- OpenClaw 工作区中包含本仓库
- 如果要直接处理图片或扫描 PDF，需要可用的 OCR provider

## 安装步骤

1. 把整个 skill 文件夹放到 OpenClaw 工作区 `skills/` 目录下：

```bash
skills/bill-processing-os-openclaw
```

2. 在 OpenClaw 工作区根目录执行：

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/setup.sh"
```

这一步会自动完成：

- 安装 skill runtime 依赖

## 启动方式

运行单个票据文件：

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill.md" \
 --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json" \
  --excel-out "/absolute/path/to/result.xlsx"
```

运行图片票据并启用 macOS 原生 OCR：

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill.jpg" \
  --template-bundle "$SKILL_DIR/examples/yubo-fabric-ticket-template.bundle.json" \
  --ocr-command "$SKILL_DIR/scripts/ocr-macos-vision.sh" \
  --excel-out "/absolute/path/to/result.xlsx"
```

运行一个目录中的多个 JSON 文件：

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill-inputs" \
  --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json" \
  --excel-out "/absolute/path/to/result.xlsx"
```

如果需要 JSON 输出：

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
BILL_JSON_OUTPUT=1 \
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill-inputs" \
  --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json"
```

## 当前边界

- 当前版本输入支持 JSON / Markdown / 纯文本 / 图片 / PDF 票据源
- 当前版本已经支持输出真实 `.xlsx` 文件
- 图片和扫描 PDF 需要通过 `--ocr-command` 提供 OCR 能力
- skill 已内置一个 macOS Vision OCR 脚本；Linux 环境请传入你自己的 OCR 可执行文件

## OpenClaw 中的触发示例

你可以对 OpenClaw 说：

```text
用 bill_processing_os 帮我处理这批票据 JSON
```

或者：

```text
帮我运行票据结构化录入 skill，并输出处理结果
```
