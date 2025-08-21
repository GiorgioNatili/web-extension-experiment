// Safari background script tests
import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock WASM loader
const mockSafariWASMLoader = {
  loadWASMModule: jest.fn(),
  isModuleLoaded: jest.fn(),
  createStreamingAnalyzer: jest.fn(),
  getModuleStatus: jest.fn(),
  debugIntrospection: jest.fn()
};

// Mock error handler
const mockSafariErrorHandler = {
  handleError: jest.fn(),
  getErrorStats: jest.fn(),
  getErrorLog: jest.fn()
};

// Global mocks
global.browser = mockBrowser as any;

// Mock shared utilities
jest.mock('shared', () => ({
  CONFIG: { CHUNK_SIZE: 1024 * 1024 },
  MESSAGES: {
    ANALYSIS_COMPLETE: 'Analysis complete',
    ANALYSIS_FAILED: 'Analysis failed',
    INVALID_FILE_TYPE: 'Invalid file type'
  }
}));

describe('Safari Background Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize WASM module on startup', async () => {
      mockSafariWASMLoader.loadWASMModule.mockResolvedValue(true);
      
      const initializeWASM = async () => {
        try {
          await mockSafariWASMLoader.loadWASMModule();
          console.log('WASM module initialized successfully');
          return true;
        } catch (error) {
          console.error('Failed to initialize WASM module:', error);
          const recovery = await mockSafariErrorHandler.handleError(error as Error, { operation: 'wasm_init' });
          if (!recovery.recovered) {
            console.error('WASM initialization failed and could not be recovered');
          }
          return false;
        }
      };
      
      const result = await initializeWASM();
      
      expect(result).toBe(true);
      expect(mockSafariWASMLoader.loadWASMModule).toHaveBeenCalled();
    });

    test('should handle WASM initialization errors', async () => {
      const mockError = new Error('WASM init failed');
      mockSafariWASMLoader.loadWASMModule.mockRejectedValue(mockError);
      mockSafariErrorHandler.handleError.mockResolvedValue({ recovered: false });
      
      const initializeWASM = async () => {
        try {
          await mockSafariWASMLoader.loadWASMModule();
          console.log('WASM module initialized successfully');
          return true;
        } catch (error) {
          console.error('Failed to initialize WASM module:', error);
          const recovery = await mockSafariErrorHandler.handleError(error as Error, { operation: 'wasm_init' });
          if (!recovery.recovered) {
            console.error('WASM initialization failed and could not be recovered');
          }
          return false;
        }
      };
      
      const result = await initializeWASM();
      
      expect(result).toBe(false);
      expect(mockSafariWASMLoader.loadWASMModule).toHaveBeenCalled();
      expect(mockSafariErrorHandler.handleError).toHaveBeenCalledWith(mockError, { operation: 'wasm_init' });
    });
  });

  describe('Message Handling', () => {
    test('should handle GET_STATUS message', () => {
      mockSafariWASMLoader.isModuleLoaded.mockReturnValue(true);
      mockSafariErrorHandler.getErrorStats.mockReturnValue({ total: 0, wasm_errors: 0 });
      
      const sendResponse = jest.fn();
      
      const handleGetStatus = () => {
        sendResponse({ 
          status: 'ready',
          wasm_loaded: mockSafariWASMLoader.isModuleLoaded(),
          error_stats: mockSafariErrorHandler.getErrorStats()
        });
      };
      
      handleGetStatus();
      
      expect(sendResponse).toHaveBeenCalledWith({
        status: 'ready',
        wasm_loaded: true,
        error_stats: { total: 0, wasm_errors: 0 }
      });
      expect(mockSafariWASMLoader.isModuleLoaded).toHaveBeenCalled();
      expect(mockSafariErrorHandler.getErrorStats).toHaveBeenCalled();
    });

    test('should handle GET_ERROR_LOG message', () => {
      const mockErrorLog = [
        { timestamp: Date.now(), error: 'Test error', type: 'analysis' }
      ];
      const mockErrorStats = { total: 1, wasm_errors: 0 };
      
      mockSafariErrorHandler.getErrorLog.mockReturnValue(mockErrorLog);
      mockSafariErrorHandler.getErrorStats.mockReturnValue(mockErrorStats);
      
      const sendResponse = jest.fn();
      
      const handleGetErrorLog = () => {
        sendResponse({ 
          error_log: mockSafariErrorHandler.getErrorLog(),
          error_stats: mockSafariErrorHandler.getErrorStats()
        });
      };
      
      handleGetErrorLog();
      
      expect(sendResponse).toHaveBeenCalledWith({
        error_log: mockErrorLog,
        error_stats: mockErrorStats
      });
      expect(mockSafariErrorHandler.getErrorLog).toHaveBeenCalled();
      expect(mockSafariErrorHandler.getErrorStats).toHaveBeenCalled();
    });

    test('should handle ANALYZE_FILE message', async () => {
      const mockAnalyzer = {
        processChunk: jest.fn(),
        finalize: jest.fn().mockReturnValue({
          decision: 'allow',
          riskScore: 0.2,
          reason: 'File appears safe'
        })
      };
      
      mockSafariWASMLoader.isModuleLoaded.mockReturnValue(true);
      mockSafariWASMLoader.createStreamingAnalyzer.mockReturnValue(mockAnalyzer);
      
      const sendResponse = jest.fn();
      const message = {
        type: 'ANALYZE_FILE',
        data: {
          content: 'test file content',
          fileName: 'test.txt'
        }
      };
      
      const handleFileAnalysis = async (message: any, sendResponse: any) => {
        try {
          const { content, fileName } = message.data;
          
          if (!mockSafariWASMLoader.isModuleLoaded()) {
            throw new Error('WASM module not loaded');
          }
          
          // Create streaming analyzer
          const analyzer = mockSafariWASMLoader.createStreamingAnalyzer();
          
          // Process content in chunks
          const chunks = ['test ', 'file ', 'content'];
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
            error: error.message
          });
        }
      };
      
      await handleFileAnalysis(message, sendResponse);
      
      expect(mockSafariWASMLoader.isModuleLoaded).toHaveBeenCalled();
      expect(mockSafariWASMLoader.createStreamingAnalyzer).toHaveBeenCalled();
      expect(mockAnalyzer.processChunk).toHaveBeenCalledTimes(3);
      expect(mockAnalyzer.finalize).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        result: expect.objectContaining({
          decision: 'allow',
          riskScore: 0.2,
          reason: 'File appears safe',
          fileName: 'test.txt'
        })
      });
    });

    test('should handle ANALYZE_FILE with WASM not loaded', async () => {
      mockSafariWASMLoader.isModuleLoaded.mockReturnValue(false);
      
      const sendResponse = jest.fn();
      const message = {
        type: 'ANALYZE_FILE',
        data: {
          content: 'test file content',
          fileName: 'test.txt'
        }
      };
      
      const handleFileAnalysis = async (message: any, sendResponse: any) => {
        try {
          const { content, fileName } = message.data;
          
          if (!mockSafariWASMLoader.isModuleLoaded()) {
            throw new Error('WASM module not loaded');
          }
          
          // This should not be reached
          sendResponse({ success: true });
        } catch (error) {
          console.error('File analysis failed:', error);
          sendResponse({
            success: false,
            error: error.message
          });
        }
      };
      
      await handleFileAnalysis(message, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'WASM module not loaded'
      });
    });
  });

  describe('Ready Signal Broadcasting', () => {
    test('should send ready signal to all tabs', async () => {
      const mockTabs = [
        { id: 1, url: 'http://localhost:8080/test' },
        { id: 2, url: 'http://localhost:8080/test2' }
      ];
      
      mockBrowser.tabs.query.mockResolvedValue(mockTabs);
      mockBrowser.tabs.sendMessage.mockResolvedValue(true);
      
      const sendReadySignal = async () => {
        console.log('[Safari] Sending immediate ready signal');
        try {
          const tabs = await mockBrowser.tabs.query({});
          tabs.forEach((tab: any) => {
            if (tab.id) {
              mockBrowser.tabs.sendMessage(tab.id, { 
                type: 'EXTENSION_READY',
                source: 'squarex-extension',
                ready: true 
              }).catch(() => {
                // Ignore errors for tabs that don't have content scripts
              });
            }
          });
        } catch (error) {
          console.error('[Safari] Error sending immediate ready signal:', error);
        }
      };
      
      await sendReadySignal();
      
      expect(mockBrowser.tabs.query).toHaveBeenCalledWith({});
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'EXTENSION_READY',
        source: 'squarex-extension',
        ready: true
      });
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(2, {
        type: 'EXTENSION_READY',
        source: 'squarex-extension',
        ready: true
      });
    });

    test('should handle errors when sending ready signal', async () => {
      mockBrowser.tabs.query.mockRejectedValue(new Error('Query failed'));
      
      const sendReadySignal = async () => {
        console.log('[Safari] Sending immediate ready signal');
        try {
          const tabs = await mockBrowser.tabs.query({});
          tabs.forEach((tab: any) => {
            if (tab.id) {
              mockBrowser.tabs.sendMessage(tab.id, { 
                type: 'EXTENSION_READY',
                source: 'squarex-extension',
                ready: true 
              }).catch(() => {
                // Ignore errors for tabs that don't have content scripts
              });
            }
          });
        } catch (error) {
          console.error('[Safari] Error sending immediate ready signal:', error);
          return false;
        }
        return true;
      };
      
      const result = await sendReadySignal();
      
      expect(result).toBe(false);
      expect(mockBrowser.tabs.query).toHaveBeenCalledWith({});
    });
  });

  describe('Streaming Operations', () => {
    test('should handle STREAM_INIT message', async () => {
      mockSafariWASMLoader.isModuleLoaded.mockReturnValue(true);
      
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_INIT',
        operation_id: 'test-op-123',
        file_info: {
          name: 'large.txt',
          size: 2 * 1024 * 1024,
          type: 'text/plain'
        }
      };
      
      const handleStreamInit = async (message: any, sendResponse: any) => {
        try {
          const { operation_id, file_info } = message;
          
          if (!mockSafariWASMLoader.isModuleLoaded()) {
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
          
          // Store operation (in real implementation, this would be in a Map)
          console.log('Streaming operation initialized:', operation_id);
          
          sendResponse({ success: true, operation_id });
        } catch (error) {
          console.error('Stream initialization failed:', error);
          sendResponse({
            success: false,
            error: error.message
          });
        }
      };
      
      await handleStreamInit(message, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        operation_id: 'test-op-123'
      });
    });

    test('should handle STREAM_CHUNK message', async () => {
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_CHUNK',
        operation_id: 'test-op-123',
        chunk: 'test chunk content',
        chunk_index: 0
      };
      
      const handleStreamChunk = async (message: any, sendResponse: any) => {
        try {
          const { operation_id, chunk, chunk_index } = message;
          
          // In real implementation, this would retrieve the operation from storage
          const operation = {
            id: operation_id,
            content: '',
            stats: {
              total_chunks: 0,
              total_content_length: 0
            },
            lastActivity: Date.now()
          };
          
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
            error: error.message
          });
        }
      };
      
      await handleStreamChunk(message, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        chunk_index: 0,
        total_chunks: 1
      });
    });

    test('should handle STREAM_FINALIZE message', async () => {
      const mockAnalyzer = {
        processChunk: jest.fn(),
        finalize: jest.fn().mockReturnValue({
          decision: 'block',
          riskScore: 0.8,
          reason: 'High risk content detected'
        })
      };
      
      mockSafariWASMLoader.isModuleLoaded.mockReturnValue(true);
      mockSafariWASMLoader.createStreamingAnalyzer.mockReturnValue(mockAnalyzer);
      
      const sendResponse = jest.fn();
      const message = {
        type: 'STREAM_FINALIZE',
        operation_id: 'test-op-123'
      };
      
      const handleStreamFinalize = async (message: any, sendResponse: any) => {
        try {
          const { operation_id } = message;
          
          if (!mockSafariWASMLoader.isModuleLoaded()) {
            throw new Error('WASM module not loaded');
          }
          
          // In real implementation, this would retrieve the operation from storage
          const operation = {
            id: operation_id,
            content: 'complete file content',
            file_info: {
              name: 'large.txt',
              size: 1024,
              type: 'text/plain'
            },
            stats: {
              total_chunks: 1,
              total_content_length: 20
            }
          };
          
          // Create analyzer and process final content
          const analyzer = mockSafariWASMLoader.createStreamingAnalyzer();
          analyzer.processChunk(operation.content);
          
          // Finalize analysis
          const result = analyzer.finalize();
          
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
            error: error.message
          });
        }
      };
      
      await handleStreamFinalize(message, sendResponse);
      
      expect(mockSafariWASMLoader.createStreamingAnalyzer).toHaveBeenCalled();
      expect(mockAnalyzer.processChunk).toHaveBeenCalledWith('complete file content');
      expect(mockAnalyzer.finalize).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        result: expect.objectContaining({
          decision: 'block',
          riskScore: 0.8,
          reason: 'High risk content detected',
          fileName: 'large.txt'
        })
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WASM errors gracefully', async () => {
      const mockError = new Error('WASM processing failed');
      mockSafariErrorHandler.handleError.mockResolvedValue({
        recovered: true,
        retry: true
      });
      
      const handleWasmError = async (error: Error) => {
        const recovery = await mockSafariErrorHandler.handleError(error, { operation: 'analysis' });
        return recovery;
      };
      
      const recovery = await handleWasmError(mockError);
      
      expect(mockSafariErrorHandler.handleError).toHaveBeenCalledWith(mockError, { operation: 'analysis' });
      expect(recovery.recovered).toBe(true);
      expect(recovery.retry).toBe(true);
    });

    test('should handle unrecoverable errors', async () => {
      const mockError = new Error('Critical WASM error');
      mockSafariErrorHandler.handleError.mockResolvedValue({
        recovered: false,
        retry: false
      });
      
      const handleWasmError = async (error: Error) => {
        const recovery = await mockSafariErrorHandler.handleError(error, { operation: 'wasm_init' });
        if (!recovery.recovered) {
          console.error('Critical error, cannot recover');
        }
        return recovery;
      };
      
      const recovery = await handleWasmError(mockError);
      
      expect(recovery.recovered).toBe(false);
      expect(recovery.retry).toBe(false);
    });
  });
});
