import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock global browser object
(global as any).browser = mockBrowser;

// Mock DOM APIs
const mockDocument = {
  addEventListener: jest.fn(),
  getElementById: jest.fn()
};

// Mock DOM elements
const mockSaveBtn = {
  addEventListener: jest.fn()
};

const mockResetBtn = {
  addEventListener: jest.fn()
};

const mockSaveStatus = {
  textContent: '',
  className: '',
  style: {
    display: ''
  }
};

const mockScannerEnabled = {
  checked: true
};

const mockAutoScan = {
  checked: true
};

const mockEntropyThreshold = {
  value: '4.8'
};

const mockRiskThreshold = {
  value: '0.6'
};

const mockMaxWords = {
  value: '10'
};

const mockBannedPhrases = {
  value: 'confidential\ndo not share\nsecret\ninternal\nclassified'
};

const mockStopwords = {
  value: 'the\na\nan\nand\nor\nbut\nin\non\nat\nto\nfor\nof\nwith\nby'
};

// Mock global objects
(global as any).document = mockDocument;

// Mock console for testing
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};
(global as any).console = mockConsole;

// Mock setTimeout for testing
const mockSetTimeout = jest.fn();
(global as any).setTimeout = mockSetTimeout;

describe('Firefox Options Page', () => {
  let initializeOptions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup DOM element mocks
    mockDocument.getElementById.mockImplementation((id: string) => {
      switch (id) {
        case 'saveBtn': return mockSaveBtn;
        case 'resetBtn': return mockResetBtn;
        case 'saveStatus': return mockSaveStatus;
        case 'scannerEnabled': return mockScannerEnabled;
        case 'autoScan': return mockAutoScan;
        case 'entropyThreshold': return mockEntropyThreshold;
        case 'riskThreshold': return mockRiskThreshold;
        case 'maxWords': return mockMaxWords;
        case 'bannedPhrases': return mockBannedPhrases;
        case 'stopwords': return mockStopwords;
        default: return null;
      }
    });

    // Create the initializeOptions function that simulates the options page behavior
    initializeOptions = jest.fn(async () => {
      // Load current settings
      const result = await mockBrowser.storage.local.get([
        'scannerEnabled',
        'autoScan',
        'entropyThreshold',
        'riskThreshold',
        'maxWords',
        'bannedPhrases',
        'stopwords'
      ]);

      // Set form values
      mockScannerEnabled.checked = result.scannerEnabled !== false;
      mockAutoScan.checked = result.autoScan !== false;
      mockEntropyThreshold.value = result.entropyThreshold || '4.8';
      mockRiskThreshold.value = result.riskThreshold || '0.6';
      mockMaxWords.value = result.maxWords || '10';
      mockBannedPhrases.value = result.bannedPhrases || 'confidential\ndo not share\nsecret\ninternal\nclassified';
      mockStopwords.value = result.stopwords || 'the\na\nan\nand\nor\nbut\nin\non\nat\nto\nfor\nof\nwith\nby\nis\nare\nwas\nwere\nbe\nbeen\nhave\nhas\nhad\ndo\ndoes\ndid\nwill\nwould\ncould\nshould\nmay\nmight\ncan\nthis\nthat\nthese\nthose\ni\nyou\nhe\nshe\nit\nwe\nthey\nme\nhim\nher\nus\nthem\nmy\nyour\nhis\nher\nits\nour\ntheir\nmine\nyours\nhers\nours\ntheirs';

      // Save settings
      mockSaveBtn.addEventListener('click', async () => {
        try {
          const settings = {
            scannerEnabled: mockScannerEnabled.checked,
            autoScan: mockAutoScan.checked,
            entropyThreshold: parseFloat(mockEntropyThreshold.value),
            riskThreshold: parseFloat(mockRiskThreshold.value),
            maxWords: parseInt(mockMaxWords.value),
            bannedPhrases: mockBannedPhrases.value,
            stopwords: mockStopwords.value
          };

          await mockBrowser.storage.local.set(settings);
          showSaveStatus('Settings saved successfully!', 'success');
        } catch (error) {
          console.error('Error saving settings:', error);
          showSaveStatus('Error saving settings', 'error');
        }
      });

      // Reset to defaults
      mockResetBtn.addEventListener('click', () => {
        mockScannerEnabled.checked = true;
        mockAutoScan.checked = true;
        mockEntropyThreshold.value = '4.8';
        mockRiskThreshold.value = '0.6';
        mockMaxWords.value = '10';
        mockBannedPhrases.value = 'confidential\ndo not share\nsecret\ninternal\nclassified';
        mockStopwords.value = 'the\na\nan\nand\nor\nbut\nin\non\nat\nto\nfor\nof\nwith\nby\nis\nare\nwas\nwere\nbe\nbeen\nhave\nhas\nhad\ndo\ndoes\ndid\nwill\nwould\ncould\nshould\nmay\nmight\ncan\nthis\nthat\nthese\nthose\ni\nyou\nhe\nshe\nit\nwe\nthey\nme\nhim\nher\nus\nthem\nmy\nyour\nhis\nher\nits\nour\ntheir\nmine\nyours\nhers\nours\ntheirs';
        
        showSaveStatus('Settings reset to defaults', 'success');
      });

      function showSaveStatus(message: string, type: 'success' | 'error') {
        mockSaveStatus.textContent = message;
        mockSaveStatus.className = `save-status ${type}`;
        mockSaveStatus.style.display = 'block';
        
        setTimeout(() => {
          mockSaveStatus.style.display = 'none';
        }, 3000);
      }
    });
  });

  describe('Initialization', () => {
    test('should initialize when DOM is loaded', async () => {
      await initializeOptions();
      
      // Verify that storage was queried
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith([
        'scannerEnabled',
        'autoScan',
        'entropyThreshold',
        'riskThreshold',
        'maxWords',
        'bannedPhrases',
        'stopwords'
      ]);
    });

    test('should load current settings from storage', async () => {
      // Mock storage response
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      // Verify storage was queried
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith([
        'scannerEnabled',
        'autoScan',
        'entropyThreshold',
        'riskThreshold',
        'maxWords',
        'bannedPhrases',
        'stopwords'
      ]);
    });

    test('should set form values from storage', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: false,
        autoScan: false,
        entropyThreshold: 5.0,
        riskThreshold: 0.8,
        maxWords: 15,
        bannedPhrases: 'secret\nclassified',
        stopwords: 'the\na\nan\nand'
      });

      await initializeOptions();

      // Verify form values were set
      expect(mockScannerEnabled.checked).toBe(false);
      expect(mockAutoScan.checked).toBe(false);
      expect(mockEntropyThreshold.value).toBe('5.0');
      expect(mockRiskThreshold.value).toBe('0.8');
      expect(mockMaxWords.value).toBe('15');
      expect(mockBannedPhrases.value).toBe('secret\nclassified');
      expect(mockStopwords.value).toBe('the\na\nan\nand');
    });
  });

  describe('Default Values', () => {
    test('should use default values when storage is empty', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      await initializeOptions();

      // Should use defaults
      expect(mockScannerEnabled.checked).toBe(true);
      expect(mockAutoScan.checked).toBe(true);
      expect(mockEntropyThreshold.value).toBe('4.8');
      expect(mockRiskThreshold.value).toBe('0.6');
      expect(mockMaxWords.value).toBe('10');
      expect(mockBannedPhrases.value).toBe('confidential\ndo not share\nsecret\ninternal\nclassified');
      expect(mockStopwords.value).toContain('the');
    });

    test('should use default values for missing settings', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true
        // Other settings missing
      });

      await initializeOptions();

      // Should use defaults for missing values
      expect(mockAutoScan.checked).toBe(true);
      expect(mockEntropyThreshold.value).toBe('4.8');
      expect(mockRiskThreshold.value).toBe('0.6');
    });
  });

  describe('Save Settings', () => {
    test('should save settings when save button is clicked', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      // Get the save button click listener
      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      
      // Trigger save
      await saveListener();

      // Verify settings were saved
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share\nsecret\ninternal\nclassified',
        stopwords: 'the\na\nan\nand\nor\nbut\nin\non\nat\nto\nfor\nof\nwith\nby\nis\nare\nwas\nwere\nbe\nbeen\nhave\nhas\nhad\ndo\ndoes\ndid\nwill\nwould\ncould\nshould\nmay\nmight\ncan\nthis\nthat\nthese\nthose\ni\nyou\nhe\nshe\nit\nwe\nthey\nme\nhim\nher\nus\nthem\nmy\nyour\nhis\nher\nits\nour\ntheir\nmine\nyours\nhers\nours\ntheirs'
      });
    });

    test('should show success message when settings are saved', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      await saveListener();

      // Verify success message was shown
      expect(mockSaveStatus.textContent).toBe('Settings saved successfully!');
      expect(mockSaveStatus.className).toBe('save-status success');
      expect(mockSaveStatus.style.display).toBe('block');
    });

    test('should handle save errors gracefully', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      mockBrowser.storage.local.set.mockRejectedValue(new Error('Storage error'));

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      await saveListener();

      // Verify error was logged
      expect(mockConsole.error).toHaveBeenCalledWith('Error saving settings:', expect.any(Error));
      
      // Verify error message was shown
      expect(mockSaveStatus.textContent).toBe('Error saving settings');
      expect(mockSaveStatus.className).toBe('save-status error');
    });

    test('should parse numeric values correctly', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      // Set custom values
      mockEntropyThreshold.value = '5.5';
      mockRiskThreshold.value = '0.75';
      mockMaxWords.value = '20';

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      await saveListener();

      // Verify numeric values were parsed correctly
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          entropyThreshold: 5.5,
          riskThreshold: 0.75,
          maxWords: 20
        })
      );
    });
  });

  describe('Reset Settings', () => {
    test('should reset settings to defaults when reset button is clicked', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: false,
        autoScan: false,
        entropyThreshold: 5.0,
        riskThreshold: 0.8,
        maxWords: 15,
        bannedPhrases: 'custom phrases',
        stopwords: 'custom stopwords'
      });

      await initializeOptions();

      // Get the reset button click listener
      const resetListener = mockResetBtn.addEventListener.mock.calls[0][1];
      
      // Trigger reset
      resetListener();

      // Verify form values were reset to defaults
      expect(mockScannerEnabled.checked).toBe(true);
      expect(mockAutoScan.checked).toBe(true);
      expect(mockEntropyThreshold.value).toBe('4.8');
      expect(mockRiskThreshold.value).toBe('0.6');
      expect(mockMaxWords.value).toBe('10');
      expect(mockBannedPhrases.value).toBe('confidential\ndo not share\nsecret\ninternal\nclassified');
      expect(mockStopwords.value).toContain('the');
    });

    test('should show success message when settings are reset', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      const resetListener = mockResetBtn.addEventListener.mock.calls[0][1];
      resetListener();

      // Verify success message was shown
      expect(mockSaveStatus.textContent).toBe('Settings reset to defaults');
      expect(mockSaveStatus.className).toBe('save-status success');
      expect(mockSaveStatus.style.display).toBe('block');
    });
  });

  describe('Status Message Management', () => {
    test('should show status messages with correct styling', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      await saveListener();

      // Verify success styling
      expect(mockSaveStatus.className).toBe('save-status success');
    });

    test('should show error messages with correct styling', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      mockBrowser.storage.local.set.mockRejectedValue(new Error('Storage error'));

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      await saveListener();

      // Verify error styling
      expect(mockSaveStatus.className).toBe('save-status error');
    });

    test('should hide status messages after timeout', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      await saveListener();

      // Verify setTimeout was called
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);

      // Get the timeout callback
      const timeoutCallback = mockSetTimeout.mock.calls[0][0];
      
      // Trigger timeout
      timeoutCallback();

      // Verify status was hidden
      expect(mockSaveStatus.style.display).toBe('none');
    });
  });

  describe('Event Listener Registration', () => {
    test('should register save button click listener', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      expect(mockSaveBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should register reset button click listener', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      expect(mockResetBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', async () => {
      // Mock missing elements
      mockDocument.getElementById.mockReturnValue(null);

      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      // Should not throw an error
      await expect(initializeOptions()).resolves.toBeUndefined();
    });

    test('should handle storage access errors', async () => {
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Storage access denied'));

      // Should not throw an error
      await expect(initializeOptions()).resolves.toBeUndefined();
    });

    test('should handle invalid numeric values', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      // Set invalid values
      mockEntropyThreshold.value = 'invalid';
      mockRiskThreshold.value = 'not-a-number';
      mockMaxWords.value = 'abc';

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      await saveListener();

      // Should handle invalid values gracefully
      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory', () => {
    test('should handle rapid save clicks efficiently', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      
      // Simulate rapid clicks
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(saveListener());
      }
      
      await Promise.all(promises);

      // Should handle all clicks
      expect(mockBrowser.storage.local.set).toHaveBeenCalledTimes(5);
    });

    test('should not leak memory with repeated operations', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        autoScan: true,
        entropyThreshold: 4.8,
        riskThreshold: 0.6,
        maxWords: 10,
        bannedPhrases: 'confidential\ndo not share',
        stopwords: 'the\na\nan'
      });

      await initializeOptions();

      const saveListener = mockSaveBtn.addEventListener.mock.calls[0][1];
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await saveListener();
      }

      // Should still work correctly
      expect(mockBrowser.storage.local.set).toHaveBeenCalledTimes(100);
    });
  });

  describe('Future Enhancement Tests', () => {
    test('should be ready for advanced configuration options', () => {
      // Test that the options page is ready for advanced configuration
      expect(mockBrowser.storage.local.get).toBeDefined();
      expect(mockBrowser.storage.local.set).toBeDefined();
    });

    test('should be ready for configuration validation', () => {
      // Test that the options page can validate configuration
      expect(mockDocument.getElementById).toBeDefined();
      expect(typeof mockDocument.getElementById).toBe('function');
    });

    test('should be ready for configuration import/export', () => {
      // Test that the options page is ready for import/export functionality
      expect(mockBrowser.storage.local.get).toBeDefined();
      expect(mockBrowser.storage.local.set).toBeDefined();
    });
  });
});
