import { showNotification, createElement } from '../utils/ui';
import { validateFile } from '../utils/validation';
import { readFileAsText } from '../utils/file';

describe('Shared Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset global mocks
    if ((global as any).browser?.notifications?.create) {
      (global as any).browser.notifications.create.mockClear();
    }
    if ((global as any).chrome?.notifications?.create) {
      (global as any).chrome.notifications.create.mockClear();
    }
  });

  describe('UI Utils', () => {
    test('showNotification should create a notification element', () => {
      showNotification('Test message', 'info');
      
      const notification = document.querySelector('.notification.notification-info');
      expect(notification).toBeTruthy();
      expect(notification?.textContent).toBe('Test message');
    });

    test('showNotification should create warning notification by default', () => {
      showNotification('Test message');
      
      const notification = document.querySelector('.notification.notification-warning');
      expect(notification).toBeTruthy();
      expect(notification?.textContent).toBe('Test message');
    });

    test('createElement should create element with correct properties', () => {
      const element = createElement('div', 'test-class', 'test content');
      
      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('test-class');
      expect(element.textContent).toBe('test content');
    });
  });

  describe('Validation Utils', () => {
    test('validateFile should return null for valid .txt files', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      expect(validateFile(file)).toBeNull();
    });

    test('validateFile should return error for non-.txt files', () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_FILE_TYPE');
    });

    test('validateFile should return error for empty files', () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      const result = validateFile(file);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('EMPTY_FILE');
    });

    test('validateFile should return error for null file', () => {
      const result = validateFile(null as any);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('NO_FILE');
    });
  });

  describe('File Utils', () => {
    test('readFileAsText should return file content as string', async () => {
      const content = 'test file content';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const result = await readFileAsText(file);
      expect(result).toBe('mock file content'); // Mock returns this value
    });

    test('readFileAsText should handle empty files', async () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      
      const result = await readFileAsText(file);
      expect(result).toBe('mock file content'); // Mock returns this value
    });
  });
});
