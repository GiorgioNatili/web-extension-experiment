describe('Basic Tests', () => {
  test('should have browser API mocked', () => {
    expect((global as any).browser).toBeDefined();
    expect((global as any).browser.runtime.sendMessage).toBeDefined();
  });

  test('should have chrome API mocked', () => {
    expect((global as any).chrome).toBeDefined();
    expect((global as any).chrome.runtime.sendMessage).toBeDefined();
  });

  test('should have File API mocked', () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    expect(file.name).toBe('test.txt');
    expect(file.type).toBe('text/plain');
    expect(file.size).toBe(12); // 'test content' length
  });

  test('should handle async file reading', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const content = await file.text();
    expect(content).toBe('test content');
  });
});
