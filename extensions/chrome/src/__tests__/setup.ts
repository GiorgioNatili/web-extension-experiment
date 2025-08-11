// Jest setup file for Chrome extension tests

// Mock chrome API
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  notifications: {
    create: jest.fn()
  }
};

// Setup global mocks
Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

// Mock File API for Node.js environment
global.File = class MockFile {
  name: string;
  type: string;
  size: number;
  content: string;

  constructor(bits: string[], name: string, options?: { type?: string }) {
    this.content = bits.join('');
    this.name = name;
    this.type = options?.type || 'text/plain';
    this.size = this.content.length;
  }

  async text(): Promise<string> {
    return this.content;
  }
} as any;
