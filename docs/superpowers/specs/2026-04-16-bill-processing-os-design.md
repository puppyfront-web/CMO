# Bill Processing OS Design

## Goal

构建一个可学习、可扩展、可观测的票据结构化录入系统，以 Skill 作为主入口，支持图片、PDF、手写混合票据的解析、结构化、校验、复核、学习和 Excel 写入。

## Scope

本设计覆盖本地优先的票据处理运行时、Skill 封装、模板学习闭环和人工复核闭环。

Included:

- 多格式票据输入：图片、扫描 PDF、文本型 PDF、含手写覆盖票据
- `new_entry`、`backfill`、`repair`、`batch_process`、`type_onboarding`、`manual_review` 六种执行模式
- 类型识别、结构抽取、字段标准化、规则校验、置信度决策、Excel 写入
- 用户确认后模板生成与模板版本化沉淀
- 低置信度、手写覆盖、字段冲突场景下的人工复核任务生成与回写
- 全链路日志、中间产物持久化、可回放调试
- 可被 Agent / Skill 调用的稳定输入输出契约

Not included in the first iteration:

- 云端常驻服务和多租户账号体系
- 复杂权限系统
- 在线协同复核界面
- 训练自有 OCR / handwriting 模型
- 自动调用外部 ERP / 财务系统

## Recommended Delivery Shape

推荐采用 `OpenClaw Skill Delivery + Local-first Workflow Runtime` 方案，与当前仓库已有 OpenClaw skill 结构保持一致：

- `packages/bill-processing-os`
  - 开发态源码、测试、领域模型、流水线实现
- `skills/bill-processing-os-openclaw`
  - 面向客户交付的 OpenClaw skill
  - 包含 `SKILL.md`、`INSTALL.md`、`scripts/setup.sh`、`scripts/run.sh`
  - 包含 `runtime/` 目录，用于放置可直接在客户环境运行的代码与依赖

开发与交付分离的好处：

- 研发侧可以保持清晰的工程结构和测试结构
- 客户侧拿到的是一个稳定、可安装、可 support 的 OpenClaw skill 包
- 后续如果演进为服务端部署，不需要推翻领域模型和工作流骨架

## System Pattern

系统模式固定为：

`Single Skill Entry, Workflow Core, Agent-Assisted Nodes`

这意味着：

- 对客户和 OpenClaw 暴露的是一个主 Skill
- 系统内部主链路由确定性的 workflow 和状态机驱动
- Agent 只用于局部高不确定性节点，不拥有全局调度权

不采用纯 Agent 驱动的原因：

- 客户交付场景更强调稳定性、可审计、可 support 和可重跑
- Excel 写入、去重、修复、补录都要求可预测行为
- 人工复核和模板学习需要明确状态与可回溯证据

## User Experience

用户上传一张或一批票据后，主入口 `bill_task_router` 根据上下文判断这是新录入、补录、修复、批处理还是新类型接入任务。系统随后完成类型匹配、文档解析、结构抽取、校验和决策。

对于高置信度、已知类型、无手写覆盖的票据，系统直接写入目标 Excel，并保留完整中间产物。对于中置信度票据，系统输出确认请求；对于手写覆盖、字段冲突或低置信度票据，系统生成复核任务；对于无法识别的新类型票据，系统进入 `type_onboarding`，等待用户确认后自动生成模板并纳入模板库。

## Architecture

系统采用五层处理链路和三个出口能力：

```text
bill_task_router
  -> L1 任务理解层
  -> L2 类型识别层
  -> L3 文档解析层
  -> L4 结构抽取层
  -> L5 决策执行层
  -> { excel_writer | review_processor | template_builder }
```

### Deterministic vs Agentic Boundaries

以下节点必须 deterministic：

- 任务路由
- 状态迁移
- 去重
- 规则校验
- Excel 写入
- 复核任务创建
- 模板版本落库

以下节点允许 agent 化，但必须被 deterministic workflow 包裹：

- 结构化字段抽取
- 手写覆盖解释
- 字段冲突归因
- 新类型模板归纳
- 人工复核建议生成

规则是：Agent 可以提供候选答案和解释，但最终写入系统状态的动作必须经过规则层确认。

### L1: Task Understanding

职责：

