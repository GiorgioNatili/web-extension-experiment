// Chrome WASM Loader
import { CONFIG } from 'shared';

export interface StreamingAnalyzer {
  processChunk(chunk: string): void;
  finalize(): any;
  reset(): void;
}

export interface StreamingConfig {
  chunkSize: number;
  maxFileSize: number;
  timeoutMs: number;
}

export class ChromeWASMLoader {
  private moduleLoaded = false;
  private moduleStatus = 'not_loaded';
  private loadPromise: Promise<void> | null = null;

  /**
   * Load the WASM module
   */
  async loadWASMModule(): Promise<void> {
    if (this.moduleLoaded) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.moduleStatus = 'loading';
    this.loadPromise = this._loadModule();
    
    try {
      await this.loadPromise;
      this.moduleLoaded = true;
      this.moduleStatus = 'loaded';
      console.log('Chrome WASM module loaded successfully');
    } catch (error) {
      this.moduleStatus = 'error';
      console.error('Failed to load Chrome WASM module:', error);
      throw error;
    }
  }

  /**
   * Private method to actually load the module
   */
  private async _loadModule(): Promise<void> {
    // Simulate WASM loading for now
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, this would load the actual WASM module
    // For now, we'll use a mock implementation
    console.log('Chrome WASM module loading simulation complete');
  }

  /**
   * Check if the module is loaded
   */
  isModuleLoaded(): boolean {
    return this.moduleLoaded;
  }

  /**
   * Get module status
   */
  getModuleStatus(): string {
    return this.moduleStatus;
  }

  /**
   * Create a streaming analyzer
   */
  createStreamingAnalyzer(): StreamingAnalyzer {
    if (!this.moduleLoaded) {
      throw new Error('WASM module not loaded');
    }

    return new MockStreamingAnalyzer();
  }

  /**
   * Unload the module
   */
  unloadModule(): void {
    this.moduleLoaded = false;
    this.moduleStatus = 'not_loaded';
    this.loadPromise = null;
    console.log('Chrome WASM module unloaded');
  }
}

/**
 * Mock streaming analyzer for Chrome
 */
class MockStreamingAnalyzer implements StreamingAnalyzer {
  private chunks: string[] = [];
  private totalSize = 0;

  processChunk(chunk: string): void {
    this.chunks.push(chunk);
    this.totalSize += chunk.length;
  }

  finalize(): any {
    const content = this.chunks.join('');
    
    // Mock analysis results
    const result = {
      topWords: this.extractTopWords(content),
      bannedPhrases: this.detectBannedPhrases(content),
      piiPatterns: this.detectPII(content),
      entropy: this.calculateEntropy(content),
      isObfuscated: this.detectObfuscation(content),
      decision: this.makeDecision(content),
      reason: this.getReason(content),
      riskScore: this.calculateRiskScore(content),
      stats: {
        totalChunks: this.chunks.length,
        totalContent: this.totalSize,
        processingTime: Date.now(),
        performance: {
          timing: { total_time: 100 },
          memory: { peak_memory: 1024 },
          throughput: { bytes_per_second: 1000 }
        }
      }
    };

    this.reset();
    return result;
  }

  reset(): void {
    this.chunks = [];
    this.totalSize = 0;
  }

  private extractTopWords(content: string): string[] {
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private detectBannedPhrases(content: string): string[] {
    const bannedPhrases = ['malware', 'virus', 'trojan', 'spyware'];
    const found: string[] = [];
    
    bannedPhrases.forEach(phrase => {
      if (content.toLowerCase().includes(phrase)) {
        found.push(phrase);
      }
    });

    return found;
  }

  private detectPII(content: string): string[] {
    const patterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
    ];

    const found: string[] = [];
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        found.push(...matches);
      }
    });

    return found;
  }

  private calculateEntropy(content: string): number {
    const charCount = new Map<string, number>();
    const totalChars = content.length;

    for (const char of content) {
      charCount.set(char, (charCount.get(char) || 0) + 1);
    }

    let entropy = 0;
    for (const count of charCount.values()) {
      const probability = count / totalChars;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private detectObfuscation(content: string): boolean {
    const entropy = this.calculateEntropy(content);
    return entropy > CONFIG.ENTROPY_THRESHOLD;
  }

  private makeDecision(content: string): 'allow' | 'block' {
    const riskScore = this.calculateRiskScore(content);
    return riskScore > CONFIG.RISK_THRESHOLD ? 'block' : 'allow';
  }

  private getReason(content: string): string {
    const bannedPhrases = this.detectBannedPhrases(content);
    const piiPatterns = this.detectPII(content);
    const isObfuscated = this.detectObfuscation(content);

    if (bannedPhrases.length > 0) {
      return `Detected banned phrases: ${bannedPhrases.join(', ')}`;
    }
    if (piiPatterns.length > 0) {
      return `Detected PII patterns: ${piiPatterns.length} matches`;
    }
    if (isObfuscated) {
      return 'High entropy detected - possible obfuscation';
    }
    return 'File appears to be safe';
  }

  private calculateRiskScore(content: string): number {
    let score = 0;
    
    // Banned phrases
    const bannedPhrases = this.detectBannedPhrases(content);
    score += bannedPhrases.length * 0.3;
    
    // PII patterns
    const piiPatterns = this.detectPII(content);
    score += piiPatterns.length * 0.2;
    
    // Obfuscation
    if (this.detectObfuscation(content)) {
      score += 0.4;
    }
    
    return Math.min(score, 1.0);
  }
}

// Export singleton instance
export const chromeWASMLoader = new ChromeWASMLoader();
