import { CONFIG, MESSAGES } from 'shared';
import { chromeWASMLoader } from './wasm-loader';
import { chromeErrorHandler, ErrorType } from '../utils/error-handler';

console.log('SquareX File Scanner Service Worker loaded');

// Configuration
const TIMEOUT_MS = 30000; // 30 seconds
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = CONFIG.CHUNK_SIZE; // 1MB

// In-memory storage for streaming operations
const streamingOperations = new Map<string, any>();

// Initialize WASM module on startup
async function initializeWASM() {
  try {
    await chromeWASMLoader.loadWASMModule();
    console.log('WASM module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
    // Handle WASM initialization error
    const recovery = await chromeErrorHandler.handleError(error as Error, { operation: 'wasm_init' });
    if (!recovery.recovered) {
      console.error('WASM initialization failed and could not be recovered');
    }
  }
}

// Initialize on startup
initializeWASM();

// Handle messages from content script
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
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
        wasm_loaded: chromeWASMLoader.isModuleLoaded(),
        error_stats: chromeErrorHandler.getErrorStats()
      });
      break;
      
    case 'GET_ERROR_LOG':
      sendResponse({ 
        error_log: chromeErrorHandler.getErrorLog(),
        error_stats: chromeErrorHandler.getErrorStats()
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
    if (!chromeWASMLoader.isModuleLoaded()) {
      await chromeWASMLoader.loadWASMModule();
    }
    
    // Create analyzer and process content
    const analyzer = chromeWASMLoader.createStreamingAnalyzer();
    analyzer.processChunk(message.data.content);
    const result = analyzer.finalize();
    
    console.log('Analysis complete:', result);
    sendResponse({ success: true, result });
    
  } catch (error) {
    console.error('Analysis failed:', error);
    
    // Handle error with recovery
    const recovery = await chromeErrorHandler.handleError(error as Error, {
      operation: 'file_analysis',
      context: { fileName: message.data.fileName }
    });
    
    if (recovery.recovered && recovery.fallbackResult) {
      sendResponse({ success: true, result: recovery.fallbackResult });
    } else {
      sendResponse({ 
        success: false, 
        error: MESSAGES.ANALYSIS_FAILED 
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
    
    // Initialize streaming operation
    const operation = {
      id: message.operation_id,
      file: message.file,
      config: message.config || {},
      state: 'processing',
      stats: {
        total_chunks: 0,
        total_content_length: 0,
        unique_words: 0,
        banned_phrase_count: 0,
        pii_pattern_count: 0,
        processing_time_ms: 0
      },
      startTime: Date.now(),
      lastActivity: Date.now(),
      content: ''
    };
    
    streamingOperations.set(message.operation_id, operation);
    
    console.log('Streaming operation initialized:', operation.id);
    
    sendResponse({
      success: true,
      operation: {
        id: operation.id,
        state: operation.state,
        config: operation.config
      }
    });
    
  } catch (error) {
    console.error('Stream init failed:', error);
    
    const wasmError = {
      code: 'STREAM_INIT_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    };
    
    sendResponse({
      success: false,
      error: wasmError,
      retryable: true
    });
  }
}

/**
 * Handle stream chunk processing
 */
async function handleStreamChunk(message: any, sendResponse: (response: any) => void) {
  try {
    console.log(`Processing chunk ${message.chunk.index} for operation ${message.operation_id}`);
    
    const operation = streamingOperations.get(message.operation_id);
    if (!operation) {
      throw new Error('Operation not found');
    }
    
    // Process chunk with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chunk processing timeout')), TIMEOUT_MS);
    });
    
    const processPromise = processChunk(operation, message.chunk);
    
    const { stats, backpressure } = await Promise.race([processPromise, timeoutPromise]) as any;
    
    // Calculate progress
    const progress = {
      current_chunk: message.chunk.index + 1,
      total_chunks: Math.ceil(operation.file.size / CHUNK_SIZE),
      percentage: Math.round(((message.chunk.index + 1) / Math.ceil(operation.file.size / CHUNK_SIZE)) * 100),
      stats,
      estimated_time_ms: calculateEstimatedTime(operation)
    };
    
    console.log(`Chunk ${message.chunk.index} processed successfully`);
    
    sendResponse({
      success: true,
      progress,
      backpressure,
      operation_state: operation.state
    });
    
  } catch (error) {
    console.error('Stream chunk processing failed:', error);
    
    const wasmError = {
      code: 'STREAM_CHUNK_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    };
    
    sendResponse({
      success: false,
      error: wasmError,
      retryable: true
    });
  }
}

/**
 * Process a single chunk
 */
async function processChunk(operation: any, chunk: any) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
  
  // Add chunk to content
  operation.content += chunk.data;
  operation.stats.total_chunks++;
  operation.stats.total_content_length = operation.content.length;
  operation.lastActivity = Date.now();
  
  // Simple analysis
  const words = operation.content.toLowerCase().split(/\s+/);
  operation.stats.unique_words = new Set(words).size;
  
  // Check for banned phrases
  const bannedPhrases = ['confidential', 'secret', 'private'];
  operation.stats.banned_phrase_count = bannedPhrases.filter(phrase => 
    operation.content.toLowerCase().includes(phrase)
  ).length;
  
  // Check for PII patterns
  const piiRegex = /\b\d{9,12}\b/g;
  const piiMatches = operation.content.match(piiRegex) || [];
  operation.stats.pii_pattern_count = piiMatches.length;
  
  // Calculate processing time
  operation.stats.processing_time_ms = Date.now() - operation.startTime;
  
  // Calculate backpressure
  const backpressure = {
    pause: operation.stats.total_chunks > 50, // Pause after 50 chunks
    resumeAfterMs: operation.stats.total_chunks > 50 ? 1000 : undefined,
    queueSize: streamingOperations.size,
    maxQueueSize: 10,
    processingRate: 5
  };
  
  return { stats: operation.stats, backpressure };
}

/**
 * Handle stream finalization
 */
async function handleStreamFinalize(message: any, sendResponse: (response: any) => void) {
  try {
    console.log(`Finalizing streaming analysis for operation ${message.operation_id}`);
    
    const operation = streamingOperations.get(message.operation_id);
    if (!operation) {
      throw new Error('Operation not found');
    }
    
    // Finalize operation with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Finalization timeout')), TIMEOUT_MS);
    });
    
    const finalizePromise = finalizeOperation(operation);
    
    const result = await Promise.race([finalizePromise, timeoutPromise]) as any;
    
    console.log('Streaming analysis finalized successfully');
    
    sendResponse({
      success: true,
      result,
      operation_id: message.operation_id
    });
    
  } catch (error) {
    console.error('Stream finalization failed:', error);
    
    const wasmError = {
      code: 'STREAM_FINALIZE_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    };
    
    sendResponse({
      success: false,
      error: wasmError,
      retryable: !message.force
    });
  }
}

/**
 * Finalize streaming operation
 */
async function finalizeOperation(operation: any) {
  // Simulate finalization delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Calculate entropy
  const normalized = operation.content.toLowerCase().replace(/[^a-z0-9]/g, '');
  let entropy = 0;
  
  if (normalized.length > 0) {
    const charCounts = new Map<string, number>();
    for (const char of normalized) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    const total = normalized.length;
    for (const count of charCounts.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
  }
  
  // Calculate risk score
  const bannedScore = operation.stats.banned_phrase_count > 0 ? 1.0 : 0.0;
  const piiScore = operation.stats.pii_pattern_count > 0 ? 1.0 : 0.0;
  const entropyScore = entropy > 4.8 ? 1.0 : entropy / 4.8;
  
  const riskScore = (bannedScore * 0.4) + (piiScore * 0.3) + (entropyScore * 0.3);
  const decision = riskScore >= 0.6 ? 'block' : 'allow';
  
  // Generate reason
  const reasons = [];
  if (operation.stats.banned_phrase_count > 0) {
    reasons.push(`Found ${operation.stats.banned_phrase_count} banned phrase(s)`);
  }
  if (operation.stats.pii_pattern_count > 0) {
    reasons.push(`Detected ${operation.stats.pii_pattern_count} PII pattern(s)`);
  }
  if (entropy > 4.8) {
    reasons.push('High entropy content detected');
  }
  
  const reason = reasons.length > 0 ? reasons.join('; ') : 'No security concerns detected';
  
  // Get top words
  const words = operation.content.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (word.length > 0) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }
  
  const topWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => [word, count]);
  
  return {
    risk_score: riskScore,
    decision,
    reasons: [reason],
    top_words: topWords,
    banned_phrases: [],
    pii_patterns: [],
    entropy,
    stats: operation.stats
  };
}

