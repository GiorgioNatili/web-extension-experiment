# SquareX Browser Extension - Protocol Documentation

This document defines the communication protocols, message formats, and API contracts used in the SquareX browser extension system.

## Table of Contents

1. [Overview](#overview)
2. [Message Protocol](#message-protocol)
3. [WASM Module API](#wasm-module-api)
4. [Extension Communication](#extension-communication)
5. [Data Validation](#data-validation)
6. [Error Handling](#error-handling)
7. [Security Considerations](#security-considerations)
8. [Versioning](#versioning)

## Overview

The SquareX browser extension uses a message-based architecture for communication between different components:

- **Content Scripts** ↔ **Background Scripts**
- **Background Scripts** ↔ **WASM Module**
- **Extensions** ↔ **Web Pages**
- **Cross-extension Communication**

All communication follows a standardized message format with runtime validation using Zod schemas.

## Message Protocol

### Message Structure

Every message follows this base structure:

```typescript
interface BaseMessage {
  id: string;           // UUID v4 identifier
  type: MessageType;    // Message type enum
  timestamp: number;    // Unix timestamp in milliseconds
  source: string;       // Source extension ID or 'content'
  target: string;       // Target extension ID or 'background'
}
```

### Message Types

| Type | Direction | Purpose | Payload |
|------|-----------|---------|---------|
| `ANALYZE_FILE` | Content → Background | Request file analysis | FileInfo + optional config |
| `ANALYSIS_PROGRESS` | Background → Content | Progress update | Progress percentage + stage |
| `ANALYSIS_COMPLETE` | Background → Content | Analysis results | AnalysisResult + stats |
| `ANALYSIS_ERROR` | Background → Content | Error notification | ErrorInfo + optional file |
| `CONFIG_UPDATE` | Content → Background | Update configuration | StreamingConfig + apply flag |
| `STATUS_REQUEST` | Content → Background | Request status info | Array of requested info |
| `STATUS_RESPONSE` | Background → Content | Status information | Config + stats + health |

### Message Flow Examples

#### File Analysis Request

```typescript
// Content script sends analysis request
const message: AnalyzeFileMessage = {
  id: crypto.randomUUID(),
  type: 'ANALYZE_FILE',
  timestamp: Date.now(),
  source: 'content-script',
  target: 'background',
  file: {
    name: 'document.txt',
    size: 1024,
    type: 'text/plain',
    lastModified: Date.now()
  },
  config: {
    risk_threshold: 0.6,
    banned_phrases: ['confidential', 'secret']
  },
  use_streaming: true
};

// Send to background script
chrome.runtime.sendMessage(message);
```

#### Analysis Progress Update

```typescript
// Background script sends progress update
const progressMessage: AnalysisProgressMessage = {
  id: crypto.randomUUID(),
  type: 'ANALYSIS_PROGRESS',
  timestamp: Date.now(),
  source: 'background',
  target: 'content-script',
  progress: 75,
  stage: 'analyzing',
  message: 'Processing chunk 3 of 4...',
  estimated_time_ms: 1500
};

// Send to content script
chrome.tabs.sendMessage(tabId, progressMessage);
```

#### Analysis Results

```typescript
// Background script sends analysis results
const resultMessage: AnalysisCompleteMessage = {
  id: crypto.randomUUID(),
  type: 'ANALYSIS_COMPLETE',
  timestamp: Date.now(),
  source: 'background',
  target: 'content-script',
  result: {
    risk_score: 0.85,
    decision: 'block',
    reasons: ['High entropy detected', 'Banned phrase found'],
    top_words: [['confidential', 3], ['internal', 2]],
    banned_phrases: [{
      phrase: 'confidential',
      position: 150,
      context: 'This is confidential information',
      severity: 'high'
    }],
    pii_patterns: [],
    entropy: 5.2,
    stats: {
      total_chunks: 4,
      total_content_length: 4096,
      unique_words: 156,
      banned_phrase_count: 1,
      pii_pattern_count: 0,
      processing_time_ms: 1250
    }
  },
  stats: {
    total_chunks: 4,
    total_content_length: 4096,
    unique_words: 156,
    banned_phrase_count: 1,
    pii_pattern_count: 0,
    processing_time_ms: 1250
  }
};
```

## WASM Module API

### Core Functions

#### `analyze_file(content: string) → AnalysisResult`

Analyzes a complete file and returns results immediately.

```typescript
// Synchronous analysis for small files
const result = wasmModule.analyze_file(fileContent);
console.log(`Risk score: ${result.risk_score}`);
console.log(`Decision: ${result.decision}`);
```

#### Streaming Analysis API

For large files, use the streaming API:

```typescript
// 1. Initialize streaming analyzer
let analyzer = wasmModule.init_streaming();

// 2. Process content in chunks
analyzer = wasmModule.process_chunk(analyzer, "First chunk of content");
analyzer = wasmModule.process_chunk(analyzer, "Second chunk of content");
analyzer = wasmModule.process_chunk(analyzer, "Final chunk of content");

// 3. Get processing statistics
const stats = wasmModule.get_streaming_stats(analyzer);
console.log(`Processed ${stats.total_chunks} chunks`);

// 4. Finalize analysis
const result = wasmModule.finalize_streaming(analyzer);
console.log(`Final decision: ${result.decision}`);
```

#### Custom Configuration

```typescript
// Initialize with custom configuration
const config = {
  stopwords: ["custom", "words", "to", "exclude"],
  entropy_threshold: 4.0,
  risk_threshold: 0.5,
  max_words: 15,
  banned_phrases: ["secret", "internal", "confidential"],
  chunk_size: 2097152 // 2MB chunks
};

let analyzer = wasmModule.init_streaming_with_config(config);
```

### Individual Analysis Functions

```typescript
// Calculate entropy for text obfuscation detection
const entropy = wasmModule.calculate_entropy("Some text content");

// Find banned phrases in content
const bannedPhrases = wasmModule.find_banned_phrases("This is confidential information");

// Detect PII patterns
const piiPatterns = wasmModule.detect_pii_patterns("Phone: 1234567890");

// Get word frequency analysis
const topWords = wasmModule.get_top_words("Text content here", 10);
```

## Extension Communication

### Content Script ↔ Background Script

Content scripts communicate with background scripts using Chrome's message passing API:

```typescript
// Content script sends message
chrome.runtime.sendMessage({
  id: crypto.randomUUID(),
  type: 'ANALYZE_FILE',
  timestamp: Date.now(),
  source: 'content-script',
  target: 'background',
  file: fileInfo,
  config: customConfig
}, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message failed:', chrome.runtime.lastError);
    return;
  }
  console.log('Analysis started:', response);
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'ANALYSIS_PROGRESS':
      updateProgressUI(message.progress, message.message);
      break;
    case 'ANALYSIS_COMPLETE':
      displayResults(message.result);
      break;
    case 'ANALYSIS_ERROR':
      showError(message.error);
      break;
  }
});
```

### Background Script ↔ WASM Module

Background scripts load and interact with the WASM module:

```typescript
// Load WASM module
import init, { WasmModule } from './pkg/wasm.js';

let wasmModule: WasmModule | null = null;

async function initializeWasm() {
  try {
    await init();
    wasmModule = new WasmModule();
    console.log('WASM module loaded successfully');
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw error;
  }
}

// Handle analysis requests
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_FILE') {
    try {
      // Validate message
      const validatedMessage = validateAnalyzeFileMessage(message);
      
      // Start analysis
      const result = await analyzeFile(validatedMessage);
      
      // Send results back
      chrome.tabs.sendMessage(sender.tab.id, {
        id: crypto.randomUUID(),
        type: 'ANALYSIS_COMPLETE',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        result: result,
        stats: result.stats
      });
      
    } catch (error) {
      // Send error back
      chrome.tabs.sendMessage(sender.tab.id, {
        id: crypto.randomUUID(),
        type: 'ANALYSIS_ERROR',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        error: {
          code: 'ANALYSIS_FAILED',
          message: error.message,
          timestamp: Date.now()
        },
        file: message.file
      });
    }
  }
});
```

### Cross-extension Communication

For communication between different extensions or components:

```typescript
// Send message to specific extension
chrome.runtime.sendMessage(extensionId, message);

// Listen for messages from other extensions
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Validate sender
  if (!isTrustedExtension(sender.id)) {
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return;
  }
  
  // Process message
  handleExternalMessage(message, sender);
});
```

## Data Validation

### Runtime Validation

All data is validated using Zod schemas at runtime:

```typescript
import { 
  validateAnalysisResult, 
  validateStreamingConfig,
  safeValidate 
} from './schema';

// Strict validation (throws on failure)
try {
  const result = validateAnalysisResult(data);
  // Use validated result
} catch (error) {
  console.error('Invalid analysis result:', error);
}

// Safe validation (returns null on failure)
const config = safeValidate(StreamingConfigSchema, data);
if (config) {
  // Use validated config
} else {
  // Handle invalid data
  console.error('Invalid configuration data');
}
```

### Type Guards

Use type guards for runtime type checking:

```typescript
import { isAnalysisResult, isStreamingConfig } from './schema';

function processMessage(data: unknown) {
  if (isAnalysisResult(data)) {
    // TypeScript knows this is AnalysisResult
    console.log(`Risk score: ${data.risk_score}`);
    return data;
  }
  
  if (isStreamingConfig(data)) {
    // TypeScript knows this is StreamingConfig
    console.log(`Risk threshold: ${data.risk_threshold}`);
    return data;
  }
  
  throw new Error('Unknown message type');
}
```

### Schema Validation

Zod schemas provide comprehensive validation:

```typescript
// Validation includes:
// - Type checking
// - Range validation (e.g., risk_score 0.0-1.0)
// - Required field validation
// - Enum value validation
// - Array length validation
// - Custom validation rules

const StreamingConfigSchema = z.object({
  stopwords: z.array(z.string()),
  entropy_threshold: z.number().min(0).max(8),
  risk_threshold: z.number().min(0).max(1),
  max_words: z.number().min(1).max(1000),
  banned_phrases: z.array(z.string()),
  chunk_size: z.number().min(1024).max(10485760).optional()
});
```

## Error Handling

### Error Types

```typescript
interface ErrorInfo {
  code: string;           // Machine-readable error code
  message: string;        // Human-readable error message
  details?: any;          // Additional error context
  stack?: string;         // Stack trace if available
  timestamp: number;      // When error occurred
}
```

### Common Error Codes

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `WASM_LOAD_FAILED` | Failed to load WASM module | Retry initialization |
| `ANALYSIS_TIMEOUT` | Analysis took too long | Increase timeout or use streaming |
| `INVALID_FILE_TYPE` | Unsupported file type | Check file extension |
| `FILE_TOO_LARGE` | File exceeds size limit | Use streaming analysis |
| `CONFIG_INVALID` | Invalid configuration | Validate and retry |
| `MEMORY_ERROR` | Insufficient memory | Reduce chunk size |
| `NETWORK_ERROR` | Network communication failed | Retry with exponential backoff |

### Error Recovery

```typescript
// Implement retry logic with exponential backoff
async function analyzeFileWithRetry(file: File, maxRetries = 3): Promise<AnalysisResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeFile(file);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Security Considerations

### Message Validation

- **Source Verification**: Always validate message source
- **Type Checking**: Use Zod schemas for runtime validation
- **Size Limits**: Enforce reasonable message size limits
- **Rate Limiting**: Prevent message flooding attacks

### WASM Module Security

- **Content Isolation**: Process content in isolated WASM environment
- **Memory Bounds**: Validate all memory access
- **Input Sanitization**: Sanitize all inputs before processing
- **Error Handling**: Never expose internal errors to external code

### Extension Permissions

- **Minimal Permissions**: Request only necessary permissions
- **Content Script Isolation**: Isolate content scripts from web pages
- **Background Script Security**: Validate all incoming messages
- **Cross-origin Restrictions**: Respect same-origin policy

## Versioning

### Protocol Versioning

Messages include version information for backward compatibility:

```typescript
interface VersionedMessage extends BaseMessage {
  protocol_version: string;  // e.g., "1.0.0"
  api_version: string;       // e.g., "2.1.0"
}
```

### Version Compatibility

| Protocol Version | API Version | Features | Breaking Changes |
|------------------|-------------|----------|------------------|
| 1.0.0 | 1.0.0 | Basic analysis, Chrome extension | None |
| 1.1.0 | 1.1.0 | Firefox extension, streaming analysis | None |
| 2.0.0 | 2.0.0 | Safari extension, custom PII patterns | Message format changes |
| 2.1.0 | 2.1.0 | Performance optimizations, enhanced validation | None |

### Migration Guide

When upgrading between major versions:

1. **Check Protocol Version**: Verify compatibility
2. **Update Message Format**: Use new message structure
3. **Handle Deprecated Fields**: Remove usage of deprecated fields
4. **Test Compatibility**: Verify with test suite
5. **Update Documentation**: Review and update docs

## Testing

### Message Validation Tests

```typescript
import { validateAnalysisResult, validateStreamingConfig } from './schema';

describe('Message Validation', () => {
  test('should validate valid analysis result', () => {
    const validResult = createValidAnalysisResult();
    expect(() => validateAnalysisResult(validResult)).not.toThrow();
  });
  
  test('should reject invalid analysis result', () => {
    const invalidResult = { risk_score: 1.5 }; // Invalid: > 1.0
    expect(() => validateAnalysisResult(invalidResult)).toThrow();
  });
});
```

### Protocol Tests

```typescript
describe('Message Protocol', () => {
  test('should handle complete analysis flow', async () => {
    // 1. Send analysis request
    const request = createAnalyzeFileMessage();
    const response = await sendMessage(request);
    
    // 2. Verify progress updates
    expect(response.type).toBe('ANALYSIS_PROGRESS');
    
    // 3. Verify final results
    const results = await waitForMessage('ANALYSIS_COMPLETE');
    expect(results.result.decision).toBeDefined();
  });
});
```

## Performance Considerations

### Message Size Optimization

- **Minimize Payload**: Only include necessary data
- **Compression**: Use compression for large messages
- **Chunking**: Break large data into manageable chunks
- **Lazy Loading**: Load data only when needed

### WASM Performance

- **Streaming**: Use streaming API for large files
- **Chunk Size**: Optimize chunk size for memory usage
- **Caching**: Cache analysis results when possible
- **Background Processing**: Process in background threads

### Memory Management

- **Garbage Collection**: Minimize object creation
- **Memory Pools**: Reuse objects when possible
- **Cleanup**: Properly dispose of resources
- **Monitoring**: Track memory usage

## Troubleshooting

### Common Issues

#### Message Not Received

1. Check message format and validation
2. Verify source and target IDs
3. Check for runtime errors
4. Verify extension permissions

#### WASM Module Errors

1. Check browser console for errors
2. Verify WASM file loading
3. Check memory usage
4. Validate input data

#### Performance Issues

1. Monitor message frequency
2. Check chunk size settings
3. Profile memory usage
4. Optimize validation logic

### Debug Tools

```typescript
// Enable debug logging
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[SquareX Debug] ${message}`, data);
  }
}

// Add to message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message', { type: message.type, source: sender.id });
  // ... handle message
});
```

---

**Note**: This protocol documentation should be updated whenever the message format or API contracts change. All changes should be versioned and tested for backward compatibility.
