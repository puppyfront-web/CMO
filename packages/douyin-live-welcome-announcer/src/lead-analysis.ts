import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { BrowserContext } from "playwright";

import type { SessionSummary } from "./session.js";
import type { WatcherEntry } from "./watcher.js";

export interface LeadProfileSummary {
  url: string;
  title?: string;
  bioSnippet?: string;
  recentTopics?: string[];
}

export interface LeadUserSummary {
  nickname: string;
  commentCount: number;
  giftCount: number;
  joinCount: number;
  comments: string[];
  profileUrl?: string;
  score: number;
  tier: "high_intent" | "follow_up" | "low_signal";
  topSignals: string[];
  profile?: LeadProfileSummary;
  firstSeenAt?: string;
  lastSeenAt?: string;
  joinAt?: string;
  staySeconds?: number;
}

export interface LeadRecord extends LeadUserSummary {
  evidenceComments: string[];
  recommendedAction: string;
}

export interface LeadAnalysisResult {
  roomUrl: string;
  startedAt: string;
  endedAt: string;
  users: LeadUserSummary[];
  leads: LeadRecord[];
}

export interface AnalyzeLeadSessionOptions {
  roomUrl: string;
  startedAt: string;
  endedAt: string;
  events: WatcherEntry[];
  context?: BrowserContext;
  logger?: (message: string) => void;
}

interface AggregatedLeadUserSummary extends LeadUserSummary {
  aggregateKey: string;
}

export async function analyzeLeadSession(options: AnalyzeLeadSessionOptions): Promise<LeadAnalysisResult> {
  const userMap = new Map<string, AggregatedLeadUserSummary>();

  for (const event of deduplicateEvents(options.events)) {
    const nickname = event.nickname.trim();
    if (!nickname) {
      continue;
    }

    const aggregateKey = resolveAggregateKey(userMap, event);
    const current =
      userMap.get(aggregateKey) ??
      {
        aggregateKey,
        nickname,
        commentCount: 0,
        giftCount: 0,
        joinCount: 0,
        comments: [],
        profileUrl: undefined,
        score: 0,
        tier: "low_signal" as const,
        topSignals: []
      };

    current.firstSeenAt = current.firstSeenAt
      ? minIsoTimestamp(current.firstSeenAt, event.detectedAt)
      : event.detectedAt;
    current.lastSeenAt = current.lastSeenAt
      ? maxIsoTimestamp(current.lastSeenAt, event.detectedAt)
      : event.detectedAt;

    if (event.kind === "join") {
      current.joinCount += 1;
      current.joinAt = current.joinAt ? minIsoTimestamp(current.joinAt, event.detectedAt) : event.detectedAt;
    }

    if (event.kind === "comment" && event.comment) {
      current.commentCount += 1;
      current.comments.push(event.comment);
      current.profileUrl ??= event.profileUrl;
    }

    if (event.kind === "gift") {
      current.giftCount += 1;
    }

    const nextAggregateKey = current.profileUrl ? buildProfileAggregateKey(current.profileUrl) : aggregateKey;
    if (nextAggregateKey !== aggregateKey) {
      userMap.delete(aggregateKey);
      current.aggregateKey = nextAggregateKey;
    }
    userMap.set(current.aggregateKey, current);
  }

  const users = [...userMap.values()]
    .map((user) => ({
      ...user,
      staySeconds: computeStaySeconds(user.joinAt ?? user.firstSeenAt, options.endedAt)
    }))
    .map(({ aggregateKey: _aggregateKey, ...user }) => user)
    .filter((user) => !shouldDropSilentShortStayUser(user))
    .map((user) => scoreUser(user))
    .sort((left, right) => right.score - left.score || right.commentCount - left.commentCount);

  const leads = users
    .filter((user) => user.tier !== "low_signal")
    .map<LeadRecord>((user) => ({
      ...user,
      evidenceComments: user.comments.slice(0, 3),
      recommendedAction: user.tier === "high_intent" ? "优先私聊跟进" : "加入待跟进名单"
    }));

  if (options.context && !options.context.isClosed()) {
    for (const lead of leads.filter((lead) => lead.profileUrl)) {
      lead.profile = await enrichProfile(options.context, lead.profileUrl!, options.logger);
    }

    for (const user of users) {
      const matchedLead = leads.find((lead) => lead.profileUrl === user.profileUrl && lead.nickname === user.nickname);
      if (matchedLead?.profile) {
        user.profile = matchedLead.profile;
      }
    }
  }

  return {
    roomUrl: options.roomUrl,
    startedAt: options.startedAt,
    endedAt: options.endedAt,
    users,
    leads
  };
}

function deduplicateEvents(events: WatcherEntry[]): WatcherEntry[] {
  const deduped: WatcherEntry[] = [];
  const recentEventKeys = new Map<string, number>();

  for (const event of events) {
    const dedupeKey = buildEventDedupeKey(event);
    if (!dedupeKey) {
      deduped.push(event);
      continue;
    }

    const currentMs = Date.parse(event.detectedAt);
    const previousMs = recentEventKeys.get(dedupeKey);
    if (previousMs !== undefined && !Number.isNaN(currentMs) && currentMs - previousMs <= 3_000) {
      continue;
    }

    if (!Number.isNaN(currentMs)) {
      recentEventKeys.set(dedupeKey, currentMs);
    }
    deduped.push(event);
  }

  return deduped;
}

function buildEventDedupeKey(event: WatcherEntry): string | undefined {
  if (event.kind === "comment" && event.comment) {
    return [
      event.kind,
      event.nickname.trim(),
      normalizeFreeText(event.comment)
    ].join("::");
  }

  if (event.kind === "gift" && event.gift) {
    return [event.kind, event.nickname.trim(), normalizeFreeText(event.gift)].join("::");
  }

  return undefined;
}

