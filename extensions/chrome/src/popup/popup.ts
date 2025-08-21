import { CONFIG, MESSAGES } from 'shared';

console.log('SquareX File Scanner Popup loaded');

// DOM elements
let toggleButton: HTMLButtonElement | null = null;
let testWasmButton: HTMLButtonElement | null = null;
let statusElement: HTMLElement | null = null;
let wasmStatusElement: HTMLElement | null = null;
let errorStatsElement: HTMLElement | null = null;
let latestResultsElement: HTMLElement | null = null;

// Initialize popup
async function initializePopup() {
  console.log('Initializing popup...');
  
  // Get DOM elements
  toggleButton = document.getElementById('toggleButton') as HTMLButtonElement;
  testWasmButton = document.getElementById('testWasmButton') as HTMLButtonElement;
  statusElement = document.getElementById('status');
  wasmStatusElement = document.getElementById('wasmStatus');
  errorStatsElement = document.getElementById('errorStats');
  latestResultsElement = document.getElementById('latestResults');
  
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
  
  // Check extension status and get latest results
  await updateStatus();
  await updateLatestResults();
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
    await updateLatestResults();
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

// Update latest results display
async function updateLatestResults() {
  try {
    // Get latest analysis results from storage
    const result = await chrome.storage.local.get(['latestAnalysisResult']);
    
    if (latestResultsElement && result.latestAnalysisResult) {
      const analysis = result.latestAnalysisResult;
      const riskScore = (analysis.riskScore || analysis.risk_score || 0) * 100;
      const decision = analysis.decision || 'allow';
      const fileName = analysis.fileName || 'Unknown file';
      const reason = analysis.reason || 'Analysis complete';
      
      latestResultsElement.innerHTML = `
        <h4>Latest Analysis</h4>
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
        <p><strong>Risk Score:</strong> ${riskScore.toFixed(0)}%</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Time:</strong> ${new Date(analysis.timestamp || Date.now()).toLocaleTimeString()}</p>
      `;
      latestResultsElement.className = 'status success';
    } else if (latestResultsElement) {
      latestResultsElement.innerHTML = '<h4>Latest Analysis</h4><p>No recent analysis results</p>';
      latestResultsElement.className = 'status info';
    }
  } catch (error) {
    console.error('Failed to update latest results:', error);
    if (latestResultsElement) {
      latestResultsElement.innerHTML = '<h4>Latest Analysis</h4><p>Error loading results</p>';
      latestResultsElement.className = 'status error';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);
