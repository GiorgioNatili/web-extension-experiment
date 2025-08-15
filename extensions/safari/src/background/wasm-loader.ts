import { CONFIG } from 'shared';
import { WASMLoaderImpl } from 'shared';

/**
 * Safari-specific WASM loader for file analysis
 */
export class SafariWASMLoader {
  private wasmLoader: WASMLoaderImpl;
  private wasmModule: any = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.wasmLoader = new WASMLoaderImpl();
  }

  /**
   * Load the WASM module
   */
  async loadWASMModule(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadModule();
    return this.loadPromise;
  }

  /**
   * Internal method to load the WASM module
   */
  private async _loadModule(): Promise<void> {
    try {
      console.log('Loading WASM module for Safari...');
      
      // Use the shared WASM loader
      this.wasmModule = await this.wasmLoader.load();
      this.isLoaded = true;
      console.log('WASM module loaded successfully for Safari');
      
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw new Error(`WASM module loading failed: ${error}`);
    }
  }

  /**
   * Create a new streaming analyzer instance
   */
  createStreamingAnalyzer(config: any = {}): any {
    if (!this.isLoaded) {
      throw new Error('WASM module not loaded. Call loadWASMModule() first.');
    }

    return new StreamingAnalyzerWrapper(this.wasmModule, config);
  }

  /**
   * Check if WASM module is loaded
   */
  isModuleLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get module status
   */
  getModuleStatus(): any {
    return {
      loaded: this.isLoaded,
      module: this.wasmModule ? 'WASMModule' : null,
      timestamp: Date.now()
    };
  }

  /**
   * Unload the WASM module (for cleanup)
   */
  unloadModule(): void {
    this.wasmModule = null;
    this.isLoaded = false;
    this.loadPromise = null;
    console.log('WASM module unloaded');
  }
}

/**
 * Wrapper for streaming analyzer to maintain compatibility
 */
class StreamingAnalyzerWrapper {
  private wasmModule: any;
  private handle: any;
  private config: any;
  private chunks: string[] = [];
  private startTime: number = Date.now();

  constructor(wasmModule: any, config: any) {
    this.wasmModule = wasmModule;
    this.config = config;
    this.handle = this.wasmModule.createStreamingAnalyzer();
    console.log('Safari StreamingAnalyzerWrapper initialized with config:', config);
  }

  processChunk(chunk: string): void {
    this.chunks.push(chunk);
    this.wasmModule.processChunk(this.handle, chunk);
  }

  finalize(): any {
    const result = this.wasmModule.finalizeStreaming(this.handle);
    const stats = this.wasmModule.getStreamingStats(this.handle);
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    return {
      risk_score: result.riskScore || 0,
      is_safe: (result.riskScore || 0) < 0.6,
      decision: result.decision || 'allow',
      reason: result.reason || 'Analysis complete',
      stats: {
        total_chunks: this.chunks.length,
        total_content: this.chunks.join('').length,
        processing_time: duration,
        performance: {
          timing: { total_time: duration },
          memory: { peak_memory: stats?.memoryUsage || 1024 },
          throughput: { bytes_per_second: stats?.throughput || 1000 }
        }
      },
      analysis: {
        word_counts: result.topWords || [],
        banned_phrases: result.bannedPhrases || [],
        pii_patterns: result.piiPatterns || [],
        entropy: result.entropy || 0
      }
    };
  }
}

/**
 * Global WASM loader instance
 */
export const safariWASMLoader = new SafariWASMLoader();

