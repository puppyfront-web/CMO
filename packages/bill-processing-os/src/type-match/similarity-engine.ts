function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function coverageScore(terms: string[], text: string): number {
  const normalizedText = normalize(text);

  if (terms.length === 0 || normalizedText.length === 0) {
    return 0;
  }

  const matched = unique(terms).filter((term) => normalizedText.includes(normalize(term)));

  return matched.length / unique(terms).length;
}

export interface SimilarityBreakdown {
  keyword_score: number;
  header_score: number;
  text_score: number;
  score: number;
}

export function scoreTemplateSimilarity(input: {
  text: string;
  headers: string[];
  layoutFeatures: string[];
  keywordTerms: string[];
  headerTerms: string[];
  searchableTerms: string[];
}): SimilarityBreakdown {
  const headerBlob = input.headers.join(" ");
  const layoutBlob = input.layoutFeatures.join(" ");
  const textBlob = [input.text, headerBlob, layoutBlob].join(" ");

  const keyword_score = coverageScore(input.keywordTerms, [input.text, headerBlob].join(" "));
  const header_score = coverageScore(input.headerTerms, headerBlob);
  const text_score = coverageScore(input.searchableTerms, textBlob);
  const score = Number(
    (keyword_score * 0.5 + header_score * 0.35 + text_score * 0.15).toFixed(4),
  );

  return {
    keyword_score,
    header_score,
    text_score,
    score,
  };
}

