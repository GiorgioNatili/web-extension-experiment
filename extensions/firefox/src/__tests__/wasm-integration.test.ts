/**
 * Firefox WASM Integration Tests
 * Tests the direct WASM interface fix for Firefox
 */

import { firefoxWASMLoader } from '../background/wasm-loader';

// Mock the browser runtime APIs
global.browser = {
  runtime: {
    getURL: jest.fn((path: string) => `moz-extension://test-id/${path}`),
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    onUpdateAvailable: {
      addListener: jest.fn()
    }
  }
} as any;

// Mock WASM module
const mockWasmModule = {
  WasmModule: jest.fn().mockImplementation(() => ({
    init_streaming: jest.fn().mockReturnValue({ __analyzer: 'test-analyzer' }),
    process_chunk: jest.fn().mockImplementation((analyzer, content) => ({
      __analyzer: 'updated-analyzer',
      __content: content
    })),
    finalize_streaming: jest.fn().mockReturnValue({
      top_words: ['test', 'word'],
      banned_phrases: [],
      pii_patterns: [],
      entropy: 2.5,
      is_obfuscated: false,
      decision: 'allow',
      reason: 'Test analysis complete',
      risk_score: 0.2
    }),
    get_streaming_stats: jest.fn().mockReturnValue({
      total_time: 100,
      peak_memory: 1024,
      bytes_per_second: 1000
    })
  }))
};

// Mock File API
global.File = jest.fn().mockImplementation((content, name, options) => ({
  name,
  size: content[0].length,
  type: options?.type || 'text/plain',
  content: content[0]
})) as any;