- 识别用户意图和执行模式
- 组装任务上下文
- 补齐批处理场景下的共享参数

核心组件：

- `intent_classifier`
- `context_builder`

输入：

- 文件位置
- 用户输入的 `user_intent`
- 历史上下文，例如上次失败原因、目标 Excel、已知模板集合

输出：

- `execution_mode`
- `task_context`
- 下一步路由建议

### L2: Type Matching

职责：

- 对票据进行已知类型召回与排序
- 判断是否应进入 `type_onboarding`
- 给后续层提供模板候选集

核心组件：

- `bill_type_matcher`
- `similarity_engine`
- `template_feature_index`

匹配信号：

- 标题关键词
- 表头结构
- 版式位置特征
- 供应商 / 客户名称特征
- OCR 片段 embedding

### L3: Document Parsing

职责：

- 产出尽可能完整的原始解析材料
- 标记文本型 PDF、扫描件、图片和手写覆盖区域
- 为抽取层提供多模态输入

核心组件：

- `preprocess`
- `markdown_adapter`
- `ocr_adapter`
- `handwriting_detector`

解析输出必须保留：

- 原图 / PDF 引用
- markdown
- OCR 文本
- 页面维度和区域信息
- 手写标注与覆盖候选

### L4: Structured Extraction

职责：

- 从原始解析结果中抽取结构化字段和行项目
- 融合 OCR、markdown 和模板先验
- 输出标准化领域对象

核心组件：

- `llm_extractor`
- `field_fusion`
- `normalizer`

抽取目标分为两类：

- 头部字段：日期、供应商、客户、单据编号、总金额、币种等
- 明细项目：品名、规格、数量、单位、单价、金额等

### L5: Decision and Execution

职责：

- 执行规则校验、冲突检测、去重判断和置信度决策
- 选择自动写入、用户确认、人工复核或类型学习

核心组件：

- `validation_engine`
- `confidence_policy`
- `routing_engine`
- `dedupe_guard`

### Reflection Layer

在抽取层和决策层之间插入一个内部 `reflection` 复核节点，用于对生成结果进行二次自审查。

职责：

- 检查字段之间的内部一致性
- 对可安全推导的缺失值做有限自动修复
- 对高风险不一致结果强制降置信度或进入人工复核
- 产出独立的 reflection artifact 供回放与排障

首期 reflection 规则至少包含：

- 明细金额可稳定求和时，补全缺失的 `total_amount`
- `total_amount` 与明细和不一致时，强制 `REVIEW_REQUIRED`
- `quantity * unit_price != amount` 时，强制 `REVIEW_REQUIRED`

## State Machines

### Document State

```text
UPLOADED
 -> PREPROCESSED
 -> PARSED
 -> EXTRACTED
 -> VALIDATED
 -> (AUTO_WRITE | REVIEW_REQUIRED | TYPE_ONBOARDING)
 -> WRITTEN | REJECTED
```

状态要求：

- 每次状态迁移都要写事件日志
- 任一失败状态都必须附带 `failure_reason`
- 所有状态都必须允许回放读取对应中间产物

### Execution Mode

```text
new_entry
backfill
repair
batch_process
type_onboarding
manual_review
```

执行模式影响：

- 输入校验规则
- 去重策略是否启用
- 是否允许覆盖已有 Excel 行
- 是否必须生成复核任务

### Complexity Flags

```text
clean_printed
printed_with_handwriting
override_detected
uncertain_document
```

复杂度标记不替代主状态机，但会改变阈值和路由决策。

## Data Model

### BillDocument

`BillDocument` 是全链路主实体。它保存原始解析结果、结构化结果、标准化结果、校验结果、手写标记和审计信息。所有子流程只允许追加或更新自己负责的字段，不允许覆盖其他层的产物。

建议额外补充这些字段：

- `doc_hash`
- `source_filename`
- `page_count`
- `complexity_flags`
- `processing_trace_id`
- `template_candidates`
- `review_task_id`

### BillTypeTemplate

模板实体负责描述一个票据类型如何被识别、抽取和映射：

- `features`
- `field_mapping`
- `table_schema`
- `excel_mapping_id`
- `confidence_threshold`
- `post_rules`

