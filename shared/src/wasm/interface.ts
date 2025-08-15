import { AnalysisResult, AnalysisRequest } from '../types/analysis';

export interface WASMModule {
  analyzeFile(content: string): Promise<AnalysisResult>;
  calculateEntropy(text: string): number;
  findBannedPhrases(text: string): Promise<string[]>;
  detectPIIPatterns(text: string): Promise<PIIPattern[]>;
  getTopWords(text: string, count: number): Promise<string[]>;
  
  // Streaming interface for large files
  createStreamingAnalyzer(): any;
  processChunk(analyzer: any, chunk: string): void;
  finalizeStreaming(analyzer: any): AnalysisResult;
  getStreamingStats(analyzer: any): any;
}

export interface WASMLoader {
  load(): Promise<WASMModule>;
  isLoaded(): boolean;
}

export interface AnalysisResult {
  topWords: string[];
  bannedPhrases: string[];
  piiPatterns: PIIPattern[];
  entropy: number;
  isObfuscated: boolean;
  decision: 'allow' | 'block';
  reason: string;
  riskScore: number;
  stats?: {
    processingTime: number;
    memoryUsage: number;
    throughput: number;
  };
}

export interface PIIPattern {
  type: string;
  value: string;
  confidence: number;
}
