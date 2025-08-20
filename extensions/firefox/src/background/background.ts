// Firefox background script
console.log('[FF] BACKGROUND SCRIPT STARTING - BEFORE IMPORTS');
console.log('[FF] ==========================================');

import { CONFIG, MESSAGES } from 'shared';
import { firefoxWASMLoader } from './wasm-loader';
import { firefoxErrorHandler, ErrorType } from '../utils/error-handler';

console.log('[FF] ==========================================');
console.log('[FF] SquareX Security Scanner Background Script loaded');
console.log('[FF] Background script environment check:', {
  hasBrowser: typeof browser !== 'undefined',
  hasRuntime: typeof browser !== 'undefined' && !!browser.runtime,
  hasOnMessage: typeof browser !== 'undefined' && !!browser.runtime && !!browser.runtime.onMessage,
  timestamp: new Date().toISOString()
});
console.log('[FF] ==========================================');

// Configuration
const TIMEOUT_MS = 30000; // 30 seconds
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = CONFIG.CHUNK_SIZE; // 1MB

// In-memory storage for streaming operations
const streamingOperations = new Map<string, any>();

// Initialize WASM module on startup
async function initializeWASM() {
  try {
    await firefoxWASMLoader.loadWASMModule();
    console.log('WASM module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
    // Handle WASM initialization error
    const recovery = await firefoxErrorHandler.handleError(error as Error, { operation: 'wasm_init' });
    if (!recovery.recovered) {
      console.error('WASM initialization failed and could not be recovered');
    }
  }
}

// Initialize on startup
initializeWASM();

// Test message listener is working
setTimeout(() => {
  console.log('[FF] ==========================================');
  console.log('[FF] Background script startup test - message listener should be active');
  console.log('[FF] If you see this message, the background script is working!');
  console.log('[FF] ==========================================');
}, 1000);

// Handle messages from content script
browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  console.log('[FF] Background script received message:', {
    type: message.type,
    hasData: !!message.data,
    timestamp: new Date().toISOString()
  });
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'ANALYZE_FILE':
      handleFileAnalysis(message, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'STREAM_INIT':
      handleStreamInit(message, sendResponse);
      return true;
      
    case 'STREAM_CHUNK':
      handleStreamChunk(message, sendResponse);
      return true;
      
    case 'STREAM_FINALIZE':
      handleStreamFinalize(message, sendResponse);
      return true;
      
    case 'GET_STATUS':
      sendResponse({ 
        status: 'ready',
        wasm_loaded: firefoxWASMLoader.isModuleLoaded(),
        error_stats: firefoxErrorHandler.getErrorStats(),
        debug: (() => { try { const m: any = (firefoxWASMLoader as any); const mod = (m && m.wasmModule) || null; return { keys: mod ? Object.keys(mod) : [], hasCreateFn: !!(mod && typeof mod.createStreamingAnalyzer === 'function') }; } catch { return { keys: [], hasCreateFn: false }; } })()
      });
      break;
      
    case 'GET_ERROR_LOG':
      sendResponse({ 
        error_log: firefoxErrorHandler.getErrorLog(),
        error_stats: firefoxErrorHandler.getErrorStats()
      });
      break;
    
    case 'TEST_WASM_LOADING':
      handleWasmTest(sendResponse);
      return true; // Keep message channel open for async response
      
    default:
      console.warn('[FF] Unknown message type:', message.type);
      console.log('[FF] Unhandled message details:', {
        type: message.type,
        hasData: !!message.data,
        messageKeys: Object.keys(message),
        timestamp: new Date().toISOString()
      });
  }
});

/**
 * Handle traditional file analysis (legacy)
 */
