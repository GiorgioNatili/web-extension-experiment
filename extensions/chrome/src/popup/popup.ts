import { CONFIG, MESSAGES } from 'shared';

console.log('SquareX File Scanner Popup loaded');

// DOM elements
let toggleButton: HTMLButtonElement | null = null;
let testWasmButton: HTMLButtonElement | null = null;
let statusElement: HTMLElement | null = null;
let wasmStatusElement: HTMLElement | null = null;
let errorStatsElement: HTMLElement | null = null;

// Initialize popup
async function initializePopup() {
  console.log('Initializing popup...');
  
  // Get DOM elements
  toggleButton = document.getElementById('toggleButton') as HTMLButtonElement;
  testWasmButton = document.getElementById('testWasmButton') as HTMLButtonElement;
  statusElement = document.getElementById('status');
  wasmStatusElement = document.getElementById('wasmStatus');
  errorStatsElement = document.getElementById('errorStats');
  
  // Load current settings
  const result = await chrome.storage.local.get(['scannerEnabled', 'entropyThreshold']);
  const scannerEnabled = result.scannerEnabled !== false; // Default to true
  
  // Update UI
  if (toggleButton) {
    toggleButton.textContent = scannerEnabled ? 'Disable Scanner' : 'Enable Scanner';
    toggleButton.addEventListener('click', toggleScanner);
  }
  if (testWasmButton) {
    testWasmButton.addEventListener('click', triggerWasmTest);
  }
  
  // Check extension status
  await updateStatus();
}

// Trigger background WASM loading test
async function triggerWasmTest() {
  try {
    if (testWasmButton) {
      testWasmButton.disabled = true;
      testWasmButton.textContent = 'Testing...';
    }
    const response = await chrome.runtime.sendMessage({ type: 'TEST_WASM_LOADING' });
    console.log('WASM test response:', response);
    await updateStatus();
    if (testWasmButton) {
      testWasmButton.textContent = 'Test WASM';
    }
  } catch (error) {
    console.error('Failed to run WASM test:', error);
  } finally {
    if (testWasmButton) {
      testWasmButton.disabled = false;
    }
  }
}

// Toggle scanner on/off
async function toggleScanner() {
  try {
    const result = await chrome.storage.local.get(['scannerEnabled']);
    const newStatus = !result.scannerEnabled;
    
    await chrome.storage.local.set({ scannerEnabled: newStatus });
    
    if (toggleButton) {
      toggleButton.textContent = newStatus ? 'Disable Scanner' : 'Enable Scanner';
    }
    
    console.log('Scanner toggled:', newStatus);
  } catch (error) {
    console.error('Failed to toggle scanner:', error);
  }
}

// Update status display
async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    
    if (statusElement) {
      if (response.status === 'ready') {
        statusElement.textContent = 'Ready';
        statusElement.className = 'status ready';
      } else if (response.status === 'busy') {
        statusElement.textContent = 'Processing';
        statusElement.className = 'status busy';
      } else if (response.status === 'error') {
        statusElement.textContent = 'Error';
        statusElement.className = 'status error';
      }
    }
    
    if (wasmStatusElement) {
      if (response.wasm_loaded) {
        wasmStatusElement.textContent = 'WASM Loaded';
        wasmStatusElement.className = 'status success';
      } else {
        wasmStatusElement.textContent = 'WASM Not Loaded';
        wasmStatusElement.className = 'status error';
      }
    }
    
    if (errorStatsElement && response.error_stats) {
      errorStatsElement.textContent = `${response.error_stats.total} errors (${response.error_stats.recent} recent)`;
      errorStatsElement.className = 'status info';
    }
    
    // Add performance metrics if available
    if (response.performance && statusElement) {
      statusElement.innerHTML = `Ready - Performance: ${response.performance.timing.total_time}ms`;
    }
    
    // Add timestamp
    if (statusElement) {
      const now = new Date();
      statusElement.innerHTML += ` - ${now.toLocaleTimeString()}`;
    }
    
  } catch (error) {
    console.error('Failed to update status:', error);
    if (statusElement) {
      statusElement.textContent = 'Error';
      statusElement.className = 'status error';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);
