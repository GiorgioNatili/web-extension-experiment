// Safari background script
import { CONFIG, MESSAGES } from 'shared';
import { safariWASMLoader } from './wasm-loader';
import { safariErrorHandler, ErrorType } from '../utils/error-handler';

console.log('SquareX File Scanner Safari Background Script loaded');

// Configuration
const TIMEOUT_MS = 30000; // 30 seconds
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = CONFIG.CHUNK_SIZE; // 1MB

// In-memory storage for streaming operations
const streamingOperations = new Map<string, any>();

// Initialize WASM module on startup
async function initializeWASM() {
  try {
    await safariWASMLoader.loadWASMModule();
    console.log('WASM module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
    // Handle WASM initialization error
    const recovery = await safariErrorHandler.handleError(error as Error, { operation: 'wasm_init' });
    if (!recovery.recovered) {
      console.error('WASM initialization failed and could not be recovered');
    }
  }
}

// Initialize on startup
initializeWASM();

// Handle messages from content script
browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log('Received message:', message);
  
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
        wasm_loaded: safariWASMLoader.isModuleLoaded(),
        error_stats: safariErrorHandler.getErrorStats()
      });
      break;
      
    case 'GET_ERROR_LOG':
      sendResponse({ 
        error_log: safariErrorHandler.getErrorLog(),
        error_stats: safariErrorHandler.getErrorStats()
      });
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
});

// Handle file analysis request
async function handleFileAnalysis(message: any, sendResponse: any) {
  try {
    const { content, fileName } = message.data;
    
    if (!safariWASMLoader.isModuleLoaded()) {
      throw new Error('WASM module not loaded');
    }
    
    // Create streaming analyzer
    const analyzer = safariWASMLoader.createStreamingAnalyzer();
    
    // Process content in chunks
    const chunks = chunkContent(content, CHUNK_SIZE);
    let totalChunks = chunks.length;
    
    for (let i = 0; i < chunks.length; i++) {
      analyzer.processChunk(chunks[i]);
      
      // Add small delay to prevent blocking
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    // Finalize analysis
    const result = analyzer.finalize();
    
    sendResponse({
      success: true,
      result: {
        ...result,
        stats: {
          totalChunks,
          totalContent: content.length,
          processingTime: Date.now() - message.timestamp || 0
        }
      }
    });
    
  } catch (error) {
    console.error('File analysis failed:', error);
    const recovery = await safariErrorHandler.handleError(error as Error, { 
      operation: 'file_analysis',
      fileName: message.data?.fileName 
    });
    
    sendResponse({
      success: false,
      error: error.message,
      fallback: recovery.recovered
    });
  }
}

// Handle streaming initialization
async function handleStreamInit(message: any, sendResponse: any) {
  try {
    const { operation_id, file_info } = message;
    
    if (!safariWASMLoader.isModuleLoaded()) {
      throw new Error('WASM module not loaded');
    }
    
    // Create streaming operation
    const analyzer = safariWASMLoader.createStreamingAnalyzer();
    const operation = {
      id: operation_id,
      analyzer,
      fileInfo: file_info,
      startTime: Date.now(),
      chunks: [],
      status: 'initialized'
    };
    
    streamingOperations.set(operation_id, operation);
    
    sendResponse({
      success: true,
      operation_id,
      message: 'Streaming operation initialized'
    });
    
  } catch (error) {
    console.error('Streaming initialization failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle streaming chunk processing
async function handleStreamChunk(message: any, sendResponse: any) {
  try {
    const { operation_id, chunk, chunk_index } = message;
    
    const operation = streamingOperations.get(operation_id);
    if (!operation) {
      throw new Error('Streaming operation not found');
    }
    
    // Process chunk
    operation.analyzer.processChunk(chunk);
    operation.chunks.push(chunk_index);
    
    // Check for timeout
    const elapsed = Date.now() - operation.startTime;
    if (elapsed > TIMEOUT_MS) {
      throw new Error('Streaming operation timeout');
    }
    
    sendResponse({
      success: true,
      operation_id,
      chunk_index,
      message: 'Chunk processed successfully'
    });
    
  } catch (error) {
    console.error('Chunk processing failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle streaming finalization
async function handleStreamFinalize(message: any, sendResponse: any) {
  try {
    const { operation_id } = message;
    
    const operation = streamingOperations.get(operation_id);
    if (!operation) {
      throw new Error('Streaming operation not found');
    }
    
    // Finalize analysis
    const result = operation.analyzer.finalize();
    
    // Calculate performance metrics
    const processingTime = Date.now() - operation.startTime;
    const totalContent = operation.chunks.length * CHUNK_SIZE;
    
    // Clean up operation
    streamingOperations.delete(operation_id);
    
    sendResponse({
      success: true,
      operation_id,
      result: {
        ...result,
        stats: {
          totalChunks: operation.chunks.length,
          totalContent,
          processingTime
        }
      }
    });
    
  } catch (error) {
    console.error('Streaming finalization failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Utility function to chunk content
function chunkContent(content: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }
  return chunks;
}

// Handle extension lifecycle events
browser.runtime.onInstalled.addListener((details) => {
  console.log('Safari extension installed:', details);
  
  // Initialize default settings
  browser.storage.local.set({
    scannerEnabled: true,
    entropyThreshold: '4.8',
    riskThreshold: '0.6',
    bannedPhrases: 'malware,virus,trojan',
    stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
  });
});

browser.runtime.onStartup.addListener(() => {
  console.log('Safari extension started');
  initializeWASM();
});

browser.runtime.onUpdateAvailable.addListener(() => {
  console.log('Safari extension update available');
  browser.runtime.reload();
});

// Cleanup streaming operations periodically
setInterval(() => {
  const now = Date.now();
  for (const [operationId, operation] of streamingOperations.entries()) {
    if (now - operation.startTime > TIMEOUT_MS) {
      console.log('Cleaning up stale streaming operation:', operationId);
      streamingOperations.delete(operationId);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
