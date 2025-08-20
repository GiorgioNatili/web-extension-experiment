// Chrome WASM Loader - Uses shared WASM module
import { CONFIG } from 'shared';
import { WASMLoaderImpl } from 'shared';
import * as wasmNs from 'wasm/pkg/wasm.js';

export interface StreamingAnalyzer {
  processChunk(chunk: string): void;
  finalize(): any;
  reset(): void;
}

export interface StreamingConfig {
  maxChunkSize?: number;
  maxTotalSize?: number;
}

export class ChromeWASMLoader {
  private wasmLoader: WASMLoaderImpl;
  private wasmModule: any = null;
  private moduleLoaded = false;
  private moduleStatus = 'not_loaded';
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Inject preloaded wasm namespace to avoid dynamic import() in MV3 SW
    const wasmBinaryURL = chrome.runtime.getURL('wasm_bg.wasm');
    this.wasmLoader = new WASMLoaderImpl({ wasmNamespace: wasmNs, wasmBinaryURL });
  }

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
      console.log('WASM module loaded successfully');
    } catch (error) {
      this.moduleStatus = 'error';
      this.moduleLoaded = false;
      console.error('Failed to load WASM module:', error);
      throw error;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Private method to actually load the module
   */
  private async _loadModule(): Promise<void> {
    try {
      console.log('[BG] ChromeWASMLoader: loading via shared loader...');
      
      // Use the shared WASM loader
      this.wasmModule = await this.wasmLoader.load();
      console.log('[BG] ChromeWASMLoader: loaded OK');
      try {
        const keys = this.wasmModule ? Object.keys(this.wasmModule) : [];
        console.log('[BG] ChromeWASMLoader: wasmModule keys:', keys);
        console.log('[BG] ChromeWASMLoader: typeof createStreamingAnalyzer:', typeof (this.wasmModule as any)?.createStreamingAnalyzer);

        // Adapter: if we accidentally received the raw wasm namespace instead of the wrapper
        const candidate: any = this.wasmModule;
        if (typeof candidate?.createStreamingAnalyzer !== 'function' && typeof candidate?.WasmModule === 'function') {
          console.warn('[BG] ChromeWASMLoader: building adapter around raw WasmModule namespace');
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
          console.log('[BG] ChromeWASMLoader: adapter installed; typeof createStreamingAnalyzer =', typeof (this.wasmModule as any)?.createStreamingAnalyzer);
        }
      } catch (e) {
        console.warn('[BG] ChromeWASMLoader: failed to introspect wasmModule', e);
      }
      
    } catch (error) {
      console.error('[BG] ChromeWASMLoader: load failed:', error);
      console.error('[BG] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      
      throw error; // Don't fallback to mock - this is production!
    }
  }

  isModuleLoaded(): boolean {
    return this.moduleLoaded && this.wasmModule !== null;
  }

  getModuleStatus(): string {
    return this.moduleStatus;
  }

  // Debug helper for introspection without accessing private fields elsewhere
  debugIntrospection(): { keys: string[]; hasCreateFn: boolean } {
    try {
      const keys = this.wasmModule ? Object.keys(this.wasmModule) : [];
      const hasCreateFn = typeof (this.wasmModule as any)?.createStreamingAnalyzer === 'function';
      return { keys, hasCreateFn };
    } catch {
      return { keys: [], hasCreateFn: false };
    }
  }

  createStreamingAnalyzer(): StreamingAnalyzer {
    if (!this.moduleLoaded || !this.wasmModule) {
      throw new Error('WASM module not loaded');
    }
    try {
      console.log('[BG] ChromeWASMLoader: creating streaming analyzer...');
      console.log('[BG] typeof createStreamingAnalyzer =', typeof (this.wasmModule as any)?.createStreamingAnalyzer);
    } catch (e) {}
    
    return new RealStreamingAnalyzer(this.wasmModule);
  }

  unloadModule(): void {
    this.moduleLoaded = false;
    this.moduleStatus = 'not_loaded';
    this.wasmModule = null;
    this.loadPromise = null;
  }
}

class RealStreamingAnalyzer implements StreamingAnalyzer {
  private wasmModule: any;
  private handle: any;
  private chunks: string[] = [];
  private totalSize = 0;

  constructor(wasmModule: any) {
    this.wasmModule = wasmModule;
    
    try {
      console.log('[BG] RealStreamingAnalyzer: init; has createStreamingAnalyzer?', typeof (this.wasmModule as any)?.createStreamingAnalyzer);
      this.handle = this.wasmModule.createStreamingAnalyzer();
      console.log('Real WASM analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WASM analyzer:', error);
      throw new Error(`WASM analyzer initialization failed: ${(error as Error).message}`);
    }
  }

  processChunk(chunk: string): void {
    this.chunks.push(chunk);
    this.totalSize += chunk.length;
    
    if (!this.handle) {
      throw new Error('WASM analyzer not initialized');
    }
    
    try {
      this.wasmModule.processChunk(this.handle, chunk);
    } catch (error) {
      console.error('WASM chunk processing failed:', error);
      throw new Error(`WASM chunk processing failed: ${(error as Error).message}`);
    }
  }

  finalize(): any {
    if (!this.handle) {
      throw new Error('WASM analyzer not initialized');
    }
    
    try {
      const result = this.wasmModule.finalizeStreaming(this.handle);
      const stats = this.wasmModule.getStreamingStats(this.handle);
      
      const finalResult = {
        ...result,
        stats: {
          ...stats,
          totalChunks: this.chunks.length,
          totalContent: this.totalSize,
          processingTime: Date.now()
        }
      };
      
      console.log('WASM analysis completed successfully');
      this.reset();
      return finalResult;
      
    } catch (error) {
      console.error('WASM finalization failed:', error);
      throw new Error(`WASM finalization failed: ${(error as Error).message}`);
    }
  }

  reset(): void {
    this.chunks = [];
    this.totalSize = 0;
    
    try {
      this.handle = this.wasmModule.createStreamingAnalyzer();
    } catch (error) {
      console.error('Failed to reinitialize WASM analyzer:', error);
      throw new Error(`WASM analyzer reset failed: ${(error as Error).message}`);
    }
  }
}

export const chromeWASMLoader = new ChromeWASMLoader();
