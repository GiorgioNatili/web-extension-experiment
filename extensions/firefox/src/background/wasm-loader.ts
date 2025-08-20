import { CONFIG } from 'shared';
import { WASMLoaderImpl } from 'shared';

/**
 * Firefox-specific WASM loader for file analysis
 */
export class FirefoxWASMLoader {
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
      console.log('Loading WASM module for Firefox...');
      
      // Use the shared WASM loader
      this.wasmModule = await this.wasmLoader.load();
      this.isLoaded = true;
      console.log('WASM module loaded successfully for Firefox');
      try {
        const keys = this.wasmModule ? Object.keys(this.wasmModule) : [];
        console.log('[FF] wasmModule keys:', keys);
        console.log('[FF] typeof createStreamingAnalyzer:', typeof (this.wasmModule as any)?.createStreamingAnalyzer);

        // Adapter in case we received raw wasm namespace instead of wrapper
        const candidate: any = this.wasmModule;
        if (typeof candidate?.createStreamingAnalyzer !== 'function' && typeof candidate?.WasmModule === 'function') {
          console.warn('[FF] Building adapter around raw WasmModule namespace');
          const makeAdapter = (ns: any) => ({
            createStreamingAnalyzer: (config?: any) => {
              const mod = new ns.WasmModule();
              const analyzer = config ? mod.init_streaming_with_config(config) : mod.init_streaming();
              return { __module: mod, __analyzer: analyzer };
            },
            processChunk: (handle: any, chunk: string) => handle.__module.process_chunk(handle.__analyzer, chunk),
            finalizeStreaming: (handle: any) => {
              const raw = handle.__module.finalize_streaming(handle.__analyzer);
              return {
                topWords: raw?.top_words ?? [],
                bannedPhrases: raw?.banned_phrases ?? [],
                piiPatterns: raw?.pii_patterns ?? [],
                entropy: raw?.entropy ?? 0,
                isObfuscated: raw?.is_obfuscated ?? false,
                decision: raw?.decision ?? 'allow',
                reason: raw?.reason ?? 'Analysis complete',
                riskScore: raw?.risk_score ?? 0,
              };
            },
            getStreamingStats: (handle: any) => handle.__module.get_streaming_stats(handle.__analyzer),
          });
          this.wasmModule = makeAdapter(candidate);
          console.log('[FF] Adapter installed; typeof createStreamingAnalyzer =', typeof (this.wasmModule as any)?.createStreamingAnalyzer);
        }
      } catch (e) {
        console.warn('[FF] failed to introspect wasmModule', e);
      }
      
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
   * Analyze a single chunk
   */
  async analyzeChunk(chunk: string, analyzer: any): Promise<any> {
    if (!this.isLoaded) {
      throw new Error('WASM module not loaded');
    }

    try {
      analyzer.processChunk(chunk);
      return {
        success: true,
        chunk_size: chunk.length,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Chunk analysis failed:', error);
      throw error;
    }
  }

  /**
   * Finalize analysis and get results
   */
  async finalizeAnalysis(analyzer: any): Promise<any> {
    if (!this.isLoaded) {
      throw new Error('WASM module not loaded');
    }

    try {
      const result = analyzer.finalize();
      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('Analysis finalization failed:', error);
      throw error;
    }
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

  // Add method to get raw WASM module for direct interface access
  getRawModule(): any {
    return this.wasmModule;
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
    console.log('[FF] StreamingAnalyzerWrapper init; has createStreamingAnalyzer?', typeof (this.wasmModule as any)?.createStreamingAnalyzer);
    this.handle = this.wasmModule.createStreamingAnalyzer();
    console.log('StreamingAnalyzerWrapper initialized with config:', config);
  }

  processChunk(chunk: string): void {
    try {
      console.log('[FF] WASM processChunk called:', {
        chunkLength: chunk.length,
        chunkPreview: chunk.substring(0, 50) + '...',
        handleType: typeof this.handle,
        hasHandle: !!this.handle,
        timestamp: new Date().toISOString()
      });
      
      this.chunks.push(chunk);
      
      // STEP 2: Use direct WASM interface like Chrome
      // Get the raw WASM module instance
      const rawModule = this.wasmModule.getRawModule?.() || this.wasmModule;
      
      if (rawModule && typeof rawModule.process_chunk === 'function') {
        // Use direct WASM interface like Chrome
        console.log('[FF] Using direct WASM interface for process_chunk');
        
        // STEP 3: Add proper handle validation before reassignment
        const newHandle = rawModule.process_chunk(this.handle, chunk);
        
        // Validate the new handle before reassignment
        if (newHandle && typeof newHandle === 'object') {
          // Check if it's a valid analyzer handle
          if (newHandle.__module && newHandle.__analyzer) {
            this.handle = newHandle;
            console.log('[FF] Direct WASM process_chunk completed, handle updated - valid structure');
          } else if (typeof newHandle === 'object' && Object.keys(newHandle).length > 0) {
            // It might be a direct analyzer reference
            this.handle = newHandle;
            console.log('[FF] Direct WASM process_chunk completed, handle updated - direct reference');
          } else {
            console.warn('[FF] Direct process_chunk returned invalid handle structure:', newHandle);
            throw new Error('Invalid analyzer handle returned from direct WASM interface');
          }
        } else {
          console.warn('[FF] Direct process_chunk returned invalid handle:', newHandle);
          throw new Error('Invalid analyzer handle returned from direct WASM interface');
        }
      } else {
        // Fallback to wrapper interface
        console.log('[FF] Using wrapper interface for processChunk');
        const result = this.wasmModule.processChunk(this.handle, chunk);
        
        // Enhanced handle validation and reassignment
        if (result && typeof result === 'object') {
          // Validate the handle has the expected structure
          if (result.__module && result.__analyzer) {
            this.handle = result;
            console.log('[FF] WASM analyzer handle updated after processChunk - valid structure');
          } else if (typeof result === 'object' && Object.keys(result).length > 0) {
            // Fallback: if it's an object but not the expected structure, it might be a direct analyzer
            this.handle = result;
            console.log('[FF] WASM analyzer handle updated after processChunk - fallback structure');
          } else {
            console.warn('[FF] processChunk returned unexpected result structure:', result);
          }
        } else {
          console.warn('[FF] processChunk returned invalid result:', result);
        }
      }
      
      console.log('[FF] WASM processChunk completed successfully');
    } catch (error) {
      // Enhanced error logging for Firefox debugging
      console.error('[FF] Detailed WASM processChunk error:', {
        chunkLength: chunk.length,
        chunksCount: this.chunks.length,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  finalize(): any {
    let result: any;
    let stats: any;
    
    try {
      // Get stats BEFORE finalizing (handle becomes invalid after finalize)
      stats = this.wasmModule.getStreamingStats(this.handle);
      result = this.wasmModule.finalizeStreaming(this.handle);
    } catch (error) {
      // Enhanced error logging for Firefox debugging
      console.error('[FF] Detailed WASM finalize error:', {
        chunksCount: this.chunks.length,
        totalContentLength: this.chunks.join('').length,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    // Normalize result fields
    let bannedPhrases = result.bannedPhrases ?? result.banned_phrases ?? [];
    let piiPatterns = result.piiPatterns ?? result.pii_patterns ?? [];
    let entropy = typeof result.entropy === 'number' ? result.entropy : 0;

    // Heuristic fallback using aggregated content if wasm did not provide signals
    const contentText = this.chunks.join('');
    if ((!Array.isArray(bannedPhrases) || bannedPhrases.length === 0) && contentText) {
      const keywords = ['confidential', 'secret', 'classified', 'private', 'internal'];
      const detected = keywords.filter(k => contentText.toLowerCase().includes(k));
      bannedPhrases = detected;
    }
    if ((!Array.isArray(piiPatterns) || piiPatterns.length === 0) && contentText) {
      const piiRegex = /\b\d{9,12}\b/g;
      const matches = contentText.match(piiRegex) || [];
      piiPatterns = matches.map(v => ({ type: 'number_sequence', value: v, confidence: 0.5 }));
    }
    if ((!entropy || entropy === 0) && contentText) {
      const normalized = contentText.toLowerCase().replace(/[^a-z0-9]/g, '');
      let e = 0;
      if (normalized.length > 0) {
        const counts = new Map<string, number>();
        for (const ch of normalized) counts.set(ch, (counts.get(ch) || 0) + 1);
        const total = normalized.length;
        for (const c of counts.values()) {
          const p = c / total;
          e -= p * Math.log2(p);
        }
      }
      entropy = e;
    }
    let risk = (typeof result.riskScore === 'number') ? result.riskScore
             : (typeof result.risk_score === 'number') ? result.risk_score
             : undefined;
    if (risk === undefined || Number.isNaN(risk)) {
      const bannedScore = (Array.isArray(bannedPhrases) && bannedPhrases.length > 0) ? 1.0 : 0.0;
      const piiScore = (Array.isArray(piiPatterns) && piiPatterns.length > 0) ? 1.0 : 0.0;
      const entropyScore = entropy > 4.8 ? 1.0 : (entropy / 4.8);
      risk = (bannedScore * 0.4) + (piiScore * 0.3) + (entropyScore * 0.3);
    }
    const decision = (result.decision) ? result.decision : (risk >= 0.6 ? 'block' : 'allow');
    const reason = result.reason || 'Analysis complete';

    return {
      risk_score: risk,
      is_safe: risk < 0.6,
      decision,
      reason,
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
        banned_phrases: bannedPhrases,
        pii_patterns: piiPatterns,
        entropy
      }
    };
  }
}

/**
 * Global WASM loader instance
 */
export const firefoxWASMLoader = new FirefoxWASMLoader();
