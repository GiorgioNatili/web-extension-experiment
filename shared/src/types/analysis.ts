export interface AnalysisResult {
  topWords: Array<{ word: string; count: number }>;
  bannedPhrases: Array<{ phrase: string; count: number }>;
  piiPatterns: Array<{ pattern: string; count: number }>;
  entropy: number;
  isObfuscated: boolean;
  decision: 'allow' | 'block';
  reason: string;
}

export interface AnalysisRequest {
  content: string;
}
