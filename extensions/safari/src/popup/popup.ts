// Safari popup script
import { CONFIG, MESSAGES } from 'shared';

let toggleButton: HTMLButtonElement | null = null;
let testWasmButton: HTMLButtonElement | null = null;
let statusElement: HTMLElement | null = null;
let wasmStatusElement: HTMLElement | null = null;
let errorStatsElement: HTMLElement | null = null;
let latestResultsElement: HTMLElement | null = null;

async function initializePopup() {
  // Get DOM elements
  toggleButton = document.getElementById('toggleButton') as HTMLButtonElement;
  testWasmButton = document.getElementById('testWasmButton') as HTMLButtonElement;
  statusElement = document.getElementById('status');
  wasmStatusElement = document.getElementById('wasmStatus');
  errorStatsElement = document.getElementById('errorStats');
  latestResultsElement = document.getElementById('latestResults');

  // Load current settings
  const result = await browser.storage.local.get(['scannerEnabled', 'entropyThreshold']);
  const scannerEnabled = result.scannerEnabled !== false;

  // Set up toggle button
  if (toggleButton) {
    toggleButton.textContent = scannerEnabled ? 'Disable Scanner' : 'Enable Scanner';
    toggleButton.className = scannerEnabled ? 'toggle-button' : 'toggle-button disabled';
    toggleButton.addEventListener('click', toggleScanner);
  }

  // Set up WASM test button
  if (testWasmButton) {
    testWasmButton.addEventListener('click', triggerWasmTest);
  }

  // Set up footer links
  const optionsLink = document.getElementById('optionsLink');
  const helpLink = document.getElementById('helpLink');

  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      browser.runtime.openOptionsPage();
    });
  }

  if (helpLink) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      browser.tabs.create({ url: 'https://github.com/squarex/file-scanner' });
    });
  }

  // Update status and latest results
  await updateStatus();
  await updateLatestResults();
}

async function toggleScanner() {
  if (!toggleButton) return;

  try {
    toggleButton.disabled = true;
    toggleButton.textContent = 'Updating...';

    // Get current state
    const result = await browser.storage.local.get(['scannerEnabled']);
    const currentState = result.scannerEnabled !== false;
    const newState = !currentState;

    // Update storage
    await browser.storage.local.set({ scannerEnabled: newState });

    // Update button
    toggleButton.textContent = newState ? 'Disable Scanner' : 'Enable Scanner';
    toggleButton.className = newState ? 'toggle-button' : 'toggle-button disabled';

    // Update status
    await updateStatus();

    // Show notification
    const message = newState ? 'Scanner enabled' : 'Scanner disabled';
    showNotification(message, 'success');

  } catch (error) {
    console.error('Failed to toggle scanner:', error);
    showNotification('Failed to update scanner state', 'error');
  } finally {
    if (toggleButton) {
      toggleButton.disabled = false;
    }
  }
}

// Trigger background WASM loading test
async function triggerWasmTest() {
  try {
    if (testWasmButton) {
      testWasmButton.disabled = true;
      testWasmButton.textContent = 'Testing...';
    }
    const response = await browser.runtime.sendMessage({ type: 'TEST_WASM_LOADING' });
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

async function updateStatus() {
  try {
    // Get extension status
    const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
    
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
        wasmStatusElement.className = 'status ready';
      } else {
        wasmStatusElement.textContent = 'WASM Not Loaded';
        wasmStatusElement.className = 'status error';
      }
    }

    if (errorStatsElement) {
      const stats = response.error_stats || { total: 0 };
      if (stats.total > 0) {
        errorStatsElement.textContent = `${stats.total} errors`;
        errorStatsElement.className = 'status error';
      } else {
        errorStatsElement.textContent = 'No errors';
        errorStatsElement.className = 'status ready';
      }
    }

  } catch (error) {
    console.error('Failed to update status:', error);
    if (statusElement) {
      statusElement.textContent = 'Error';
      statusElement.className = 'status error';
    }
  }
}

async function updateLatestResults() {
  try {
    const result = await browser.storage.local.get(['latestAnalysisResult']);
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
      latestResultsElement.innerHTML = 'No analysis results available';
      latestResultsElement.className = 'status info';
    }
  } catch (error) {
    console.error('Failed to update latest results:', error);
    if (latestResultsElement) {
      latestResultsElement.innerHTML = 'Error loading results';
      latestResultsElement.className = 'status error';
    }
  }
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10002;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 400px;
    text-align: center;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);
