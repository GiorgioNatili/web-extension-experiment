// Test setup for Firefox extension tests

// Mock browser API globally
const mockBrowser = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn()
  },
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
  readyState: 'complete',
  addEventListener: jest.fn(),
  getElementById: jest.fn(),
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
  ELEMENT_NODE: 1,
  TEXT_NODE: 3
};

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

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Export mock objects for use in tests
export {
  mockBrowser,
  mockDocument,
  mockMutationObserver,
  mockConsole,
  mockSetTimeout
};
