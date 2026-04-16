import fs from "node:fs";

import { parseCliArgs } from "./config.js";
import {
  buildDetailDocumentTitle,
  formatSheetRow,
  renderDetailDocumentMarkdown
} from "./extraction.js";
import { appendSpreadsheetRow, createDetailDocument, ensureSpreadsheet } from "./feishu.js";
import { extractAnalysis, transcribeAudio } from "./model-client.js";
import {
  loadOpenClawConfig,
  resolveProviderSettings,
  resolveSpreadsheetUrlFromEnv
} from "./openclaw-config.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const cliConfig = parseCliArgs(args);

  if (!fs.existsSync(cliConfig.audioPath)) {
    throw new Error(`Audio file not found: ${cliConfig.audioPath}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const openclawConfig = loadOpenClawConfig(cliConfig.openclawConfigPath);
  const providerSettings = resolveProviderSettings(process.env, openclawConfig, cliConfig);
  const transcript = await transcribeAudio(cliConfig.audioPath, providerSettings);
  const analysis = await extractAnalysis(transcript, providerSettings, today);
  const detailDocumentTitle = buildDetailDocumentTitle(analysis);
  const detailMarkdown = renderDetailDocumentMarkdown(analysis, transcript);
  const detailDocumentUrl = await createDetailDocument(
    detailDocumentTitle,
    detailMarkdown,
    cliConfig.docSpace
  );
  const spreadsheetUrl = await ensureSpreadsheet(
    cliConfig.sheetUrl ?? resolveSpreadsheetUrlFromEnv(process.env),
    cliConfig.sheetTitle
  );
  await appendSpreadsheetRow(spreadsheetUrl, formatSheetRow(analysis, detailDocumentUrl));

  const output = {
    spreadsheetUrl,
    detailDocumentUrl,
    detailDocumentTitle,
    transcript,
    analysis
  };

  if (cliConfig.outputJson) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`Spreadsheet: ${spreadsheetUrl}`);
  console.log(`Detail document: ${detailDocumentUrl}`);
  console.log(`Customer: ${analysis.customerName}`);
  console.log(`Stage: ${analysis.engagementStage}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

function printHelp(): void {
  console.log(`Usage: tsx src/cli.ts --audio /absolute/path/to/call.m4a [options]

Options:
  --audio <path>             Local audio file path
  --sheet-url <url>          Existing Feishu spreadsheet URL
  --sheet-title <title>      Spreadsheet title when auto-creating one
  --doc-space <space>        Feishu wiki space, defaults to my_library
  --provider <key>           Provider key from ~/.openclaw/openclaw.json
  --transcribe-model <id>    Override transcription model
  --extract-model <id>       Override extraction model
  --openclaw-config <path>   Custom OpenClaw config file path
  --json                     Print final result as JSON
  --help                     Show this message
`);
}
