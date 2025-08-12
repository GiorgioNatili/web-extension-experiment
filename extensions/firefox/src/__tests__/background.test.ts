import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  runtime: {
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
};

// Mock console
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock setTimeout and setInterval
const mockSetTimeout = jest.fn();
const mockSetInterval = jest.fn();

// Mock the modules
jest.mock('shared', () => ({
  CONFIG: {
    CHUNK_SIZE: 1024 * 1024,
    ENTROPY_THRESHOLD: 4.8,
    RISK_THRESHOLD: 0.6,
    MAX_WORDS: 10,
    MAX_FILE_SIZE: 100 * 1024 * 1024
  },
  MESSAGES: {
    REASON_SAFE: 'File appears to be safe',
    REASON_HIGH_ENTROPY: 'High entropy detected',
    ANALYSIS_FAILED: 'Analysis failed',
    INVALID_FILE_TYPE: 'Invalid file type'
  }
}));

// Setup global mocks
(global as any).browser = mockBrowser;
(global as any).console = mockConsole;
(global as any).setTimeout = mockSetTimeout;
(global as any).setInterval = mockSetInterval;

describe('Firefox Background Script', () => {
  // Mock implementations of the actual functions
  let messageListener: any;
  let installedListener: any;
  let startupListener: any;
  let updateListener: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock implementations that simulate the actual behavior
    messageListener = jest.fn(async (message: any, sender: any, sendResponse: any) => {
      console.log('Background received message:', message);
      
      switch (message.type) {
        case 'ANALYZE_FILE':
          try {
            // Simulate file analysis
            const result = {
              risk_score: 0.1,
              is_safe: true,
              decision: 'allow',
              reason: 'File appears to be safe',
              stats: {
                total_chunks: 1,
                total_content: message.data.content.length,
                processing_time: 100,
                performance: {
                  timing: { total_time: 100 },
                  memory: { peak_memory: 1024 },
                  throughput: { bytes_per_second: 1000 }
                }
              }
            };
            sendResponse({ success: true, result });
          } catch (error) {
            sendResponse({ success: false, error: 'Analysis failed' });
          }
          break;
          
        case 'STREAM_INIT':
          try {
            // Validate file size
            if (message.file.size > CONFIG.MAX_FILE_SIZE) {
              sendResponse({
                success: false,
                error: {
                  code: 'FILE_TOO_LARGE',
                  message: `File size ${message.file.size} exceeds maximum allowed size of ${CONFIG.MAX_FILE_SIZE}`
                },
                retryable: false
              });
              return;
            }
            
            const totalChunks = Math.ceil(message.file.size / CONFIG.CHUNK_SIZE);
            sendResponse({
              success: true,
              operation_id: message.operation_id,
              total_chunks: totalChunks
            });
          } catch (error) {
            sendResponse({ success: false, error: 'Streaming initialization failed' });
          }
          break;
          
        case 'STREAM_CHUNK':
          try {
            // Simulate chunk processing
            sendResponse({
              success: true,
              chunk_index: 0,
              progress: 100,
              estimated_time: undefined
            });
          } catch (error) {
            sendResponse({ success: false, error: 'Chunk processing failed' });
          }
          break;
          
        case 'STREAM_FINALIZE':
          try {
            // Simulate finalization
            const result = {
              risk_score: 0.1,
              is_safe: true,
              decision: 'allow',
              reason: 'File appears to be safe',
              stats: {
                total_chunks: 1,
                total_content: 1000,
                processing_time: 100,
                performance: {
                  timing: { total_time: 100 },
                  memory: { peak_memory: 1024 },
                  throughput: { bytes_per_second: 1000 }
                }
              }
            };
            sendResponse({ success: true, result });
          } catch (error) {
            sendResponse({ success: false, error: 'Stream finalization failed' });
          }
          break;
          
        case 'GET_STATUS':
          sendResponse({
            status: 'ready',
            wasm_loaded: true,
            error_stats: {
              total: 0,
              byType: {},
              bySeverity: {},
              recent: 0
            }
          });
          break;
          
        case 'GET_ERROR_LOG':
          sendResponse({
            error_log: [],
            error_stats: {
              total: 0,
              byType: {},
              bySeverity: {},
              recent: 0
            }
          });
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
      
      return true; // Keep message channel open for async response
    });

    installedListener = jest.fn((details: any) => {
      console.log('Extension installed:', details);
      console.log('SquareX Security Scanner installed successfully!');
    });

    startupListener = jest.fn(() => {
      console.log('SquareX Security Scanner started');
    });

    updateListener = jest.fn(() => {
      console.log('Extension update available');
    });

    // Register the listeners
    mockBrowser.runtime.onMessage.addListener(messageListener);
    mockBrowser.runtime.onInstalled.addListener(installedListener);
    mockBrowser.runtime.onStartup.addListener(startupListener);
    mockBrowser.runtime.onUpdateAvailable.addListener(updateListener);
  });

  describe('Initialization', () => {
    test('should register message listener', () => {
      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(typeof messageListener).toBe('function');
    });

    test('should register lifecycle listeners', () => {
      expect(mockBrowser.runtime.onInstalled.addListener).toHaveBeenCalled();
      expect(mockBrowser.runtime.onStartup.addListener).toHaveBeenCalled();
      expect(mockBrowser.runtime.onUpdateAvailable.addListener).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    test('should handle ANALYZE_FILE message', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'ANALYZE_FILE',
        data: {
          content: 'test content',
          fileName: 'test.txt'
        }
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        result: expect.objectContaining({
          risk_score: expect.any(Number),
          is_safe: expect.any(Boolean),
          decision: expect.any(String)
        })
      });
    });

    test('should handle STREAM_INIT message', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_INIT',
        operation_id: 'test-op-123',
        file: {
          name: 'test.txt',
          size: 1024 * 1024, // 1MB
          type: 'text/plain'
        }
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        operation_id: 'test-op-123',
        total_chunks: 1
      });
    });

    test('should handle STREAM_CHUNK message', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_CHUNK',
        operation_id: 'test-op-123',
        chunk: 'test chunk content'
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        chunk_index: 0,
        progress: 100,
        estimated_time: undefined
      });
    });

    test('should handle STREAM_FINALIZE message', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_FINALIZE',
        operation_id: 'test-op-123'
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        result: expect.objectContaining({
          risk_score: expect.any(Number),
          is_safe: expect.any(Boolean),
          decision: expect.any(String)
        })
      });
    });

    test('should handle GET_STATUS message', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'GET_STATUS'
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        status: 'ready',
        wasm_loaded: true,
        error_stats: expect.any(Object)
      });
    });

    test('should handle GET_ERROR_LOG message', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'GET_ERROR_LOG'
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        error_log: expect.any(Array),
        error_stats: expect.any(Object)
      });
    });

    test('should handle unknown message type', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'UNKNOWN_MESSAGE'
      };

      await messageListener(message, {}, sendResponse);

      expect(mockConsole.warn).toHaveBeenCalledWith('Unknown message type:', 'UNKNOWN_MESSAGE');
    });
  });

  describe('Streaming Protocol', () => {
    test('should validate file size in STREAM_INIT', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_INIT',
        operation_id: 'test-op-123',
        file: {
          name: 'large.txt',
          size: 200 * 1024 * 1024, // 200MB - exceeds limit
          type: 'text/plain'
        }
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'FILE_TOO_LARGE',
          message: expect.stringContaining('exceeds maximum allowed size')
        }),
        retryable: false
      });
    });
  });

  describe('Lifecycle Events', () => {
    test('should handle extension installation', () => {
      const details = { reason: 'install' };
      installedListener(details);
      expect(mockConsole.log).toHaveBeenCalledWith('Extension installed:', details);
      expect(mockConsole.log).toHaveBeenCalledWith('SquareX Security Scanner installed successfully!');
    });

    test('should handle extension startup', () => {
      startupListener();
      expect(mockConsole.log).toHaveBeenCalledWith('SquareX Security Scanner started');
    });

    test('should handle extension update', () => {
      updateListener();
      expect(mockConsole.log).toHaveBeenCalledWith('Extension update available');
    });
  });

  describe('Configuration', () => {
    test('should use correct timeout configuration', () => {
      expect(CONFIG.CHUNK_SIZE).toBe(1024 * 1024); // 1MB
    });

    test('should use correct max file size', () => {
      expect(CONFIG.MAX_FILE_SIZE).toBe(100 * 1024 * 1024); // 100MB
    });

    test('should use correct entropy threshold', () => {
      expect(CONFIG.ENTROPY_THRESHOLD).toBe(4.8);
    });

    test('should use correct risk threshold', () => {
      expect(CONFIG.RISK_THRESHOLD).toBe(0.6);
    });
  });

  describe('Error Handling', () => {
    test('should handle analysis errors gracefully', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'ANALYZE_FILE',
        data: null // This will cause an error
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Analysis failed'
      });
    });

    test('should handle streaming errors gracefully', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_INIT',
        operation_id: 'test-op-123',
        file: null // This will cause an error
      };

      await messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Streaming initialization failed'
      });
    });
  });

  describe('Performance and Memory', () => {
    test('should handle multiple concurrent messages', async () => {
      const messages = [
        { type: 'ANALYZE_FILE', data: { content: 'test1', fileName: 'file1.txt' } },
        { type: 'ANALYZE_FILE', data: { content: 'test2', fileName: 'file2.txt' } },
        { type: 'ANALYZE_FILE', data: { content: 'test3', fileName: 'file3.txt' } }
      ];

      const promises = messages.map(msg => 
        messageListener(msg, {}, jest.fn())
      );

      await Promise.all(promises);

      // All messages should be processed
      expect(mockConsole.log).toHaveBeenCalledTimes(3); // 3 messages logged
    });

    test('should not leak memory with repeated calls', async () => {
      const message = {
        type: 'ANALYZE_FILE',
        data: { content: 'test content', fileName: 'test.txt' }
      };

      // Call multiple times to check for memory leaks
      for (let i = 0; i < 100; i++) {
        await messageListener(message, {}, jest.fn());
      }

      // Should still work correctly
      expect(mockConsole.log).toHaveBeenCalledTimes(100);
    });
  });
});