/**
 * Calculate estimated time remaining
 */
function calculateEstimatedTime(operation: any): number | undefined {
  if (operation.stats.total_chunks === 0) return undefined;
  
  const elapsed = Date.now() - operation.startTime;
  const avgTimePerChunk = elapsed / operation.stats.total_chunks;
  const remainingChunks = Math.ceil(operation.file.size / CHUNK_SIZE) - operation.stats.total_chunks;
  
  return Math.round(avgTimePerChunk * remainingChunks);
}

/**
 * Service Worker lifecycle events
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SquareX File Scanner Service Worker installed:', details.reason);
  
  // Initialize storage with default settings
  chrome.storage.local.set({
    maxFileSize: MAX_FILE_SIZE,
    timeout: TIMEOUT_MS,
    chunkSize: CHUNK_SIZE,
    maxConcurrentOperations: 3,
    maxQueueSize: 10,
    processingRate: 5
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('SquareX File Scanner Service Worker started');
});

// Handle service worker updates
chrome.runtime.onUpdateAvailable.addListener(() => {
  console.log('Service Worker update available');
  chrome.runtime.reload();
});

// Cleanup on service worker shutdown
self.addEventListener('beforeunload', () => {
  console.log('Service Worker shutting down, cleaning up...');
  streamingOperations.clear();
});

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [operationId, operation] of streamingOperations.entries()) {
    if ((now - operation.lastActivity) > maxAge) {
      streamingOperations.delete(operationId);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

export {};
