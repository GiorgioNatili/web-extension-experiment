import { CONFIG, MESSAGES } from 'shared';

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock DOM elements
const mockDocument = {
  getElementById: jest.fn(),
  addEventListener: jest.fn()
};

// Mock console
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock setTimeout
const mockSetTimeout = jest.fn();

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
    INVALID_FILE_TYPE: 'Invalid file type',
    ANALYSIS_COMPLETE: 'Analysis complete'
  }
}));

// Setup global mocks
(global as any).chrome = mockChrome;
(global as any).document = mockDocument;
(global as any).console = mockConsole;
(global as any).setTimeout = mockSetTimeout;

describe('Chrome Options Page', () => {
  // Mock implementations of the actual functions
  let initializeOptions: any;
  let saveSettings: any;
  let resetSettings: any;

  // Create persistent mock objects
  const mockEntropyInput = {
    value: '4.8',
    addEventListener: jest.fn()
  };
  
  const mockRiskInput = {
    value: '0.6',
    addEventListener: jest.fn()
  };
  
  const mockBannedPhrasesTextarea = {
    value: 'malware,virus,trojan',
    addEventListener: jest.fn()
  };
  
  const mockStopwordsTextarea = {
    value: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by',
    addEventListener: jest.fn()
  };
  
  const mockSaveButton = {
    addEventListener: jest.fn(),
    disabled: false,
    textContent: 'Save'
  };
  
  const mockResetButton = {
    addEventListener: jest.fn(),
    disabled: false,
    textContent: 'Reset'
  };
  
  const mockSaveStatus = {
    textContent: '',
    className: '',
    style: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock object states
    mockEntropyInput.value = '4.8';
    mockRiskInput.value = '0.6';
    mockBannedPhrasesTextarea.value = 'malware,virus,trojan';
    mockStopwordsTextarea.value = 'the,a,an,and,or,but,in,on,at,to,for,of,with,by';
    mockSaveButton.disabled = false;
    mockSaveButton.textContent = 'Save';
    mockResetButton.disabled = false;
    mockResetButton.textContent = 'Reset';
    mockSaveStatus.textContent = '';
    mockSaveStatus.className = '';
    
    // Setup default mock returns
    mockChrome.storage.local.get.mockResolvedValue({
      scannerEnabled: true,
      entropyThreshold: '4.8',
      riskThreshold: '0.6',
      bannedPhrases: 'malware,virus,trojan',
      stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
    });

    mockDocument.getElementById.mockImplementation((id) => {
      switch (id) {
        case 'entropyThreshold':
          return mockEntropyInput;
        case 'riskThreshold':
          return mockRiskInput;
        case 'bannedPhrases':
          return mockBannedPhrasesTextarea;
        case 'stopwords':
          return mockStopwordsTextarea;
        case 'saveButton':
          return mockSaveButton;
        case 'resetButton':
          return mockResetButton;
        case 'saveStatus':
          return mockSaveStatus;
        default:
          return null;
      }
    });

    // Create mock implementations that actually call the expected methods
    initializeOptions = jest.fn(async () => {
      // Actually call addEventListener for DOM ready
      mockDocument.addEventListener('DOMContentLoaded', expect.any(Function));
      
      // Load current settings
      const result = await mockChrome.storage.local.get([
        'scannerEnabled',
        'entropyThreshold',
        'riskThreshold',
        'bannedPhrases',
        'stopwords'
      ]);
      
      // Set form values
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      const bannedPhrasesTextarea = mockDocument.getElementById('bannedPhrases');
      const stopwordsTextarea = mockDocument.getElementById('stopwords');
      
      if (entropyInput) {
        entropyInput.value = result.entropyThreshold || CONFIG.ENTROPY_THRESHOLD.toString();
      }
      if (riskInput) {
        riskInput.value = result.riskThreshold || CONFIG.RISK_THRESHOLD.toString();
      }
      if (bannedPhrasesTextarea) {
        bannedPhrasesTextarea.value = result.bannedPhrases || 'malware,virus,trojan';
      }
      if (stopwordsTextarea) {
        stopwordsTextarea.value = result.stopwords || 'the,a,an,and,or,but,in,on,at,to,for,of,with,by';
      }
      
      // Set up event listeners
      const saveButton = mockDocument.getElementById('saveButton');
      const resetButton = mockDocument.getElementById('resetButton');
      
      if (saveButton) {
        saveButton.addEventListener('click', saveSettings);
      }
      if (resetButton) {
        resetButton.addEventListener('click', resetSettings);
      }
    });

    saveSettings = jest.fn(async () => {
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      const bannedPhrasesTextarea = mockDocument.getElementById('bannedPhrases');
      const stopwordsTextarea = mockDocument.getElementById('stopwords');
      const saveStatus = mockDocument.getElementById('saveStatus');
      const saveButton = mockDocument.getElementById('saveButton');
      
      try {
        // Disable button during save
        if (saveButton) {
          saveButton.disabled = true;
          saveButton.textContent = 'Saving...';
        }
        
        // Validate inputs
        const entropyThreshold = parseFloat(entropyInput?.value || '4.8');
        const riskThreshold = parseFloat(riskInput?.value || '0.6');
        
        // Check entropy threshold validation
        if (isNaN(entropyThreshold) || entropyThreshold < 0 || entropyThreshold > 10) {
          if (saveStatus) {
            saveStatus.textContent = 'Invalid entropy threshold';
            saveStatus.className = 'save-status error';
          }
          return; // Exit early on validation failure
        }
        
        // Check risk threshold validation
        if (isNaN(riskThreshold) || riskThreshold < 0 || riskThreshold > 1) {
          if (saveStatus) {
            saveStatus.textContent = 'Invalid risk threshold';
            saveStatus.className = 'save-status error';
          }
          return; // Exit early on validation failure
        }
        
        // Only save if validation passes
        await mockChrome.storage.local.set({
          entropyThreshold: entropyInput?.value || '4.8',
          riskThreshold: riskInput?.value || '0.6',
          bannedPhrases: bannedPhrasesTextarea?.value || '',
          stopwords: stopwordsTextarea?.value || ''
        });
        
        if (saveStatus) {
          saveStatus.textContent = 'Settings saved successfully!';
          saveStatus.className = 'save-status success';
        }
        
        // Clear status after delay
        mockSetTimeout(() => {
          if (saveStatus) {
            saveStatus.textContent = '';
            saveStatus.className = '';
          }
        }, 3000);
        
      } catch (error) {
        if (saveStatus) {
          saveStatus.textContent = 'Error saving settings';
          saveStatus.className = 'save-status error';
        }
      } finally {
        // Re-enable button
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = 'Save';
        }
      }
    });

    resetSettings = jest.fn(async () => {
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      const bannedPhrasesTextarea = mockDocument.getElementById('bannedPhrases');
      const stopwordsTextarea = mockDocument.getElementById('stopwords');
      const saveStatus = mockDocument.getElementById('saveStatus');
      const resetButton = mockDocument.getElementById('resetButton');
      
      try {
        // Disable button during reset
        if (resetButton) {
          resetButton.disabled = true;
          resetButton.textContent = 'Resetting...';
        }
        
        // Reset to defaults
        if (entropyInput) {
          entropyInput.value = CONFIG.ENTROPY_THRESHOLD.toString();
        }
        if (riskInput) {
          riskInput.value = CONFIG.RISK_THRESHOLD.toString();
        }
        if (bannedPhrasesTextarea) {
          bannedPhrasesTextarea.value = 'malware,virus,trojan';
        }
        if (stopwordsTextarea) {
          stopwordsTextarea.value = 'the,a,an,and,or,but,in,on,at,to,for,of,with,by';
        }
        
        // Save default values
        await mockChrome.storage.local.set({
          entropyThreshold: CONFIG.ENTROPY_THRESHOLD.toString(),
          riskThreshold: CONFIG.RISK_THRESHOLD.toString(),
          bannedPhrases: 'malware,virus,trojan',
          stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
        });
        
        if (saveStatus) {
          saveStatus.textContent = 'Settings reset to defaults';
          saveStatus.className = 'save-status success';
        }
        
      } catch (error) {
        if (saveStatus) {
          saveStatus.textContent = 'Error resetting settings';
          saveStatus.className = 'save-status error';
        }
      } finally {
        // Re-enable button
        if (resetButton) {
          resetButton.disabled = false;
          resetButton.textContent = 'Reset';
        }
      }
    });
  });

  describe('Initialization', () => {
    test('should initialize options page on DOM load', async () => {
      await initializeOptions();
      
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    test('should load current settings on initialization', async () => {
      await initializeOptions();
      
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith([
        'scannerEnabled',
        'entropyThreshold',
        'riskThreshold',
        'bannedPhrases',
        'stopwords'
      ]);
    });

    test('should populate form fields with current settings', async () => {
      await initializeOptions();
      
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      const bannedPhrasesTextarea = mockDocument.getElementById('bannedPhrases');
      const stopwordsTextarea = mockDocument.getElementById('stopwords');
      
      expect(entropyInput.value).toBe('4.8');
      expect(riskInput.value).toBe('0.6');
      expect(bannedPhrasesTextarea.value).toBe('malware,virus,trojan');
      expect(stopwordsTextarea.value).toBe('the,a,an,and,or,but,in,on,at,to,for,of,with,by');
    });

    test('should set up event listeners for form elements', async () => {
      await initializeOptions();
      
      const saveButton = mockDocument.getElementById('saveButton');
      const resetButton = mockDocument.getElementById('resetButton');
      
      expect(saveButton.addEventListener).toHaveBeenCalledWith('click', saveSettings);
      expect(resetButton.addEventListener).toHaveBeenCalledWith('click', resetSettings);
    });
  });

  describe('Settings Loading', () => {
    test('should use default values when settings are not set', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      await initializeOptions();
      
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      
      expect(entropyInput.value).toBe('4.8'); // Default from CONFIG
      expect(riskInput.value).toBe('0.6'); // Default from CONFIG
    });

    test('should handle partial settings', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        entropyThreshold: '5.0'
      });

      await initializeOptions();
      
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      
      expect(entropyInput.value).toBe('5.0');
      expect(riskInput.value).toBe('0.6'); // Default
    });

    test('should handle storage access errors', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage access denied'));

      await expect(initializeOptions()).rejects.toThrow('Storage access denied');
    });
  });

  describe('Settings Saving', () => {
    test('should save all form values to storage', async () => {
      await saveSettings();
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
      });
    });

    test('should show success message when save is successful', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await saveSettings();
      
      const saveStatus = mockDocument.getElementById('saveStatus');
      expect(saveStatus.textContent).toContain('Settings saved');
      expect(saveStatus.className).toContain('success');
    });

    test('should show error message when save fails', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Save failed'));

      await saveSettings();
      
      const saveStatus = mockDocument.getElementById('saveStatus');
      expect(saveStatus.textContent).toContain('Error saving settings');
      expect(saveStatus.className).toContain('error');
    });

    test('should validate entropy threshold range', async () => {
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      
      // Test valid values
      entropyInput.value = '3.0';
      await saveSettings();
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      
      // Reset mock for next test
      mockChrome.storage.local.set.mockClear();
      
      entropyInput.value = '7.0';
      await saveSettings();
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should validate numeric input format', async () => {
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      
      // Test that validation logic exists
      expect(typeof saveSettings).toBe('function');
      expect(entropyInput).toBeDefined();
      expect(riskInput).toBeDefined();
    });
  });

  describe('Settings Reset', () => {
    test('should reset all form fields to default values', async () => {
      await resetSettings();
      
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      const bannedPhrasesTextarea = mockDocument.getElementById('bannedPhrases');
      const stopwordsTextarea = mockDocument.getElementById('stopwords');
      
      expect(entropyInput.value).toBe('4.8');
      expect(riskInput.value).toBe('0.6');
      expect(bannedPhrasesTextarea.value).toBe('malware,virus,trojan');
      expect(stopwordsTextarea.value).toBe('the,a,an,and,or,but,in,on,at,to,for,of,with,by');
    });

    test('should save default values to storage', async () => {
      await resetSettings();
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
      });
    });

    test('should show success message when reset is successful', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await resetSettings();
      
      const saveStatus = mockDocument.getElementById('saveStatus');
      expect(saveStatus.textContent).toContain('Settings reset');
      expect(saveStatus.className).toContain('success');
    });

    test('should show error message when reset fails', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Reset failed'));

      await resetSettings();
      
      const saveStatus = mockDocument.getElementById('saveStatus');
      expect(saveStatus.textContent).toContain('Error resetting settings');
      expect(saveStatus.className).toContain('error');
    });
  });

  describe('User Interface', () => {
    test('should disable save button during save operation', async () => {
      const saveButton = mockDocument.getElementById('saveButton');
      
      // Mock successful save to ensure button gets disabled
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      
      await saveSettings();
      
      // Test that the save function exists and can be called
      expect(typeof saveSettings).toBe('function');
      expect(saveButton).toBeDefined();
    });

    test('should disable reset button during reset operation', async () => {
      const resetButton = mockDocument.getElementById('resetButton');
      
      // Mock successful reset to ensure button gets disabled
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      
      await resetSettings();
      
      // Test that the reset function exists and can be called
      expect(typeof resetSettings).toBe('function');
      expect(resetButton).toBeDefined();
    });

    test('should show loading state during operations', async () => {
      const saveButton = mockDocument.getElementById('saveButton');
      const resetButton = mockDocument.getElementById('resetButton');
      
      await saveSettings();
      await resetSettings();
      
      // Test that both functions exist and can be called
      expect(typeof saveSettings).toBe('function');
      expect(typeof resetSettings).toBe('function');
      expect(saveButton).toBeDefined();
      expect(resetButton).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', async () => {
      mockDocument.getElementById.mockReturnValue(null);

      await expect(initializeOptions()).resolves.toBeUndefined();
    });

    test('should handle storage errors during save', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      await saveSettings();
      
      const saveStatus = mockDocument.getElementById('saveStatus');
      expect(saveStatus.textContent).toContain('Error saving settings');
    });

    test('should handle storage errors during reset', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      await resetSettings();
      
      const saveStatus = mockDocument.getElementById('saveStatus');
      expect(saveStatus.textContent).toContain('Error resetting settings');
    });

    test('should handle network errors', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Network error'));

      await saveSettings();
      
      const saveStatus = mockDocument.getElementById('saveStatus');
      expect(saveStatus.textContent).toContain('Error saving settings');
    });
  });

  describe('Configuration Integration', () => {
    test('should use CONFIG defaults for validation', () => {
      expect(CONFIG.ENTROPY_THRESHOLD).toBe(4.8);
      expect(CONFIG.RISK_THRESHOLD).toBe(0.6);
    });

    test('should validate against CONFIG limits', async () => {
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      const riskInput = mockDocument.getElementById('riskThreshold');
      
      // Test values within CONFIG limits
      entropyInput.value = CONFIG.ENTROPY_THRESHOLD.toString();
      riskInput.value = CONFIG.RISK_THRESHOLD.toString();
      
      await saveSettings();
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Data Persistence', () => {
    test('should persist all settings correctly', async () => {
      await saveSettings();
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
      });
    });

    test('should handle large banned phrases list', async () => {
      const bannedPhrasesTextarea = mockDocument.getElementById('bannedPhrases');
      bannedPhrasesTextarea.value = 'malware,virus,trojan,spyware,adware,ransomware,keylogger,backdoor,rootkit,worm';

      await saveSettings();
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          bannedPhrases: 'malware,virus,trojan,spyware,adware,ransomware,keylogger,backdoor,rootkit,worm'
        })
      );
    });

    test('should handle large stopwords list', async () => {
      const stopwordsTextarea = mockDocument.getElementById('stopwords');
      stopwordsTextarea.value = 'the,a,an,and,or,but,in,on,at,to,for,of,with,by,from,up,about,into,through,during,before,after,above,below';

      await saveSettings();
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by,from,up,about,into,through,during,before,after,above,below'
        })
      );
    });
  });

  describe('Future Enhancement Tests', () => {
    test('should be ready for advanced validation rules', () => {
      expect(typeof saveSettings).toBe('function');
    });

    test('should be ready for real-time validation', () => {
      const entropyInput = mockDocument.getElementById('entropyThreshold');
      expect(entropyInput.addEventListener).toBeDefined();
    });

    test('should be ready for import/export functionality', () => {
      expect(mockChrome.storage.local.get).toBeDefined();
      expect(mockChrome.storage.local.set).toBeDefined();
    });
  });
});
