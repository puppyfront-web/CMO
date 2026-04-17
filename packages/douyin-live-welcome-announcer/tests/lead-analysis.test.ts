import { describe, expect, test } from "vitest";

import { analyzeLeadSession, renderLeadReport } from "../src/lead-analysis.js";

describe("analyzeLeadSession", () => {
  test("promotes repeated purchase-intent comments into high-intent leads", async () => {
    const analysis = await analyzeLeadSession({
      roomUrl: "https://live.douyin.com/812195156626",
      startedAt: "2026-04-15T10:00:00.000Z",
      endedAt: "2026-04-15T10:30:00.000Z",
      events: [
        {
          kind: "comment",
          nickname: "阿秋",
          comment: "怎么买课程",
          rawText: "阿秋：怎么买课程",
          detectedAt: "2026-04-15T10:00:05.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          source: "websocket"
        },
        {
          kind: "comment",
          nickname: "阿秋",
          comment: "多少钱",
          rawText: "阿秋：多少钱",
          detectedAt: "2026-04-15T10:00:15.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          source: "websocket"
        },
        {
          kind: "gift",
          nickname: "阿秋",
          gift: "小心心",
          rawText: "阿秋 送出了 小心心",
          detectedAt: "2026-04-15T10:00:20.000Z",
          pageUrl: "https://live.douyin.com/812195156626"
        },
        {
          kind: "comment",
          nickname: "路人甲",
          comment: "哈哈哈哈",
          rawText: "路人甲：哈哈哈哈",
          detectedAt: "2026-04-15T10:00:30.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          source: "websocket"
        }
      ]
    });

    expect(analysis.leads[0]).toMatchObject({
      nickname: "阿秋",
      tier: "high_intent"
    });
    expect(analysis.users.find((user) => user.nickname === "路人甲")?.tier).toBe("low_signal");
  });

  test("drops short-stay silent visitors from extracted users", async () => {
    const analysis = await analyzeLeadSession({
      roomUrl: "https://live.douyin.com/812195156626",
      startedAt: "2026-04-15T10:00:00.000Z",
      endedAt: "2026-04-15T10:00:50.000Z",
      events: [
        {
          kind: "join",
          nickname: "路过观众",
          rawText: "路过观众 进入了直播间",
          detectedAt: "2026-04-15T10:00:05.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          source: "dom"
        }
      ]
    });

    expect(analysis.users.find((user) => user.nickname === "路过观众")).toBeUndefined();
  });

  test("deduplicates identical comments emitted by websocket and DOM fallback", async () => {
    const analysis = await analyzeLeadSession({
      roomUrl: "https://live.douyin.com/812195156626",
      startedAt: "2026-04-15T10:00:00.000Z",
      endedAt: "2026-04-15T10:00:50.000Z",
      events: [
        {
          kind: "comment",
          nickname: "阿秋",
          comment: "怎么买课程",
          rawText: "阿秋：怎么买课程",
          detectedAt: "2026-04-15T10:00:05.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          source: "websocket"
        },
        {
          kind: "comment",
          nickname: "阿秋",
          comment: "怎么买课程",
          rawText: "阿秋：怎么买课程",
          detectedAt: "2026-04-15T10:00:06.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          profileUrl: "https://www.douyin.com/user/alpha",
          source: "dom"
        }
      ]
    });

    expect(analysis.users[0]).toMatchObject({
      nickname: "阿秋",
      commentCount: 1
    });
    expect(analysis.users[0]?.comments).toEqual(["怎么买课程"]);
  });

  test("keeps same-nickname users separate when profile URLs differ", async () => {
    const analysis = await analyzeLeadSession({
      roomUrl: "https://live.douyin.com/812195156626",
      startedAt: "2026-04-15T10:00:00.000Z",
      endedAt: "2026-04-15T10:05:00.000Z",
      events: [
        {
          kind: "comment",
          nickname: "阿秋",
          comment: "怎么买课程",
          rawText: "阿秋：怎么买课程",
          detectedAt: "2026-04-15T10:00:05.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          profileUrl: "https://www.douyin.com/user/alpha",
          source: "dom"
        },
        {
          kind: "comment",
          nickname: "阿秋",
          comment: "多少钱",
          rawText: "阿秋：多少钱",
          detectedAt: "2026-04-15T10:01:05.000Z",
          pageUrl: "https://live.douyin.com/812195156626",
          profileUrl: "https://www.douyin.com/user/beta",
          source: "dom"
        }
      ]
    });

    expect(analysis.users).toHaveLength(2);
    expect(analysis.users.map((user) => user.profileUrl)).toEqual([
      "https://www.douyin.com/user/alpha",
      "https://www.douyin.com/user/beta"
    ]);
  });
});

describe("renderLeadReport", () => {
  test("renders a markdown summary with top leads", () => {
    const report = renderLeadReport({
      roomUrl: "https://live.douyin.com/812195156626",
      startedAt: "2026-04-15T10:00:00.000Z",
      endedAt: "2026-04-15T10:30:00.000Z",
      users: [],
      leads: [
        {
          nickname: "阿秋",
          tier: "high_intent",
          score: 16,
          commentCount: 2,
          giftCount: 1,
          joinCount: 1,
          comments: ["怎么买课程", "多少钱"],
          topSignals: ["价格咨询", "购买路径"],
          evidenceComments: ["怎么买课程", "多少钱"],
          recommendedAction: "优先私聊跟进"
        }
      ]
    });

    expect(report).toContain("潜在客户分析报告");
    expect(report).toContain("阿秋");
    expect(report).toContain("优先私聊跟进");
  });
});
