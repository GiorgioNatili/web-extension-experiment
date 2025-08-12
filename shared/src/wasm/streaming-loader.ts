import { 
  StreamingWASMModule, 
  StreamingWASMLoader,
  StreamingOperation,
  BackpressureControl 
} from './streaming-interface';
import { 
  WasmAnalysisResult, 
  ProcessingStats, 
  StreamingConfig,
  PerformanceMetrics,
  DEFAULT_STREAMING_CONFIG 
} from '../schema';
import { PerformanceCollector } from '../utils/performance';

/**
 * Mock implementation of streaming WASM module
 */
class MockStreamingWASMModule implements StreamingWASMModule {
  private config: StreamingConfig;
  private stats: ProcessingStats;
  private performanceCollector: PerformanceCollector;
  private totalContent = '';
  private chunkCount = 0;

  constructor() {
    this.config = { ...DEFAULT_STREAMING_CONFIG };
    this.stats = {
      total_chunks: 0,
      total_content_length: 0,
      unique_words: 0,
      banned_phrase_count: 0,
      pii_pattern_count: 0,
      processing_time_ms: 0,
      performance: {
        timing: { file_read_ms: 0, wasm_analysis_ms: 0, js_processing_ms: 0, ui_update_ms: 0, total_ms: 0 },
        memory: { peak_memory_bytes: 0, final_memory_bytes: 0, wasm_memory_bytes: 0, js_memory_bytes: 0 },
        throughput: { bytes_per_second: 0, chars_per_second: 0, chunks_per_second: 0, avg_chunk_time_ms: 0 },
        resources: { cpu_cores_used: navigator.hardwareConcurrency || 1 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 0, recovery_attempts: 0, completed_successfully: true }
      }
    };
    this.performanceCollector = new PerformanceCollector();
  }

  async init(config?: Partial<StreamingConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.performanceCollector.start();
    this.performanceCollector.mark('init');
  }

  async processChunk(chunk: string): Promise<ProcessingStats> {
    this.performanceCollector.mark('chunk_start');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
    
    this.totalContent += chunk;
    this.chunkCount++;
    
    // Update statistics
    this.stats = {
      total_chunks: this.chunkCount,
      total_content_length: this.totalContent.length,
      unique_words: this.calculateUniqueWords(),
      banned_phrase_count: this.detectBannedPhrases().length,
      pii_pattern_count: this.detectPIIPatterns().length,
      processing_time_ms: this.performanceCollector.generateMetrics(this.totalContent.length).timing.total_ms,
      performance: this.performanceCollector.generateMetrics(this.totalContent.length)
    };
    
    this.performanceCollector.mark('chunk_end');
    
    return this.stats;
  }

  async finalize(): Promise<WasmAnalysisResult> {
    this.performanceCollector.mark('finalize');
    
    // Simulate finalization delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const entropy = this.calculateEntropy();
    const bannedPhrases = this.detectBannedPhrases();
    const piiPatterns = this.detectPIIPatterns();
    const topWords = this.getTopWords();
    
    const riskScore = this.calculateRiskScore(entropy, bannedPhrases.length, piiPatterns.length);
    const decision = riskScore >= this.config.risk_threshold ? 'block' : 'allow';
    const reason = this.generateReason(bannedPhrases.length, piiPatterns.length, entropy);
    
    const finalMetrics = this.performanceCollector.generateMetrics(this.totalContent.length);
    
    return {
      risk_score: riskScore,
      decision,
      reasons: [reason],
      top_words: topWords.map(w => [w.word, w.count]),
      banned_phrases: bannedPhrases.map(phrase => ({
        phrase,
        position: this.totalContent.indexOf(phrase),
        context: this.getContext(phrase),
        severity: 'high' as const
      })),
      pii_patterns: piiPatterns.map(pattern => ({
        type: 'custom' as const,
        pattern,
        position: this.totalContent.indexOf(pattern),
        confidence: 0.8
      })),
      entropy,
      stats: {
        ...this.stats,
        performance: finalMetrics
      }
    };
  }

