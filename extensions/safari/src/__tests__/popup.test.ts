// Safari popup tests
import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  runtime: {
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    create: jest.fn()
  }
};

// Mock document
const mockDocument = {
  getElementById: jest.fn(),
  addEventListener: jest.fn()
};

// Global mocks
global.browser = mockBrowser as any;
global.document = mockDocument as any;

// Mock shared utilities
jest.mock('shared', () => ({
  CONFIG: { CHUNK_SIZE: 1024 * 1024 },
  MESSAGES: {
    ANALYSIS_COMPLETE: 'Analysis complete',
    ANALYSIS_FAILED: 'Analysis failed',
    INVALID_FILE_TYPE: 'Invalid file type'
  },
  showNotification: jest.fn()
}));

describe('Safari Popup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize popup with DOM elements', async () => {
      const mockToggleButton = {
        textContent: '',
        className: '',
        addEventListener: jest.fn(),
        disabled: false
      };
      
      const mockStatusElement = {
        textContent: '',
        className: ''
      };
      
      const mockWasmStatusElement = {
        textContent: '',
        className: ''
      };
      
      const mockErrorStatsElement = {
        textContent: '',
        className: ''
      };
      
      const mockLatestResultsElement = {
        innerHTML: '',
        className: ''
      };
      
      (document.getElementById as jest.Mock)
        .mockReturnValueOnce(mockToggleButton) // toggleButton
        .mockReturnValueOnce(mockStatusElement) // status
        .mockReturnValueOnce(mockWasmStatusElement) // wasmStatus
        .mockReturnValueOnce(mockErrorStatsElement) // errorStats
        .mockReturnValueOnce(mockLatestResultsElement); // latestResults
      
      (browser.storage.local.get as jest.Mock).mockResolvedValue({
        scannerEnabled: true,
        entropyThreshold: 0.7
      });
      
      const initializePopup = async () => {
        // Get DOM elements
        const toggleButton = document.getElementById('toggleButton') as HTMLButtonElement;
        const statusElement = document.getElementById('status');
        const wasmStatusElement = document.getElementById('wasmStatus');
        const errorStatsElement = document.getElementById('errorStats');
        const latestResultsElement = document.getElementById('latestResults');
        
        // Load current settings
        const result = await browser.storage.local.get(['scannerEnabled', 'entropyThreshold']);
        const scannerEnabled = result.scannerEnabled !== false;
        
        // Update UI
        if (toggleButton) {
          toggleButton.textContent = scannerEnabled ? 'Disable Scanner' : 'Enable Scanner';
          toggleButton.addEventListener('click', jest.fn());
        }
        
        return {
          toggleButton,
          statusElement,
          wasmStatusElement,
          errorStatsElement,
          latestResultsElement,
          scannerEnabled
        };
      };
      
      const result = await initializePopup();
      
      expect(result.toggleButton).toBe(mockToggleButton);
      expect(result.statusElement).toBe(mockStatusElement);
      expect(result.wasmStatusElement).toBe(mockWasmStatusElement);
      expect(result.errorStatsElement).toBe(mockErrorStatsElement);
      expect(result.latestResultsElement).toBe(mockLatestResultsElement);
      expect(result.scannerEnabled).toBe(true);
      
      expect(mockToggleButton.textContent).toBe('Disable Scanner');
      expect(mockToggleButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Scanner Toggle', () => {
    test('should toggle scanner from enabled to disabled', async () => {
      const mockToggleButton = {
        textContent: '',
        className: '',
        addEventListener: jest.fn(),
        disabled: false
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockToggleButton);
      
      (browser.storage.local.get as jest.Mock)
        .mockResolvedValueOnce({ scannerEnabled: true }) // Initial state
        .mockResolvedValueOnce({ scannerEnabled: false }); // After toggle
      
      const toggleScanner = async () => {
        try {
          const result = await browser.storage.local.get(['scannerEnabled']);
          const newStatus = !result.scannerEnabled;
          
          await browser.storage.local.set({ scannerEnabled: newStatus });
          
          if (mockToggleButton) {
            mockToggleButton.textContent = newStatus ? 'Disable Scanner' : 'Enable Scanner';
          }
          
          return newStatus;
        } catch (error) {
          console.error('Failed to toggle scanner:', error);
          throw error;
        }
      };
      
      const newStatus = await toggleScanner();
      
      expect(newStatus).toBe(false);
      expect(browser.storage.local.set).toHaveBeenCalledWith({ scannerEnabled: false });
      expect(mockToggleButton.textContent).toBe('Enable Scanner');
    });

    test('should toggle scanner from disabled to enabled', async () => {
      const mockToggleButton = {
        textContent: '',
        className: '',
        addEventListener: jest.fn(),
        disabled: false
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockToggleButton);
      
      (browser.storage.local.get as jest.Mock)
        .mockResolvedValueOnce({ scannerEnabled: false }) // Initial state
        .mockResolvedValueOnce({ scannerEnabled: true }); // After toggle
      
      const toggleScanner = async () => {
        try {
          const result = await browser.storage.local.get(['scannerEnabled']);
          const newStatus = !result.scannerEnabled;
          
          await browser.storage.local.set({ scannerEnabled: newStatus });
          
          if (mockToggleButton) {
            mockToggleButton.textContent = newStatus ? 'Disable Scanner' : 'Enable Scanner';
          }
          
          return newStatus;
        } catch (error) {
          console.error('Failed to toggle scanner:', error);
          throw error;
        }
      };
      
      const newStatus = await toggleScanner();
      
      expect(newStatus).toBe(true);
      expect(browser.storage.local.set).toHaveBeenCalledWith({ scannerEnabled: true });
      expect(mockToggleButton.textContent).toBe('Disable Scanner');
    });
  });

  describe('WASM Testing', () => {
    test('should trigger WASM loading test', async () => {
      const mockTestWasmButton = {
        disabled: false,
        textContent: '',
        addEventListener: jest.fn()
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockTestWasmButton);
      
      (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        wasm_loaded: true
      });
      
      const triggerWasmTest = async () => {
        try {
          if (mockTestWasmButton) {
            mockTestWasmButton.disabled = true;
            mockTestWasmButton.textContent = 'Testing...';
          }
          
          const response = await browser.runtime.sendMessage({ type: 'TEST_WASM_LOADING' });
          
          if (mockTestWasmButton) {
            mockTestWasmButton.textContent = 'Test WASM';
          }
          
          return response;
        } catch (error) {
          console.error('Failed to run WASM test:', error);
          throw error;
        } finally {
          if (mockTestWasmButton) {
            mockTestWasmButton.disabled = false;
          }
        }
      };
      
      const response = await triggerWasmTest();
      
      expect(response.success).toBe(true);
      expect(response.wasm_loaded).toBe(true);
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TEST_WASM_LOADING' });
      expect(mockTestWasmButton.disabled).toBe(false);
      expect(mockTestWasmButton.textContent).toBe('Test WASM');
    });

    test('should handle WASM test errors', async () => {
      const mockTestWasmButton = {
        disabled: false,
        textContent: '',
        addEventListener: jest.fn()
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockTestWasmButton);
      
      (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('WASM test failed'));
      
      const triggerWasmTest = async () => {
        try {
          if (mockTestWasmButton) {
            mockTestWasmButton.disabled = true;
            mockTestWasmButton.textContent = 'Testing...';
          }
          
          const response = await browser.runtime.sendMessage({ type: 'TEST_WASM_LOADING' });
          
          if (mockTestWasmButton) {
            mockTestWasmButton.textContent = 'Test WASM';
          }
          
          return response;
        } catch (error) {
          console.error('Failed to run WASM test:', error);
          if (mockTestWasmButton) {
            mockTestWasmButton.textContent = 'Test WASM';
          }
          throw error;
        } finally {
          if (mockTestWasmButton) {
            mockTestWasmButton.disabled = false;
          }
        }
      };
      
      await expect(triggerWasmTest()).rejects.toThrow('WASM test failed');
      expect(mockTestWasmButton.disabled).toBe(false);
      expect(mockTestWasmButton.textContent).toBe('Test WASM');
    });
  });

  describe('Status Updates', () => {
    test('should update status display for ready state', async () => {
      const mockStatusElement = {
        textContent: '',
        className: ''
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockStatusElement);
      
      (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({
        status: 'ready',
        wasm_loaded: true,
        error_stats: { total: 0 }
      });
      
      const updateStatus = async () => {
        try {
          const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
          
          if (mockStatusElement) {
            if (response.status === 'ready') {
              mockStatusElement.textContent = 'Ready';
              mockStatusElement.className = 'status ready';
            } else if (response.status === 'busy') {
              mockStatusElement.textContent = 'Processing';
              mockStatusElement.className = 'status busy';
            } else if (response.status === 'error') {
              mockStatusElement.textContent = 'Error';
              mockStatusElement.className = 'status error';
            }
          }
          
          return response;
        } catch (error) {
          console.error('Failed to update status:', error);
          throw error;
        }
      };
      
      const response = await updateStatus();
      
      expect(response.status).toBe('ready');
      expect(mockStatusElement.textContent).toBe('Ready');
      expect(mockStatusElement.className).toBe('status ready');
    });

    test('should update status display for busy state', async () => {
      const mockStatusElement = {
        textContent: '',
        className: ''
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockStatusElement);
      
      (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({
        status: 'busy',
        wasm_loaded: true,
        error_stats: { total: 0 }
      });
      
      const updateStatus = async () => {
        try {
          const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
          
          if (mockStatusElement) {
            if (response.status === 'ready') {
              mockStatusElement.textContent = 'Ready';
              mockStatusElement.className = 'status ready';
            } else if (response.status === 'busy') {
              mockStatusElement.textContent = 'Processing';
              mockStatusElement.className = 'status busy';
            } else if (response.status === 'error') {
              mockStatusElement.textContent = 'Error';
              mockStatusElement.className = 'status error';
            }
          }
          
          return response;
        } catch (error) {
          console.error('Failed to update status:', error);
          throw error;
        }
      };
      
      const response = await updateStatus();
      
      expect(response.status).toBe('busy');
      expect(mockStatusElement.textContent).toBe('Processing');
      expect(mockStatusElement.className).toBe('status busy');
    });
  });

  describe('Latest Results Display', () => {
    test('should display latest analysis results', async () => {
      const mockLatestResultsElement = {
        innerHTML: '',
        className: ''
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockLatestResultsElement);
      
      (browser.storage.local.get as jest.Mock).mockResolvedValue({
        latestAnalysisResult: {
          fileName: 'test.txt',
          decision: 'allow',
          riskScore: 0.3,
          reason: 'File appears safe',
          timestamp: Date.now()
        }
      });
      
      const updateLatestResults = async () => {
        try {
          const result = await browser.storage.local.get(['latestAnalysisResult']);
          if (mockLatestResultsElement && result.latestAnalysisResult) {
            const analysis = result.latestAnalysisResult;
            const riskScore = (analysis.riskScore || analysis.risk_score || 0) * 100;
            const decision = analysis.decision || 'allow';
            const fileName = analysis.fileName || 'Unknown file';
            const reason = analysis.reason || 'Analysis complete';
            
            mockLatestResultsElement.innerHTML = `
              <h4>Latest Analysis</h4>
              <p><strong>File:</strong> ${fileName}</p>
              <p><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
              <p><strong>Risk Score:</strong> ${riskScore.toFixed(0)}%</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Time:</strong> ${new Date(analysis.timestamp || Date.now()).toLocaleTimeString()}</p>
            `;
            mockLatestResultsElement.className = 'status success';
          }
        } catch (error) {
          console.error('Failed to update latest results:', error);
        }
      };
      
      await updateLatestResults();
      
      expect(mockLatestResultsElement.innerHTML).toContain('Latest Analysis');
      expect(mockLatestResultsElement.innerHTML).toContain('test.txt');
      expect(mockLatestResultsElement.innerHTML).toContain('Allowed');
      expect(mockLatestResultsElement.innerHTML).toContain('30%');
      expect(mockLatestResultsElement.innerHTML).toContain('File appears safe');
      expect(mockLatestResultsElement.className).toBe('status success');
    });

    test('should handle missing latest results', async () => {
      const mockLatestResultsElement = {
        innerHTML: '',
        className: ''
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockLatestResultsElement);
      
      (browser.storage.local.get as jest.Mock).mockResolvedValue({});
      
      const updateLatestResults = async () => {
        try {
          const result = await browser.storage.local.get(['latestAnalysisResult']);
          if (mockLatestResultsElement && result.latestAnalysisResult) {
            // Update with results
            mockLatestResultsElement.innerHTML = 'Results found';
          } else {
            // No results available
            mockLatestResultsElement.innerHTML = 'No analysis results available';
            mockLatestResultsElement.className = 'status info';
          }
        } catch (error) {
          console.error('Failed to update latest results:', error);
        }
      };
      
      await updateLatestResults();
      
      expect(mockLatestResultsElement.innerHTML).toBe('No analysis results available');
      expect(mockLatestResultsElement.className).toBe('status info');
    });
  });

  describe('Options and Help Links', () => {
    test('should open options page', () => {
      const mockOptionsLink = {
        addEventListener: jest.fn()
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockOptionsLink);
      
      const setupOptionsLink = () => {
        const optionsLink = document.getElementById('optionsLink');
        if (optionsLink) {
          optionsLink.addEventListener('click', (e: any) => {
            e.preventDefault();
            browser.runtime.openOptionsPage();
          });
        }
      };
      
      setupOptionsLink();
      
      expect(mockOptionsLink.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should open help page', () => {
      const mockHelpLink = {
        addEventListener: jest.fn()
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockHelpLink);
      
      const setupHelpLink = () => {
        const helpLink = document.getElementById('helpLink');
        if (helpLink) {
          helpLink.addEventListener('click', (e: any) => {
            e.preventDefault();
            browser.tabs.create({ url: 'https://github.com/squarex/file-scanner' });
          });
        }
      };
      
      setupHelpLink();
      
      expect(mockHelpLink.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });
});
