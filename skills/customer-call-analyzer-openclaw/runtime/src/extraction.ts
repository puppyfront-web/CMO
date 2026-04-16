import type { AnalysisRecord, MindmapNode } from "./types.js";

export function normalizeAnalysisRecord(raw: unknown, defaultDate: string): AnalysisRecord {
  const payload = normalizePayload(raw);

  return {
    date: asString(payload.date) || defaultDate,
    customerName: asString(payload.customerName) || "未识别客户",
    phone: asString(payload.phone),
    customerCategory: asString(payload.customerCategory) || "待判断",
    needs: normalizeNeeds(payload.needs),
    engagementStage: asString(payload.engagementStage) || "待确认",
    summary: asString(payload.summary) || "暂无总结",
    nextActions: normalizeStringList(payload.nextActions),
    risks: normalizeStringList(payload.risks),
    mindmap: normalizeMindmap(payload.mindmap)
  };
}

export function renderDetailDocumentMarkdown(
  record: AnalysisRecord,
  transcript?: string
): string {
  const lines = [
    "# 打电话录音分析",
    "",
    "## 核心字段",
    `- 日期：${record.date}`,
    `- 客户名：${record.customerName}`,
    `- 电话：${record.phone || "未提取"}`,
    `- 客户类别：${record.customerCategory}`,
    `- 需求：${record.needs || "未提取"}`,
    `- 对接阶段：${record.engagementStage}`,
    "",
    "## 通话总结",
    record.summary,
    "",
    "## 脑图",
    ...renderMindmapSection(record.mindmap),
    "",
    "## 后续跟进",
    ...renderBulletSection(record.nextActions, "暂无明确后续动作"),
    "",
    "## 风险与顾虑",
    ...renderBulletSection(record.risks, "暂无明显风险"),
  ];

  if (transcript) {
    lines.push("", "## 转写原文", transcript);
  }

  return lines.join("\n");
}

export function buildDetailDocumentTitle(record: AnalysisRecord): string {
  return `客户通话分析-${record.date}-${record.customerName}`;
}

export function formatSheetRow(record: AnalysisRecord, documentUrl: string): string[] {
  return [
    record.date,
    record.customerName,
    record.phone,
    record.customerCategory,
    record.needs,
    record.engagementStage,
    documentUrl
  ];
}

function normalizePayload(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      const extracted = extractJsonObject(trimmed);
      return extracted ? (JSON.parse(extracted) as Record<string, unknown>) : {};
    }
  }

  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }

  return {};
}

function normalizeNeeds(value: unknown): string {
  if (Array.isArray(value)) {
    return normalizeStringList(value).join("；");
  }

  return asString(value);
}

function normalizeStringList(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/[\n;,；]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }

  return [];
}

function normalizeMindmap(value: unknown): MindmapNode[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeMindmapItem(item));
  }

  return normalizeMindmapItem(value);
}

function normalizeMindmapItem(value: unknown): MindmapNode[] {
  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title) => ({ title, children: [] }));
  }

  if (value && typeof value === "object") {
    const payload = value as Record<string, unknown>;
    const title = asString(payload.title);
    const children = payload.children;

    if (title) {
      return [
        {
          title,
          children: normalizeMindmap(children)
        }
      ];
    }
  }

  return [];
}

function renderMindmapSection(nodes: MindmapNode[]): string[] {
  if (nodes.length === 0) {
    return ["- 暂无脑图内容"];
  }

  return renderMindmapLines(nodes, 0);
}

function renderMindmapLines(nodes: MindmapNode[], depth = 0): string[] {
  if (nodes.length === 0) {
    return [];
  }

  return nodes.flatMap((node) => {
    const prefix = `${"  ".repeat(depth)}- ${node.title}`;
    return [prefix, ...renderMindmapLines(node.children ?? [], depth + 1)];
  });
}

function renderBulletSection(items: string[], emptyValue: string): string[] {
  if (items.length === 0) {
    return [`- ${emptyValue}`];
  }

  return items.map((item) => `- ${item}`);
}

function extractJsonObject(input: string): string | undefined {
  const match = input.match(/\{[\s\S]*\}/);
  return match?.[0];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
