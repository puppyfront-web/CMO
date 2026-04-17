import type { BrowserContext } from "playwright";

import type { LeadAnalysisResult } from "./lead-analysis.js";
import type { SessionCounts, SessionRecorder, SessionSummary } from "./session.js";

interface WatcherContextLike {
  isClosed(): boolean;
}

interface WatcherLike<TContext extends WatcherContextLike = BrowserContext> {
  context: TContext;
  stop(): Promise<void>;
}

interface SpeakerLike {
  stop(): void;
  waitForIdle(): Promise<void>;
}

interface FinalizeWatcherSessionOptions<TContext extends WatcherContextLike = BrowserContext> {
  watcher: WatcherLike<TContext>;
  speaker: SpeakerLike;
  sessionRecorder: SessionRecorder;
  counts: SessionCounts;
  analyze(args: { summary: SessionSummary; context: TContext | undefined }): Promise<LeadAnalysisResult>;
  writeAnalysis(args: { summary: SessionSummary; analysis: LeadAnalysisResult }): Promise<void>;
  log(message: string): void;
}

export function finalizeWatcherSession(options: FinalizeWatcherSessionOptions<BrowserContext>): Promise<void>;
export function finalizeWatcherSession<TContext extends WatcherContextLike>(
  options: FinalizeWatcherSessionOptions<TContext>
): Promise<void>;
export async function finalizeWatcherSession<TContext extends WatcherContextLike>(
  options: FinalizeWatcherSessionOptions<TContext>
): Promise<void> {
  options.speaker.stop();
  await options.watcher.stop();

  const summary = await options.sessionRecorder.finalize({
    counts: options.counts
  });
  const context = options.watcher.context.isClosed() ? undefined : options.watcher.context;
  const analysis = await options.analyze({
    summary,
    context
  });

  await options.writeAnalysis({
    summary,
    analysis
  });
  options.log(`潜客分析已输出：${summary.sessionDir}`);
  await options.speaker.waitForIdle();
}
