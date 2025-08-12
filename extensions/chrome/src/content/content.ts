import { CONFIG, MESSAGES } from 'shared';
import { getFileInfo, isValidTextFile, readFileAsText } from 'shared';
import { createElement, showNotification, createProgressBar } from 'shared';

console.log('SquareX File Scanner Content Script loaded');

// Configuration
const CHUNK_SIZE = CONFIG.CHUNK_SIZE; // 1MB chunks

// UI elements for progress tracking
let progressContainer: HTMLElement | null = null;
let progressBar: HTMLElement | null = null;
let statusText: HTMLElement | null = null;

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  return `chrome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create progress UI elements
 */
function createProgressUI(): void {
  // Remove existing progress UI if any
  if (progressContainer) {
    progressContainer.remove();
  }

  progressContainer = document.createElement('div');
  progressContainer.id = 'squarex-progress';
  progressContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
  `;

  const title = document.createElement('h4');
  title.textContent = 'SquareX File Scanner';
  title.style.margin = '0 0 10px 0';
  title.style.color = '#333';

  statusText = document.createElement('div');
  statusText.textContent = 'Initializing...';
  statusText.style.marginBottom = '10px';
  statusText.style.fontSize = '14px';
  statusText.style.color = '#666';

  progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
  `;

  const progressFill = document.createElement('div');
  progressFill.id = 'squarex-progress-fill';
  progressFill.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #45a049);
    transition: width 0.3s ease;
  `;

  progressBar.appendChild(progressFill);
  progressContainer.appendChild(title);
  progressContainer.appendChild(statusText);
  progressContainer.appendChild(progressBar);

  document.body.appendChild(progressContainer);
}

/**
 * Update progress UI
 */
function updateProgress(progress: number, status: string): void {
  if (progressContainer && progressBar && statusText) {
    const progressFill = progressBar.querySelector('#squarex-progress-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    statusText.textContent = status;
  }
}

/**
 * Remove progress UI
 */
function removeProgressUI(): void {
  if (progressContainer) {
    progressContainer.remove();
    progressContainer = null;
    progressBar = null;
    statusText = null;
  }
}

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
    // Use streaming for files larger than 1MB, traditional for smaller files
    if (file.size > 1024 * 1024) {
      await processFileWithStreaming(file);
    } else {
      const content = await readFileAsText(file);
      await analyzeFile(content, file.name);
    }
  } catch (error) {
    console.error('Error reading file:', error);
    showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
  }
}

/**
 * Process file using streaming protocol
 */
async function processFileWithStreaming(file: File): Promise<void> {
  const operationId = generateOperationId();
  
  try {
    // Create progress UI
    createProgressUI();
    updateProgress(0, 'Initializing streaming analysis...');
    
    // Initialize streaming
    const initResponse = await chrome.runtime.sendMessage({
      type: 'STREAM_INIT',
      operation_id: operationId,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });
    
    if (!initResponse.success) {
      throw new Error('Streaming initialization failed');
    }
    
    updateProgress(10, 'Processing file chunks...');
    
    // Process chunks
    let offset = 0;
    let chunkIndex = 0;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const chunkText = await readFileAsText(chunk);
      
      const chunkResponse = await chrome.runtime.sendMessage({
        type: 'STREAM_CHUNK',
        operation_id: operationId,
        chunk: chunkText
      });
      
      if (!chunkResponse.success) {
        throw new Error('Chunk processing failed');
      }
      
      offset += CHUNK_SIZE;
      chunkIndex++;
      
      const progress = Math.min(90, 10 + (chunkIndex / totalChunks) * 80);
      updateProgress(progress, `Processing chunk ${chunkIndex}/${totalChunks}...`);
    }
    
    updateProgress(95, 'Finalizing analysis...');
    
    // Finalize
    const finalizeResponse = await chrome.runtime.sendMessage({
      type: 'STREAM_FINALIZE',
      operation_id: operationId
    });
    
    if (finalizeResponse.success) {
      updateProgress(100, 'Analysis complete!');
      showResults(finalizeResponse.result, file.name);
      showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
    } else {
      throw new Error('Streaming finalization failed');
    }
    
  } catch (error) {
    console.error('Streaming analysis failed:', error);
    showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
  } finally {
    // Remove progress UI after a delay
    setTimeout(removeProgressUI, 2000);
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
      <p>Entropy: ${result.entropy?.toFixed(2) || 'N/A'}</p>
      <p>Risk Score: ${((result.riskScore || 0) * 100).toFixed(1)}%</p>
      ${result.fallback ? '<p><em>Analysis completed using fallback method</em></p>' : ''}
    </div>
    ${result.stats ? `
    <div class="stats">
      <h4>Processing Statistics</h4>
      <p>Total Chunks: ${result.stats.totalChunks || 'N/A'}</p>
      <p>Total Content: ${(result.stats.totalContent || 0).toLocaleString()} bytes</p>
      <p>Processing Time: ${result.stats.processingTime || 'N/A'}ms</p>
    </div>
    ` : ''}
  `;
  
  document.body.appendChild(container);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (container.parentNode) {
      container.remove();
    }
  }, 10000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFileMonitoring);
} else {
  setupFileMonitoring();
}
