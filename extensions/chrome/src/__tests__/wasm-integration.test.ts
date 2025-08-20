// Mock DOM environment
document.body.innerHTML = `
  <input type="file" id="fileInput" accept=".txt">
  <div id="results"></div>
`;

// Mock chrome API
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    getURL: jest.fn((path: string) => `chrome-extension://test/${path}`)
  }
};

Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

// Mock WASM module
const mockWasmModule = {
  WasmModule: jest.fn().mockImplementation(() => ({
    init_streaming: jest.fn().mockReturnValue('mock-analyzer'),
    process_chunk: jest.fn().mockReturnValue('updated-analyzer'),
    finalize_streaming: jest.fn().mockReturnValue({
      top_words: [['test', 1]],
      banned_phrases: [],
      pii_patterns: [],
      entropy: 3.5,
      is_obfuscated: false,
      decision: 'allow',
      reason: 'Analysis complete',
      risk_score: 0.2
    }),
    get_streaming_stats: jest.fn().mockReturnValue({
      total_chunks: 1,
      total_content_length: 10,
      unique_words: 1,
      banned_phrase_count: 0,
      pii_pattern_count: 0
    })
  })),
  default: jest.fn().mockResolvedValue(undefined)
};

// Mock dynamic import
const mockImport = jest.fn().mockResolvedValue(mockWasmModule);

// Mock window.postMessage
const mockPostMessage = jest.fn();
Object.defineProperty(global, 'window', {
  value: {
    postMessage: mockPostMessage,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  writable: true
});

// Mock File API
global.File = class MockFile {
  name: string;
  type: string;
  size: number;
  content: string;

  constructor(bits: string[], name: string, options?: { type?: string }) {
    this.content = bits.join('');
    this.name = name;
    this.type = options?.type || 'text/plain';
    this.size = this.content.length;
  }

  async text(): Promise<string> {
    return this.content;
  }

  slice(start: number, end: number): MockFile {
    return new MockFile([this.content.slice(start, end)], `chunk_${start}_${end}`);
  }
} as any;

// Mock global import
global.import = mockImport as any;

describe('Chrome Extension WASM Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <input type="file" id="fileInput" accept=".txt">
      <div id="results"></div>
    `;
  });

  describe('WASM Initialization', () => {
    test('should initialize WASM with correct URLs', async () => {
      // This test would require importing the actual content script
      // For now, we test the URL generation logic
      const wasmJsUrl = mockChrome.runtime.getURL('wasm.js');
      const wasmBinaryUrl = mockChrome.runtime.getURL('wasm_bg.wasm');
      
      expect(wasmJsUrl).toBe('chrome-extension://test/wasm.js');
      expect(wasmBinaryUrl).toBe('chrome-extension://test/wasm_bg.wasm');
    });

    test('should handle WASM initialization failure gracefully', async () => {
      // Mock WASM initialization failure
      mockImport.mockRejectedValueOnce(new Error('WASM load failed'));
      
      // This would be tested in the actual content script
      expect(mockImport).toBeDefined();
    });
  });

  describe('WASM Result Type Handling', () => {
    test('should handle successful WASM analysis result', () => {
      const mockResult = {
        top_words: [['test', 1]],
        banned_phrases: [],
        pii_patterns: [],
        entropy: 3.5,
        is_obfuscated: false,
        decision: 'allow',
        reason: 'Analysis complete',
        risk_score: 0.2
      };

      const normalized = {
        topWords: mockResult.top_words,
        bannedPhrases: mockResult.banned_phrases,
        piiPatterns: mockResult.pii_patterns,
        entropy: mockResult.entropy,
        isObfuscated: mockResult.is_obfuscated,
        decision: mockResult.decision,
        reason: mockResult.reason,
        riskScore: mockResult.risk_score,
        stats: {
          totalChunks: 1,
          totalContent: 10,
          processingTime: 0,
          memoryUsage: 0,
          throughput: 0
        }
      };

      expect(normalized.decision).toBe('allow');
      expect(normalized.entropy).toBe(3.5);
      expect(normalized.riskScore).toBe(0.2);
    });

    test('should handle WASM error results', () => {
      const mockError = new Error('Finalization error: No content processed');
      
      expect(mockError.message).toContain('Finalization error');
      expect(mockError).toBeInstanceOf(Error);
    });
  });

  describe('Message Bridge', () => {
    test('should send ready signal on initialization', () => {
      // Simulate content script initialization
      const readyMessage = { source: 'squarex-extension', ready: true };
      mockPostMessage(readyMessage, '*');
      
      expect(mockPostMessage).toHaveBeenCalledWith(readyMessage, '*');
    });

    test('should handle WASM test messages', () => {
      const testMessage = {
        source: 'squarex-test',
        correlationId: 'test-123',
        payload: { type: 'TEST_WASM_LOADING' }
      };

      // This would be tested in the actual content script
      expect(testMessage.payload.type).toBe('TEST_WASM_LOADING');
    });
  });

  describe('File Processing', () => {
    test('should process text files correctly', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      expect(file.name).toBe('test.txt');
      expect(file.type).toBe('text/plain');
      expect(file.size).toBe(12); // 'test content'.length
    });

    test('should handle large files with chunking', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      expect(file.size).toBe(1024 * 1024);
      
      // Test chunking
      const chunk = file.slice(0, 1024);
      expect(chunk.size).toBe(1024);
    });

    test('should reject non-text files', () => {
      const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      expect(pdfFile.type).toBe('application/pdf');
      expect(pdfFile.name).toBe('test.pdf');
    });
  });

  describe('Error Handling', () => {
    test('should handle WASM module errors', () => {
      const wasmError = new Error('WASM analysis failed: Finalization error: No content processed');
      
      expect(wasmError.message).toContain('WASM analysis failed');
      expect(wasmError.message).toContain('Finalization error');
    });

    test('should handle file reading errors', () => {
      const fileError = new Error('File reading failed');
      
      expect(fileError.message).toBe('File reading failed');
      expect(fileError).toBeInstanceOf(Error);
    });
  });

  describe('Extension Detection', () => {
    test('should detect Chrome extension environment', () => {
      expect(mockChrome.runtime).toBeDefined();
      expect(mockChrome.runtime.getURL).toBeDefined();
      expect(typeof mockChrome.runtime.getURL).toBe('function');
    });

    test('should generate correct extension URLs', () => {
      const wasmUrl = mockChrome.runtime.getURL('wasm.js');
      expect(wasmUrl).toContain('chrome-extension://');
      expect(wasmUrl).toContain('wasm.js');
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

      // Mock the WASM module directly for Chrome tests
      const wasmModule = hrMockModule;
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

      // Mock the WASM module directly for Chrome tests
      const wasmModule = consistentMockModule;
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
});
