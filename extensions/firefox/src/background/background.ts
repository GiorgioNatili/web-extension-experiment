// Firefox background script
import { CONFIG, MESSAGES } from 'shared';
import { firefoxWASMLoader } from './wasm-loader';
import { firefoxErrorHandler, ErrorType } from '../utils/error-handler';

console.log('SquareX Security Scanner Background Script loaded');

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

// Handle messages from content script
browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
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
        error_stats: firefoxErrorHandler.getErrorStats()
      });
      break;
      
    case 'GET_ERROR_LOG':
      sendResponse({ 
        error_log: firefoxErrorHandler.getErrorLog(),
        error_stats: firefoxErrorHandler.getErrorStats()
      });
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
});

/**
 * Handle traditional file analysis (legacy)
 */
async function handleFileAnalysis(message: any, sendResponse: (response: any) => void) {
  try {
    console.log('Starting file analysis...');
    
    // Ensure WASM module is loaded
    if (!firefoxWASMLoader.isModuleLoaded()) {
      await firefoxWASMLoader.loadWASMModule();
    }
    
    // Create analyzer and process content
    const analyzer = firefoxWASMLoader.createStreamingAnalyzer();
    analyzer.processChunk(message.data.content);
    const result = analyzer.finalize();
    
    console.log('Analysis complete:', result);
    sendResponse({ success: true, result });
    
  } catch (error) {
    console.error('Analysis failed:', error);
    
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
