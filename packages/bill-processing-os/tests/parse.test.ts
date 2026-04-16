import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBillDocument } from "../src/parse/bill-parse-pipeline.js";

interface ParseFixture {
  doc_id: string;
  file_url: string;
  source_filename: string;
  mime_type: string;
  markdown?: string;
  ocr_text?: string;
  image_meta?: Record<string, unknown>;
  handwriting?: Array<{
    page: number;
    text: string;
    confidence: number;
    override_candidate?: boolean;
  }>;
}

function loadFixture(name: string): ParseFixture {
  const fixtureUrl = new URL(`./fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(fixtureUrl, "utf8")) as ParseFixture;
}

describe("bill parse pipeline", () => {
  it("detects image inputs and marks clean printed documents", () => {
    const fixture = loadFixture("clean-printed-image");

    const result = parseBillDocument(fixture);

    expect(result.input_kind).toBe("image");
    expect(result.document.status).toBe("PARSED");
    expect(result.document.raw.markdown).toBe(fixture.markdown ?? "");
    expect(result.document.raw.ocr_text).toBe(fixture.ocr_text ?? "");
    expect(result.document.raw.image_meta).toMatchObject({
      page_count: 1,
      source_kind: "image",
    });
    expect(result.document.handwriting).toEqual({
      has_handwriting: false,
      annotations: [],
    });
    expect(result.document.complexity_flags).toEqual(["clean_printed"]);

    const replayableRaw = JSON.parse(result.replay_artifacts.raw_json) as {
      markdown: string;
      ocr_text: string;
    };

    expect(replayableRaw.markdown).toBe(fixture.markdown ?? "");
    expect(replayableRaw.ocr_text).toBe(fixture.ocr_text ?? "");
  });

  it("detects text pdf inputs without handwriting and keeps markdown as the primary text layer", () => {
    const fixture = loadFixture("text-pdf");

    const result = parseBillDocument(fixture);

    expect(result.input_kind).toBe("text_pdf");
    expect(result.document.raw.markdown).toBe(fixture.markdown ?? "");
    expect(result.document.raw.ocr_text).toBe("");
    expect(result.document.raw.image_meta).toMatchObject({
      page_count: 1,
      source_kind: "text_pdf",
    });
    expect(result.document.complexity_flags).toEqual(["clean_printed"]);
  });

  it("detects handwriting overrides in scanned pdf inputs", () => {
    const fixture = loadFixture("mixed-handwriting-scanned-pdf");

    const result = parseBillDocument(fixture);

    expect(result.input_kind).toBe("scanned_pdf");
    expect(result.document.raw.ocr_text).toBe(fixture.ocr_text ?? "");
    expect(result.document.handwriting.has_handwriting).toBe(true);
    expect(result.document.handwriting.annotations).toEqual([
      expect.objectContaining({
        page: 1,
        confidence: 0.92,
        override_candidate: true,
      }),
    ]);
    expect(result.document.complexity_flags).toEqual([
      "printed_with_handwriting",
      "override_detected",
    ]);
  });

  it("flags blank scans as uncertain documents", () => {
    const fixture = loadFixture("uncertain-scanned-pdf");

    const result = parseBillDocument(fixture);

    expect(result.input_kind).toBe("scanned_pdf");
    expect(result.document.raw.markdown).toBe("");
    expect(result.document.raw.ocr_text).toBe("");
    expect(result.document.handwriting).toEqual({
      has_handwriting: false,
      annotations: [],
    });
    expect(result.document.complexity_flags).toEqual(["uncertain_document"]);
  });
});
