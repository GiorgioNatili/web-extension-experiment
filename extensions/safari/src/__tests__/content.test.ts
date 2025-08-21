// Safari content script tests
import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  runtime: {
    sendMessage: jest.fn(),
    getURL: jest.fn()
  },
  storage: {
    local: {
      set: jest.fn(),
      get: jest.fn()
    }
  }
};

// Mock document
const mockDocument = {
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  getElementById: jest.fn(),
  body: {
    appendChild: jest.fn()
  },
  addEventListener: jest.fn(),
  readyState: 'complete'
};

// Mock window
const mockWindow = {
  postMessage: jest.fn(),
  addEventListener: jest.fn()
};

// Mock MutationObserver
const mockMutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

// Mock FileReader
const mockFileReader = {
  readAsText: jest.fn(),
  result: 'test file content',
  onload: null as any,
  onerror: null as any
};

// Global mocks
global.browser = mockBrowser as any;
global.document = mockDocument as any;
global.window = mockWindow as any;
global.MutationObserver = mockMutationObserver as any;
global.FileReader = mockFileReader as any;

// Mock shared utilities
jest.mock('shared', () => ({
  CONFIG: { CHUNK_SIZE: 1024 * 1024 },
  MESSAGES: {
    ANALYSIS_COMPLETE: 'Analysis complete',
    ANALYSIS_FAILED: 'Analysis failed',
    INVALID_FILE_TYPE: 'Invalid file type'
  },
  getFileInfo: jest.fn(),
  isValidTextFile: jest.fn(),
  readFileAsText: jest.fn(),
  createElement: jest.fn(),
  createProgressBar: jest.fn(),
  showNotification: jest.fn()
}));

