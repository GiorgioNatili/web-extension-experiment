// Safari extension test setup

// Mock browser API globally
global.browser = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    onUpdateAvailable: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn(),
    reload: jest.fn()
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
} as any;

// Mock document API globally
global.document = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  body: {
    appendChild: jest.fn()
  },
  readyState: 'complete'
} as any;

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
})) as any;

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  result: 'test file content',
  onload: null,
  onerror: null
})) as any;

// Mock setTimeout and setInterval
global.setTimeout = jest.fn((callback: Function, delay: number) => {
  setTimeout(callback, delay);
  return 1;
}) as any;

global.setInterval = jest.fn((callback: Function, delay: number) => {
  setInterval(callback, delay);
  return 1;
}) as any;

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
} as any;

// Mock performance API
global.performance = {
  memory: {
    usedJSHeapSize: 1024 * 1024,
    totalJSHeapSize: 2 * 1024 * 1024,
    jsHeapSizeLimit: 4 * 1024 * 1024
  },
  now: jest.fn(() => Date.now())
} as any;

// Mock Event constructor
global.Event = jest.fn().mockImplementation((type: string) => ({
  type,
  target: null,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
})) as any;

// Mock HTMLElement methods
const mockHTMLElement = {
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  remove: jest.fn(),
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
    toggle: jest.fn()
  },
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  closest: jest.fn(),
  parentNode: null
};

// Mock document.createElement to return mock elements
(global.document as any).createElement = jest.fn((tagName: string) => ({
  ...mockHTMLElement,
  tagName: tagName.toUpperCase(),
  id: '',
  className: '',
  textContent: '',
  innerHTML: '',
  value: '',
  disabled: false,
  title: '',
  style: { ...mockHTMLElement.style }
}));

// Mock document.getElementById to return mock elements
(global.document as any).getElementById = jest.fn((id: string) => ({
  ...mockHTMLElement,
  id,
  className: '',
  textContent: '',
  innerHTML: '',
  value: '',
  disabled: false,
  title: '',
  style: { ...mockHTMLElement.style }
}));

// Mock document.querySelectorAll to return mock NodeList
(global.document as any).querySelectorAll = jest.fn(() => []);

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset mock element properties
  Object.assign(mockHTMLElement, {
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    remove: jest.fn(),
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn()
    },
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    closest: jest.fn(),
    parentNode: null
  });
});

// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
});
