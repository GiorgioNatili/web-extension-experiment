import { MESSAGES } from 'shared';

console.log('SquareX File Scanner Popup loaded');

document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status') as HTMLElement;
  const testButton = document.getElementById('testButton') as HTMLButtonElement;
  
  // Check extension status
  checkStatus();
  
  // Handle test button click
  testButton.addEventListener('click', handleTestClick);
  
  async function checkStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (response.status === 'ready') {
        statusElement.textContent = 'Status: Ready';
        statusElement.className = 'status ready';
      } else {
        statusElement.textContent = 'Status: Error';
        statusElement.className = 'status error';
      }
    } catch (error) {
      console.error('Status check failed:', error);
      statusElement.textContent = 'Status: Error';
      statusElement.className = 'status error';
    }
  }
  
  async function handleTestClick() {
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    
    try {
      // Test with sample content
      const testContent = 'This is a test file with some sample content.';
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_FILE',
        data: { content: testContent, fileName: 'test.txt' }
      });
      
      if (response.success) {
        alert('Test successful! Analysis completed.');
      } else {
        alert('Test failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + error);
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test Analysis';
    }
  }
});
