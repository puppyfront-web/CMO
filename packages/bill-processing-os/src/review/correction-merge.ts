import type { BillDocument } from "../domain/bill-document.js";

export interface CorrectionAuditEntry {
  path: string;
  previous_value: unknown;
  next_value: unknown;
  review_task_id: string | null;
  reason: string;
  corrected_at: string;
}

export interface CorrectionMergeResult {
  document: BillDocument;
  audit_trail: CorrectionAuditEntry[];
}

function cloneDocument(document: BillDocument): BillDocument {
  return structuredClone(document);
}

function applyFieldCorrection(
  document: BillDocument,
  path: string,
  value: unknown,
  reviewTaskId: string | null,
  reason: string,
): CorrectionAuditEntry | null {
  const fieldName = path.slice("fields.".length);
  const previous_value = document.normalized.fields[fieldName];
  document.normalized.fields[fieldName] = value;
  return {
    path,
    previous_value,
    next_value: value,
    review_task_id: reviewTaskId,
    reason,
    corrected_at: new Date().toISOString(),
  };
}

function applyItemCorrection(
  document: BillDocument,
  path: string,
  value: unknown,
  reviewTaskId: string | null,
  reason: string,
): CorrectionAuditEntry | null {
  const segments = path.split(".");
  if (segments.length < 3) {
    return null;
  }

  const index = Number(segments[1]);
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }

  const fieldName = segments.slice(2).join(".");
  const currentItem = document.normalized.items[index] ?? {};
  const previous_value = currentItem[fieldName];
  document.normalized.items[index] = {
    ...currentItem,
    [fieldName]: value,
  };

  return {
    path,
    previous_value,
    next_value: value,
    review_task_id: reviewTaskId,
    reason,
    corrected_at: new Date().toISOString(),
  };
}

export function mergeCorrectionsIntoBillDocument(
  document: BillDocument,
  corrections: Record<string, unknown>,
  reviewTaskId: string | null,
  reason: string,
): CorrectionMergeResult {
  const nextDocument = cloneDocument(document);
  const audit_trail: CorrectionAuditEntry[] = [];

  for (const [path, value] of Object.entries(corrections)) {
    let entry: CorrectionAuditEntry | null = null;

    if (path.startsWith("fields.")) {
      entry = applyFieldCorrection(nextDocument, path, value, reviewTaskId, reason);
    } else if (path.startsWith("items.")) {
      entry = applyItemCorrection(nextDocument, path, value, reviewTaskId, reason);
    }

    if (entry) {
      audit_trail.push(entry);
    }
  }

  nextDocument.audit.updated_at = new Date().toISOString();

  return {
    document: nextDocument,
    audit_trail,
  };
}
