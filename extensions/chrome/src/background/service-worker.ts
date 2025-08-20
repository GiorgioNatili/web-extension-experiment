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

// Do not initialize WASM in SW; CSP forbids WASM in MV3 SW. Keep SW lightweight.

// Handle messages from content script
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'ANALYZE_FILE':
      // Proxy to active tab content script to run WASM locally
      proxyToActiveTab(message, sendResponse);
      return true;
      
    case 'STREAM_INIT':
      proxyToActiveTab(message, sendResponse);
      return true;
      
    case 'STREAM_CHUNK':
      proxyToActiveTab(message, sendResponse);
      return true;
      
    case 'STREAM_FINALIZE':
      proxyToActiveTab(message, sendResponse);
      return true;
      
    case 'GET_STATUS':
      sendResponse({ 
        status: 'ready',
        wasm_loaded: chromeWASMLoader.isModuleLoaded(),
        error_stats: chromeErrorHandler.getErrorStats(),
        module_status: chromeWASMLoader.getModuleStatus(),
        debug: chromeWASMLoader.debugIntrospection()
      });
      break;
      
    case 'GET_ERROR_LOG':
      sendResponse({ 
        error_log: chromeErrorHandler.getErrorLog(),
        error_stats: chromeErrorHandler.getErrorStats()
      });
      break;
      
    case 'TEST_WASM_LOADING':
      proxyToActiveTab(message, sendResponse);
      return true;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
});

/**
 * Handle traditional file analysis (legacy)
 */
async function proxyToActiveTab(message: any, sendResponse: (response: any) => void) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    const resp = await chrome.tabs.sendMessage(tab.id, message);
    sendResponse(resp);
  } catch (e) {
    sendResponse({ success: false, error: (e as Error).message });
  }
}

/**
 * Handle stream initialization
 */
// Removed local streaming handlers; handled in content script now

/**
 * Handle stream chunk processing
 */

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
// Removed finalize handler; handled in content script now

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
 * Handle WASM loading test
 */
async function handleWasmTest(sendResponse: (response: any) => void) {
  try {
    console.log('Testing WASM loading...');
    
    // Check current WASM status
    const wasmLoaded = chromeWASMLoader.isModuleLoaded();
    const moduleStatus = chromeWASMLoader.getModuleStatus();
    
    console.log('Current WASM status:', { wasmLoaded, moduleStatus });
    
    // If not loaded, try to load it
    if (!wasmLoaded) {
      console.log('WASM not loaded, attempting to load...');
      await chromeWASMLoader.loadWASMModule();
    }
    
    // Test WASM functionality
    let testResult = 'WASM module loaded successfully';
    try {
      // Safe analyzer creation: prefer wrapper, fallback to raw WasmModule if needed
      let analyzer: any;
      try {
        analyzer = chromeWASMLoader.createStreamingAnalyzer();
      } catch (e) {
        console.warn('[BG] createStreamingAnalyzer failed, attempting raw adapter path');
        const anyLoader: any = (chromeWASMLoader as any);
        const mod: any = anyLoader && anyLoader.wasmModule;
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
    } catch (error) {
      testResult = `WASM analysis test failed: ${(error as Error).message}`;
    }
    
    sendResponse({
      success: true,
      wasmLoaded: chromeWASMLoader.isModuleLoaded(),
      moduleStatus: chromeWASMLoader.getModuleStatus(),
      testResult
    });
    
  } catch (error) {
    console.error('WASM test failed:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
      wasmLoaded: chromeWASMLoader.isModuleLoaded(),
      moduleStatus: chromeWASMLoader.getModuleStatus()
    });
  }
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