模板必须版本化，禁止原地修改。用户确认产生的新模板或模板修订，应以新版本落库。

### ExcelTemplateMapping

Excel 映射负责把标准化字段映射到单元格或行展开策略。首期必须支持：

- 固定单元格写入
- `expand_items` 行展开
- 指定起始行写入
- 追加模式和覆盖模式

### ReviewTask

复核任务至少包含：

- 复核原因
- 需复核字段列表
- 当前抽取值
- 候选值和证据来源
- 任务状态
- 人工修正结果

人工修正后，系统要能把修正结果回写到 `BillDocument.normalized`，并触发模板学习候选。

## Skill Contracts

### `bill_task_router`

输入：

```json
{
  "file_url": "",
  "user_intent": "",
  "context": {}
}
```

输出：

```json
{
  "intent": "new_entry",
  "type_match": 0.82,
  "action": "parse_and_confirm",
  "task_id": "",
  "doc_ids": []
}
```

### `bill_parse_pipeline`

输入：

- `doc_id`
- 文件引用
- 可选模板候选

输出：

- `BillDocument.raw`
- 页面级解析元数据
- 手写标记

### `bill_extraction_pipeline`

输出：

- `BillDocument.parsed`
- `BillDocument.normalized`
- 字段级置信度

### `bill_validation_pipeline`

输出：

- `validation`
- `confidence_score`
- `decision`
- `dedupe_result`

### `bill_template_builder`

职责：

- 接收用户确认后的标准化数据
- 生成或更新 `BillTypeTemplate`
- 建立模板和 Excel 映射的关系

### `bill_excel_writer`

职责：

- 根据 `ExcelTemplateMapping` 写入目标工作簿
- 记录写入批次 ID、工作表名、起始行、写入结果

### `bill_review_processor`

职责：

- 生成复核任务
- 接收人工修正
- 触发回写和学习

## Decision Policy

固定策略如下：

```text
IF type_match > 0.9 AND confidence > 0.9
    -> AUTO_WRITE

IF 0.7 < confidence < 0.9
    -> USER_CONFIRM

IF handwriting_override_detected
    -> REVIEW_REQUIRED

IF type_match < 0.6
    -> TYPE_ONBOARDING
```

补充约束：

- `USER_CONFIRM` 不等于 `REVIEW_REQUIRED`。前者是用户轻确认，后者是需要带证据的人工复核任务。
- `handwriting_override_detected` 的优先级高于高置信度自动写入。
- 若触发去重命中，默认不写 Excel，改为 `REVIEW_REQUIRED` 或 `REJECTED`，取决于执行模式。

## Conflict and Dedupe Policy

冲突处理：

- 手写覆盖明显，手写值优先
- 无明确覆盖关系，保留冲突证据并进入人工复核

去重策略：

- 使用 `doc_hash + total_amount + date`
- `repair` 模式允许命中后进入修复分支
- `batch_process` 模式必须输出重复报告

## Storage and Replay

每次处理任务都要创建一个本地任务目录：

`~/.bill-processing-os/runs/<started-at>-<task-id>/`

目录至少包含：

- `task.json`
- `documents/<doc-id>/raw.json`
- `documents/<doc-id>/parsed.json`
- `documents/<doc-id>/normalized.json`
- `documents/<doc-id>/validation.json`
- `documents/<doc-id>/artifacts/*`
- `events.jsonl`

该目录既是可观测性底座，也是重跑和回放入口。

## Observability

必须具备：

- 每层开始 / 结束 / 失败日志
- 状态迁移事件日志
- 关键决策日志：类型命中、置信度、去重命中、复核原因
- 中间产物落盘
- `trace_id` 贯穿所有子 Skill 和子流程

首期采用结构化 JSON 日志即可，不要求引入集中式观测平台。

reflection 结果也必须持久化，包括：

- `issues`
- `auto_fixes`
- `adjusted_confidence_score`
- `force_review`

## Error Handling

- 任何解析失败都不能丢失原始文件引用
- OCR 失败时允许 fallback 到 markdown 或手工复核
- 单文档失败不能阻断 `batch_process` 的其他文档
- Excel 写入失败必须生成可重试结果，不可吞错
- 模板学习失败不能影响主录入链路

## Testing Strategy

测试必须覆盖：

