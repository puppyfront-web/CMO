import type { BillDocument } from "../domain/bill-document.js";

export interface DuplicateCandidate {
  doc_hash: string | null;
  total_amount: string | number | null;
  bill_date: string | null;
}

export interface DuplicateResult {
  dedupe_key: string;
  is_duplicate: boolean;
  matched_index: number | null;
}

function toKeyPart(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "missing";
  }

  return String(value);
}

function readDocumentField(
  document: BillDocument,
  fieldName: string,
): string | number | null | undefined {
  const normalizedField = document.normalized.fields[fieldName];
  if (normalizedField !== undefined && normalizedField !== null) {
    return normalizedField as string | number;
  }

  return document.parsed.fields[fieldName] as string | number | null | undefined;
}

export function buildBillDedupeKey(document: BillDocument): string {
  return [
    toKeyPart(document.doc_hash),
    toKeyPart(readDocumentField(document, "total_amount")),
    toKeyPart(readDocumentField(document, "bill_date")),
  ].join("|");
}

export function detectBillDuplicate(
  document: BillDocument,
  candidates: DuplicateCandidate[],
): DuplicateResult {
  const dedupe_key = buildBillDedupeKey(document);

  const matched_index = candidates.findIndex((candidate) => {
    return (
      toKeyPart(candidate.doc_hash) === toKeyPart(document.doc_hash) &&
      toKeyPart(candidate.total_amount) ===
        toKeyPart(readDocumentField(document, "total_amount")) &&
      toKeyPart(candidate.bill_date) ===
        toKeyPart(readDocumentField(document, "bill_date"))
    );
  });

  return {
    dedupe_key,
    is_duplicate: matched_index >= 0,
    matched_index: matched_index >= 0 ? matched_index : null,
  };
}
