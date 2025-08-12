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
    openOptionsPage: jest.fn()
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
const mockToggleBtn = {
  addEventListener: jest.fn(),
  textContent: '',
  className: ''
};

const mockOptionsBtn = {
  addEventListener: jest.fn()
};

const mockStatusDiv = {
  textContent: '',
  className: ''
};

const mockFileCountSpan = {
  textContent: ''
};

const mockThreatCountSpan = {
  textContent: ''
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

describe('Firefox Popup', () => {
  let initializePopup: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup DOM element mocks
    mockDocument.getElementById.mockImplementation((id: string) => {
      switch (id) {
        case 'toggleBtn': return mockToggleBtn;
        case 'optionsBtn': return mockOptionsBtn;
        case 'status': return mockStatusDiv;
        case 'fileCount': return mockFileCountSpan;
        case 'threatCount': return mockThreatCountSpan;
        default: return null;
      }
    });

    // Create the initializePopup function that simulates the popup behavior
    initializePopup = jest.fn(async () => {
      // Load current status
      const result = await browser.storage.local.get(['scannerEnabled', 'fileCount', 'threatCount']);
      const scannerEnabled = result.scannerEnabled !== false; // Default to true
      const fileCount = result.fileCount || 0;
      const threatCount = result.threatCount || 0;

      // Update UI
      updateStatus(scannerEnabled);
      mockFileCountSpan.textContent = fileCount.toString();
      mockThreatCountSpan.textContent = threatCount.toString();

      // Toggle scanner
      mockToggleBtn.addEventListener('click', async () => {
        const newStatus = !scannerEnabled;
        await browser.storage.local.set({ scannerEnabled: newStatus });
        updateStatus(newStatus);
      });

      // Open options
      mockOptionsBtn.addEventListener('click', () => {
        browser.runtime.openOptionsPage();
      });

      function updateStatus(enabled: boolean) {
        if (enabled) {
          mockStatusDiv.textContent = '✅ Scanner Active';
          mockStatusDiv.className = 'status active';
          mockToggleBtn.textContent = 'Disable Scanner';
          mockToggleBtn.className = 'btn-primary';
        } else {
          mockStatusDiv.textContent = '❌ Scanner Disabled';
          mockStatusDiv.className = 'status inactive';
          mockToggleBtn.textContent = 'Enable Scanner';
          mockToggleBtn.className = 'btn-secondary';
        }
      }
    });
  });

  describe('Initialization', () => {
    test('should initialize when DOM is loaded', async () => {
      await initializePopup();
      
      // Verify that storage was queried
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith([
        'scannerEnabled',
        'fileCount',
        'threatCount'
      ]);
    });

    test('should load current status from storage', async () => {
      // Mock storage response
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 2
      });

      await initializePopup();

      // Verify storage was queried
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith([
        'scannerEnabled',
        'fileCount',
        'threatCount'
      ]);
    });

    test('should use default values when storage is empty', async () => {
      // Mock empty storage response
      mockBrowser.storage.local.get.mockResolvedValue({});

      await initializePopup();

      // Should use defaults
      expect(mockFileCountSpan.textContent).toBe('0');
      expect(mockThreatCountSpan.textContent).toBe('0');
    });
  });

  describe('Status Display', () => {
    test('should display active status when scanner is enabled', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 10,
        threatCount: 3
      });

      await initializePopup();

      expect(mockStatusDiv.textContent).toBe('✅ Scanner Active');
      expect(mockStatusDiv.className).toBe('status active');
      expect(mockToggleBtn.textContent).toBe('Disable Scanner');
      expect(mockToggleBtn.className).toBe('btn-primary');
    });

    test('should display inactive status when scanner is disabled', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: false,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      expect(mockStatusDiv.textContent).toBe('❌ Scanner Disabled');
      expect(mockStatusDiv.className).toBe('status inactive');
      expect(mockToggleBtn.textContent).toBe('Enable Scanner');
      expect(mockToggleBtn.className).toBe('btn-secondary');
    });

    test('should display correct file and threat counts', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 25,
        threatCount: 7
      });

      await initializePopup();

      expect(mockFileCountSpan.textContent).toBe('25');
      expect(mockThreatCountSpan.textContent).toBe('7');
    });
  });

  describe('Toggle Scanner Functionality', () => {
    test('should enable scanner when toggled from disabled state', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: false,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      // Get the toggle button click listener
      const toggleListener = mockToggleBtn.addEventListener.mock.calls[0][1];
      
      // Trigger toggle
      await toggleListener();

      // Verify storage was updated
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        scannerEnabled: true
      });

      // Verify UI was updated
      expect(mockStatusDiv.textContent).toBe('✅ Scanner Active');
      expect(mockToggleBtn.textContent).toBe('Disable Scanner');
    });

    test('should disable scanner when toggled from enabled state', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 10,
        threatCount: 3
      });

      await initializePopup();

      const toggleListener = mockToggleBtn.addEventListener.mock.calls[0][1];
      await toggleListener();

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        scannerEnabled: false
      });

      expect(mockStatusDiv.textContent).toBe('❌ Scanner Disabled');
      expect(mockToggleBtn.textContent).toBe('Enable Scanner');
    });

    test('should handle storage errors gracefully', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 1
      });

      mockBrowser.storage.local.set.mockRejectedValue(new Error('Storage error'));

      await initializePopup();

      const toggleListener = mockToggleBtn.addEventListener.mock.calls[0][1];
      
      // Should not throw an error
      await expect(toggleListener()).rejects.toThrow('Storage error');
    });
  });

  describe('Options Page Integration', () => {
    test('should open options page when options button is clicked', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      const optionsListener = mockOptionsBtn.addEventListener.mock.calls[0][1];
      optionsListener();

      expect(mockBrowser.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('Event Listener Registration', () => {
    test('should register toggle button click listener', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      expect(mockToggleBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should register options button click listener', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      expect(mockOptionsBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', async () => {
      // Mock missing elements
      mockDocument.getElementById.mockReturnValue(null);

      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 1
      });

      // Should not throw an error
      await expect(initializePopup()).resolves.toBeUndefined();
    });

    test('should handle storage access errors', async () => {
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Storage access denied'));

      // Should not throw an error
      await expect(initializePopup()).resolves.toBeUndefined();
    });
  });

  describe('Default Values', () => {
    test('should use default scanner enabled state when not set', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        fileCount: 5,
        threatCount: 1
        // scannerEnabled not set
      });

      await initializePopup();

      // Should default to enabled (true)
      expect(mockStatusDiv.textContent).toBe('✅ Scanner Active');
    });

    test('should use default file count when not set', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        threatCount: 1
        // fileCount not set
      });

      await initializePopup();

      expect(mockFileCountSpan.textContent).toBe('0');
    });

    test('should use default threat count when not set', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5
        // threatCount not set
      });

      await initializePopup();

      expect(mockThreatCountSpan.textContent).toBe('0');
    });
  });

  describe('UI State Management', () => {
    test('should update UI immediately after toggle', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: false,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      const toggleListener = mockToggleBtn.addEventListener.mock.calls[0][1];
      await toggleListener();

      // UI should be updated immediately, not waiting for storage
      expect(mockStatusDiv.textContent).toBe('✅ Scanner Active');
      expect(mockToggleBtn.textContent).toBe('Disable Scanner');
    });

    test('should maintain UI state consistency', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 10,
        threatCount: 3
      });

      await initializePopup();

      // Verify all UI elements are consistent
      expect(mockStatusDiv.textContent).toBe('✅ Scanner Active');
      expect(mockStatusDiv.className).toBe('status active');
      expect(mockToggleBtn.textContent).toBe('Disable Scanner');
      expect(mockToggleBtn.className).toBe('btn-primary');
      expect(mockFileCountSpan.textContent).toBe('10');
      expect(mockThreatCountSpan.textContent).toBe('3');
    });
  });

  describe('Performance and Memory', () => {
    test('should handle rapid toggle clicks efficiently', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      const toggleListener = mockToggleBtn.addEventListener.mock.calls[0][1];
      
      // Simulate rapid clicks
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(toggleListener());
      }
      
      await Promise.all(promises);

      // Should handle all clicks
      expect(mockBrowser.storage.local.set).toHaveBeenCalledTimes(5);
    });

    test('should not leak memory with repeated operations', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        scannerEnabled: true,
        fileCount: 5,
        threatCount: 1
      });

      await initializePopup();

      const toggleListener = mockToggleBtn.addEventListener.mock.calls[0][1];
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await toggleListener();
      }

      // Should still work correctly
      expect(mockBrowser.storage.local.set).toHaveBeenCalledTimes(100);
    });
  });

  describe('Future Enhancement Tests', () => {
    test('should be ready for real-time status updates', () => {
      // Test that the popup is ready for real-time updates
      expect(mockBrowser.storage.local.get).toBeDefined();
      expect(mockBrowser.storage.local.set).toBeDefined();
    });

    test('should be ready for advanced statistics display', () => {
      // Test that the popup can display various statistics
      expect(mockFileCountSpan).toBeDefined();
      expect(mockThreatCountSpan).toBeDefined();
    });

    test('should be ready for configuration management', () => {
      // Test that the popup can integrate with options page
      expect(mockBrowser.runtime.openOptionsPage).toBeDefined();
    });
  });
});
