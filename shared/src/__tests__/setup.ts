// Jest setup file for global mocks and configurations

// Mock browser APIs
const mockBrowser = {
  notifications: {
    create: jest.fn()
  }
};

const mockChrome = {
  notifications: {
    create: jest.fn()
  }
};

// Setup global mocks
Object.defineProperty(global, 'browser', {
  value: mockBrowser,
  writable: true
});

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

// Mock FileReader
global.FileReader = class MockFileReader {
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsText(blob: Blob) {
    setTimeout(() => {
      this.result = 'mock file content';
      if (this.onload) {
        this.onload.call(this, {} as ProgressEvent<FileReader>);
      }
    }, 0);
  }
} as any;
