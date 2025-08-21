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

// NEW: Send ready signal immediately
console.log('[Safari] Sending immediate ready signal');
try {
  browser.tabs.query({}).then((tabs: any[]) => {
    tabs.forEach((tab: any) => {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, { 
          type: 'EXTENSION_READY',
          source: 'squarex-extension',
          ready: true 
        }).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      }
    });
  });
} catch (error) {
  console.error('[Safari] Error sending immediate ready signal:', error);
}

// Handle messages from content script
browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
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
        error_stats: safariErrorHandler.getErrorStats(),
        module_status: safariWASMLoader.getModuleStatus()
      });
      break;
      
    case 'GET_ERROR_LOG':
      sendResponse({ 
        error_log: safariErrorHandler.getErrorLog(),
        error_stats: safariErrorHandler.getErrorStats()
      });
      break;
      
    case 'TEST_WASM_LOADING':
      handleWasmTest(message, sendResponse);
      return true;
      
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
        fileName,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('File analysis failed:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle WASM test request
async function handleWasmTest(message: any, sendResponse: any) {
  try {
    const isLoaded = safariWASMLoader.isModuleLoaded();
    const moduleStatus = safariWASMLoader.getModuleStatus();
    
    sendResponse({
      success: true,
      wasm_loaded: isLoaded,
      module_status: moduleStatus
    });
  } catch (error) {
    console.error('WASM test failed:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle stream initialization
async function handleStreamInit(message: any, sendResponse: any) {
  try {
    const { operation_id, file_info } = message;
    
    if (!safariWASMLoader.isModuleLoaded()) {
      throw new Error('WASM module not loaded');
    }
    
    // Initialize streaming operation
    const operation = {
      id: operation_id,
      file_info,
      content: '',
      stats: {
        total_chunks: 0,
        total_content_length: 0,
        start_time: Date.now()
      },
      lastActivity: Date.now()
    };
    
    // Store operation
    streamingOperations.set(operation_id, operation);
    
    console.log('Streaming operation initialized:', operation_id);
    
    sendResponse({ success: true, operation_id });
  } catch (error) {
    console.error('Stream initialization failed:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle stream chunk processing
async function handleStreamChunk(message: any, sendResponse: any) {
  try {
    const { operation_id, chunk, chunk_index } = message;
    
    const operation = streamingOperations.get(operation_id);
    if (!operation) {
      throw new Error('Streaming operation not found');
    }
    
    // Process chunk
    operation.content += chunk;
    operation.stats.total_chunks++;
    operation.stats.total_content_length = operation.content.length;
    operation.lastActivity = Date.now();
    
    console.log(`Processed chunk ${chunk_index} for operation ${operation_id}`);
    
    sendResponse({
      success: true,
      chunk_index,
      total_chunks: operation.stats.total_chunks
    });
  } catch (error) {
    console.error('Chunk processing failed:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle stream finalization
async function handleStreamFinalize(message: any, sendResponse: any) {
  try {
    const { operation_id } = message;
    
    if (!safariWASMLoader.isModuleLoaded()) {
      throw new Error('WASM module not loaded');
    }
    
    const operation = streamingOperations.get(operation_id);
    if (!operation) {
      throw new Error('Streaming operation not found');
    }
    
    // Create analyzer and process final content
    const analyzer = safariWASMLoader.createStreamingAnalyzer();
    analyzer.processChunk(operation.content);
    
    // Finalize analysis
    const result = analyzer.finalize();
    
    // Clean up operation
    streamingOperations.delete(operation_id);
    
    console.log('Streaming analysis completed:', operation_id);
    
    sendResponse({
      success: true,
      result: {
        ...result,
        fileName: operation.file_info.name,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Stream finalization failed:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Utility function to chunk content
function chunkContent(content: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let offset = 0;
  
  while (offset < content.length) {
    const chunk = content.slice(offset, offset + chunkSize);
    chunks.push(chunk);
    offset += chunkSize;
  }
  
  return chunks;
}

// Clean up old streaming operations periodically
setInterval(() => {
  const now = Date.now();
  for (const [operationId, operation] of streamingOperations.entries()) {
    if (now - operation.lastActivity > TIMEOUT_MS) {
      console.log('Cleaning up expired streaming operation:', operationId);
      streamingOperations.delete(operationId);
    }
  }
}, 60000); // Check every minute

// Handle extension lifecycle events
browser.runtime.onInstalled.addListener((details: any) => {
  console.log('Extension installed:', details);
});

browser.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  initializeWASM();
});

browser.runtime.onUpdateAvailable.addListener(() => {
  console.log('Update available, reloading extension');
  browser.runtime.reload();
});
