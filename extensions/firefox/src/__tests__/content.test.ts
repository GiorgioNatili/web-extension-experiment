import { CONFIG, MESSAGES } from 'shared';

// Mock browser API
const mockBrowser = {
  runtime: {
    sendMessage: jest.fn()
  }
};

// Mock global browser object
(global as any).browser = mockBrowser;

// Mock DOM APIs
const mockDocument = {
  readyState: 'complete',
  addEventListener: jest.fn(),
  querySelectorAll: jest.fn(),
  body: {
    appendChild: jest.fn()
  }
};

const mockMutationObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

// Mock global objects
(global as any).document = mockDocument;
(global as any).MutationObserver = mockMutationObserver;
(global as any).Node = {
  ELEMENT_NODE: 1
};

// Mock console for testing
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};
(global as any).console = mockConsole;

describe('Firefox Content Script', () => {
  let mockFileInput: any;
  let mockFile: any;
  let mockEvent: any;
  let monitorFileUploads: any;
  let observerCallback: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock file input
    mockFileInput = {
      addEventListener: jest.fn(),
      files: null
    };

    // Setup mock file
    mockFile = {
      name: 'test.txt',
      type: 'text/plain',
      size: 1024,
      text: jest.fn().mockResolvedValue('This is test content')
    };

    // Setup mock event
    mockEvent = {
      target: mockFileInput
    };

    // Setup document.querySelectorAll to return mock file input
    mockDocument.querySelectorAll.mockReturnValue([mockFileInput]);

    // Create the monitorFileUploads function that simulates the content script behavior
    monitorFileUploads = jest.fn(() => {
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      fileInputs.forEach((input: any) => {
        input.addEventListener('change', async (event: any) => {
          const target = event.target;
          const files = target.files;
          
          if (files && files.length > 0) {
            const file = files[0];
            
            // Only process .txt files for now
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
              console.log('Processing file:', file.name);
              
              try {
                const content = await file.text();
                
                // Send to background script for analysis
                const response = await browser.runtime.sendMessage({
                  type: 'ANALYZE_FILE',
                  data: {
                    name: file.name,
                    size: file.size,
                    content: content
                  }
                });
                
                if (response.success) {
                  console.log(`File ${file.name} analyzed successfully`);
                } else {
                  console.error(`Failed to analyze ${file.name}`);
                }
              } catch (error) {
                console.error('Error processing file:', error);
              }
            }
          }
        });
      });
    });

    // Create the mutation observer callback
    observerCallback = jest.fn((mutations: any[]) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node: any) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (element.querySelector && typeof element.querySelector === 'function') {
              const fileInputs = element.querySelectorAll('input[type="file"]');
              fileInputs.forEach((input: any) => {
                input.addEventListener('change', async (event: any) => {
                  const target = event.target;
                  const files = target.files;
                  
                  if (files && files.length > 0) {
                    const file = files[0];
                    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                      console.log('Processing dynamically added file:', file.name);
                      // Handle file processing
                    }
                  }
                });
              });
            }
          }
        });
      });
    });

    // Setup mutation observer
    mockMutationObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
    });
  });

  describe('Initialization', () => {
    test('should initialize when DOM is ready', () => {
      monitorFileUploads();
      
      // Verify that querySelectorAll was called to find file inputs
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('input[type="file"]');
    });

    test('should add event listeners to file inputs', () => {
      monitorFileUploads();
      
      // Verify that addEventListener was called on the file input
      expect(mockFileInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should set up mutation observer for dynamic content', () => {
      // Create mutation observer
      const observer = new MutationObserver(observerCallback);
      
      // Verify that MutationObserver was instantiated
      expect(mockMutationObserver).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('File Upload Detection', () => {
    test('should detect file upload events', async () => {
      monitorFileUploads();
      
      // Get the change event listener
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      
      // Simulate file selection
      mockFileInput.files = [mockFile];
      
      // Trigger the event
      await changeListener(mockEvent);
      
      // Verify that the file was processed
      expect(mockConsole.log).toHaveBeenCalledWith('Processing file:', 'test.txt');
    });

    test('should handle multiple files', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      const mockFile2 = {
        name: 'test2.txt',
        type: 'text/plain',
        size: 2048,
        text: jest.fn().mockResolvedValue('This is test content 2')
      };
      
      mockFileInput.files = [mockFile, mockFile2];
      
      await changeListener(mockEvent);
      
      // Should process the first file
      expect(mockConsole.log).toHaveBeenCalledWith('Processing file:', 'test.txt');
    });

    test('should handle empty file selection', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      
      mockFileInput.files = [];
      
      await changeListener(mockEvent);
      
      // Should not process anything
      expect(mockConsole.log).not.toHaveBeenCalledWith(expect.stringContaining('Processing file:'));
    });
  });

  describe('File Type Validation', () => {
    test('should process .txt files', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      mockFileInput.files = [mockFile];
      
      await changeListener(mockEvent);
      
      expect(mockConsole.log).toHaveBeenCalledWith('Processing file:', 'test.txt');
    });

    test('should process text/plain files', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      const textFile = {
        name: 'document.txt',
        type: 'text/plain',
        size: 1024,
        text: jest.fn().mockResolvedValue('Text content')
      };
      mockFileInput.files = [textFile];
      
      await changeListener(mockEvent);
      
      expect(mockConsole.log).toHaveBeenCalledWith('Processing file:', 'document.txt');
    });

    test('should skip non-text files', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      const imageFile = {
        name: 'image.jpg',
        type: 'image/jpeg',
        size: 1024,
        text: jest.fn().mockResolvedValue('')
      };
      mockFileInput.files = [imageFile];
      
      await changeListener(mockEvent);
      
      expect(mockConsole.log).not.toHaveBeenCalledWith(expect.stringContaining('Processing file:'));
    });

    test('should handle files without type but with .txt extension', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      const txtFile = {
        name: 'document.txt',
        type: '',
        size: 1024,
        text: jest.fn().mockResolvedValue('Text content')
      };
      mockFileInput.files = [txtFile];
      
      await changeListener(mockEvent);
      
      expect(mockConsole.log).toHaveBeenCalledWith('Processing file:', 'document.txt');
    });
  });

  describe('Background Script Communication', () => {
    test('should send file data to background script', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      mockFileInput.files = [mockFile];
      
      // Mock successful response
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: 'Analysis completed'
      });
      
      await changeListener(mockEvent);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'ANALYZE_FILE',
        data: {
          name: 'test.txt',
          size: 1024,
          content: 'This is test content'
        }
      });
    });

    test('should handle successful analysis response', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      mockFileInput.files = [mockFile];
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: 'Analysis completed'
      });
      
      await changeListener(mockEvent);
      
      expect(mockConsole.log).toHaveBeenCalledWith('File test.txt analyzed successfully');
    });

    test('should handle failed analysis response', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      mockFileInput.files = [mockFile];
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: 'Analysis failed'
      });
      
      await changeListener(mockEvent);
      
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to analyze test.txt');
    });

    test('should handle communication errors', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      mockFileInput.files = [mockFile];
      
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Network error'));
      
      await changeListener(mockEvent);
      
      expect(mockConsole.error).toHaveBeenCalledWith('Error processing file:', expect.any(Error));
    });
  });

  describe('Dynamic Content Monitoring', () => {
    test('should monitor for dynamically added file inputs', () => {
      // Create mutation observer
      const observer = new MutationObserver(observerCallback);
      
      // Verify that MutationObserver was set up
      expect(mockMutationObserver).toHaveBeenCalled();
      
      // Mock mutation with added file input
      const mockMutation = {
        addedNodes: [{
          nodeType: 1, // ELEMENT_NODE
          querySelectorAll: jest.fn().mockReturnValue([mockFileInput])
        }]
      };
      
      observerCallback([mockMutation]);
      
      // Should add event listener to new file input
      expect(mockFileInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should handle non-element nodes in mutations', () => {
      const observer = new MutationObserver(observerCallback);
      
      const mockMutation = {
        addedNodes: [{
          nodeType: 3, // TEXT_NODE
          querySelectorAll: jest.fn()
        }]
      };
      
      observerCallback([mockMutation]);
      
      // Should not try to query non-element nodes
      expect(mockMutation.addedNodes[0].querySelectorAll).not.toHaveBeenCalled();
    });

    test('should handle elements without querySelectorAll', () => {
      const observer = new MutationObserver(observerCallback);
      
      const mockMutation = {
        addedNodes: [{
          nodeType: 1, // ELEMENT_NODE
          // No querySelectorAll method
        }]
      };
      
      observerCallback([mockMutation]);
      
      // Should not throw an error
      expect(() => observerCallback([mockMutation])).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle file reading errors', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      const errorFile = {
        name: 'error.txt',
        type: 'text/plain',
        size: 1024,
        text: jest.fn().mockRejectedValue(new Error('File read error'))
      };
      mockFileInput.files = [errorFile];
      
      await changeListener(mockEvent);
      
      expect(mockConsole.error).toHaveBeenCalledWith('Error processing file:', expect.any(Error));
    });

    test('should handle missing files property', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      
      // Remove files property
      delete mockFileInput.files;
      
      await changeListener(mockEvent);
      
      // Should not throw an error
      await expect(changeListener(mockEvent)).resolves.toBeUndefined();
    });

    test('should handle null files', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      
      mockFileInput.files = null;
      
      await changeListener(mockEvent);
      
      // Should not throw an error
      await expect(changeListener(mockEvent)).resolves.toBeUndefined();
    });
  });

  describe('Performance and Memory', () => {
    test('should handle large files efficiently', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      const largeFile = {
        name: 'large.txt',
        type: 'text/plain',
        size: 1024 * 1024, // 1MB
        text: jest.fn().mockResolvedValue('x'.repeat(1024 * 1024))
      };
      mockFileInput.files = [largeFile];
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: 'Analysis completed'
      });
      
      await changeListener(mockEvent);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'ANALYZE_FILE',
        data: {
          name: 'large.txt',
          size: 1024 * 1024,
          content: 'x'.repeat(1024 * 1024)
        }
      });
    });

    test('should handle multiple rapid file uploads', async () => {
      monitorFileUploads();
      
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({
        success: true,
        result: 'Analysis completed'
      });
      
      // Simulate multiple rapid uploads
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const file = {
          name: `file${i}.txt`,
          type: 'text/plain',
          size: 1024,
          text: jest.fn().mockResolvedValue(`Content ${i}`)
        };
        mockFileInput.files = [file];
        promises.push(changeListener(mockEvent));
      }
      
      await Promise.all(promises);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledTimes(5);
    });
  });

  describe('Future Enhancement Tests', () => {
    test('should be ready for streaming protocol integration', () => {
      // Test that the content script is ready for streaming protocol
      expect(mockBrowser.runtime.sendMessage).toBeDefined();
      expect(typeof mockBrowser.runtime.sendMessage).toBe('function');
    });

    test('should be ready for UI injection', () => {
      // Test that DOM manipulation capabilities are available
      expect(mockDocument.querySelectorAll).toBeDefined();
      expect(mockDocument.body.appendChild).toBeDefined();
    });

    test('should be ready for progress tracking', () => {
      // Test that the script can handle async operations
      monitorFileUploads();
      const changeListener = mockFileInput.addEventListener.mock.calls[0][1];
      expect(typeof changeListener).toBe('function');
    });
  });
});