async function handleFileAnalysis(message: any, sendResponse: (response: any) => void) {
  try {
    console.log('[FF] Background script received analysis request:', {
      fileName: message.data?.fileName,
      contentLength: message.data?.content?.length,
      timestamp: new Date().toISOString()
    });
    
    console.log('Starting file analysis...');
    
    // Ensure WASM module is loaded
    if (!firefoxWASMLoader.isModuleLoaded()) {
      await firefoxWASMLoader.loadWASMModule();
    }
    
    // Use Chrome's direct WASM interface pattern
    const wasmModule = firefoxWASMLoader.getRawModule();
    if (!wasmModule || typeof wasmModule.WasmModule !== 'function') {
      throw new Error('WASM module not available or invalid');
    }
    
    // Debug content processing
    console.log('[FF] Processing content using direct WASM interface:', {
      contentLength: message.data.content.length,
      contentPreview: message.data.content.substring(0, 100) + '...',
      hasContent: !!message.data.content,
      timestamp: new Date().toISOString()
    });
    
    // Use Chrome's proven pattern: direct WASM module calls
    const moduleInstance = new wasmModule.WasmModule();
    let analyzer = moduleInstance.init_streaming();
    
    console.log('[FF] WASM analyzer initialized, processing chunk...');
    
    // Process chunk and reassign analyzer (Chrome's pattern)
    analyzer = moduleInstance.process_chunk(analyzer, message.data.content);
    
    console.log('[FF] WASM chunk processed, finalizing...');
    
    // Finalize analysis
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
        totalContent: message.data.content.length,
        processingTime: Date.now() - Date.now(),
        performance: {
          timing: { total_time: stats?.total_time || 0 },
          memory: { peak_memory: stats?.peak_memory || 0 },
          throughput: { bytes_per_second: stats?.bytes_per_second || 0 }
        }
      }
    };
    
    console.log('Analysis complete:', result);
    sendResponse({ success: true, result });
    
  } catch (error) {
    // Enhanced error logging for Firefox debugging
    console.error('[FF] Detailed background analysis error:', {
      fileName: message.data?.fileName,
      contentLength: message.data?.content?.length,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      operation: 'file_analysis'
    });
    
    // Handle error with recovery
    const recovery = await firefoxErrorHandler.handleError(error as Error, {
      operation: 'file_analysis',
      content: message.data?.content,
      fileName: message.data?.fileName
    });
    
    if (recovery.recovered && recovery.result) {
      sendResponse({ success: true, result: recovery.result });
    } else {
      sendResponse({ 
        success: false, 
        error: firefoxErrorHandler.getUserFriendlyMessage(ErrorType.UNKNOWN_ERROR)
      });
    }
  }
}

/**
 * Handle stream initialization
 */
async function handleStreamInit(message: any, sendResponse: (response: any) => void) {
  try {
    console.log('Initializing streaming analysis:', message.operation_id);
    
    // Validate file size
    if (message.file.size > MAX_FILE_SIZE) {
      const error = {
        code: 'FILE_TOO_LARGE',
        message: `File size ${message.file.size} exceeds maximum allowed size ${MAX_FILE_SIZE}`,
        timestamp: Date.now()
      };
      
      sendResponse({
        success: false,
        error,
        retryable: false
      });
      return;
    }
    
    // Ensure WASM module is loaded
    if (!firefoxWASMLoader.isModuleLoaded()) {
      await firefoxWASMLoader.loadWASMModule();
    }
    
    // Create WASM analyzer for this operation
    const analyzer = firefoxWASMLoader.createStreamingAnalyzer();
    
    // Initialize streaming operation
    const operation = {
      id: message.operation_id,
      file: message.file,
      analyzer: analyzer,
      chunks: [],
      processedChunks: 0,
      totalChunks: Math.ceil(message.file.size / CHUNK_SIZE),
      startTime: Date.now(),
      lastChunkTime: Date.now(),
      isPaused: false,
      timeoutId: null as any,
      errorCount: 0,
      maxErrors: 3
    };
    
    // Set timeout for operation
    operation.timeoutId = setTimeout(() => {
      console.warn('Operation timeout:', operation.id);
      streamingOperations.delete(operation.id);
    }, TIMEOUT_MS);
    
    streamingOperations.set(operation.id, operation);
    
    console.log('Streaming operation initialized:', operation.id);
    sendResponse({
      success: true,
      operation_id: operation.id,
      total_chunks: operation.totalChunks
    });
    
  } catch (error) {
    console.error('Stream initialization failed:', error);
    
    // Handle error with recovery
    const recovery = await firefoxErrorHandler.handleError(error as Error, {
      operation: 'stream_init',
      file: message.file,
      operation_id: message.operation_id
    });
    
    if (recovery.recovered && recovery.result) {
      sendResponse({
        success: true,
        operation_id: message.operation_id,
        total_chunks: 1,
        fallback: true
      });
    } else {
      sendResponse({
        success: false,
        error: {
          code: 'INIT_FAILED',
          message: firefoxErrorHandler.getUserFriendlyMessage(ErrorType.STREAM_INIT_FAILED),
          timestamp: Date.now()
        }
      });
    }
  }
}

