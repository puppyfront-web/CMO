import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import type { ParseSourceInput } from "../parse/preprocess.js";

const execFileAsync = promisify(execFile);

const TEXT_EXTENSIONS = new Set([".json", ".md", ".txt"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS, ...PDF_EXTENSIONS]);

export interface SourceLoaderOptions {
  ocrCommand?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDocId(fileName: string): string {
  return `doc-${slugify(fileName.replace(/\.[^.]+$/, "")) || "source"}`;
}

function isSupportedFile(fileName: string): boolean {
  return SUPPORTED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function inferMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".md") {
    return "text/markdown";
  }

  if (extension === ".txt") {
    return "text/plain";
  }

  if (extension === ".json") {
    return "application/json";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".gif") {
    return "image/gif";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".bmp") {
    return "image/bmp";
  }

  if (extension === ".tif" || extension === ".tiff") {
    return "image/tiff";
  }

  if (extension === ".pdf") {
    return "application/pdf";
  }

  return "application/octet-stream";
}

async function loadJsonSource(filePath: string): Promise<ParseSourceInput[]> {
  const contents = await readFile(filePath, "utf8");
  const parsed = JSON.parse(contents) as ParseSourceInput | ParseSourceInput[];
  const sources = Array.isArray(parsed) ? parsed : [parsed];

  return sources.map((source, index) => ({
    ...source,
    doc_id: source.doc_id || `${buildDocId(path.basename(filePath))}-${index + 1}`,
    file_url: source.file_url || pathToFileURL(filePath).href,
    source_filename: source.source_filename || path.basename(filePath),
  }));
}

async function loadTextSource(filePath: string, extension: ".md" | ".txt"): Promise<ParseSourceInput[]> {
  const contents = await readFile(filePath, "utf8");
  const fileName = path.basename(filePath);

  return [
    {
      doc_id: buildDocId(fileName),
      file_url: pathToFileURL(filePath).href,
      source_filename: fileName,
      mime_type: extension === ".md" ? "text/markdown" : "text/plain",
      markdown: contents,
      ocr_text: extension === ".txt" ? contents : "",
      image_meta: {
        source_kind: extension === ".md" ? "markdown_file" : "text_file",
      },
    },
  ];
}

async function runOcrCommand(filePath: string, ocrCommand: string): Promise<string> {
  const { stdout } = await execFileAsync(ocrCommand, [filePath], {
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout.trim();
}

async function loadVisualSource(filePath: string, options: SourceLoaderOptions): Promise<ParseSourceInput[]> {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const transcript = options.ocrCommand ? await runOcrCommand(filePath, options.ocrCommand) : "";
  const isPdf = PDF_EXTENSIONS.has(extension);

  return [
    {
      doc_id: buildDocId(fileName),
      file_url: pathToFileURL(filePath).href,
      source_filename: fileName,
      mime_type: inferMimeType(filePath),
      markdown: transcript,
      ocr_text: transcript,
      image_meta: {
        source_kind: isPdf ? "pdf_file" : "image_file",
        ocr_provider: options.ocrCommand ? "command" : "none",
        original_extension: extension,
      },
    },
  ];
}

async function loadFile(filePath: string, options: SourceLoaderOptions): Promise<ParseSourceInput[]> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".json") {
    return loadJsonSource(filePath);
  }

  if (extension === ".md" || extension === ".txt") {
    return loadTextSource(filePath, extension);
  }

  if (IMAGE_EXTENSIONS.has(extension) || PDF_EXTENSIONS.has(extension)) {
    return loadVisualSource(filePath, options);
  }

  throw new Error(`Unsupported bill input file: ${filePath}`);
}

export async function loadBillSourcesFromPath(
  inputPath: string,
  options: SourceLoaderOptions = {},
): Promise<ParseSourceInput[]> {
  const inputStat = await stat(inputPath);

  if (inputStat.isFile()) {
    return loadFile(inputPath, options);
  }

  const entries = (await readdir(inputPath))
    .filter(isSupportedFile)
    .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));

  const sources: ParseSourceInput[] = [];
  for (const entry of entries) {
    sources.push(...(await loadFile(path.join(inputPath, entry), options)));
  }

  return sources;
}
