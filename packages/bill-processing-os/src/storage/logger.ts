import type { DocumentState } from "../domain/execution.js";
import type { EventLog } from "./event-log.js";

export interface StructuredLogger {
  layerStart(layer: string, details?: Record<string, unknown>): Promise<void>;
  layerEnd(layer: string, details?: Record<string, unknown>): Promise<void>;
  layerFail(layer: string, details?: Record<string, unknown>): Promise<void>;
  stateTransition(
    documentId: string,
    fromState: DocumentState,
    toState: DocumentState,
    details?: Record<string, unknown>,
  ): Promise<void>;
  decision(documentId: string, decision: string, details?: Record<string, unknown>): Promise<void>;
  info(message: string, details?: Record<string, unknown>): Promise<void>;
}

export function createStructuredLogger(eventLog: EventLog, traceId: string): StructuredLogger {
  const emit = async (
    kind: string,
    message: string,
    details?: Record<string, unknown>,
    documentId?: string,
    extra?: Record<string, unknown>,
  ) => {
    await eventLog.append({
      trace_id: traceId,
      kind,
      message,
      document_id: documentId,
      details,
      ...extra,
    });
  };

  return {
    async layerStart(layer, details) {
      await emit("layer_start", layer, details);
    },
    async layerEnd(layer, details) {
      await emit("layer_end", layer, details);
    },
    async layerFail(layer, details) {
      await emit("layer_fail", layer, details);
    },
    async stateTransition(documentId, fromState, toState, details) {
      await emit("state_transition", `${fromState} -> ${toState}`, details, documentId, {
        from_state: fromState,
        to_state: toState,
      });
    },
    async decision(documentId, decision, details) {
      await emit("decision", decision, details, documentId, { decision });
    },
    async info(message, details) {
      await emit("log", message, details);
    },
  };
}
