import { WASMModule, WASMLoader } from './interface';

interface WASMLoaderOptions {
  // Preloaded wasm-bindgen ESM namespace (with default init and WasmModule)
  wasmNamespace?: any;
  // Explicit URL to the wasm binary for initialization
  wasmBinaryURL?: string;
}

export class WASMLoaderImpl implements WASMLoader {
  private module: WASMModule | null = null;
  private loading = false;
  private loadPromise: Promise<WASMModule> | null = null;
  private options?: WASMLoaderOptions;

  constructor(options?: WASMLoaderOptions) {
    this.options = options;
  }

  async load(): Promise<WASMModule> {
    if (this.module) {
      return this.module;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loading = true;
    this.loadPromise = this._loadModule();
    
    try {
      this.module = await this.loadPromise;
      return this.module;
    } finally {
      this.loading = false;
      this.loadPromise = null;
    }
  }

  isLoaded(): boolean {
    return this.module !== null;
  }

  private async _loadModule(): Promise<WASMModule> {
    try {
      console.log('[WASM] Starting module load...');
      const envSummary = {
        isChromeDefined: typeof chrome !== 'undefined',
        hasChromeRuntime: typeof chrome !== 'undefined' && !!chrome.runtime,
        isServiceWorker: typeof self !== 'undefined' && (self as any).registration ? true : false,
        locationHref: typeof location !== 'undefined' ? location.href : 'n/a',
      };
      console.log('[WASM] Environment summary:', envSummary);
      
      // Detect browser extension environment (Chrome/Firefox/Safari)
      const hasChrome = typeof chrome !== 'undefined' && (chrome as any).runtime;
      const hasBrowser = typeof (globalThis as any).browser !== 'undefined' && (globalThis as any).browser.runtime;
      const isExtension = hasChrome || hasBrowser;
      const getURL = (path: string): string => {
        if (hasChrome) return (chrome as any).runtime.getURL(path);
        if (hasBrowser) return (globalThis as any).browser.runtime.getURL(path);
        return path;
      };
      
      // wasmNs is the ESM namespace from wasm-pack glue (exports class WasmModule and default init)
      let wasmNs: any;

      // If a preloaded namespace is provided (e.g., MV3 service worker), use it and skip dynamic import
      if (this.options?.wasmNamespace) {
        console.log('[WASM] Using injected wasm namespace');
        wasmNs = this.options.wasmNamespace;
        const explicitUrl = this.options.wasmBinaryURL;
        if (typeof wasmNs?.default === 'function') {
          console.log('[WASM] Initializing injected glue with', explicitUrl || 'no explicit URL');
          await wasmNs.default({ module_or_path: explicitUrl });
        }
      } else if (isExtension) {
        const wasmJsUrl = getURL('wasm.js');
        const wasmBinaryUrl = getURL('wasm_bg.wasm');
        console.log('[WASM] Extension environment URLs:', { wasmJsUrl, wasmBinaryUrl });

        try {
          console.log('[WASM] Dynamic importing glue via URL import(...)');
          // Import the ESM glue directly; CSP-safe and works in MV3 service worker
          wasmNs = await import(/* webpackIgnore: true */ wasmJsUrl);
        } catch (e) {
          console.error('[WASM] Dynamic import of glue failed:', e);
          throw e;
        }

        // Initialize with explicit wasm URL so glue fetches the right file
        console.log('[WASM] Initializing wasm-bindgen glue with wasm URL...');
        await wasmNs.default({ module_or_path: wasmBinaryUrl });
      } else {
        console.log('[WASM] Non-extension environment detected. Dynamic importing local glue...');
        wasmNs = await import('../../../wasm/pkg/wasm.js');
        await wasmNs.default();
      }

      console.log('[WASM] Module initialized successfully');

      // Internal helper to create an analyzer handle that keeps its module instance
      const createAnalyzerHandle = (config?: any) => {
        const moduleInstance = new wasmNs.WasmModule();
        const analyzer = config
          ? moduleInstance.init_streaming_with_config(config)
          : moduleInstance.init_streaming();
        return { __module: moduleInstance, __analyzer: analyzer };
      };

      // Return a wrapper that implements our WASMModule interface
      return {
        analyzeFile: async (content: string) => {
          const handle = createAnalyzerHandle();
          handle.__module.process_chunk(handle.__analyzer, content);
          const result = handle.__module.finalize_streaming(handle.__analyzer);
          const stats = handle.__module.get_streaming_stats(handle.__analyzer);

          return {
            topWords: result.top_words || [],
            bannedPhrases: result.banned_phrases || [],
            piiPatterns: result.pii_patterns || [],
            entropy: result.entropy || 0,
            isObfuscated: result.is_obfuscated || false,
            decision: result.decision || 'allow',
            reason: result.reason || 'Analysis complete',
            riskScore: result.risk_score || 0,
            stats: {
              processingTime: stats?.total_time || 0,
              memoryUsage: stats?.peak_memory || 0,
              throughput: stats?.bytes_per_second || 0
            }
          };
        },

        calculateEntropy: (text: string) => {
          const moduleInstance = new wasmNs.WasmModule();
          return moduleInstance.calculate_entropy(text);
        },

        findBannedPhrases: async (text: string) => {
          const moduleInstance = new wasmNs.WasmModule();
          return moduleInstance.find_banned_phrases(text);
        },

        detectPIIPatterns: async (text: string) => {
          const moduleInstance = new wasmNs.WasmModule();
          return moduleInstance.detect_pii_patterns(text);
        },

        getTopWords: async (text: string, count: number) => {
          const moduleInstance = new wasmNs.WasmModule();
          return moduleInstance.get_top_words(text, count);
        },

        // Streaming interface
        createStreamingAnalyzer: (config?: any) => {
          return createAnalyzerHandle(config);
        },

        processChunk: (handle: any, chunk: string) => {
          if (!handle || !handle.__module || !handle.__analyzer) {
            throw new Error('Invalid analyzer handle');
          }
          return handle.__module.process_chunk(handle.__analyzer, chunk);
        },

        finalizeStreaming: (handle: any) => {
          if (!handle || !handle.__module || !handle.__analyzer) {
            throw new Error('Invalid analyzer handle');
          }
          const raw = handle.__module.finalize_streaming(handle.__analyzer);
          // Normalize field names to camelCase expected by background/content code
          return {
            topWords: raw?.top_words ?? raw?.topWords ?? [],
            bannedPhrases: raw?.banned_phrases ?? raw?.bannedPhrases ?? [],
            piiPatterns: raw?.pii_patterns ?? raw?.piiPatterns ?? [],
            entropy: raw?.entropy ?? 0,
            isObfuscated: raw?.is_obfuscated ?? raw?.isObfuscated ?? false,
            decision: raw?.decision ?? 'allow',
            reason: raw?.reason ?? (Array.isArray(raw?.reasons) ? raw.reasons[0] : 'Analysis complete'),
            riskScore: raw?.risk_score ?? raw?.riskScore ?? 0
          };
        },

        getStreamingStats: (handle: any) => {
          if (!handle || !handle.__module || !handle.__analyzer) {
            throw new Error('Invalid analyzer handle');
          }
          return handle.__module.get_streaming_stats(handle.__analyzer);
        }
      };
      
    } catch (error) {
      const err = error as Error;
      console.error('[WASM] Module load failed with error:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      throw new Error(`WASM module loading failed: ${err.message}`);
    }
  }
}
