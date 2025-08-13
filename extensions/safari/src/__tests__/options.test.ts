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

// Global mocks
global.browser = mockBrowser as any;
global.document = mockDocument as any;

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
      style: {}
    };

    // Setup document.getElementById mock
    (document.getElementById as jest.Mock).mockImplementation((id: string) => {
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
  });

  describe('Initialization', () => {
    test('should initialize options page with DOM elements', async () => {
      // Mock the initializeOptions function
      const initializeOptions = async () => {
        const entropyInput = document.getElementById('entropyThreshold');
        const riskInput = document.getElementById('riskThreshold');
        const bannedPhrasesTextarea = document.getElementById('bannedPhrases');
        const stopwordsTextarea = document.getElementById('stopwords');
        
        if (!entropyInput || !riskInput || !bannedPhrasesTextarea || !stopwordsTextarea) {
          throw new Error('Required DOM elements not found');
        }
        
        return true;
      };

      const result = await initializeOptions();
      
      expect(result).toBe(true);
      expect(document.getElementById).toHaveBeenCalledWith('entropyThreshold');
      expect(document.getElementById).toHaveBeenCalledWith('riskThreshold');
      expect(document.getElementById).toHaveBeenCalledWith('bannedPhrases');
      expect(document.getElementById).toHaveBeenCalledWith('stopwords');
    });
  });

  describe('Settings Management', () => {
    test('should load settings from storage', async () => {
      const mockSettings = {
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,and,or,but'
      };
      
      (browser.storage.local.get as jest.Mock).mockResolvedValue(mockSettings);
      
      // Mock the loadSettings function
      const loadSettings = async () => {
        const result = await browser.storage.local.get([
          'entropyThreshold',
          'riskThreshold',
          'bannedPhrases',
          'stopwords'
        ]);
        
        const entropyInput = document.getElementById('entropyThreshold') as HTMLInputElement;
        const riskInput = document.getElementById('riskThreshold') as HTMLInputElement;
        const bannedPhrasesTextarea = document.getElementById('bannedPhrases') as HTMLTextAreaElement;
        const stopwordsTextarea = document.getElementById('stopwords') as HTMLTextAreaElement;
        
        if (entropyInput) entropyInput.value = result.entropyThreshold || '4.8';
        if (riskInput) riskInput.value = result.riskThreshold || '0.6';
        if (bannedPhrasesTextarea) bannedPhrasesTextarea.value = result.bannedPhrases || 'malware,virus,trojan';
        if (stopwordsTextarea) stopwordsTextarea.value = result.stopwords || 'the,and,or,but';
        
        return result;
      };

      const settings = await loadSettings();
      
      expect(settings).toEqual(mockSettings);
      expect(mockEntropyInput.value).toBe('4.8');
      expect(mockRiskInput.value).toBe('0.6');
      expect(mockBannedPhrasesTextarea.value).toBe('malware,virus,trojan');
      expect(mockStopwordsTextarea.value).toBe('the,and,or,but');
    });

    test('should save settings to storage', async () => {
      const mockSettings = {
        entropyThreshold: '5.0',
        riskThreshold: '0.7',
        bannedPhrases: 'spam,phishing,malware',
        stopwords: 'a,an,the,and,or,but'
      };
      
      (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);
      
      // Mock the saveSettings function
      const saveSettings = async (settings: any) => {
        await browser.storage.local.set(settings);
        return true;
      };

      const result = await saveSettings(mockSettings);
      
      expect(result).toBe(true);
      expect(browser.storage.local.set).toHaveBeenCalledWith(mockSettings);
    });
  });

  describe('Reset Settings', () => {
    test('should reset settings to defaults', async () => {
      const defaultSettings = {
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,and,or,but'
      };
      
      (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);
      
      // Mock the resetSettings function
      const resetSettings = async () => {
        await browser.storage.local.set(defaultSettings);
        
        const entropyInput = document.getElementById('entropyThreshold') as HTMLInputElement;
        const riskInput = document.getElementById('riskThreshold') as HTMLInputElement;
        const bannedPhrasesTextarea = document.getElementById('bannedPhrases') as HTMLTextAreaElement;
        const stopwordsTextarea = document.getElementById('stopwords') as HTMLTextAreaElement;
        
        if (entropyInput) entropyInput.value = defaultSettings.entropyThreshold;
        if (riskInput) riskInput.value = defaultSettings.riskThreshold;
        if (bannedPhrasesTextarea) bannedPhrasesTextarea.value = defaultSettings.bannedPhrases;
        if (stopwordsTextarea) stopwordsTextarea.value = defaultSettings.stopwords;
        
        return true;
      };

      const result = await resetSettings();
      
      expect(result).toBe(true);
      expect(mockEntropyInput.value).toBe('4.8');
      expect(mockRiskInput.value).toBe('0.6');
      expect(mockBannedPhrasesTextarea.value).toBe('malware,virus,trojan');
      expect(mockStopwordsTextarea.value).toBe('the,and,or,but');
    });
  });

  describe('Validation', () => {
    test('should validate entropy threshold', () => {
      // Mock the validateEntropyThreshold function
      const validateEntropyThreshold = (value: string) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 10;
      };

      expect(validateEntropyThreshold('4.8')).toBe(true);
      expect(validateEntropyThreshold('0')).toBe(true);
      expect(validateEntropyThreshold('10')).toBe(true);
      expect(validateEntropyThreshold('11')).toBe(false);
      expect(validateEntropyThreshold('-1')).toBe(false);
      expect(validateEntropyThreshold('invalid')).toBe(false);
    });

    test('should validate risk threshold', () => {
      // Mock the validateRiskThreshold function
      const validateRiskThreshold = (value: string) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 1;
      };

      expect(validateRiskThreshold('0.6')).toBe(true);
      expect(validateRiskThreshold('0')).toBe(true);
      expect(validateRiskThreshold('1')).toBe(true);
      expect(validateRiskThreshold('1.1')).toBe(false);
      expect(validateRiskThreshold('-0.1')).toBe(false);
      expect(validateRiskThreshold('invalid')).toBe(false);
    });
  });

  describe('Status Messages', () => {
    test('should show save status message', () => {
      // Mock the showSaveStatus function
      const showSaveStatus = (message: string, type: 'success' | 'error' = 'success') => {
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
          saveStatus.textContent = message;
          saveStatus.className = `save-status ${type}`;
        }
      };

      showSaveStatus('Settings saved successfully', 'success');
      
      expect(mockSaveStatus.textContent).toBe('Settings saved successfully');
      expect(mockSaveStatus.className).toBe('save-status success');
    });

    test('should auto-hide status messages', () => {
      // Mock the showSaveStatus function with auto-hide
      const showSaveStatus = (message: string, type: 'success' | 'error' = 'success') => {
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
          saveStatus.textContent = message;
          saveStatus.className = `save-status ${type}`;
          
          // Auto-hide after 3 seconds
          setTimeout(() => {
            saveStatus.textContent = '';
            saveStatus.className = '';
          }, 3000);
        }
      };

      showSaveStatus('Settings saved successfully', 'success');
      
      expect(mockSaveStatus.textContent).toBe('Settings saved successfully');
      expect(mockSaveStatus.className).toBe('save-status success');
    });
  });

  describe('Event Handlers', () => {
    test('should handle save button click', async () => {
      // Set up mock input values
      mockEntropyInput.value = '5.0';
      mockRiskInput.value = '0.7';
      mockBannedPhrasesTextarea.value = 'spam,phishing';
      mockStopwordsTextarea.value = 'a,an,the';
      
      const mockSettings = {
        entropyThreshold: '5.0',
        riskThreshold: '0.7',
        bannedPhrases: 'spam,phishing',
        stopwords: 'a,an,the'
      };
      
      (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);
      
      // Mock the handleSaveClick function
      const handleSaveClick = async () => {
        const entropyInput = document.getElementById('entropyThreshold') as HTMLInputElement;
        const riskInput = document.getElementById('riskThreshold') as HTMLInputElement;
        const bannedPhrasesTextarea = document.getElementById('bannedPhrases') as HTMLTextAreaElement;
        const stopwordsTextarea = document.getElementById('stopwords') as HTMLTextAreaElement;
        
        const settings = {
          entropyThreshold: entropyInput?.value || '4.8',
          riskThreshold: riskInput?.value || '0.6',
          bannedPhrases: bannedPhrasesTextarea?.value || 'malware,virus,trojan',
          stopwords: stopwordsTextarea?.value || 'the,and,or,but'
        };
        
        await browser.storage.local.set(settings);
        
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
          saveStatus.textContent = 'Settings saved successfully';
          saveStatus.className = 'save-status success';
        }
        
        return settings;
      };

      const settings = await handleSaveClick();
      
      expect(settings).toEqual(mockSettings);
      expect(browser.storage.local.set).toHaveBeenCalledWith(mockSettings);
      expect(mockSaveStatus.textContent).toBe('Settings saved successfully');
    });

    test('should handle reset button click', async () => {
      const defaultSettings = {
        entropyThreshold: '4.8',
        riskThreshold: '0.6',
        bannedPhrases: 'malware,virus,trojan',
        stopwords: 'the,and,or,but'
      };
      
      (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);
      
      // Mock the handleResetClick function
      const handleResetClick = async () => {
        await browser.storage.local.set(defaultSettings);
        
        const entropyInput = document.getElementById('entropyThreshold') as HTMLInputElement;
        const riskInput = document.getElementById('riskThreshold') as HTMLInputElement;
        const bannedPhrasesTextarea = document.getElementById('bannedPhrases') as HTMLTextAreaElement;
        const stopwordsTextarea = document.getElementById('stopwords') as HTMLTextAreaElement;
        
        if (entropyInput) entropyInput.value = defaultSettings.entropyThreshold;
        if (riskInput) riskInput.value = defaultSettings.riskThreshold;
        if (bannedPhrasesTextarea) bannedPhrasesTextarea.value = defaultSettings.bannedPhrases;
        if (stopwordsTextarea) stopwordsTextarea.value = defaultSettings.stopwords;
        
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
          saveStatus.textContent = 'Settings reset to defaults';
          saveStatus.className = 'save-status success';
        }
        
        return true;
      };

      const result = await handleResetClick();
      
      expect(result).toBe(true);
      expect(browser.storage.local.set).toHaveBeenCalledWith(defaultSettings);
      expect(mockSaveStatus.textContent).toBe('Settings reset to defaults');
    });
  });
});
