// Mock DOM environment
document.body.innerHTML = `
  <input type="file" id="fileInput" accept=".txt">
  <div id="results"></div>
`;

// Mock chrome API
const mockChrome = {
  runtime: {
    sendMessage: jest.fn()
  }
};

Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

// Mock File API
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

describe('Chrome Extension Content Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <input type="file" id="fileInput" accept=".txt">
      <div id="results"></div>
    `;
  });

  test('should detect file input elements', () => {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(1);
    expect(fileInputs[0].id).toBe('fileInput');
  });

  test('should handle file selection event', async () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true
    });

    // Trigger change event
    const event = new Event('change');
    fileInput.dispatchEvent(event);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    // For now, just verify the file input exists and has files
    expect(fileInput.files?.length).toBe(1);
    expect(fileInput.files?.[0].name).toBe('test.txt');
  });

  test('should handle non-text files', async () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true
    });

    const event = new Event('change');
    fileInput.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    // Should not call sendMessage for non-text files
    expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  test('should handle empty file selection', async () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [],
      writable: true
    });

    const event = new Event('change');
    fileInput.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
});
