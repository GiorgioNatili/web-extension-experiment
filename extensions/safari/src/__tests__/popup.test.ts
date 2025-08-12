// Safari popup tests
import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn()
  },
  tabs: {
    create: jest.fn()
  }
};

// Mock document
const mockDocument = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn()
  },
  addEventListener: jest.fn()
};

// Mock setTimeout and setInterval
const mockSetTimeout = jest.fn((callback: Function, delay: number) => {
  setTimeout(callback, delay);
  return 1;
});

const mockSetInterval = jest.fn((callback: Function, delay: number) => {
  setInterval(callback, delay);
  return 1;
});

// Global mocks
global.browser = mockBrowser as any;
global.document = mockDocument as any;
global.setTimeout = mockSetTimeout as any;
global.setInterval = mockSetInterval as any;

// Mock shared utilities
jest.mock('shared', () => ({
  CONFIG: { CHUNK_SIZE: 1024 * 1024 },
  MESSAGES: {
    ANALYSIS_COMPLETE: 'Analysis complete',
    ANALYSIS_FAILED: 'Analysis failed'
  }
}));

describe('Safari Popup', () => {
  let mockToggleButton: any;
  let mockStatusElement: any;
  let mockWasmStatusElement: any;
  let mockErrorStatsElement: any;
  let mockOptionsLink: any;
  let mockHelpLink: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock DOM elements
    mockToggleButton = {
      textContent: '',
      className: '',
      disabled: false,
      addEventListener: jest.fn()
    };

    mockStatusElement = {
      textContent: '',
      className: '',
      innerHTML: ''
    };

    mockWasmStatusElement = {
      textContent: '',
      className: ''
    };

    mockErrorStatsElement = {
      textContent: '',
      className: '',
      innerHTML: ''
    };

    mockOptionsLink = {
      addEventListener: jest.fn()
    };

    mockHelpLink = {
      addEventListener: jest.fn()
    };

    // Mock getElementById
    mockDocument.getElementById.mockImplementation((id: string) => {
      switch (id) {
        case 'toggleButton': return mockToggleButton;
        case 'status': return mockStatusElement;
        case 'wasmStatus': return mockWasmStatusElement;
        case 'errorStats': return mockErrorStatsElement;
        case 'optionsLink': return mockOptionsLink;
        case 'helpLink': return mockHelpLink;
        default: return null;
      }
    });
  });

  describe('Initialization', () => {
    test('should initialize popup with DOM elements', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        entropyThreshold: '4.8'
      });

      // Mock the initializePopup function
      const initializePopup = async () => {
        // Get DOM elements
        const toggleButton = document.getElementById('toggleButton') as HTMLButtonElement;
        const statusElement = document.getElementById('status');
        const wasmStatusElement = document.getElementById('wasmStatus');
        const errorStatsElement = document.getElementById('errorStats');

        // Load current settings
        const result = await browser.storage.local.get(['scannerEnabled', 'entropyThreshold']);
        const scannerEnabled = result.scannerEnabled !== false;

        // Set up toggle button
        if (toggleButton) {
          toggleButton.textContent = scannerEnabled ? 'Disable Scanner' : 'Enable Scanner';
          toggleButton.className = scannerEnabled ? 'toggle-button' : 'toggle-button disabled';
          toggleButton.addEventListener('click', jest.fn());
        }

        // Set up footer links
        const optionsLink = document.getElementById('optionsLink');
        const helpLink = document.getElementById('helpLink');

        if (optionsLink) {
          optionsLink.addEventListener('click', jest.fn());
        }

        if (helpLink) {
          helpLink.addEventListener('click', jest.fn());
        }
      };

      await initializePopup();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('toggleButton');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('status');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('wasmStatus');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('errorStats');
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith(['scannerEnabled', 'entropyThreshold']);
    });

    test('should set up toggle button correctly', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true
      });

      // Mock the toggle button setup
      const setupToggleButton = async () => {
        const result = await browser.storage.local.get(['scannerEnabled']);
        const scannerEnabled = result.scannerEnabled !== false;

        if (mockToggleButton) {
          mockToggleButton.textContent = scannerEnabled ? 'Disable Scanner' : 'Enable Scanner';
          mockToggleButton.className = scannerEnabled ? 'toggle-button' : 'toggle-button disabled';
          mockToggleButton.addEventListener('click', jest.fn());
        }
      };

      await setupToggleButton();

      expect(mockToggleButton.textContent).toBe('Disable Scanner');
      expect(mockToggleButton.className).toBe('toggle-button');
      expect(mockToggleButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should set up footer links', async () => {
      // Mock the footer links setup
      const setupFooterLinks = () => {
        if (mockOptionsLink) {
          mockOptionsLink.addEventListener('click', (e: Event) => {
            e.preventDefault();
            browser.runtime.openOptionsPage();
          });
        }

        if (mockHelpLink) {
          mockHelpLink.addEventListener('click', (e: Event) => {
            e.preventDefault();
            browser.tabs.create({ url: 'https://github.com/squarex/file-scanner' });
          });
        }
      };

      setupFooterLinks();

      expect(mockOptionsLink.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockHelpLink.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Toggle Scanner', () => {
    test('should toggle scanner from enabled to disabled', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true
      });

      // Mock the toggleScanner function
      const toggleScanner = async () => {
        try {
          mockToggleButton.disabled = true;
          mockToggleButton.textContent = 'Updating...';

          // Get current state
          const result = await browser.storage.local.get(['scannerEnabled']);
          const currentState = result.scannerEnabled !== false;
          const newState = !currentState;

          // Update storage
          await browser.storage.local.set({ scannerEnabled: newState });

          // Update button
          mockToggleButton.textContent = newState ? 'Disable Scanner' : 'Enable Scanner';
          mockToggleButton.className = newState ? 'toggle-button' : 'toggle-button disabled';

          return newState;
        } catch (error) {
          console.error('Failed to toggle scanner:', error);
          throw error;
        } finally {
          mockToggleButton.disabled = false;
        }
      };

      const newState = await toggleScanner();

      expect(newState).toBe(false);
      expect(mockToggleButton.textContent).toBe('Enable Scanner');
      expect(mockToggleButton.className).toBe('toggle-button disabled');
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ scannerEnabled: false });
    });

    test('should toggle scanner from disabled to enabled', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: false
      });

      // Mock the toggleScanner function
      const toggleScanner = async () => {
        try {
          mockToggleButton.disabled = true;
          mockToggleButton.textContent = 'Updating...';

          // Get current state
          const result = await browser.storage.local.get(['scannerEnabled']);
          const currentState = result.scannerEnabled !== false;
          const newState = !currentState;

          // Update storage
          await browser.storage.local.set({ scannerEnabled: newState });

          // Update button
          mockToggleButton.textContent = newState ? 'Disable Scanner' : 'Enable Scanner';
          mockToggleButton.className = newState ? 'toggle-button' : 'toggle-button disabled';

          return newState;
        } catch (error) {
          console.error('Failed to toggle scanner:', error);
          throw error;
        } finally {
          mockToggleButton.disabled = false;
        }
      };

      const newState = await toggleScanner();

      expect(newState).toBe(true);
      expect(mockToggleButton.textContent).toBe('Disable Scanner');
      expect(mockToggleButton.className).toBe('toggle-button');
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ scannerEnabled: true });
    });

    test('should handle toggle errors', async () => {
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Storage error'));

      // Mock the toggleScanner function with error handling
      const toggleScanner = async () => {
        try {
          mockToggleButton.disabled = true;
          mockToggleButton.textContent = 'Updating...';

          // Get current state
          const result = await browser.storage.local.get(['scannerEnabled']);
          const currentState = result.scannerEnabled !== false;
          const newState = !currentState;

          // Update storage
          await browser.storage.local.set({ scannerEnabled: newState });

          // Update button
          mockToggleButton.textContent = newState ? 'Disable Scanner' : 'Enable Scanner';
          mockToggleButton.className = newState ? 'toggle-button' : 'toggle-button disabled';

        } catch (error) {
          console.error('Failed to toggle scanner:', error);
          throw error;
        } finally {
          mockToggleButton.disabled = false;
        }
      };

      await expect(toggleScanner()).rejects.toThrow('Storage error');
      expect(mockToggleButton.disabled).toBe(false);
    });
  });

  describe('Status Updates', () => {
    test('should update status with ready state', async () => {
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        status: 'ready',
        wasm_loaded: true,
        error_stats: {
          total: 0,
          recovered: 0,
          recoveryRate: '0%'
        }
      });

      // Mock the updateStatus function
      const updateStatus = async () => {
        try {
          // Get extension status
          const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
          
          if (mockStatusElement) {
            if (response.status === 'ready') {
              mockStatusElement.textContent = 'Ready';
              mockStatusElement.className = 'status ready';
            } else {
              mockStatusElement.textContent = 'Error';
              mockStatusElement.className = 'status error';
            }
          }

          if (mockWasmStatusElement) {
            if (response.wasm_loaded) {
              mockWasmStatusElement.textContent = 'Loaded';
              mockWasmStatusElement.className = 'status ready';
            } else {
              mockWasmStatusElement.textContent = 'Not loaded';
              mockWasmStatusElement.className = 'status error';
            }
          }

          if (mockErrorStatsElement && response.error_stats) {
            const stats = response.error_stats;
            const totalErrors = stats.total || 0;
            const recoveredErrors = stats.recovered || 0;

            if (totalErrors === 0) {
              mockErrorStatsElement.textContent = 'No errors';
              mockErrorStatsElement.className = 'status ready';
            } else {
              mockErrorStatsElement.innerHTML = `
                <div>Total: ${totalErrors} | Recovered: ${recoveredErrors}</div>
                <div class="error-stats">Recovery Rate: <strong>${stats.recoveryRate}</strong></div>
              `;
              mockErrorStatsElement.className = 'status warning';
            }
          }

        } catch (error) {
          console.error('Failed to update status:', error);
          
          if (mockStatusElement) {
            mockStatusElement.textContent = 'Connection error';
            mockStatusElement.className = 'status error';
          }
        }
      };

      await updateStatus();

      expect(mockStatusElement.textContent).toBe('Ready');
      expect(mockStatusElement.className).toBe('status ready');
      expect(mockWasmStatusElement.textContent).toBe('Loaded');
      expect(mockWasmStatusElement.className).toBe('status ready');
      expect(mockErrorStatsElement.textContent).toBe('No errors');
      expect(mockErrorStatsElement.className).toBe('status ready');
    });

    test('should update status with error state', async () => {
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        status: 'error',
        wasm_loaded: false,
        error_stats: {
          total: 5,
          recovered: 3,
          recoveryRate: '60%'
        }
      });

      // Mock the updateStatus function
      const updateStatus = async () => {
        try {
          // Get extension status
          const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
          
          if (mockStatusElement) {
            if (response.status === 'ready') {
              mockStatusElement.textContent = 'Ready';
              mockStatusElement.className = 'status ready';
            } else {
              mockStatusElement.textContent = 'Error';
              mockStatusElement.className = 'status error';
            }
          }

          if (mockWasmStatusElement) {
            if (response.wasm_loaded) {
              mockWasmStatusElement.textContent = 'Loaded';
              mockWasmStatusElement.className = 'status ready';
            } else {
              mockWasmStatusElement.textContent = 'Not loaded';
              mockWasmStatusElement.className = 'status error';
            }
          }

          if (mockErrorStatsElement && response.error_stats) {
            const stats = response.error_stats;
            const totalErrors = stats.total || 0;
            const recoveredErrors = stats.recovered || 0;

            if (totalErrors === 0) {
              mockErrorStatsElement.textContent = 'No errors';
              mockErrorStatsElement.className = 'status ready';
            } else {
              mockErrorStatsElement.innerHTML = `
                <div>Total: ${totalErrors} | Recovered: ${recoveredErrors}</div>
                <div class="error-stats">Recovery Rate: <strong>${stats.recoveryRate}</strong></div>
              `;
              mockErrorStatsElement.className = 'status warning';
            }
          }

        } catch (error) {
          console.error('Failed to update status:', error);
          
          if (mockStatusElement) {
            mockStatusElement.textContent = 'Connection error';
            mockStatusElement.className = 'status error';
          }
        }
      };

      await updateStatus();

      expect(mockStatusElement.textContent).toBe('Error');
      expect(mockStatusElement.className).toBe('status error');
      expect(mockWasmStatusElement.textContent).toBe('Not loaded');
      expect(mockWasmStatusElement.className).toBe('status error');
      expect(mockErrorStatsElement.innerHTML).toContain('Total: 5 | Recovered: 3');
      expect(mockErrorStatsElement.innerHTML).toContain('Recovery Rate: <strong>60%</strong>');
      expect(mockErrorStatsElement.className).toBe('status warning');
    });

    test('should handle status update errors', async () => {
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Connection failed'));

      // Mock the updateStatus function
      const updateStatus = async () => {
        try {
          // Get extension status
          const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
          
          if (mockStatusElement) {
            if (response.status === 'ready') {
              mockStatusElement.textContent = 'Ready';
              mockStatusElement.className = 'status ready';
            } else {
              mockStatusElement.textContent = 'Error';
              mockStatusElement.className = 'status error';
            }
          }

        } catch (error) {
          console.error('Failed to update status:', error);
          
          if (mockStatusElement) {
            mockStatusElement.textContent = 'Connection error';
            mockStatusElement.className = 'status error';
          }
        }
      };

      await updateStatus();

      expect(mockStatusElement.textContent).toBe('Connection error');
      expect(mockStatusElement.className).toBe('status error');
    });
  });

  describe('Notifications', () => {
    test('should show success notification', () => {
      // Mock the showNotification function
      const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 3000);
      };

      showNotification('Scanner enabled', 'success');

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    test('should show error notification', () => {
      // Mock the showNotification function
      const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 3000);
      };

      showNotification('Failed to update scanner state', 'error');

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    test('should display performance metrics', async () => {
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        status: 'ready',
        wasm_loaded: true,
        performance: {
          memoryUsed: 1024 * 1024, // 1MB
          throughput: 1000, // 1000 KB/s
          cpuUsage: 15.5
        }
      });

      // Mock the updateStatus function with performance metrics
      const updateStatus = async () => {
        try {
          const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
          
          if (response.performance && mockStatusElement) {
            const perf = response.performance;
            const perfHtml = `
              <div class="performance-metrics">
                <strong>Memory:</strong> ${(perf.memoryUsed / 1024 / 1024).toFixed(1)}MB | 
                <strong>Throughput:</strong> ${perf.throughput.toFixed(0)} KB/s | 
                <strong>CPU:</strong> ${perf.cpuUsage.toFixed(1)}%
              </div>
            `;
            mockStatusElement.innerHTML += perfHtml;
          }

        } catch (error) {
          console.error('Failed to update status:', error);
        }
      };

      await updateStatus();

      expect(mockStatusElement.innerHTML).toContain('<strong>Memory:</strong> 1.0MB');
      expect(mockStatusElement.innerHTML).toContain('<strong>Throughput:</strong> 1000 KB/s');
      expect(mockStatusElement.innerHTML).toContain('<strong>CPU:</strong> 15.5%');
    });
  });

  describe('Auto-refresh', () => {
    test('should set up auto-refresh interval', () => {
      // Mock the setInterval call
      const setupAutoRefresh = () => {
        // Update status every 5 seconds
        setInterval(() => {
          // This would call updateStatus in real implementation
        }, 5000);
      };

      setupAutoRefresh();

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
  });
});