/**
 * Handle WASM loading test (parity with Chrome)
 */
async function handleWasmTest(sendResponse: (response: any) => void) {
  try {
    console.log('[FF] Testing WASM loading...');
    const wasmLoaded = firefoxWASMLoader.isModuleLoaded();
    const moduleStatus = firefoxWASMLoader.getModuleStatus();
    console.log('[FF] Current WASM status:', { wasmLoaded, moduleStatus });

    if (!wasmLoaded) {
      console.log('[FF] WASM not loaded, attempting to load...');
      await firefoxWASMLoader.loadWASMModule();
    }

    let testResult = 'WASM module loaded successfully';
    try {
      let analyzer: any;
      try {
        analyzer = firefoxWASMLoader.createStreamingAnalyzer();
      } catch (e) {
        console.warn('[FF] createStreamingAnalyzer failed, attempting raw adapter path');
        const mod: any = (firefoxWASMLoader as any).getRawModule?.() || (firefoxWASMLoader as any).wasmModule;
        if (mod && typeof mod.WasmModule === 'function') {
          const m = new mod.WasmModule();
          const h = m.init_streaming();
          analyzer = {
            processChunk: (chunk: string) => m.process_chunk(h, chunk),
            finalize: () => ({
              ...m.finalize_streaming(h),
              stats: m.get_streaming_stats(h)
            })
          };
        } else {
          throw e;
        }
      }
      analyzer.processChunk('test content');
      const result = analyzer.finalize();
      testResult = `WASM analysis test passed: ${JSON.stringify(result).substring(0, 100)}...`;
    } catch (e) {
      testResult = `WASM analysis test failed: ${(e as Error).message}`;
    }

    sendResponse({
      success: true,
      wasmLoaded: firefoxWASMLoader.isModuleLoaded(),
      moduleStatus: firefoxWASMLoader.getModuleStatus(),
      testResult
    });
  } catch (error) {
    console.error('[FF] WASM test failed:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
      wasmLoaded: firefoxWASMLoader.isModuleLoaded(),
      moduleStatus: firefoxWASMLoader.getModuleStatus()
    });
  }
}

/**
 * Handle chunk processing
 */
async function handleStreamChunk(message: any, sendResponse: (response: any) => void) {
  try {
    const operation = streamingOperations.get(message.operation_id);
    
    if (!operation) {
      sendResponse({
        success: false,
        error: {
          code: 'OPERATION_NOT_FOUND',
          message: 'Streaming operation not found',
          timestamp: Date.now()
        }
      });
      return;
    }
    
    // Check if operation is paused due to backpressure
    if (operation.isPaused) {
      sendResponse({
        success: false,
        error: {
          code: 'OPERATION_PAUSED',
          message: 'Operation paused due to backpressure',
          timestamp: Date.now()
        },
        retryable: true,
        retry_after: 1000 // Retry after 1 second
      });
      return;
    }
    
    // Process chunk using WASM
    const chunkResult = await firefoxWASMLoader.analyzeChunk(message.chunk, operation.analyzer);
    operation.chunks.push(chunkResult);
    operation.processedChunks++;
    operation.lastChunkTime = Date.now();
    
    // Apply backpressure if needed (pause after 50 chunks)
    if (operation.processedChunks % 50 === 0) {
      operation.isPaused = true;
      setTimeout(() => {
        operation.isPaused = false;
      }, 1000);
    }
    
    // Calculate progress
    const progress = (operation.processedChunks / operation.totalChunks) * 100;
    const estimatedTime = calculateEstimatedTime(operation);
    
    console.log(`Chunk processed: ${operation.processedChunks}/${operation.totalChunks} (${progress.toFixed(1)}%)`);
    
    sendResponse({
      success: true,
      chunk_index: operation.processedChunks - 1,
      progress,
      estimated_time: estimatedTime
    });
    
  } catch (error) {
    console.error('Chunk processing failed:', error);
    
    const operation = streamingOperations.get(message.operation_id);
    if (operation) {
      operation.errorCount++;
      
      // If too many errors, abort operation
      if (operation.errorCount >= operation.maxErrors) {
        streamingOperations.delete(message.operation_id);
        sendResponse({
          success: false,
          error: {
            code: 'TOO_MANY_ERRORS',
            message: 'Too many processing errors, operation aborted',
            timestamp: Date.now()
          }
        });
        return;
      }
    }
    
    // Handle error with recovery
    const recovery = await firefoxErrorHandler.handleError(error as Error, {
      operation: 'chunk_processing',
      chunk: message.chunk,
      operation_id: message.operation_id
    });
    
    if (recovery.recovered) {
      // Continue with next chunk
      sendResponse({
        success: true,
        chunk_index: operation?.processedChunks || 0,
        progress: operation ? (operation.processedChunks / operation.totalChunks) * 100 : 0,
        error_recovered: true
      });
    } else {
      sendResponse({
        success: false,
        error: {
          code: 'CHUNK_PROCESSING_FAILED',
          message: firefoxErrorHandler.getUserFriendlyMessage(ErrorType.CHUNK_PROCESSING_FAILED),
          timestamp: Date.now()
        }
      });
    }
  }
}

