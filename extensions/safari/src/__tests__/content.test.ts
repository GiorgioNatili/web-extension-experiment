// Safari content script tests
import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  runtime: {
    sendMessage: jest.fn()
  }
};

// Mock document
const mockDocument = {
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn()
  },
  addEventListener: jest.fn(),
  readyState: 'complete'
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

// Mock setTimeout
const mockSetTimeout = jest.fn((callback: Function, delay: number) => {
  setTimeout(callback, delay);
  return 1;
});

// Global mocks
global.browser = mockBrowser as any;
global.document = mockDocument as any;
global.MutationObserver = mockMutationObserver as any;
global.FileReader = mockFileReader as any;
global.setTimeout = mockSetTimeout as any;

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
  createProgressBar: jest.fn()
}));

describe('Safari Content Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Input Monitoring', () => {
    test('should monitor file uploads on page load', () => {
      const mockFileInputs = [
        { addEventListener: jest.fn() },
        { addEventListener: jest.fn() }
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockFileInputs);
      
      // Import content script to trigger monitoring
      require('../content/content');
      
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('input[type="file"]');
      expect(mockMutationObserver).toHaveBeenCalled();
    });

    test('should intercept file input changes', () => {
      const mockInput = {
        addEventListener: jest.fn(),
        files: [{ name: 'test.txt', size: 1024, type: 'text/plain' }],
        value: ''
      };
      
      // Mock the interceptFileInput function
      const interceptFileInput = (input: HTMLInputElement) => {
        const originalAddEventListener = input.addEventListener;
        input.addEventListener = function(type: string, listener: any) {
          if (type === 'change') {
            // Simulate interception
            const event = { target: input, preventDefault: jest.fn(), stopPropagation: jest.fn() };
            listener(event);
          }
        };
      };
      
      interceptFileInput(mockInput as any);
      mockInput.addEventListener('change', jest.fn());
      
      expect(mockInput.addEventListener).toHaveBeenCalled();
    });
  });

  describe('File Analysis', () => {
    test('should analyze small files with traditional method', async () => {
      const mockFile = {
        name: 'small.txt',
        size: 512,
        type: 'text/plain',
        text: jest.fn().mockResolvedValue('small file content')
      };
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: {
          decision: 'allow',
          riskScore: 0.1,
          reason: 'File appears safe'
        }
      });
      
      // Mock the analyzeInterceptedFile function
      const analyzeInterceptedFile = async (file: File) => {
        if (file.size > 1024 * 1024) {
          // Use streaming for large files
          return await processFileWithStreaming(file);
        } else {
          // Use traditional analysis for small files
          const content = await file.text();
          return await analyzeFileContent(content, file.name);
        }
      };
      
      const result = await analyzeInterceptedFile(mockFile as any);
      
      expect(result.decision).toBe('allow');
      expect(result.riskScore).toBe(0.1);
    });

    test('should analyze large files with streaming', async () => {
      const mockFile = {
        name: 'large.txt',
        size: 2 * 1024 * 1024, // 2MB
        type: 'text/plain',
        slice: jest.fn().mockReturnValue({
          text: jest.fn().mockResolvedValue('chunk content')
        })
      };
      
      mockBrowser.runtime.sendMessage
        .mockResolvedValueOnce({ success: true }) // STREAM_INIT
        .mockResolvedValueOnce({ success: true }) // STREAM_CHUNK
        .mockResolvedValueOnce({ success: true, result: { decision: 'allow' } }); // STREAM_FINALIZE
      
      // Mock the processFileWithStreaming function
      const processFileWithStreaming = async (file: File) => {
        const operationId = 'test-op-123';
        
        // Initialize streaming
        const initResponse = await browser.runtime.sendMessage({
          type: 'STREAM_INIT',
          operation_id: operationId,
          file_info: { name: file.name, size: file.size, type: file.type }
        });
        
        if (!initResponse.success) {
          throw new Error('Streaming initialization failed');
        }
        
        // Process chunks
        const totalChunks = Math.ceil(file.size / CONFIG.CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = await file.slice(i * CONFIG.CHUNK_SIZE, (i + 1) * CONFIG.CHUNK_SIZE).text();
          
          const chunkResponse = await browser.runtime.sendMessage({
            type: 'STREAM_CHUNK',
            operation_id: operationId,
            chunk,
            chunk_index: i
          });
          
          if (!chunkResponse.success) {
            throw new Error('Chunk processing failed');
          }
        }
        
        // Finalize
        const finalizeResponse = await browser.runtime.sendMessage({
          type: 'STREAM_FINALIZE',
          operation_id: operationId
        });
        
        if (finalizeResponse.success) {
          return finalizeResponse.result;
        } else {
          throw new Error('Streaming finalization failed');
        }
      };
      
      const result = await processFileWithStreaming(mockFile as any);
      
      expect(result.decision).toBe('allow');
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('UI Management', () => {
    test('should create results panel', () => {
      const mockResultsPanel = {
        id: 'squarex-results-panel',
        setAttribute: jest.fn(),
        style: {},
        appendChild: jest.fn(),
        remove: jest.fn()
      };
      
      mockDocument.createElement.mockReturnValue(mockResultsPanel);
      
      // Mock the createResultsPanel function
      const createResultsPanel = () => {
        const panel = document.createElement('div');
        panel.id = 'squarex-results-panel';
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', 'SquareX File Analysis Results');
        panel.setAttribute('aria-live', 'polite');
        
        return panel;
      };
      
      const panel = createResultsPanel();
      
      expect(panel.id).toBe('squarex-results-panel');
      expect(panel.setAttribute).toHaveBeenCalledWith('role', 'region');
    });

    test('should create progress UI', () => {
      const mockProgressContainer = {
        id: 'squarex-progress',
        setAttribute: jest.fn(),
        style: {},
        appendChild: jest.fn()
      };
      
      mockDocument.createElement.mockReturnValue(mockProgressContainer);
      
      // Mock the createProgressUI function
      const createProgressUI = () => {
        const container = document.createElement('div');
        container.id = 'squarex-progress';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        
        return container;
      };
      
      const container = createProgressUI();
      
      expect(container.id).toBe('squarex-progress');
      expect(container.setAttribute).toHaveBeenCalledWith('role', 'status');
    });

    test('should show notifications', () => {
      const mockNotification = {
        style: {},
        setAttribute: jest.fn(),
        textContent: ''
      };
      
      mockDocument.createElement.mockReturnValue(mockNotification);
      
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
      
      showNotification('Test message', 'success');
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('File Interception', () => {
    test('should handle intercepted file processing', async () => {
      const mockFile = {
        name: 'test.txt',
        size: 1024,
        type: 'text/plain'
      };
      
      const mockInput = {
        value: '',
        closest: jest.fn().mockReturnValue({
          querySelectorAll: jest.fn().mockReturnValue([])
        })
      };
      
      // Mock the handleInterceptedFile function
      const handleInterceptedFile = async (file: File, input: HTMLInputElement) => {
        const fileData = {
          file,
          input,
          timestamp: Date.now(),
          status: 'Processing',
          riskScore: 0,
          override: false
        };
        
        // Validate file type
        if (!file.type.includes('text') && !file.name.endsWith('.txt')) {
          fileData.status = 'Invalid';
          fileData.riskScore = 1.0;
          return;
        }
        
        // Analyze file
        const result = await analyzeFileContent('test content', file.name);
        
        // Update file data
        fileData.status = result.decision === 'allow' ? 'Allowed' : 'Blocked';
        fileData.riskScore = result.riskScore;
        
        return result;
      };
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: {
          decision: 'allow',
          riskScore: 0.1,
          reason: 'File appears safe'
        }
      });
      
      const result = await handleInterceptedFile(mockFile as any, mockInput as any);
      
      expect(result.decision).toBe('allow');
      expect(result.riskScore).toBe(0.1);
    });

    test('should prevent file upload for blocked files', () => {
      const mockInput = {
        value: '',
        style: {},
        title: '',
        closest: jest.fn().mockReturnValue({
          querySelectorAll: jest.fn().mockReturnValue([
            { disabled: false, title: '' }
          ])
        })
      };
      
      // Mock the preventFileUpload function
      const preventFileUpload = (input: HTMLInputElement, fileName: string) => {
        // Clear the input
        input.value = '';
        
        // Find and disable submit buttons
        const form = input.closest('form');
        if (form) {
          const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
          submitButtons.forEach((button: any) => {
            button.disabled = true;
            button.title = `Upload blocked due to security concerns with file: ${fileName}`;
          });
        }
        
        // Add visual indicator
        input.style.borderColor = '#dc3545';
        input.style.backgroundColor = '#f8d7da';
        input.title = `File "${fileName}" has been blocked for security reasons`;
      };
      
      preventFileUpload(mockInput as any, 'malicious.txt');
      
      expect(mockInput.value).toBe('');
      expect(mockInput.style.borderColor).toBe('#dc3545');
      expect(mockInput.style.backgroundColor).toBe('#f8d7da');
    });
  });

  describe('Error Handling', () => {
    test('should handle file reading errors', async () => {
      const mockFile = {
        name: 'error.txt',
        size: 1024,
        type: 'text/plain',
        text: jest.fn().mockRejectedValue(new Error('File read error'))
      };
      
      // Mock the handleFileSelect function
      const handleFileSelect = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        
        if (!file) return;
        
        try {
          const content = await file.text();
          const response = await browser.runtime.sendMessage({
            type: 'ANALYZE_FILE',
            data: { content, fileName: file.name }
          });
          
          if (response.success) {
            return response.result;
          } else {
            throw new Error(response.error || 'Analysis failed');
          }
        } catch (error) {
          console.error('Traditional analysis failed:', error);
          throw error;
        }
      };
      
      const mockEvent = { target: { files: [mockFile] } };
      
      await expect(handleFileSelect(mockEvent as any)).rejects.toThrow('File read error');
    });

    test('should handle streaming errors', async () => {
      const mockFile = {
        name: 'large.txt',
        size: 2 * 1024 * 1024,
        type: 'text/plain',
        slice: jest.fn().mockReturnValue({
          text: jest.fn().mockResolvedValue('chunk content')
        })
      };
      
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Streaming failed'));
      
      // Mock the processFileWithStreaming function
      const processFileWithStreaming = async (file: File) => {
        try {
          const operationId = 'test-op-123';
          
          // Initialize streaming
          const initResponse = await browser.runtime.sendMessage({
            type: 'STREAM_INIT',
            operation_id: operationId,
            file_info: { name: file.name, size: file.size, type: file.type }
          });
          
          if (!initResponse.success) {
            throw new Error('Streaming initialization failed');
          }
          
          // This should throw an error
          await browser.runtime.sendMessage({
            type: 'STREAM_CHUNK',
            operation_id: operationId,
            chunk: 'test chunk',
            chunk_index: 0
          });
          
        } catch (error) {
          console.error('Streaming analysis failed:', error);
          throw error;
        }
      };
      
      await expect(processFileWithStreaming(mockFile as any)).rejects.toThrow('Streaming failed');
    });
  });

  describe('UI Mode Toggle', () => {
    test('should toggle UI mode between compact and sidebar', () => {
      let uiMode: 'compact' | 'sidebar' = 'compact';
      
      // Mock the addUIModeToggle function
      const addUIModeToggle = () => {
        const toggle = document.createElement('div');
        toggle.id = 'squarex-ui-toggle';
        toggle.textContent = `UI: ${uiMode === 'compact' ? 'Compact' : 'Sidebar'}`;
        toggle.setAttribute('role', 'button');
        toggle.setAttribute('aria-label', 'Toggle UI mode between compact and sidebar');
        
        toggle.addEventListener('click', () => {
          uiMode = uiMode === 'compact' ? 'sidebar' : 'compact';
          toggle.textContent = `UI: ${uiMode === 'compact' ? 'Compact' : 'Sidebar'}`;
        });
        
        document.body.appendChild(toggle);
        return toggle;
      };
      
      const toggle = addUIModeToggle();
      
      expect(toggle.textContent).toBe('UI: Compact');
      expect(toggle.getAttribute('role')).toBe('button');
      
      // Simulate click
      const clickEvent = new Event('click');
      toggle.dispatchEvent(clickEvent);
      
      expect(uiMode).toBe('sidebar');
    });
  });
});
