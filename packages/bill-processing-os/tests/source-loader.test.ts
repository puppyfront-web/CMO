import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBillSourcesFromPath } from "../src/input/source-loader.js";

describe("source loader", () => {
  it("loads markdown bill files as parse sources", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bill-source-loader-"));
    const markdownPath = path.join(tempDir, "bill.md");

    await writeFile(
      markdownPath,
      [
        "销货清单",
        "供应商: 旺泰",
        "日期: 2026-04-01",
        "合计: 1280",
      ].join("\n"),
      "utf8",
    );

    const sources = await loadBillSourcesFromPath(markdownPath);

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      source_filename: "bill.md",
      mime_type: "text/markdown",
      markdown: expect.stringContaining("销货清单"),
      file_url: expect.stringContaining("bill.md"),
    });
  });

  it("loads directories and sorts supported files deterministically", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bill-source-loader-dir-"));
    const inputDir = path.join(tempDir, "inputs");

    await mkdir(inputDir, { recursive: true });
    await writeFile(path.join(inputDir, "b.txt"), "供应商: B\n合计: 20\n", "utf8");
    await writeFile(path.join(inputDir, "a.md"), "供应商: A\n合计: 10\n", "utf8");

    const sources = await loadBillSourcesFromPath(inputDir);

    expect(sources.map((source) => source.source_filename)).toEqual(["a.md", "b.txt"]);
  });

  it("loads image bill files by invoking an OCR command", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bill-source-loader-image-"));
    const imagePath = path.join(tempDir, "ticket.jpg");
    const ocrScriptPath = path.join(tempDir, "ocr-provider.sh");

    await writeFile(imagePath, "fake-image-binary", "utf8");
    await writeFile(
      ocrScriptPath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "printf '%s\\n' '销货清单'",
        "printf '%s\\n' '供应商: 宇博布行'",
        "printf '%s\\n' '日期: 2026-04-10'",
        "printf '%s\\n' '本单金额: 591.60'",
      ].join("\n"),
      "utf8",
    );
    await chmod(ocrScriptPath, 0o755);

    const sources = await loadBillSourcesFromPath(imagePath, {
      ocrCommand: ocrScriptPath,
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      source_filename: "ticket.jpg",
      mime_type: "image/jpeg",
      markdown: expect.stringContaining("宇博布行"),
      ocr_text: expect.stringContaining("591.60"),
      image_meta: expect.objectContaining({
        source_kind: "image_file",
        ocr_provider: "command",
      }),
    });
  });
});