  getStats(): ProcessingStats {
    return this.stats;
  }

  async reset(): Promise<void> {
    this.totalContent = '';
    this.chunkCount = 0;
    this.stats = {
      total_chunks: 0,
      total_content_length: 0,
      unique_words: 0,
      banned_phrase_count: 0,
      pii_pattern_count: 0,
      processing_time_ms: 0,
      performance: this.stats.performance
    };
    this.performanceCollector = new PerformanceCollector();
  }

  async updateConfig(config: Partial<StreamingConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  private calculateUniqueWords(): number {
    const words = this.totalContent.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0 && !this.config.stopwords.includes(word));
    return new Set(words).size;
  }

  private detectBannedPhrases(): string[] {
    const found: string[] = [];
    for (const phrase of this.config.banned_phrases) {
      if (this.totalContent.toLowerCase().includes(phrase.toLowerCase())) {
        found.push(phrase);
      }
    }
    return found;
  }

  private detectPIIPatterns(): string[] {
    const patterns: string[] = [];
    const piiRegex = /\b\d{9,12}\b/g;
    let match;
    while ((match = piiRegex.exec(this.totalContent)) !== null) {
      patterns.push(match[0]);
    }
    return patterns;
  }

  private getTopWords(): Array<{ word: string; count: number }> {
    const words = this.totalContent.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0 && !this.config.stopwords.includes(word));
    
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.max_words)
      .map(([word, count]) => ({ word, count }));
  }

  private calculateEntropy(): number {
    const normalized = this.totalContent.toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    
    if (normalized.length === 0) return 0;
    
    const charCounts = new Map<string, number>();
    for (const char of normalized) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    let entropy = 0;
    const total = normalized.length;
    
    for (const count of charCounts.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  private calculateRiskScore(entropy: number, bannedCount: number, piiCount: number): number {
    const entropyScore = entropy > this.config.entropy_threshold ? 1.0 : entropy / this.config.entropy_threshold;
    const bannedScore = bannedCount > 0 ? 1.0 : 0.0;
    const piiScore = piiCount > 0 ? 1.0 : 0.0;
    
    return (entropyScore * 0.3) + (bannedScore * 0.4) + (piiScore * 0.3);
  }

  private generateReason(bannedCount: number, piiCount: number, entropy: number): string {
    const reasons: string[] = [];
    
    if (bannedCount > 0) {
      reasons.push(`Found ${bannedCount} banned phrase(s)`);
    }
    
    if (piiCount > 0) {
      reasons.push(`Detected ${piiCount} PII pattern(s)`);
    }
    
    if (entropy > this.config.entropy_threshold) {
      reasons.push('High entropy content detected');
    }
    
    return reasons.length > 0 ? reasons.join('; ') : 'No security concerns detected';
  }

  private getContext(phrase: string): string {
    const index = this.totalContent.toLowerCase().indexOf(phrase.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - 20);
    const end = Math.min(this.totalContent.length, index + phrase.length + 20);
    return this.totalContent.substring(start, end);
  }
}

/**
 * Streaming WASM loader implementation
 */
export class StreamingWASMLoaderImpl implements StreamingWASMLoader {
  private module: StreamingWASMModule | null = null;
  private loading = false;

  async load(): Promise<StreamingWASMModule> {
    if (this.module) {
      return this.module;
    }

    if (this.loading) {
      throw new Error('Streaming WASM module is already loading');
    }

    this.loading = true;
    try {
      // For now, create a mock implementation
      // In the future, this would load the actual WASM module
      this.module = new MockStreamingWASMModule();
      return this.module;
    } finally {
      this.loading = false;
    }
  }

  isLoaded(): boolean {
    return this.module !== null;
  }

  async unload(): Promise<void> {
    this.module = null;
  }
}