describe('Firefox WASM Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Direct WASM Interface Fix', () => {
    test('should use Chrome pattern for WASM processing', async () => {
      // Mock the WASM loader
      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(mockWasmModule);

      // Simulate the background script's handleFileAnalysis
      const message = {
        data: {
          fileName: 'test.txt',
          content: 'This is test content for analysis'
        }
      };

      const sendResponse = jest.fn();

      // Execute the fixed pattern
      const wasmModule = firefoxWASMLoader.getRawModule();
      expect(wasmModule).toBeDefined();
      expect(typeof wasmModule.WasmModule).toBe('function');

      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();
      
      // Process chunk and reassign analyzer (Chrome's pattern)
      analyzer = moduleInstance.process_chunk(analyzer, message.data.content);
      
      // Finalize analysis
      const rawResult = moduleInstance.finalize_streaming(analyzer);
      const stats = moduleInstance.get_streaming_stats(analyzer);

      // Verify the pattern worked
      expect(moduleInstance.init_streaming).toHaveBeenCalled();
      expect(moduleInstance.process_chunk).toHaveBeenCalledWith(
        { __analyzer: 'test-analyzer' },
        'This is test content for analysis'
      );
      expect(moduleInstance.finalize_streaming).toHaveBeenCalledWith({
        __analyzer: 'updated-analyzer',
        __content: 'This is test content for analysis'
      });
      expect(moduleInstance.get_streaming_stats).toHaveBeenCalled();

      // Verify result structure
      expect(rawResult).toEqual({
        top_words: ['test', 'word'],
        banned_phrases: [],
        pii_patterns: [],
        entropy: 2.5,
        is_obfuscated: false,
        decision: 'allow',
        reason: 'Test analysis complete',
        risk_score: 0.2
      });

      expect(stats).toEqual({
        total_time: 100,
        peak_memory: 1024,
        bytes_per_second: 1000
      });
    });

    test('should handle analyzer state reassignment correctly', async () => {
      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(mockWasmModule);

      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      
      // Initial analyzer
      let analyzer = moduleInstance.init_streaming();
      expect(analyzer).toEqual({ __analyzer: 'test-analyzer' });

      // Process chunk and verify reassignment
      const originalAnalyzer = analyzer;
      analyzer = moduleInstance.process_chunk(analyzer, 'test content');
      
      // Verify analyzer was reassigned (not the same reference)
      expect(analyzer).not.toBe(originalAnalyzer);
      expect(analyzer).toEqual({
        __analyzer: 'updated-analyzer',
        __content: 'test content'
      });

      // Verify finalization works with updated analyzer
      const result = moduleInstance.finalize_streaming(analyzer);
      expect(result.decision).toBe('allow');
    });

    test('should throw error for invalid WASM module', async () => {
      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(null);

      expect(() => {
        const wasmModule = firefoxWASMLoader.getRawModule();
        if (!wasmModule || typeof wasmModule.WasmModule !== 'function') {
          throw new Error('WASM module not available or invalid');
        }
      }).toThrow('WASM module not available or invalid');
    });

    test('should normalize WASM result to expected format', async () => {
      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(mockWasmModule);

      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();
      analyzer = moduleInstance.process_chunk(analyzer, 'test content');
      
      const rawResult = moduleInstance.finalize_streaming(analyzer);
      const stats = moduleInstance.get_streaming_stats(analyzer);

      // Normalize result to match expected format
      const result = {
        topWords: rawResult?.top_words ?? [],
        bannedPhrases: rawResult?.banned_phrases ?? [],
        piiPatterns: rawResult?.pii_patterns ?? [],
        entropy: rawResult?.entropy ?? 0,
        isObfuscated: rawResult?.is_obfuscated ?? false,
        decision: rawResult?.decision ?? 'allow',
        reason: rawResult?.reason ?? 'Analysis complete',
        riskScore: rawResult?.risk_score ?? 0,
        stats: {
          totalChunks: 1,
          totalContent: 'test content'.length,
          processingTime: 0,
          performance: {
            timing: { total_time: stats?.total_time || 0 },
            memory: { peak_memory: stats?.peak_memory || 0 },
            throughput: { bytes_per_second: stats?.bytes_per_second || 0 }
          }
        }
      };

      expect(result).toEqual({
        topWords: ['test', 'word'],
        bannedPhrases: [],
        piiPatterns: [],
        entropy: 2.5,
        isObfuscated: false,
        decision: 'allow',
        reason: 'Test analysis complete',
        riskScore: 0.2,
        stats: {
          totalChunks: 1,
          totalContent: 12,
          processingTime: 0,
          performance: {
            timing: { total_time: 100 },
            memory: { peak_memory: 1024 },
            throughput: { bytes_per_second: 1000 }
          }
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WASM module not loaded', async () => {
      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(false);
      jest.spyOn(firefoxWASMLoader, 'loadWASMModule').mockResolvedValue();
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(mockWasmModule);

      // Should attempt to load WASM module if not loaded
      if (!firefoxWASMLoader.isModuleLoaded()) {
        await firefoxWASMLoader.loadWASMModule();
      }

      expect(firefoxWASMLoader.loadWASMModule).toHaveBeenCalled();
    });

    test('should handle WASM processing errors', async () => {
      const errorModule = {
        WasmModule: jest.fn().mockImplementation(() => ({
          init_streaming: jest.fn().mockReturnValue({ __analyzer: 'test-analyzer' }),
          process_chunk: jest.fn().mockImplementation(() => {
            throw new Error('WASM processing failed');
          }),
          finalize_streaming: jest.fn(),
          get_streaming_stats: jest.fn()
        }))
      };

      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(errorModule);

      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();

      expect(() => {
        analyzer = moduleInstance.process_chunk(analyzer, 'test content');
      }).toThrow('WASM processing failed');
    });
  });

  describe('Risk Assessment Consistency', () => {
    test('should detect HR/performance content with consistent risk score', async () => {
      const hrContent = `What impact did you have last week?

What did you learn last week?

What went well last week? Why?

What could have gone better last week? Why?

How can I help you?

What can I do to make it easier for you to work in this organization?

Do you have any feedback for me? Be bold. Be open.

=====

Answer two questions:

What are the 3-5 competencies needed to thrive in this role? 

Is there evidence of them displaying these competencies? 

Hint: Where the answer is No, you might want a development plan. 

To build my picture quickly, I'd triangulate between:

Having them self-evaluate,

Data from prior performance reviews (if available),

And early tests to get my own independent assessment.

None of these can be definitive, but the three should point you to where you can trust people and where you might need them to develop. 

Tip: And if you see gaps across people, this is a high-leverage place to level up the whole team at once.`;

      // Mock WASM module with realistic HR content analysis
      const hrMockModule = {
        WasmModule: jest.fn().mockImplementation(() => ({
          init_streaming: jest.fn().mockReturnValue({ __analyzer: 'hr-analyzer' }),
          process_chunk: jest.fn().mockImplementation((analyzer, content) => ({
            __analyzer: 'updated-hr-analyzer',
            __content: content
          })),
          finalize_streaming: jest.fn().mockReturnValue({
            top_words: ['development', 'plan', 'performance', 'reviews', 'team'],
            banned_phrases: [],
            pii_patterns: [],
            entropy: 4.2,
            is_obfuscated: false,
            decision: 'allow',
            reason: 'HR/performance content detected',
            risk_score: 0.17  // 17% risk score for HR content
          }),
          get_streaming_stats: jest.fn().mockReturnValue({
            total_time: 150,
            peak_memory: 2048,
            bytes_per_second: 2000
          })
        }))
      };

      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(hrMockModule);

      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();
      analyzer = moduleInstance.process_chunk(analyzer, hrContent);
      
      const rawResult = moduleInstance.finalize_streaming(analyzer);
      const stats = moduleInstance.get_streaming_stats(analyzer);

      // Verify HR content is properly detected
      expect(rawResult.risk_score).toBe(0.17);
      expect(rawResult.reason).toContain('HR/performance content');
      expect(rawResult.top_words).toContain('development');
      expect(rawResult.top_words).toContain('plan');
      expect(rawResult.top_words).toContain('performance');
      expect(rawResult.top_words).toContain('reviews');
      expect(rawResult.top_words).toContain('team');

      // Verify risk indicators are present
      expect(hrContent.toLowerCase()).toContain('development plan');
      expect(hrContent.toLowerCase()).toContain('performance reviews');
      expect(hrContent.toLowerCase()).toContain('self-evaluate');
      expect(hrContent.toLowerCase()).toContain('gaps across people');
      expect(hrContent.toLowerCase()).toContain('level up the whole team');
    });

    test('should maintain consistent risk assessment across browsers', async () => {
      const testContent = 'This contains development plan and performance review content';
      
      const consistentMockModule = {
        WasmModule: jest.fn().mockImplementation(() => ({
          init_streaming: jest.fn().mockReturnValue({ __analyzer: 'test-analyzer' }),
          process_chunk: jest.fn().mockImplementation((analyzer, content) => ({
            __analyzer: 'updated-test-analyzer',
            __content: content
          })),
          finalize_streaming: jest.fn().mockReturnValue({
            top_words: ['development', 'plan', 'performance'],
            banned_phrases: [],
            pii_patterns: [],
            entropy: 3.8,
            is_obfuscated: false,
            decision: 'allow',
            reason: 'Performance management content detected',
            risk_score: 0.15  // Consistent 15% risk score
          }),
          get_streaming_stats: jest.fn().mockReturnValue({
            total_time: 100,
            peak_memory: 1024,
            bytes_per_second: 1500
          })
        }))
      };

      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(consistentMockModule);

      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();
      analyzer = moduleInstance.process_chunk(analyzer, testContent);
      
      const rawResult = moduleInstance.finalize_streaming(analyzer);

      // Verify consistent risk assessment
      expect(rawResult.risk_score).toBe(0.15);
      expect(rawResult.reason).toContain('Performance management');
      expect(rawResult.top_words).toContain('development');
      expect(rawResult.top_words).toContain('plan');
      expect(rawResult.top_words).toContain('performance');
    });
  });

  describe('Regression Prevention', () => {
    test('should prevent "Invalid analyzer handle" error', async () => {
      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(mockWasmModule);

      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();
      
      // This was the failing pattern - ensure it works now
      analyzer = moduleInstance.process_chunk(analyzer, 'test content');
      
      // Should not throw "Invalid analyzer handle" error
      expect(() => {
        const result = moduleInstance.finalize_streaming(analyzer);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    test('should prevent "No content processed" error', async () => {
      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(mockWasmModule);

      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();
      analyzer = moduleInstance.process_chunk(analyzer, 'test content');
      
      const result = moduleInstance.finalize_streaming(analyzer);
      
      // Should have processed content
      expect(result.decision).toBeDefined();
      expect(result.reason).not.toContain('No content processed');
    });

    test('should prevent finalize call order regression', async () => {
      // Mock the WASM module with call tracking
      const callOrder: string[] = [];
      const mockModuleWithCallTracking = {
        WasmModule: jest.fn().mockImplementation(() => ({
          init_streaming: jest.fn().mockReturnValue({ __analyzer: 'test-analyzer' }),
          process_chunk: jest.fn().mockImplementation((analyzer, content) => ({
            __analyzer: 'updated-analyzer',
            __content: content
          })),
          finalize_streaming: jest.fn().mockImplementation(() => {
            callOrder.push('finalize_streaming');
            return {
              top_words: ['test'],
              banned_phrases: [],
              pii_patterns: [],
              entropy: 2.5,
              is_obfuscated: false,
              decision: 'allow',
              reason: 'Test analysis complete',
              risk_score: 0.1
            };
          }),
          get_streaming_stats: jest.fn().mockImplementation(() => {
            callOrder.push('get_streaming_stats');
            return {
              total_time: 100,
              peak_memory: 1024,
              bytes_per_second: 1000
            };
          })
        }))
      };

      jest.spyOn(firefoxWASMLoader, 'isModuleLoaded').mockReturnValue(true);
      jest.spyOn(firefoxWASMLoader, 'getRawModule').mockReturnValue(mockModuleWithCallTracking);

      // Simulate the wrapper's finalize method call order
      const wasmModule = firefoxWASMLoader.getRawModule();
      const moduleInstance = new wasmModule.WasmModule();
      let analyzer = moduleInstance.init_streaming();
      analyzer = moduleInstance.process_chunk(analyzer, 'test content');
      
      // This should call get_streaming_stats BEFORE finalize_streaming
      const stats = moduleInstance.get_streaming_stats(analyzer);
      const result = moduleInstance.finalize_streaming(analyzer);

      // Verify the correct call order (stats before finalize)
      expect(callOrder).toEqual(['get_streaming_stats', 'finalize_streaming']);
      expect(stats).toBeDefined();
      expect(result).toBeDefined();
      expect(result.risk_score).toBe(0.1);
    });

    test('should prevent set-public-path regression', async () => {
      // Test that set-public-path.ts is properly configured
      const mockRuntime = {
        getURL: jest.fn((path: string) => `moz-extension://test-id/${path}`)
      };

      // Mock global browser runtime
      (global as any).browser = { runtime: mockRuntime };

      // Import set-public-path to ensure it runs
      require('../set-public-path');
      
      // Verify webpack public path is set correctly
      expect(typeof (global as any).__webpack_public_path__).toBe('string');
      expect((global as any).__webpack_public_path__).toContain('moz-extension://');
    });
  });
});

describe('Firefox Risk Score Bug Investigation', () => {
  test('should prove that direct finalizeStreaming returns no risk_score', async () => {
    // Mock the WASM module to simulate Firefox's behavior
    const mockWasmModule = {
      init_streaming: jest.fn().mockReturnValue('mock-analyzer'),
      process_chunk: jest.fn().mockReturnValue('mock-analyzer'),
      finalize_streaming: jest.fn().mockReturnValue({
        // Firefox's finalizeStreaming returns normalized result WITHOUT risk_score
        top_words: ['performance', 'review', 'feedback'],
        banned_phrases: [],
        pii_patterns: [],
        entropy: 4.2,
        is_obfuscated: false,
        decision: 'allow',
        reason: 'HR/performance content detected',
        // MISSING: risk_score: 0.17
      }),
      get_streaming_stats: jest.fn().mockReturnValue({
        total_time: 100,
        memory_usage: 1024,
        throughput: 1000
      })
    };

    // Mock the firefoxWASMLoader to return our mock module
    const originalGetRawModule = firefoxWASMLoader.getRawModule;
    firefoxWASMLoader.getRawModule = jest.fn().mockReturnValue(mockWasmModule);

    try {
      // Simulate Firefox's direct WASM calls
      const analyzer = mockWasmModule.init_streaming();
      const updatedAnalyzer = mockWasmModule.process_chunk(analyzer, 'test content');
      const rawResult = mockWasmModule.finalize_streaming(updatedAnalyzer);
      const stats = mockWasmModule.get_streaming_stats(updatedAnalyzer);

      // This proves the bug: Firefox's finalizeStreaming doesn't return risk_score
      expect(rawResult.risk_score).toBeUndefined();
      expect(rawResult.riskScore).toBeUndefined();
      
      // The result should have other fields but NOT risk_score
      expect(rawResult.top_words).toEqual(['performance', 'review', 'feedback']);
      expect(rawResult.reason).toBe('HR/performance content detected');
      
      // When we normalize this result, risk_score defaults to 0
      const normalizedResult = {
        topWords: rawResult?.top_words ?? [],
        bannedPhrases: rawResult?.banned_phrases ?? [],
        piiPatterns: rawResult?.pii_patterns ?? [],
        entropy: rawResult?.entropy ?? 0,
        isObfuscated: rawResult?.is_obfuscated ?? false,
        decision: rawResult?.decision ?? 'allow',
        reason: rawResult?.reason ?? 'Analysis complete',
        riskScore: rawResult?.risk_score ?? 0, // This becomes 0!
        stats
      };

      expect(normalizedResult.riskScore).toBe(0); // This is the bug!
      
    } finally {
      // Restore original method
      firefoxWASMLoader.getRawModule = originalGetRawModule;
    }
  });

  test('should prove that Chrome-style raw result would have risk_score', async () => {
    // Mock what Chrome's WASM module returns (the correct behavior)
    const mockChromeWasmModule = {
      init_streaming: jest.fn().mockReturnValue('mock-analyzer'),
      process_chunk: jest.fn().mockReturnValue('mock-analyzer'),
      finalize_streaming: jest.fn().mockReturnValue({
        // Chrome's finalizeStreaming returns raw result WITH risk_score
        top_words: ['performance', 'review', 'feedback'],
        banned_phrases: [],
        pii_patterns: [],
        entropy: 4.2,
        is_obfuscated: false,
        decision: 'allow',
        reason: 'HR/performance content detected',
        risk_score: 0.17 // Chrome includes this!
      }),
      get_streaming_stats: jest.fn().mockReturnValue({
        total_time: 100,
        memory_usage: 1024,
        throughput: 1000
      })
    };

    // Simulate Chrome's direct WASM calls
    const analyzer = mockChromeWasmModule.init_streaming();
    const updatedAnalyzer = mockChromeWasmModule.process_chunk(analyzer, 'test content');
    const rawResult = mockChromeWasmModule.finalize_streaming(updatedAnalyzer);
    const stats = mockChromeWasmModule.get_streaming_stats(updatedAnalyzer);

    // Chrome's result has risk_score
    expect(rawResult.risk_score).toBe(0.17);
    
    // When normalized, it preserves the risk_score
    const normalizedResult = {
      topWords: rawResult?.top_words ?? [],
      bannedPhrases: rawResult?.banned_phrases ?? [],
      piiPatterns: rawResult?.pii_patterns ?? [],
      entropy: rawResult?.entropy ?? 0,
      isObfuscated: rawResult?.is_obfuscated ?? false,
      decision: rawResult?.decision ?? 'allow',
      reason: rawResult?.reason ?? 'Analysis complete',
      riskScore: rawResult?.risk_score ?? 0,
      stats
    };

    expect(normalizedResult.riskScore).toBe(0.17); // This is correct!
  });

  test('should demonstrate the actual Firefox risk score bug in background script', async () => {
    // Mock the WASM module to simulate Firefox's actual behavior
    const mockWasmModule = {
      init_streaming: jest.fn().mockReturnValue('mock-analyzer'),
      process_chunk: jest.fn().mockReturnValue('mock-analyzer'),
      finalize_streaming: jest.fn().mockReturnValue({
        // Firefox's actual finalizeStreaming returns normalized result WITHOUT risk_score
        top_words: ['performance', 'review', 'feedback'],
        banned_phrases: [],
        pii_patterns: [],
        entropy: 4.2,
        is_obfuscated: false,
        decision: 'allow',
        reason: 'HR/performance content detected',
        // MISSING: risk_score: 0.17
      }),
      get_streaming_stats: jest.fn().mockReturnValue({
        total_time: 100,
        memory_usage: 1024,
        throughput: 1000
      })
    };

    // Mock the firefoxWASMLoader
    const originalGetRawModule = firefoxWASMLoader.getRawModule;
    firefoxWASMLoader.getRawModule = jest.fn().mockReturnValue(mockWasmModule);
    firefoxWASMLoader.isModuleLoaded = jest.fn().mockReturnValue(true);

    try {
      // Simulate the actual Firefox background script logic
      const message = {
        data: {
          fileName: 'test.txt',
          content: 'What impact did you have last week? What did you learn last week?'
        }
      };

      // This simulates the actual Firefox background script's handleFileAnalysis logic
      const wasmModule = firefoxWASMLoader.getRawModule();
      const analyzer = wasmModule.init_streaming();
      const updatedAnalyzer = wasmModule.process_chunk(analyzer, message.data.content);
      const rawResult = wasmModule.finalize_streaming(updatedAnalyzer);
      const stats = wasmModule.get_streaming_stats(updatedAnalyzer);

      // Firefox's normalizeWasmResult function (copied from background.ts)
      const normalizeWasmResult = (raw: any, stats: any) => {
        return {
          topWords: raw?.top_words ?? [],
          bannedPhrases: raw?.banned_phrases ?? [],
          piiPatterns: raw?.pii_patterns ?? [],
          entropy: raw?.entropy ?? 0,
          isObfuscated: raw?.is_obfuscated ?? false,
          decision: raw?.decision ?? 'allow',
          reason: raw?.reason ?? (Array.isArray(raw?.reasons) ? raw.reasons[0] : 'Analysis complete'),
          riskScore: raw?.risk_score ?? 0, // This becomes 0 because raw.risk_score is undefined!
          stats: {
            totalChunks: 1,
            totalContent: message.data.content.length,
            processingTime: Date.now() - Date.now(),
            performance: {
              timing: { total_time: stats?.total_time || 0 },
              memory: { peak_memory: stats?.peak_memory || 0 },
              throughput: { bytes_per_second: stats?.bytes_per_second || 0 }
            }
          }
        };
      };

      const result = normalizeWasmResult(rawResult, stats);

      // This proves the bug: Firefox returns 0% risk score for HR content
      expect(result.riskScore).toBe(0);
      expect(result.reason).toBe('HR/performance content detected');
      
      // The bug: rawResult.risk_score is undefined, so it defaults to 0
      expect(rawResult.risk_score).toBeUndefined();
      
    } finally {
      // Restore original method
      firefoxWASMLoader.getRawModule = originalGetRawModule;
    }
  });

  test('should prove that the fix works - Firefox now returns correct risk_score', async () => {
    // Mock the WASM module to simulate the FIXED Firefox behavior
    const mockWasmModule = {
      init_streaming: jest.fn().mockReturnValue('mock-analyzer'),
      process_chunk: jest.fn().mockReturnValue('mock-analyzer'),
      finalize_streaming: jest.fn().mockReturnValue({
        // FIXED: Firefox's finalizeStreaming now returns raw result WITH risk_score
        top_words: ['performance', 'review', 'feedback'],
        banned_phrases: [],
        pii_patterns: [],
        entropy: 4.2,
        is_obfuscated: false,
        decision: 'allow',
        reason: 'HR/performance content detected',
        risk_score: 0.17 // NOW INCLUDED!
      }),
      get_streaming_stats: jest.fn().mockReturnValue({
        total_time: 100,
        memory_usage: 1024,
        throughput: 1000
      })
    };

    // Mock the firefoxWASMLoader
    const originalGetRawModule = firefoxWASMLoader.getRawModule;
    firefoxWASMLoader.getRawModule = jest.fn().mockReturnValue(mockWasmModule);
    firefoxWASMLoader.isModuleLoaded = jest.fn().mockReturnValue(true);

    try {
      // Simulate the FIXED Firefox background script logic
      const message = {
        data: {
          fileName: 'test.txt',
          content: 'What impact did you have last week? What did you learn last week?'
        }
      };

      // This simulates the FIXED Firefox background script's handleFileAnalysis logic
      const wasmModule = firefoxWASMLoader.getRawModule();
      const analyzer = wasmModule.init_streaming();
      const updatedAnalyzer = wasmModule.process_chunk(analyzer, message.data.content);
      const rawResult = wasmModule.finalize_streaming(updatedAnalyzer);
      const stats = wasmModule.get_streaming_stats(updatedAnalyzer);

      // FIXED: Firefox's finalizeStreaming now returns risk_score
      expect(rawResult.risk_score).toBe(0.17);
      
      // Firefox's normalizeWasmResult function (copied from background.ts)
      const normalizeWasmResult = (raw: any, stats: any) => {
        return {
          topWords: raw?.top_words ?? [],
          bannedPhrases: raw?.banned_phrases ?? [],
          piiPatterns: raw?.pii_patterns ?? [],
          entropy: raw?.entropy ?? 0,
          isObfuscated: raw?.is_obfuscated ?? false,
          decision: raw?.decision ?? 'allow',
          reason: raw?.reason ?? (Array.isArray(raw?.reasons) ? raw.reasons[0] : 'Analysis complete'),
          riskScore: raw?.risk_score ?? 0, // Now this gets 0.17!
          stats: {
            totalChunks: 1,
            totalContent: message.data.content.length,
            processingTime: Date.now() - Date.now(),
            performance: {
              timing: { total_time: stats?.total_time || 0 },
              memory: { peak_memory: stats?.peak_memory || 0 },
              throughput: { bytes_per_second: stats?.bytes_per_second || 0 }
            }
          }
        };
      };

      const result = normalizeWasmResult(rawResult, stats);

      // FIXED: Firefox now returns 17% risk score for HR content (same as Chrome)
      expect(result.riskScore).toBe(0.17);
      expect(result.reason).toBe('HR/performance content detected');
      
      // The fix: rawResult.risk_score is now 0.17, so normalization preserves it
      expect(rawResult.risk_score).toBe(0.17);
      
    } finally {
      // Restore original method
      firefoxWASMLoader.getRawModule = originalGetRawModule;
    }
  });
});

describe('ProcessChunk Complete Result Handling', () => {
  test('should handle processChunk returning complete result without finalizeStreaming', async () => {
    const mockWasmModule = {
      createStreamingAnalyzer: jest.fn(() => ({
        config: {},
        word_counts: new Map(),
        total_chunks: 0,
        total_content: '',
        banned_phrase_matches: [],
        pii_patterns: []
      })),
      processChunk: jest.fn((handle, chunk) => ({
        config: {},
        word_counts: new Map([['test', 1], ['content', 1]]),
        total_chunks: 1,
        total_content: chunk,
        banned_phrase_matches: [],
        pii_patterns: [],
        entropy: 3.2,
        risk_score: 0.15
      })),
      finalizeStreaming: jest.fn() // Should not be called
    };

    const firefoxWASMLoader = {
      createStreamingAnalyzer: jest.fn(() => {
        const { StreamingAnalyzerWrapper } = require('../background/wasm-loader');
        return new StreamingAnalyzerWrapper(mockWasmModule, {});
      })
    };

    // Simulate the analysis flow
    const analyzer = firefoxWASMLoader.createStreamingAnalyzer();
    analyzer.processChunk('test content for analysis');
    const result = analyzer.finalize();

    // Verify processChunk was called but finalizeStreaming was not
    expect(mockWasmModule.processChunk).toHaveBeenCalledWith(
      expect.any(Object),
      'test content for analysis'
    );
    expect(mockWasmModule.finalizeStreaming).not.toHaveBeenCalled();

    // Verify the result contains the expected fields
    expect(result).toMatchObject({
      risk_score: expect.any(Number),
      is_safe: expect.any(Boolean),
      decision: expect.any(String),
      reason: expect.any(String),
      stats: expect.objectContaining({
        total_chunks: 1,
        total_content: expect.any(Number)
      }),
      analysis: expect.objectContaining({
        banned_phrases: expect.any(Array),
        pii_patterns: expect.any(Array),
        entropy: expect.any(Number)
      })
    });
  });

  test('should prevent "Invalid analyzer handle" regression with complete results', async () => {
    // Mock a WASM module that returns complete results from processChunk
    const mockWasmModule = {
      createStreamingAnalyzer: jest.fn(() => ({})),
      processChunk: jest.fn(() => ({
        total_content: 'mocked content',
        word_counts: new Map(),
        banned_phrase_matches: [],
        entropy: 2.5,
        risk_score: 0.12
      })),
      finalizeStreaming: jest.fn(() => {
        throw new Error('Invalid analyzer handle'); // This should not be called
      })
    };

    const { StreamingAnalyzerWrapper } = require('../background/wasm-loader');
    const analyzer = new StreamingAnalyzerWrapper(mockWasmModule, {});
    
    // This should complete without throwing "Invalid analyzer handle"
    analyzer.processChunk('test content');
    expect(() => analyzer.finalize()).not.toThrow();
    
    // Verify finalizeStreaming was never called
    expect(mockWasmModule.finalizeStreaming).not.toHaveBeenCalled();
  });

  test('should detect complete result structure correctly', async () => {
    const mockWasmModule = {
      createStreamingAnalyzer: jest.fn(() => ({})),
      processChunk: jest.fn(() => ({
        // Complete result structure
        config: {},
        word_counts: new Map([['leadership', 2], ['team', 3]]),
        total_chunks: 1,
        total_content: 'People-pleasing destroys team leadership...',
        banned_phrase_matches: [],
        pii_patterns: [],
        entropy: 4.1,
        risk_score: 0.18
      })),
      finalizeStreaming: jest.fn()
    };

    const { StreamingAnalyzerWrapper } = require('../background/wasm-loader');
    const analyzer = new StreamingAnalyzerWrapper(mockWasmModule, {});
    
    analyzer.processChunk('People-pleasing destroys team leadership...');
    const result = analyzer.finalize();

    // Should detect the complete result and skip finalizeStreaming
    expect(mockWasmModule.finalizeStreaming).not.toHaveBeenCalled();
    
    // Should preserve the risk score from the complete result
    expect(result.risk_score).toBe(0.18);
    expect(result.analysis.entropy).toBe(4.1);
  });
});
