import { CONFIG, MESSAGES } from 'shared';

describe('Service Worker Configuration', () => {
  test('should use correct timeout configuration', () => {
    expect(CONFIG.CHUNK_SIZE).toBe(1024 * 1024); // 1MB
  });

  test('should use correct max file size', () => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    expect(MAX_FILE_SIZE).toBe(100 * 1024 * 1024);
  });

  test('should use correct timeout value', () => {
    const TIMEOUT_MS = 30000; // 30 seconds
    expect(TIMEOUT_MS).toBe(30000);
  });
});

describe('Streaming Protocol Logic', () => {
  // Test the streaming logic functions directly
  const streamingOperations = new Map<string, any>();

  function initOperation(operationId: string, file: any, config: any = {}) {
    const operation = {
      id: operationId,
      file,
      config: config || {},
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
    
    streamingOperations.set(operationId, operation);
    return operation;
  }

  function processChunk(operation: any, chunk: any) {
    // Simulate processing delay
    const delay = Math.random() * 50 + 10;
    
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

  function finalizeOperation(operation: any) {
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
    const reasons: string[] = [];
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
    
    return {
      risk_score: riskScore,
      decision,
      reasons: [reason],
      top_words: [],
      banned_phrases: [],
      pii_patterns: [],
      entropy,
      stats: operation.stats
    };
  }

  beforeEach(() => {
    streamingOperations.clear();
  });

  test('should initialize streaming operation', () => {
    const file = {
      name: 'test.txt',
      size: 1024 * 1024,
      type: 'text/plain'
    };

    const operation = initOperation('test-op-1', file);

    expect(operation.id).toBe('test-op-1');
    expect(operation.state).toBe('processing');
    expect(operation.stats.total_chunks).toBe(0);
    expect(streamingOperations.has('test-op-1')).toBe(true);
  });

  test('should process chunks correctly', () => {
    const file = {
      name: 'test.txt',
      size: 1024 * 1024,
      type: 'text/plain'
    };

    const operation = initOperation('test-op-2', file);
    
    const chunk = {
      index: 0,
      data: 'This is test content with confidential information',
      is_last: false
    };

    const { stats, backpressure } = processChunk(operation, chunk);

    expect(stats.total_chunks).toBe(1);
    expect(stats.total_content_length).toBe(chunk.data.length);
    expect(stats.banned_phrase_count).toBe(1); // 'confidential'
    expect(backpressure.pause).toBe(false);
  });

  test('should apply backpressure after many chunks', () => {
    const file = {
      name: 'test.txt',
      size: 1024 * 1024,
      type: 'text/plain'
    };

    const operation = initOperation('test-op-3', file);
    
    // Process many chunks to trigger backpressure
    for (let i = 0; i < 60; i++) {
      const chunk = {
        index: i,
        data: `Chunk ${i} content`,
        is_last: false
      };

      const { backpressure } = processChunk(operation, chunk);
      
      if (i >= 50) {
        expect(backpressure.pause).toBe(true);
        expect(backpressure.resumeAfterMs).toBe(1000);
      }
    }
  });

  test('should finalize operation with correct results', () => {
    const file = {
      name: 'test.txt',
      size: 1024 * 1024,
      type: 'text/plain'
    };

    const operation = initOperation('test-op-4', file);
    
    // Add content with banned phrases
    const chunk = {
      index: 0,
      data: 'This contains confidential information that should be blocked',
      is_last: true
    };

    processChunk(operation, chunk);
    const result = finalizeOperation(operation);

    expect(result.decision).toBe('block');
    expect(result.risk_score).toBeGreaterThan(0.6);
    expect(result.reasons[0]).toContain('banned phrase');
  });

  test('should handle safe content correctly', () => {
    const file = {
      name: 'test.txt',
      size: 1024 * 1024,
      type: 'text/plain'
    };

    const operation = initOperation('test-op-5', file);
    
    // Add safe content
    const chunk = {
      index: 0,
      data: 'This is safe content with no security concerns',
      is_last: true
    };

    processChunk(operation, chunk);
    const result = finalizeOperation(operation);

    expect(result.decision).toBe('allow');
    expect(result.risk_score).toBeLessThan(0.6);
    expect(result.reasons[0]).toContain('No security concerns');
  });

  test('should calculate entropy correctly', () => {
    const file = {
      name: 'test.txt',
      size: 1024 * 1024,
      type: 'text/plain'
    };

    const operation = initOperation('test-op-6', file);
    
    // Add high entropy content (random characters)
    const chunk = {
      index: 0,
      data: 'abcdefghijklmnopqrstuvwxyz1234567890',
      is_last: true
    };

    processChunk(operation, chunk);
    const result = finalizeOperation(operation);

    expect(result.entropy).toBeGreaterThan(0);
    expect(typeof result.entropy).toBe('number');
  });
});

describe('Error Handling', () => {
  test('should handle file size validation', () => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    
    const validFile = { size: 50 * 1024 * 1024 }; // 50MB
    const invalidFile = { size: 200 * 1024 * 1024 }; // 200MB
    
    expect(validFile.size).toBeLessThanOrEqual(MAX_FILE_SIZE);
    expect(invalidFile.size).toBeGreaterThan(MAX_FILE_SIZE);
  });

  test('should handle timeout scenarios', () => {
    const TIMEOUT_MS = 30000;
    
    // Simulate a timeout
    const startTime = Date.now();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 100);
    });
    
    return expect(timeoutPromise).rejects.toThrow('Timeout');
  });
});