function resolveAggregateKey(
  userMap: Map<string, AggregatedLeadUserSummary>,
  event: WatcherEntry
): string {
  const profileUrl = normalizeOptionalText(event.profileUrl);
  if (profileUrl) {
    const profileKey = buildProfileAggregateKey(profileUrl);
    if (userMap.has(profileKey)) {
      return profileKey;
    }

    const anonymousKey = buildAnonymousAggregateKey(event.nickname);
    if (userMap.has(anonymousKey)) {
      return anonymousKey;
    }

    return profileKey;
  }

  const anonymousKey = buildAnonymousAggregateKey(event.nickname);
  if (userMap.has(anonymousKey)) {
    return anonymousKey;
  }

  return anonymousKey;
}

function buildAnonymousAggregateKey(nickname: string): string {
  return `nickname::${nickname.trim()}`;
}

function buildProfileAggregateKey(profileUrl: string): string {
  return `profile::${profileUrl}`;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeFreeText(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function renderLeadReport(result: LeadAnalysisResult): string {
  const lines = [
    "# 潜在客户分析报告",
    "",
    `- 直播间：${result.roomUrl}`,
    `- 开始时间：${result.startedAt}`,
    `- 结束时间：${result.endedAt}`,
    `- 用户数：${result.users.length}`,
    `- 潜客数：${result.leads.length}`,
    ""
  ];

  if (result.leads.length === 0) {
    lines.push("本场直播未识别出明确潜在客户。");
    return lines.join("\n");
  }

  lines.push("## 重点潜客");
  lines.push("");

  for (const lead of result.leads) {
    lines.push(`### ${lead.nickname}`);
    lines.push(`- 意向等级：${lead.tier}`);
    lines.push(`- 综合分：${lead.score}`);
    lines.push(`- 评论数：${lead.commentCount}`);
    lines.push(`- 礼物数：${lead.giftCount}`);
    lines.push(`- 主要信号：${lead.topSignals.join("、") || "无"}`);
    lines.push(`- 建议动作：${lead.recommendedAction}`);
    if (lead.profile?.bioSnippet) {
      lines.push(`- 主页摘要：${lead.profile.bioSnippet}`);
    }
    lines.push("- 证据评论：");
    for (const comment of lead.evidenceComments) {
      lines.push(`  - ${comment}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function writeLeadAnalysis(sessionDir: string, result: LeadAnalysisResult): Promise<void> {
  await writeFile(path.join(sessionDir, "users.json"), JSON.stringify(result.users, null, 2));
  await writeFile(path.join(sessionDir, "leads.json"), JSON.stringify(result.leads, null, 2));
  await writeFile(path.join(sessionDir, "report.md"), renderLeadReport(result));
}

function scoreUser(user: LeadUserSummary): LeadUserSummary {
  let score = 0;
  const topSignals = new Set<string>();

  for (const comment of user.comments) {
    if (/(多少钱|价格|收费|费用)/u.test(comment)) {
      score += 6;
      topSignals.add("价格咨询");
    }

    if (/(怎么买|购买|怎么下单|怎么联系|联系方式)/u.test(comment)) {
      score += 7;
      topSignals.add("购买路径");
    }

    if (/(合作|加盟|代理|分销|课程|想学|有兴趣|想了解)/u.test(comment)) {
      score += 5;
      topSignals.add("明确意向");
    }

    if (/^(哈哈|666|老师好|来了|打卡|赞)$/u.test(comment)) {
      score -= 2;
    }
  }

  if (user.commentCount >= 2) {
    score += 2;
    topSignals.add("重复互动");
  }

  if (user.giftCount > 0) {
    score += 3;
    topSignals.add("礼物互动");
  }

  const tier = score >= 12 ? "high_intent" : score >= 5 ? "follow_up" : "low_signal";

  return {
    ...user,
    score,
    tier,
    topSignals: [...topSignals]
  };
}

function shouldDropSilentShortStayUser(user: LeadUserSummary): boolean {
  return user.commentCount === 0 && user.giftCount === 0 && (user.staySeconds ?? 0) < 60;
}

function computeStaySeconds(startedAt: string | undefined, endedAt: string): number | undefined {
  if (!startedAt) {
    return undefined;
  }

  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return undefined;
  }

  return Math.floor((endMs - startMs) / 1000);
}

function minIsoTimestamp(left: string, right: string): string {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function maxIsoTimestamp(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

async function enrichProfile(
  context: BrowserContext,
  profileUrl: string,
  logger?: (message: string) => void
): Promise<LeadProfileSummary | undefined> {
  const page = await context.newPage();

  try {
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const snapshot = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
      const title = document.title?.trim() ?? "";
      const metaDescription =
        document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
      const topicTexts = [...document.querySelectorAll("h1, h2, h3, [data-e2e]")]
        .map((node) => node.textContent?.trim() ?? "")
        .filter(Boolean)
        .slice(0, 10);

      return {
        title,
        bioSnippet: metaDescription || bodyText.slice(0, 160),
        recentTopics: topicTexts.slice(0, 5)
      };
    });

    return {
      url: profileUrl,
      title: snapshot.title || undefined,
      bioSnippet: snapshot.bioSnippet || undefined,
      recentTopics: snapshot.recentTopics.length > 0 ? snapshot.recentTopics : undefined
    };
  } catch (error) {
    logger?.(`主页增强失败：${profileUrl} ${String(error)}`);
    return undefined;
  } finally {
    await page.close().catch(() => {});
  }
}