- 类型匹配命中 / 未命中 / 相近类型歧义
- 图片、PDF、手写覆盖样本的解析输出
- 字段抽取与标准化
- 决策阈值分支
- 去重逻辑
- Excel 映射展开写入
- 复核任务生成与人工修正回写
- 模板学习后再次命中同类票据

推荐测试层次：

- 单元测试：规则、标准化、映射、阈值策略
- 夹具测试：OCR / markdown / 票据样本
- 集成测试：端到端处理单张和批量票据

## Development Quality Rule

本项目开发过程固定采用 `TDD`：

- 任何生产代码都必须先有失败测试
- 每个能力点遵循 `Red -> Green -> Refactor`
- 先验证单元行为，再接入上层流水线
- 对 OCR、抽取、Excel 写入等外部依赖，优先使用夹具与适配器测试

TDD 在本项目中不是偏好，而是交付质量约束。原因如下：

- 票据系统包含大量规则分支，后补测试很难覆盖真实风险
- OpenClaw 客户交付要求稳定升级，回归测试必须先于扩展开发
- 手写覆盖、模板学习、去重与修复分支天然容易回归，必须靠测试先行锁定行为

## First Iteration Boundary

第一阶段以“本地闭环可用”为交付标准：

- CLI / Skill 可调用
- 单张与批量票据可处理
- Excel 可写入
- 复核任务可生成
- 用户确认后可生成模板
- 再次处理同类票据时可命中模板

服务化、在线复核 UI、外部系统同步放到后续迭代。

## Recommended Package Layout

建议按责任拆分为：

- `packages/bill-processing-os/src/domain`
- `packages/bill-processing-os/src/router`
- `packages/bill-processing-os/src/type-match`
- `packages/bill-processing-os/src/parse`
- `packages/bill-processing-os/src/extract`
- `packages/bill-processing-os/src/validate`
- `packages/bill-processing-os/src/write`
- `packages/bill-processing-os/src/review`
- `packages/bill-processing-os/src/template`
- `packages/bill-processing-os/src/storage`
- `packages/bill-processing-os/src/cli`
- `packages/bill-processing-os/tests`
- `skills/bill-processing-os-openclaw`

OpenClaw 交付目录建议为：

- `skills/bill-processing-os-openclaw/SKILL.md`
- `skills/bill-processing-os-openclaw/INSTALL.md`
- `skills/bill-processing-os-openclaw/scripts/setup.sh`
- `skills/bill-processing-os-openclaw/scripts/run.sh`
- `skills/bill-processing-os-openclaw/agents/openai.yaml`
- `skills/bill-processing-os-openclaw/references/runtime.md`
- `skills/bill-processing-os-openclaw/runtime/`

每个目录只负责一层能力，通过显式接口交互，避免重新退化成“大一统 OCR 工具”。

## Repository Isolation and Delivery Management

由于该仓库后续将承载多个客户交付工作流，目录和生命周期管理必须提前固定：

- 每个工作流使用独立开发目录：`packages/<workflow-name>`
- 每个客户可安装产物使用独立交付目录：`skills/<workflow-name>-openclaw`
- 每个工作流独立测试，不允许把测试耦合进其他 workflow 的测试目录
- 只有在两个以上 workflow 明确复用时，才允许抽出共享库，避免过早抽象
- 客户侧运行产物、样本、临时 Excel、交付包全部落在 gitignored 路径，不进入源码历史

推荐的仓库治理规则：

- `packages/` 只放开发态源码
- `skills/` 只放交付态 skill 包
- `deliverables/` 只放本地生成的客户交付物，并保持 gitignored
- `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 负责沉淀每个 workflow 的设计和计划
- 每个新 workflow 都必须先有 spec 和 plan，再进入实现

这条规则的目标是让仓库随着客户数量增长时，仍然保持：

- 工作流之间低耦合
- 客户交付物边界清晰
- 回归测试范围可控
- 并行开发和并行维护可持续

## Final Recommendation

这不是一个 OCR 功能包，而是一个以票据领域对象为核心、以 Skill 为调度入口、以模板学习和人工复核为闭环的 `Bill Processing OS`。首期应优先保证“可回放、可复核、可学习”，而不是追求一步到位的全自动化。
