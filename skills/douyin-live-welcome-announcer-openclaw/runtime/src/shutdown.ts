import type { LeadAnalysisResult } from "./lead-analysis.js";
import type { SessionCounts, SessionRecorder, SessionSummary } from "./session.js";

interface WatcherLike {
  context: {
    isClosed(): boolean;
  };
  stop(): Promise<void>;
}

interface SpeakerLike {
  stop(): void;
  waitForIdle(): Promise<void>;
}

interface FinalizeWatcherSessionOptions {
  watcher: WatcherLike;
  speaker: SpeakerLike;
  sessionRecorder: SessionRecorder;
  counts: SessionCounts;
  analyze(args: { summary: SessionSummary; context: WatcherLike["context"] | undefined }): Promise<LeadAnalysisResult>;
  writeAnalysis(args: { summary: SessionSummary; analysis: LeadAnalysisResult }): Promise<void>;
  log(message: string): void;
}

export async function finalizeWatcherSession(options: FinalizeWatcherSessionOptions): Promise<void> {
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
