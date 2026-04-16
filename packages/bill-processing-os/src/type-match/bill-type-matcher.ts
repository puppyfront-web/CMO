import type { TemplateIndex, TemplateIndexEntry } from "./template-index.js";
import { scoreTemplateSimilarity } from "./similarity-engine.js";

export interface TemplateCandidate {
  type_id: string;
  score: number;
  keyword_score: number;
  header_score: number;
  text_score: number;
}

export interface TypeMatchResult {
  candidates: TemplateCandidate[];
  type_match: number;
  action: "MATCH" | "TYPE_ONBOARDING";
  ambiguity: boolean;
  matched_template: TemplateIndexEntry["template"] | null;
}

function defaultThreshold(value?: number): number {
  return value ?? 0.6;
}

export function matchBillTypes(
  index: TemplateIndex,
  input: {
    text: string;
    headers?: string[];
    layout_features?: string[];
    onboarding_threshold?: number;
    ambiguity_threshold?: number;
  },
): TypeMatchResult {
  const headers = input.headers ?? [];
  const layoutFeatures = input.layout_features ?? [];

  const candidates = index.entries
    .map<TemplateCandidate>((entry) => {
      const breakdown = scoreTemplateSimilarity({
        text: input.text,
        headers,
        layoutFeatures,
        keywordTerms: entry.keywordTerms,
        headerTerms: entry.headerTerms,
        searchableTerms: entry.searchableTerms,
      });

      return {
        type_id: entry.template.type_id,
        score: breakdown.score,
        keyword_score: breakdown.keyword_score,
        header_score: breakdown.header_score,
        text_score: breakdown.text_score,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.type_id.localeCompare(right.type_id, "zh-Hans-CN");
    });

  const type_match = candidates[0]?.score ?? 0;
  const threshold = defaultThreshold(input.onboarding_threshold);
  const ambiguityThreshold = input.ambiguity_threshold ?? 0.15;
  const secondScore = candidates[1]?.score ?? 0;
  const ambiguity =
    type_match >= threshold &&
    candidates.length > 1 &&
    type_match - secondScore <= ambiguityThreshold;

  return {
    candidates,
    type_match,
    action: type_match < threshold ? "TYPE_ONBOARDING" : "MATCH",
    ambiguity,
    matched_template:
      type_match < threshold
        ? null
        : index.entries.find(
            (entry) => entry.template.type_id === candidates[0]?.type_id,
          )?.template ?? null,
  };
}