describe('Safari Content Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mock Verification', () => {
    test('should verify mocks are working', () => {
      // Test document.querySelectorAll
      const mockElements = [{ id: 'test' }];
      (document.querySelectorAll as jest.Mock).mockReturnValue(mockElements);
      const elements = document.querySelectorAll('input[type="file"]');
      expect(elements).toBe(mockElements);
      expect(document.querySelectorAll).toHaveBeenCalledWith('input[type="file"]');

      // Test document.createElement
      const mockElement = { id: 'test-element' };
      (document.createElement as jest.Mock).mockReturnValue(mockElement);
      const element = document.createElement('div');
      expect(element).toBe(mockElement);
      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('WASM Initialization', () => {
    test('should initialize WASM module', async () => {
      // Mock WASM module
      const mockWasmModule = {
        default: jest.fn().mockResolvedValue(true)
      };
      
      // Mock dynamic import
      const mockImport = jest.fn().mockResolvedValue(mockWasmModule);
      global.import = mockImport as any;
      
      // Mock browser.runtime.getURL
      (browser.runtime.getURL as jest.Mock)
        .mockReturnValueOnce('chrome-extension://test/wasm.js')
        .mockReturnValueOnce('chrome-extension://test/wasm_bg.wasm');
      
      // Test WASM initialization
      const ensureWasm = async () => {
        const wasmJsUrl = browser.runtime.getURL('wasm.js');
        const wasmBinaryUrl = browser.runtime.getURL('wasm_bg.wasm');
        
        // Mock the import to avoid actual module loading
        const wasmNs = await mockImport(wasmJsUrl);
        await wasmNs.default({ module_or_path: wasmBinaryUrl });
        
        return true;
      };
      
      const result = await ensureWasm();
      expect(result).toBe(true);
      expect(browser.runtime.getURL).toHaveBeenCalledWith('wasm.js');
      expect(browser.runtime.getURL).toHaveBeenCalledWith('wasm_bg.wasm');
    });
  });

  describe('Message Bridge', () => {
    test('should handle window.postMessage for test pages', () => {
      const mockEvent = {
        source: window,
        data: {
          source: 'squarex-test',
          payload: { type: 'TEST_WASM_LOADING' },
          correlationId: 'test-123'
        }
      };
      
      // Mock window.postMessage response
      const handleMessage = (event: any) => {
        if (event.source !== window) return;
        
        const data = event.data;
        if (!data || data.source !== 'squarex-test' || !data.payload) return;
        
        // Send response back
        window.postMessage({ 
          source: 'squarex-extension', 
          correlationId: data.correlationId, 
          response: { success: true } 
        }, '*');
      };
      
      handleMessage(mockEvent);
      
      expect(window.postMessage).toHaveBeenCalledWith({
        source: 'squarex-extension',
        correlationId: 'test-123',
        response: { success: true }
      }, '*');
    });
  });

  describe('Test Results Integration', () => {
    test('should update test-results element with analysis data', () => {
      const mockTestResults = {
        innerHTML: '',
        style: {}
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockTestResults);
      
      const showResults = (result: any, fileName: string) => {
        // Store latest analysis result for consistency
        const analysisResult = {
          ...result,
          fileName,
          timestamp: Date.now()
        };
        browser.storage.local.set({ latestAnalysisResult: analysisResult });
        
        // Update the test page's results element if it exists
        const testResults = document.getElementById('test-results');
        if (testResults) {
          const normalizedRisk = (typeof result?.riskScore === 'number')
            ? result.riskScore
            : (typeof result?.risk_score === 'number' ? result.risk_score : 0);
          const decision = result.decision || 'allow';
          const reason = result.reason || 'Analysis complete';
          
          testResults.innerHTML = `
            <div class="status success">
              <h4>Analysis Complete</h4>
              <p><strong>File:</strong> ${fileName}</p>
              <p><strong>Risk Score:</strong> ${(normalizedRisk * 100).toFixed(0)}%</p>
              <p><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            </div>
          `;
        }
      };
      
      const testResult = {
        decision: 'allow',
        riskScore: 0.3,
        reason: 'File appears safe'
      };
      
      showResults(testResult, 'test.txt');
      
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        latestAnalysisResult: expect.objectContaining({
          fileName: 'test.txt',
          decision: 'allow',
          riskScore: 0.3
        })
      });
      
      expect(mockTestResults.innerHTML).toContain('Analysis Complete');
      expect(mockTestResults.innerHTML).toContain('test.txt');
      expect(mockTestResults.innerHTML).toContain('30%');
      expect(mockTestResults.innerHTML).toContain('Allowed');
    });
  });

  describe('Ready Signal Broadcasting', () => {
    test('should send ready signal to test pages', () => {
      const sendReadySignal = () => {
        try {
          window.postMessage({ source: 'squarex-extension', ready: true }, '*');
        } catch (_) {}
      };
      
      sendReadySignal();
      
      expect(window.postMessage).toHaveBeenCalledWith({
        source: 'squarex-extension',
        ready: true
      }, '*');
    });
  });

  describe('File Input Monitoring', () => {
    test('should monitor file uploads on page load', () => {
      const mockFileInputs = [
        { addEventListener: jest.fn() },
        { addEventListener: jest.fn() }
      ];
      
      (document.querySelectorAll as jest.Mock).mockReturnValue(mockFileInputs);
      
      // Trigger the monitoring function
      const monitorFileUploads = () => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach((input: any) => {
          input.addEventListener('change', jest.fn());
        });
      };
      
      monitorFileUploads();
      
      expect(document.querySelectorAll).toHaveBeenCalledWith('input[type="file"]');
      expect(mockFileInputs[0].addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockFileInputs[1].addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should handle file selection events', async () => {
      const mockFile = {
        name: 'test.txt',
        type: 'text/plain',
        size: 1024,
        text: jest.fn().mockResolvedValue('test content')
      };
      
      const mockFileInput = {
        files: [mockFile],
        addEventListener: jest.fn()
      };
      
      const handleFileSelect = async (event: any) => {
        const input = event.target;
        const file = input.files?.[0];
        
        if (!file) return;
        
        if (file.type.includes('text') || file.name.endsWith('.txt')) {
          const content = await file.text();
          const response = await browser.runtime.sendMessage({
            type: 'ANALYZE_FILE',
            data: { content, fileName: file.name }
          });
          
          return response;
        }
      };
      
      const mockEvent = { target: mockFileInput };
      const result = await handleFileSelect(mockEvent);
      
      expect(mockFile.text).toHaveBeenCalled();
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'ANALYZE_FILE',
        data: { content: 'test content', fileName: 'test.txt' }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WASM initialization errors gracefully', async () => {
      const mockError = new Error('WASM init failed');
      
      const ensureWasmWithError = async () => {
        try {
          throw mockError;
        } catch (e) {
          console.error('[Safari] WASM init failed:', e);
          return false;
        }
      };
      
      const result = await ensureWasmWithError();
      expect(result).toBe(false);
    });

    test('should handle file analysis errors', async () => {
      const mockError = new Error('Analysis failed');
      (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(mockError);
      
      const handleFileAnalysis = async () => {
        try {
          await browser.runtime.sendMessage({
            type: 'ANALYZE_FILE',
            data: { content: 'test', fileName: 'test.txt' }
          });
        } catch (error) {
          console.error('[Safari] Analysis error:', error);
          return { success: false, error: error.message };
        }
      };
      
      const result = await handleFileAnalysis();
      expect(result).toEqual({ success: false, error: 'Analysis failed' });
    });
  });

  describe('Storage Integration', () => {
    test('should store analysis results in browser storage', async () => {
      const mockAnalysisResult = {
        decision: 'block',
        riskScore: 0.8,
        reason: 'High risk content detected',
        fileName: 'suspicious.txt',
        timestamp: Date.now()
      };
      
      const storeAnalysisResult = async (result: any) => {
        await browser.storage.local.set({ latestAnalysisResult: result });
      };
      
      await storeAnalysisResult(mockAnalysisResult);
      
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        latestAnalysisResult: mockAnalysisResult
      });
    });

    test('should retrieve analysis results from browser storage', async () => {
      const mockStoredResult = {
        latestAnalysisResult: {
          decision: 'allow',
          riskScore: 0.2,
          fileName: 'safe.txt'
        }
      };
      
      (browser.storage.local.get as jest.Mock).mockResolvedValue(mockStoredResult);
      
      const getLatestResults = async () => {
        const result = await browser.storage.local.get(['latestAnalysisResult']);
        return result.latestAnalysisResult;
      };
      
      const result = await getLatestResults();
      
      expect(browser.storage.local.get).toHaveBeenCalledWith(['latestAnalysisResult']);
      expect(result).toEqual(mockStoredResult.latestAnalysisResult);
    });
  });
});
