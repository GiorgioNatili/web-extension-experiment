import { test, expect } from '@playwright/test';

test.describe('Basic Functionality Tests', () => {
  test('should load test page successfully', async ({ page }) => {
    await page.goto('http://localhost:8080/test-page.html');
    
    // Check page title
    await expect(page).toHaveTitle('SquareX Extension Test Page');
    
    // Check main heading
    await expect(page.locator('h1')).toHaveText('SquareX File Scanner Extension Test Page');
    
    // Check extension info section
    await expect(page.locator('.extension-info h3')).toHaveText('Extension Information');
    await expect(page.locator('.extension-info')).toContainText('SquareX File Scanner');
    await expect(page.locator('.extension-info')).toContainText('0.1.0');
    
    // Check that mock extension elements are created
    await expect(page.locator('[data-squarex-extension]')).toBeVisible();
    await expect(page.locator('[data-squarex-ui-toggle]')).toBeVisible();
  });

  test('should display file upload interface', async ({ page }) => {
    await page.goto('http://localhost:8080/test-page.html');
    
    // Check file input exists
    const fileInput = page.locator('#test-file');
    await expect(fileInput).toBeVisible();
    await expect(fileInput).toHaveAttribute('accept', '.txt,.html,.css,.js,.json,.md');
    
    // Check upload status
    await expect(page.locator('#upload-status')).toContainText('Ready to scan files');
  });

  test('should handle file selection', async ({ page }) => {
    await page.goto('http://localhost:8080/test-page.html');
    
    // Create a test file
    const testContent = 'This is a test file content for scanning.';
    const testFile = Buffer.from(testContent);
    
    // Upload the file
    await page.setInputFiles('#test-file', {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: testFile
    });
    
    // Check that file was selected
    await expect(page.locator('#upload-status')).toContainText('File Selected: test.txt');
    await expect(page.locator('#upload-status')).toHaveClass(/success/);
    
    // Wait for analysis simulation
    await page.waitForTimeout(2500);
    
    // Check results
    await expect(page.locator('#test-results')).toContainText('Analysis Complete');
    await expect(page.locator('#test-results')).toContainText('test.txt');
    await expect(page.locator('#test-results')).toContainText('File appears safe');
  });

  test('should check extension status', async ({ page }) => {
    await page.goto('http://localhost:8080/test-page.html');
    
    // Check extension status section exists
    await expect(page.locator('#extension-status')).toBeVisible();
    await expect(page.locator('#extension-status')).toContainText('Extension');
  });

  test('should have proper styling and layout', async ({ page }) => {
    await page.goto('http://localhost:8080/test-page.html');
    
    // Check container styling
    const container = page.locator('.container');
    await expect(container).toBeVisible();
    
    // Check test sections
    const testSections = page.locator('.test-section');
    await expect(testSections).toHaveCount(3);
    
    // Check file input styling
    const fileInput = page.locator('#test-file');
    await expect(fileInput).toBeVisible();
  });
});
