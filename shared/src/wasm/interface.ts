import { AnalysisResult, AnalysisRequest } from '../types/analysis';

export interface WASMModule {
  analyzeFile(content: string): Promise<AnalysisResult>;
  calculateEntropy(text: string): number;
  findBannedPhrases(text: string): Promise<string[]>;
  detectPIIPatterns(text: string): Promise<string[]>;
  getTopWords(text: string, count: number): Promise<Array<{ word: string; count: number }>>;
}

export interface WASMLoader {
  load(): Promise<WASMModule>;
  isLoaded(): boolean;
}
