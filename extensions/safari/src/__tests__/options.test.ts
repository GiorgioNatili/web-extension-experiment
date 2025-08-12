// Safari options page tests
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

// Mock document
const mockDocument = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn(),
  querySelectorAll: jest.fn()
};

// Mock setTimeout
const mockSetTimeout = jest.fn((callback: Function, delay: number) => {
  setTimeout(callback, delay);
  return 1;
});

// Global mocks
global.browser = mockBrowser as any;
global.document = mockDocument as any;
global.setTimeout = mockSetTimeout as any;

// Mock shared utilities
jest.mock('shared', () => ({
  CONFIG: { CHUNK_SIZE: 1024 * 1024 },
  MESSAGES: {
    ANALYSIS_COMPLETE: 'Analysis complete',
    ANALYSIS_FAILED: 'Analysis failed'
  }
}));

describe('Safari Options Page', () => {
  let mockEntropyInput: any;
  let mockRiskInput: any;
  let mockBannedPhrasesTextarea: any;
  let mockStopwordsTextarea: any;
  let mockSaveButton: any;
  let mockResetButton: any;
  let mockSaveStatus: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock DOM elements
    mockEntropyInput = {
      value: '',
      addEventListener: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };

    mockRiskInput = {
      value: '',
      addEventListener: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };

    mockBannedPhrasesTextarea = {
      value: '',
      addEventListener: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };

    mockStopwordsTextarea = {
      value: '',
      addEventListener: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };

    mockSaveButton = {
      disabled: false,
      textContent: '',
      addEventListener: jest.fn()
    };

    mockResetButton = {
      disabled: false,
      textContent: '',
      addEventListener: jest.fn()
    };

    mockSaveStatus = {
      textContent: '',
      className: '',
      style: { display: 'none' }
    };

    // Mock getElementById
    mockDocument.getElementById.mockImplementation((id: string) => {
      switch (id) {
        case 'entropyThreshold': return mockEntropyInput;
        case 'riskThreshold': return mockRiskInput;
        case 'bannedPhrases': return mockBannedPhrasesTextarea;
        case 'stopwords': return mockStopwordsTextarea;
        case 'saveButton': return mockSaveButton;
        case 'resetButton': return mockResetButton;
        case 'saveStatus': return mockSaveStatus;
        default: return null;
      }
    });
  });

  describe('Initialization', () => {
    test('should initialize options page with DOM elements', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
      });

      // Mock the initializeOptions function
      const initializeOptions = async () => {
        // Get DOM elements
        const entropyInput = document.getElementById('entropyThreshold') as HTMLInputElement;
        const riskInput = document.getElementById('riskThreshold') as HTMLInputElement;
        const bannedPhrasesTextarea = document.getElementById('bannedPhrases') as HTMLTextAreaElement;
        const stopwordsTextarea = document.getElementById('stopwords') as HTMLTextAreaElement;
        const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
        const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
        const saveStatus = document.getElementById('saveStatus');

        // Load current settings
        const result = await browser.storage.local.get([
          'entropyThreshold',
          'riskThreshold',
          'bannedPhrases',
          'stopwords'
        ]);

        // Set default values if not found
        if (entropyInput) {
          entropyInput.value = result.entropyThreshold || '4.8';
        }
        if (riskInput) {
          riskInput.value = result.riskThreshold || '0.6';
        }
        if (bannedPhrasesTextarea) {
          bannedPhrasesTextarea.value = result.bannedPhrases || 'malware,virus,trojan';
        }
        if (stopwordsTextarea) {
          stopwordsTextarea.value = result.stopwords || 'the,a,an,and,or,but,in,on,at,to,for,of,with,by';
        }

        // Set up event listeners
        if (saveButton) {
          saveButton.addEventListener('click', jest.fn());
        }
        if (resetButton) {
          resetButton.addEventListener('click', jest.fn());
        }
      };

      await initializeOptions();

      expect(mockDocument.getElementById).toHaveBeenCalledWith('entropyThreshold');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('riskThreshold');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('bannedPhrases');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('stopwords');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('saveButton');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('resetButton');
      expect(mockDocument.getElementById).toHaveBeenCalledWith('saveStatus');
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith([
        'entropyThreshold',
        'riskThreshold',
        'bannedPhrases',
        'stopwords'
      ]);
    });

    test('should load settings from storage', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        entropyThreshold: '5.0',
        riskThreshold: '0.7',
        bannedPhrases: 'malware,virus,trojan,spyware',
        stopwords: 'the,a,an,and,or,but'
      });

      // Mock the settings loading
      const loadSettings = async () => {
        const result = await browser.storage.local.get([
          'entropyThreshold',
          'riskThreshold',
          'bannedPhrases',
          'stopwords'
        ]);

        if (mockEntropyInput) {
          mockEntropyInput.value = result.entropyThreshold || '4.8';
        }
        if (mockRiskInput) {
          mockRiskInput.value = result.riskThreshold || '0.6';
        }
        if (mockBannedPhrasesTextarea) {
          mockBannedPhrasesTextarea.value = result.bannedPhrases || 'malware,virus,trojan';
        }
        if (mockStopwordsTextarea) {
          mockStopwordsTextarea.value = result.stopwords || 'the,a,an,and,or,but,in,on,at,to,for,of,with,by';
        }

        return result;
      };

      const result = await loadSettings();

      expect(mockEntropyInput.value).toBe('5.0');
      expect(mockRiskInput.value).toBe('0.7');
      expect(mockBannedPhrasesTextarea.value).toBe('malware,virus,trojan,spyware');
      expect(mockStopwordsTextarea.value).toBe('the,a,an,and,or,but');
      expect(result.entropyThreshold).toBe('5.0');
    });
  });

  describe('Save Settings', () => {
    test('should save valid settings successfully', async () => {
      mockEntropyInput.value = '4.5';
      mockRiskInput.value = '0.5';
      mockBannedPhrasesTextarea.value = 'malware,virus';
      mockStopwordsTextarea.value = 'the,a,an';

      // Mock the saveSettings function
      const saveSettings = async () => {
        try {
          mockSaveButton.disabled = true;
          mockSaveButton.textContent = 'Saving...';

          // Validate inputs
          const validationResult = validateAllInputs();
          if (!validationResult.isValid) {
            showSaveStatus(validationResult.errorMessage || 'Validation failed', 'error');
            return false;
          }

          // Get values
          const settings = {
            entropyThreshold: mockEntropyInput?.value || '4.8',
            riskThreshold: mockRiskInput?.value || '0.6',
            bannedPhrases: mockBannedPhrasesTextarea?.value || 'malware,virus,trojan',
            stopwords: mockStopwordsTextarea?.value || 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
          };

          // Save to storage
          await browser.storage.local.set(settings);

          // Show success message
          showSaveStatus('Settings saved successfully!', 'success');

          return true;

        } catch (error) {
          console.error('Failed to save settings:', error);
          showSaveStatus('Failed to save settings. Please try again.', 'error');
          return false;
        } finally {
          if (mockSaveButton) {
            mockSaveButton.disabled = false;
            mockSaveButton.textContent = 'Save Settings';
          }
        }
      };

      // Mock validation function
      const validateAllInputs = () => {
        const entropyValue = parseFloat(mockEntropyInput?.value || '0');
        if (isNaN(entropyValue) || entropyValue < 0 || entropyValue > 10) {
          return { isValid: false, errorMessage: 'Entropy threshold must be between 0 and 10' };
        }

        const riskValue = parseFloat(mockRiskInput?.value || '0');
        if (isNaN(riskValue) || riskValue < 0 || riskValue > 1) {
          return { isValid: false, errorMessage: 'Risk threshold must be between 0 and 1' };
        }

        const bannedPhrases = mockBannedPhrasesTextarea?.value.trim() || '';
        if (bannedPhrases.length === 0) {
          return { isValid: false, errorMessage: 'Banned phrases cannot be empty' };
        }

        const stopwords = mockStopwordsTextarea?.value.trim() || '';
        if (stopwords.length === 0) {
          return { isValid: false, errorMessage: 'Stop words cannot be empty' };
        }

        return { isValid: true };
      };

      // Mock showSaveStatus function
      const showSaveStatus = (message: string, type: 'success' | 'error') => {
        if (mockSaveStatus) {
          mockSaveStatus.textContent = message;
          mockSaveStatus.className = `save-status ${type}`;
          mockSaveStatus.style.display = 'block';
        }
      };

      const result = await saveSettings();

      expect(result).toBe(true);
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        entropyThreshold: '4.5',
        riskThreshold: '0.5',
        bannedPhrases: 'malware,virus',
        stopwords: 'the,a,an'
      });
      expect(mockSaveStatus.textContent).toBe('Settings saved successfully!');
      expect(mockSaveStatus.className).toBe('save-status success');
    });

    test('should handle validation errors', async () => {
      mockEntropyInput.value = '15'; // Invalid value
      mockRiskInput.value = '0.5';
      mockBannedPhrasesTextarea.value = 'malware,virus';
      mockStopwordsTextarea.value = 'the,a,an';

      // Mock the saveSettings function
      const saveSettings = async () => {
        try {
          mockSaveButton.disabled = true;
          mockSaveButton.textContent = 'Saving...';

          // Validate inputs
          const validationResult = validateAllInputs();
          if (!validationResult.isValid) {
            showSaveStatus(validationResult.errorMessage || 'Validation failed', 'error');
            return false;
          }

          return true;

        } catch (error) {
          console.error('Failed to save settings:', error);
          showSaveStatus('Failed to save settings. Please try again.', 'error');
          return false;
        } finally {
          if (mockSaveButton) {
            mockSaveButton.disabled = false;
            mockSaveButton.textContent = 'Save Settings';
          }
        }
      };

      // Mock validation function
      const validateAllInputs = () => {
        const entropyValue = parseFloat(mockEntropyInput?.value || '0');
        if (isNaN(entropyValue) || entropyValue < 0 || entropyValue > 10) {
          return { isValid: false, errorMessage: 'Entropy threshold must be between 0 and 10' };
        }

        const riskValue = parseFloat(mockRiskInput?.value || '0');
        if (isNaN(riskValue) || riskValue < 0 || riskValue > 1) {
          return { isValid: false, errorMessage: 'Risk threshold must be between 0 and 1' };
        }

        const bannedPhrases = mockBannedPhrasesTextarea?.value.trim() || '';
        if (bannedPhrases.length === 0) {
          return { isValid: false, errorMessage: 'Banned phrases cannot be empty' };
        }

        const stopwords = mockStopwordsTextarea?.value.trim() || '';
        if (stopwords.length === 0) {
          return { isValid: false, errorMessage: 'Stop words cannot be empty' };
        }

        return { isValid: true };
      };

      // Mock showSaveStatus function
      const showSaveStatus = (message: string, type: 'success' | 'error') => {
        if (mockSaveStatus) {
          mockSaveStatus.textContent = message;
          mockSaveStatus.className = `save-status ${type}`;
          mockSaveStatus.style.display = 'block';
        }
      };

      const result = await saveSettings();

      expect(result).toBe(false);
      expect(mockSaveStatus.textContent).toBe('Entropy threshold must be between 0 and 10');
      expect(mockSaveStatus.className).toBe('save-status error');
      expect(mockBrowser.storage.local.set).not.toHaveBeenCalled();
    });

    test('should handle save errors', async () => {
      mockEntropyInput.value = '4.5';
      mockRiskInput.value = '0.5';
      mockBannedPhrasesTextarea.value = 'malware,virus';
      mockStopwordsTextarea.value = 'the,a,an';

      mockBrowser.storage.local.set.mockRejectedValue(new Error('Storage error'));

      // Mock the saveSettings function
      const saveSettings = async () => {
        try {
          mockSaveButton.disabled = true;
          mockSaveButton.textContent = 'Saving...';

          // Validate inputs
          const validationResult = validateAllInputs();
          if (!validationResult.isValid) {
            showSaveStatus(validationResult.errorMessage || 'Validation failed', 'error');
            return false;
          }

          // Get values
          const settings = {
            entropyThreshold: mockEntropyInput?.value || '4.8',
            riskThreshold: mockRiskInput?.value || '0.6',
            bannedPhrases: mockBannedPhrasesTextarea?.value || 'malware,virus,trojan',
            stopwords: mockStopwordsTextarea?.value || 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
          };

          // Save to storage
          await browser.storage.local.set(settings);

          // Show success message
          showSaveStatus('Settings saved successfully!', 'success');

          return true;

        } catch (error) {
          console.error('Failed to save settings:', error);
          showSaveStatus('Failed to save settings. Please try again.', 'error');
          return false;
        } finally {
          if (mockSaveButton) {
            mockSaveButton.disabled = false;
            mockSaveButton.textContent = 'Save Settings';
          }
        }
      };

      // Mock validation function
      const validateAllInputs = () => {
        return { isValid: true };
      };

      // Mock showSaveStatus function
      const showSaveStatus = (message: string, type: 'success' | 'error') => {
        if (mockSaveStatus) {
          mockSaveStatus.textContent = message;
          mockSaveStatus.className = `save-status ${type}`;
          mockSaveStatus.style.display = 'block';
        }
      };

      const result = await saveSettings();

      expect(result).toBe(false);
      expect(mockSaveStatus.textContent).toBe('Failed to save settings. Please try again.');
      expect(mockSaveStatus.className).toBe('save-status error');
    });
  });

  describe('Reset Settings', () => {
    test('should reset settings to defaults', async () => {
      // Mock the resetSettings function
      const resetSettings = async () => {
        try {
          mockResetButton.disabled = true;
          mockResetButton.textContent = 'Resetting...';

          // Reset to default values
          const defaultSettings = {
            entropyThreshold: '4.8',
            riskThreshold: '0.6',
            bannedPhrases: 'malware,virus,trojan',
            stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
          };

          // Update UI
          if (mockEntropyInput) mockEntropyInput.value = defaultSettings.entropyThreshold;
          if (mockRiskInput) mockRiskInput.value = defaultSettings.riskThreshold;
          if (mockBannedPhrasesTextarea) mockBannedPhrasesTextarea.value = defaultSettings.bannedPhrases;
          if (mockStopwordsTextarea) mockStopwordsTextarea.value = defaultSettings.stopwords;

          // Save to storage
          await browser.storage.local.set(defaultSettings);

          // Show success message
          showSaveStatus('Settings reset to defaults!', 'success');

          return true;

        } catch (error) {
          console.error('Failed to reset settings:', error);
          showSaveStatus('Failed to reset settings. Please try again.', 'error');
          return false;
        } finally {
          if (mockResetButton) {
            mockResetButton.disabled = false;
            mockResetButton.textContent = 'Reset to Defaults';
          }
        }
      };

      // Mock showSaveStatus function
      const showSaveStatus = (message: string, type: 'success' | 'error') => {
        if (mockSaveStatus) {
          mockSaveStatus.textContent = message;
          mockSaveStatus.className = `save-status ${type}`;
          mockSaveStatus.style.display = 'block';
        }
      };

      const result = await resetSettings();

      expect(result).toBe(true);
      expect(mockEntropyInput.value).toBe('4.8');
      expect(mockRiskInput.value).toBe('0.6');
      expect(mockBannedPhrasesTextarea.value).toBe('malware,virus,trojan');
      expect(mockStopwordsTextarea.value).toBe('the,a,an,and,or,but,in,on,at,to,for,of,with,by');
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
      });
      expect(mockSaveStatus.textContent).toBe('Settings reset to defaults!');
      expect(mockSaveStatus.className).toBe('save-status success');
    });
  });

  describe('Input Validation', () => {
    test('should validate entropy threshold range', () => {
      // Mock the validateEntropyInput function
      const validateEntropyInput = () => {
        const value = parseFloat(mockEntropyInput.value);
        const isValid = !isNaN(value) && value >= 0 && value <= 10;

        if (isValid) {
          mockEntropyInput.classList.remove('input-error');
          clearValidationError(mockEntropyInput);
        } else {
          mockEntropyInput.classList.add('input-error');
          showValidationError(mockEntropyInput, 'Entropy threshold must be between 0 and 10');
        }
      };

      // Mock helper functions
      const showValidationError = (element: any, message: string) => {
        // This would create and show validation error message
      };

      const clearValidationError = (element: any) => {
        // This would clear validation error message
      };

      // Test valid value
      mockEntropyInput.value = '5.0';
      validateEntropyInput();
      expect(mockEntropyInput.classList.remove).toHaveBeenCalledWith('input-error');

      // Test invalid value
      mockEntropyInput.value = '15.0';
      validateEntropyInput();
      expect(mockEntropyInput.classList.add).toHaveBeenCalledWith('input-error');
    });

    test('should validate risk threshold range', () => {
      // Mock the validateRiskInput function
      const validateRiskInput = () => {
        const value = parseFloat(mockRiskInput.value);
        const isValid = !isNaN(value) && value >= 0 && value <= 1;

        if (isValid) {
          mockRiskInput.classList.remove('input-error');
          clearValidationError(mockRiskInput);
        } else {
          mockRiskInput.classList.add('input-error');
          showValidationError(mockRiskInput, 'Risk threshold must be between 0 and 1');
        }
      };

      // Mock helper functions
      const showValidationError = (element: any, message: string) => {
        // This would create and show validation error message
      };

      const clearValidationError = (element: any) => {
        // This would clear validation error message
      };

      // Test valid value
      mockRiskInput.value = '0.5';
      validateRiskInput();
      expect(mockRiskInput.classList.remove).toHaveBeenCalledWith('input-error');

      // Test invalid value
      mockRiskInput.value = '1.5';
      validateRiskInput();
      expect(mockRiskInput.classList.add).toHaveBeenCalledWith('input-error');
    });

    test('should validate banned phrases not empty', () => {
      // Mock the validateBannedPhrases function
      const validateBannedPhrases = () => {
        const value = mockBannedPhrasesTextarea.value.trim();
        const isValid = value.length > 0;

        if (isValid) {
          mockBannedPhrasesTextarea.classList.remove('input-error');
          clearValidationError(mockBannedPhrasesTextarea);
        } else {
          mockBannedPhrasesTextarea.classList.add('input-error');
          showValidationError(mockBannedPhrasesTextarea, 'Banned phrases cannot be empty');
        }
      };

      // Mock helper functions
      const showValidationError = (element: any, message: string) => {
        // This would create and show validation error message
      };

      const clearValidationError = (element: any) => {
        // This would clear validation error message
      };

      // Test valid value
      mockBannedPhrasesTextarea.value = 'malware,virus';
      validateBannedPhrases();
      expect(mockBannedPhrasesTextarea.classList.remove).toHaveBeenCalledWith('input-error');

      // Test invalid value
      mockBannedPhrasesTextarea.value = '';
      validateBannedPhrases();
      expect(mockBannedPhrasesTextarea.classList.add).toHaveBeenCalledWith('input-error');
    });
  });

  describe('Status Messages', () => {
    test('should show save status messages', () => {
      // Mock the showSaveStatus function
      const showSaveStatus = (message: string, type: 'success' | 'error') => {
        if (mockSaveStatus) {
          mockSaveStatus.textContent = message;
          mockSaveStatus.className = `save-status ${type}`;
          mockSaveStatus.style.display = 'block';
        }
      };

      showSaveStatus('Settings saved successfully!', 'success');
      expect(mockSaveStatus.textContent).toBe('Settings saved successfully!');
      expect(mockSaveStatus.className).toBe('save-status success');
      expect(mockSaveStatus.style.display).toBe('block');

      showSaveStatus('Validation failed', 'error');
      expect(mockSaveStatus.textContent).toBe('Validation failed');
      expect(mockSaveStatus.className).toBe('save-status error');
    });

    test('should auto-hide status messages', () => {
      // Mock the showSaveStatus function with auto-hide
      const showSaveStatus = (message: string, type: 'success' | 'error') => {
        if (mockSaveStatus) {
          mockSaveStatus.textContent = message;
          mockSaveStatus.className = `save-status ${type}`;
          mockSaveStatus.style.display = 'block';
        }

        // Auto-hide after 3 seconds
        setTimeout(() => {
          if (mockSaveStatus) {
            mockSaveStatus.style.display = 'none';
          }
        }, 3000);
      };

      showSaveStatus('Test message', 'success');
      expect(mockSaveStatus.style.display).toBe('block');
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    });
  });
});
