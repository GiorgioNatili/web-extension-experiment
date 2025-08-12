// Safari popup script
import { CONFIG, MESSAGES } from 'shared';

let toggleButton: HTMLButtonElement | null = null;
let statusElement: HTMLElement | null = null;
let wasmStatusElement: HTMLElement | null = null;
let errorStatsElement: HTMLElement | null = null;

async function initializePopup() {
  // Get DOM elements
  toggleButton = document.getElementById('toggleButton') as HTMLButtonElement;
  statusElement = document.getElementById('status');
  wasmStatusElement = document.getElementById('wasmStatus');
  errorStatsElement = document.getElementById('errorStats');

  // Load current settings
  const result = await browser.storage.local.get(['scannerEnabled', 'entropyThreshold']);
  const scannerEnabled = result.scannerEnabled !== false;

  // Set up toggle button
  if (toggleButton) {
    toggleButton.textContent = scannerEnabled ? 'Disable Scanner' : 'Enable Scanner';
    toggleButton.className = scannerEnabled ? 'toggle-button' : 'toggle-button disabled';
    toggleButton.addEventListener('click', toggleScanner);
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

  // Update status
  await updateStatus();
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

async function updateStatus() {
  try {
    // Get extension status
    const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
    
    if (statusElement) {
      if (response.status === 'ready') {
        statusElement.textContent = 'Ready';
        statusElement.className = 'status ready';
      } else {
        statusElement.textContent = 'Error';
        statusElement.className = 'status error';
      }
    }

    if (wasmStatusElement) {
      if (response.wasm_loaded) {
        wasmStatusElement.textContent = 'Loaded';
        wasmStatusElement.className = 'status ready';
      } else {
        wasmStatusElement.textContent = 'Not loaded';
        wasmStatusElement.className = 'status error';
      }
    }

    if (errorStatsElement && response.error_stats) {
      const stats = response.error_stats;
      const totalErrors = stats.total || 0;
      const recoveredErrors = stats.recovered || 0;
      const recoveryRate = stats.recoveryRate || '0%';

      if (totalErrors === 0) {
        errorStatsElement.textContent = 'No errors';
        errorStatsElement.className = 'status ready';
      } else {
        errorStatsElement.innerHTML = `
          <div>Total: ${totalErrors} | Recovered: ${recoveredErrors}</div>
          <div class="error-stats">Recovery Rate: <strong>${recoveryRate}</strong></div>
        `;
        errorStatsElement.className = 'status warning';
      }
    }

    // Add performance metrics if available
    if (response.performance && statusElement) {
      const perf = response.performance;
      const perfHtml = `
        <div class="performance-metrics">
          <strong>Memory:</strong> ${(perf.memoryUsed / 1024 / 1024).toFixed(1)}MB | 
          <strong>Throughput:</strong> ${perf.throughput.toFixed(0)} KB/s | 
          <strong>CPU:</strong> ${perf.cpuUsage.toFixed(1)}%
        </div>
      `;
      statusElement.innerHTML += perfHtml;
    }

    // Add timestamp
    if (statusElement) {
      const timestamp = new Date().toLocaleTimeString();
      const timeHtml = `<div style="font-size: 10px; margin-top: 5px; opacity: 0.7;">Last updated: ${timestamp}</div>`;
      statusElement.innerHTML += timeHtml;
    }

  } catch (error) {
    console.error('Failed to update status:', error);
    
    if (statusElement) {
      statusElement.textContent = 'Connection error';
      statusElement.className = 'status error';
    }
  }
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    z-index: 1000;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);

// Update status every 5 seconds
setInterval(updateStatus, 5000);
