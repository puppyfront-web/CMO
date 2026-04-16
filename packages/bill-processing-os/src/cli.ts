import { runBillTaskPipeline } from "./pipeline.js";
import { loadBillSourcesFromPath } from "./input/source-loader.js";
import { loadTemplateBundle } from "./template/template-bundle.js";
import { writeWorkbookStateToXlsx } from "./write/xlsx-file.js";

export interface CliIo {
  writeStdout: (chunk: string) => void;
  writeStderr: (chunk: string) => void;
}

function defaultIo(): CliIo {
  return {
    writeStdout: (chunk) => process.stdout.write(chunk),
    writeStderr: (chunk) => process.stderr.write(chunk),
  };
}

function readFlagValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }

  return argv[index + 1] ?? null;
}

function readFlagValues(argv: string[], flag: string): string[] {
  const values: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === flag && argv[index + 1]) {
      values.push(argv[index + 1]!);
    }
  }

  return values;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export async function runCli(argv: string[], io: CliIo = defaultIo()): Promise<number> {
  const [command] = argv;

  if (command !== "run") {
    io.writeStderr("Usage: run --input <file-or-dir> [--template-bundle <file>] [--ocr-command <executable>] [--excel-out <file>] [--home-dir <dir>] [--json]\n");
    return 1;
  }

  const inputPath = readFlagValue(argv, "--input");
  if (!inputPath) {
    io.writeStderr("Missing required --input argument\n");
    return 1;
  }

  const sources = await loadBillSourcesFromPath(inputPath, {
    ocrCommand: readFlagValue(argv, "--ocr-command") ?? undefined,
  });
  const templateBundles = await Promise.all(
    readFlagValues(argv, "--template-bundle").map((bundlePath) => loadTemplateBundle(bundlePath)),
  );
  const result = await runBillTaskPipeline({
    sources,
    templates: templateBundles.map((bundle) => bundle.template),
    excel_mappings: templateBundles.map((bundle) => bundle.excel_mapping),
    home_dir: readFlagValue(argv, "--home-dir") ?? undefined,
    user_intent: sources.length > 1 ? "batch process these bills" : "process this bill",
  });
  const excelOut = readFlagValue(argv, "--excel-out");

  if (excelOut) {
    await writeWorkbookStateToXlsx(result.workbook, excelOut);
  }

  if (hasFlag(argv, "--json")) {
    io.writeStdout(
      `${JSON.stringify(
        {
          task_id: result.task.task_id,
          summary: result.summary,
          excel_output: excelOut,
          documents: result.documents.map((document) => ({
            doc_id: document.document.doc_id,
            decision: document.decision,
            status: document.document.status,
          })),
        },
        null,
        2,
      )}\n`,
    );
  } else {
    io.writeStdout(
      `Processed ${result.summary.total} document(s): ${result.summary.written} written, ${result.summary.review_required} review, ${result.summary.type_onboarding} onboarding, ${result.summary.rejected} rejected.\n`,
    );
  }

  return 0;
}
