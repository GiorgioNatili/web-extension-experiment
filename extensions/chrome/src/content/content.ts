import { CONFIG, MESSAGES } from 'shared';
import { getFileInfo, isValidTextFile, readFileAsText } from 'shared';
import { createElement, showNotification, createProgressBar } from 'shared';

console.log('SquareX File Scanner Content Script loaded');

// Monitor file input changes
function setupFileMonitoring() {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  
  fileInputs.forEach(input => {
    input.addEventListener('change', handleFileSelect);
  });
  
  // Monitor for dynamically added file inputs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const fileInputs = element.querySelectorAll('input[type="file"]');
          fileInputs.forEach(input => {
            input.addEventListener('change', handleFileSelect);
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  console.log('File selected:', getFileInfo(file));
  
  if (!isValidTextFile(file)) {
    showNotification(MESSAGES.INVALID_FILE_TYPE, 'error');
    return;
  }
  
  try {
    const content = await readFileAsText(file);
    await analyzeFile(content, file.name);
  } catch (error) {
    console.error('Error reading file:', error);
    showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
  }
}

async function analyzeFile(content: string, fileName: string) {
  console.log('Analyzing file:', fileName);
  
  // Show progress
  const progressBar = createProgressBar(0);
  document.body.appendChild(progressBar);
  
  try {
    // Send analysis request to background script
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_FILE',
      data: { content, fileName }
    });
    
    if (response.success) {
      showResults(response.result, fileName);
      showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
    } else {
      showNotification(response.error || MESSAGES.ANALYSIS_FAILED, 'error');
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
    showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
  } finally {
    progressBar.remove();
  }
}

function showResults(result: any, fileName: string) {
  const container = createElement('div', 'squarex-results');
  container.innerHTML = `
    <h3>Analysis Results for ${fileName}</h3>
    <div class="decision ${result.decision}">
      Decision: ${result.decision.toUpperCase()}
    </div>
    <div class="reason">
      Reason: ${result.reason}
    </div>
    <div class="details">
      <p>Entropy: ${result.entropy.toFixed(2)}</p>
      <p>Risk Score: ${(result.riskScore * 100).toFixed(1)}%</p>
    </div>
  `;
  
  document.body.appendChild(container);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFileMonitoring);
} else {
  setupFileMonitoring();
}