/**
 * Handle stream finalization
 */
async function handleStreamFinalize(message: any, sendResponse: (response: any) => void) {
  try {
    const operation = streamingOperations.get(message.operation_id);
    
    if (!operation) {
      sendResponse({
        success: false,
        error: {
          code: 'OPERATION_NOT_FOUND',
          message: 'Streaming operation not found',
          timestamp: Date.now()
        }
      });
      return;
    }
    
    // Clear timeout
    if (operation.timeoutId) {
      clearTimeout(operation.timeoutId);
    }
    
    // Finalize operation using WASM
    const wasmResult = await firefoxWASMLoader.finalizeAnalysis(operation.analyzer);
    const result = wasmResult.result;
    
    // Clean up
    streamingOperations.delete(operation.id);
    
    console.log('Streaming operation finalized:', operation.id);
    sendResponse({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Stream finalization failed:', error);
    
    // Handle error with recovery
    const recovery = await firefoxErrorHandler.handleError(error as Error, {
      operation: 'stream_finalize',
      operation_id: message.operation_id
    });
    
    if (recovery.recovered && recovery.result) {
      sendResponse({
        success: true,
        result: recovery.result,
        fallback: true
      });
    } else {
      sendResponse({
        success: false,
        error: {
          code: 'FINALIZATION_FAILED',
          message: firefoxErrorHandler.getUserFriendlyMessage(ErrorType.STREAM_FINALIZATION_FAILED),
          timestamp: Date.now()
        }
      });
    }
  }
}

/**
 * Calculate estimated time remaining
 */
function calculateEstimatedTime(operation: any): number | undefined {
  if (operation.processedChunks < 2) return undefined;
  
  const elapsed = Date.now() - operation.startTime;
  const avgTimePerChunk = elapsed / operation.processedChunks;
  const remainingChunks = operation.totalChunks - operation.processedChunks;
  
  return Math.round(avgTimePerChunk * remainingChunks);
}

// Handle extension installation
browser.runtime.onInstalled.addListener((details: any) => {
  console.log('Extension installed:', details);
  console.log('SquareX Security Scanner installed successfully!');
});

// Handle extension startup
browser.runtime.onStartup.addListener(() => {
  console.log('SquareX Security Scanner started');
  // Initialize WASM on startup
  initializeWASM();
});

// Handle extension update
browser.runtime.onUpdateAvailable.addListener(() => {
  console.log('Extension update available');
});

// Periodic cleanup of stale operations
setInterval(() => {
  const now = Date.now();
  for (const [id, operation] of streamingOperations.entries()) {
    if (now - operation.lastChunkTime > TIMEOUT_MS) {
      console.warn('Cleaning up stale operation:', id);
      if (operation.timeoutId) {
        clearTimeout(operation.timeoutId);
      }
      streamingOperations.delete(id);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Final test to confirm script execution
console.log('[FF] ==========================================');
console.log('[FF] BACKGROUND SCRIPT LOADED SUCCESSFULLY');
console.log('[FF] If you see this, the background script is working!');
console.log('[FF] ==========================================');
