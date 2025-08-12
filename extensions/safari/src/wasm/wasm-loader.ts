// Safari WASM Loader
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

export class SafariWASMLoader {
  private moduleLoaded = false;
  private moduleStatus = 'not_loaded';
  private loadPromise: Promise<void> | null = null;

  async loadWASMModule(): Promise<void> {
    if (this.moduleLoaded) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadModule();
    return this.loadPromise;
  }

  private async _loadModule(): Promise<void> {
    try {
      this.moduleStatus = 'loading';
      
      // In a real implementation, this would load the actual WASM module
      // For now, we'll simulate the loading process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.moduleLoaded = true;
      this.moduleStatus = 'loaded';
      console.log('Safari WASM module loaded successfully');
      
    } catch (error) {
      this.moduleStatus = 'error';
      console.error('Failed to load Safari WASM module:', error);
      throw error;
    }
  }

  isModuleLoaded(): boolean {
    return this.moduleLoaded;
  }

  getModuleStatus(): string {
    return this.moduleStatus;
  }

  createStreamingAnalyzer(): StreamingAnalyzer {
    if (!this.moduleLoaded) {
      throw new Error('WASM module not loaded');
    }
    
    return new MockStreamingAnalyzer();
  }

  unloadModule(): void {
    this.moduleLoaded = false;
    this.moduleStatus = 'not_loaded';
    this.loadPromise = null;
    console.log('Safari WASM module unloaded');
  }
}

class MockStreamingAnalyzer implements StreamingAnalyzer {
  private chunks: string[] = [];
  private totalSize = 0;

  processChunk(chunk: string): void {
    this.chunks.push(chunk);
    this.totalSize += chunk.length;
  }

  finalize(): any {
    const content = this.chunks.join('');
    
    // Perform analysis
    const topWords = this.extractTopWords(content);
    const bannedPhrases = this.detectBannedPhrases(content);
    const piiPatterns = this.detectPII(content);
    const entropy = this.calculateEntropy(content);
    const isObfuscated = this.detectObfuscation(content);
    const decision = this.makeDecision(content);
    const reason = this.getReason(content);
    const riskScore = this.calculateRiskScore(content);

    return {
      topWords,
      bannedPhrases,
      piiPatterns,
      entropy,
      isObfuscated,
      decision,
      reason,
      riskScore,
      stats: {
        totalChunks: this.chunks.length,
        totalContent: this.totalSize,
        processingTime: Date.now(),
        performance: {
          memoryUsed: this.totalSize * 2, // Rough estimate
          throughput: this.totalSize / 1000, // bytes per second
          cpuUsage: Math.random() * 10 + 5 // 5-15%
        }
      }
    };
  }

  reset(): void {
    this.chunks = [];
    this.totalSize = 0;
  }

  private extractTopWords(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private detectBannedPhrases(content: string): string[] {
    const bannedPhrases = ['malware', 'virus', 'trojan', 'confidential', 'do not share'];
    const detected: string[] = [];
    
    bannedPhrases.forEach(phrase => {
      if (content.toLowerCase().includes(phrase.toLowerCase())) {
        detected.push(phrase);
      }
    });
    
    return detected;
  }

  private detectPII(content: string): string[] {
    const patterns = [
      /\b\d{9,12}\b/g, // 9-12 digit numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g // Credit card pattern
    ];
    
    const detected: string[] = [];
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        detected.push(...matches);
      }
    });
    
    return detected;
  }

  private calculateEntropy(content: string): number {
    if (!content) return 0;
    
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
    return entropy > 4.8; // High entropy indicates obfuscation
  }

  private makeDecision(content: string): 'allow' | 'block' {
    const bannedPhrases = this.detectBannedPhrases(content);
    const piiPatterns = this.detectPII(content);
    const isObfuscated = this.detectObfuscation(content);
    const riskScore = this.calculateRiskScore(content);
    
    if (bannedPhrases.length > 0 || piiPatterns.length > 0 || isObfuscated || riskScore > 0.6) {
      return 'block';
    }
    
    return 'allow';
  }

  private getReason(content: string): string {
    const bannedPhrases = this.detectBannedPhrases(content);
    const piiPatterns = this.detectPII(content);
    const isObfuscated = this.detectObfuscation(content);
    const riskScore = this.calculateRiskScore(content);
    
    const reasons: string[] = [];
    
    if (bannedPhrases.length > 0) {
      reasons.push(`Contains banned phrases: ${bannedPhrases.join(', ')}`);
    }
    
    if (piiPatterns.length > 0) {
      reasons.push(`Contains PII patterns: ${piiPatterns.length} detected`);
    }
    
    if (isObfuscated) {
      reasons.push('Content appears to be obfuscated');
    }
    
    if (riskScore > 0.6) {
      reasons.push(`High risk score: ${riskScore.toFixed(2)}`);
    }
    
    return reasons.length > 0 ? reasons.join('; ') : 'File appears safe';
  }

  private calculateRiskScore(content: string): number {
    let score = 0;
    
    // Banned phrases increase risk
    const bannedPhrases = this.detectBannedPhrases(content);
    score += bannedPhrases.length * 0.2;
    
    // PII patterns increase risk
    const piiPatterns = this.detectPII(content);
    score += piiPatterns.length * 0.1;
    
    // Obfuscation increases risk
    if (this.detectObfuscation(content)) {
      score += 0.3;
    }
    
    // High entropy increases risk
    const entropy = this.calculateEntropy(content);
    if (entropy > 4.5) {
      score += (entropy - 4.5) * 0.1;
    }
    
    return Math.min(score, 1.0);
  }
}

export const safariWASMLoader = new SafariWASMLoader();
