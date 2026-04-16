export interface CliConfig {
  audioPath: string;
  sheetUrl?: string;
  sheetTitle: string;
  docSpace: string;
  providerKey?: string;
  transcribeModel?: string;
  extractModel?: string;
  outputJson: boolean;
  openclawConfigPath: string;
}

export interface OpenClawProviderModel {
  id: string;
  name?: string;
}

export interface OpenClawProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  api?: string;
  models?: OpenClawProviderModel[];
}

export interface OpenClawConfigFile {
  models?: {
    providers?: Record<string, OpenClawProviderConfig>;
  };
}

export interface ProviderSettings {
  providerKey: string;
  baseUrl: string;
  apiKey: string;
  extractModel: string;
  transcribeModel: string;
}

export interface MindmapNode {
  title: string;
  children?: MindmapNode[];
}

export interface AnalysisRecord {
  date: string;
  customerName: string;
  phone: string;
  customerCategory: string;
  needs: string;
  engagementStage: string;
  summary: string;
  nextActions: string[];
  risks: string[];
  mindmap: MindmapNode[];
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<CommandOutput>;
