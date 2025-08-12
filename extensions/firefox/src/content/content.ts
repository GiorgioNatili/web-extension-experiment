// Firefox content script
import { CONFIG, MESSAGES } from 'shared';

console.log('SquareX Security Scanner Content Script loaded');

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
  return `firefox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

/**
 * Show notification
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  switch (type) {
    case 'success':
      notification.style.background = '#4CAF50';
      break;
    case 'error':
      notification.style.background = '#f44336';
      break;
    default:
      notification.style.background = '#2196F3';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

/**
 * Read file chunk as text
 */
function readChunkAsText(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(chunk);
  });
}

/**
 * Process file with streaming
 */
async function processFileWithStreaming(file: File): Promise<void> {
  const operationId = generateOperationId();
  
  try {
    // Create progress UI
    createProgressUI();
    updateProgress(0, 'Initializing streaming analysis...');

    // Initialize streaming
    const initResponse = await browser.runtime.sendMessage({
      type: 'STREAM_INIT',
      operation_id: operationId,
      file: { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      }
    });

    if (!initResponse.success) {
      throw new Error(initResponse.error?.message || 'Failed to initialize streaming');
    }

    updateProgress(5, 'Processing file chunks...');

    // Process file in chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let processedChunks = 0;
    let retryCount = 0;
    const maxRetries = 3;

    for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const content = await readChunkAsText(chunk);

      // Send chunk to background script with retry logic
      let chunkResponse;
      let chunkRetryCount = 0;
      
      while (chunkRetryCount < maxRetries) {
        try {
          chunkResponse = await browser.runtime.sendMessage({
            type: 'STREAM_CHUNK',
            operation_id: operationId,
            chunk: content
          });

          if (chunkResponse.success) {
            break; // Success, exit retry loop
          }

          if (chunkResponse.error?.code === 'OPERATION_PAUSED') {
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, chunkResponse.retry_after || 1000));
            chunkRetryCount++;
            continue;
          }

          if (chunkResponse.error?.code === 'TOO_MANY_ERRORS') {
            throw new Error('Too many processing errors, operation aborted');
          }

          // Other errors, retry
          chunkRetryCount++;
          if (chunkRetryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * chunkRetryCount));
          }
        } catch (error) {
          chunkRetryCount++;
          if (chunkRetryCount >= maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * chunkRetryCount));
        }
      }

      if (!chunkResponse?.success) {
        throw new Error('Chunk processing failed after retries');
      }

      processedChunks++;
      const progress = Math.min(95, (processedChunks / totalChunks) * 100);
      updateProgress(progress, `Processing chunk ${processedChunks}/${totalChunks}...`);

      // Small delay to prevent overwhelming the background script
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    updateProgress(95, 'Finalizing analysis...');

    // Finalize streaming
    const finalizeResponse = await browser.runtime.sendMessage({
      type: 'STREAM_FINALIZE',
      operation_id: operationId
    });

    if (!finalizeResponse.success) {
      throw new Error(finalizeResponse.error?.message || 'Failed to finalize analysis');
    }

    updateProgress(100, 'Analysis complete!');
    
    // Show results
    showResults(finalizeResponse.result, file.name);
    
    if (finalizeResponse.fallback) {
      showNotification('Analysis completed using fallback method', 'info');
    } else {
      showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
    }

  } catch (error) {
    console.error('Streaming analysis failed:', error);
    
    // Try to get error log from background script
    try {
      const errorLogResponse = await browser.runtime.sendMessage({
        type: 'GET_ERROR_LOG'
      });
      
      if (errorLogResponse.error_stats) {
        console.log('Error statistics:', errorLogResponse.error_stats);
      }
    } catch (logError) {
      console.error('Failed to get error log:', logError);
    }
    
    showNotification(`Analysis failed: ${error}`, 'error');
  } finally {
    // Remove progress UI after a delay
    setTimeout(removeProgressUI, 2000);
  }
}

/**
 * Show analysis results
 */
function showResults(result: any, fileName: string): void {
  const container = document.createElement('div');
  container.id = 'squarex-results';
  container.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 10002;
    font-family: Arial, sans-serif;
  `;

  const decisionColor = result.decision === 'allow' ? '#4CAF50' : '#f44336';
  const decisionText = result.decision === 'allow' ? 'SAFE' : 'BLOCKED';

  container.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #333;">Analysis Results for ${fileName}</h3>
    <div style="margin-bottom: 15px;">
      <div style="display: inline-block; padding: 8px 16px; background: ${decisionColor}; color: white; border-radius: 4px; font-weight: bold;">
        ${decisionText}
      </div>
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Reason:</strong> ${result.reason}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Risk Score:</strong> ${(result.risk_score * 100).toFixed(1)}%
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Processing Time:</strong> ${result.stats?.processing_time || 0}ms
    </div>
    <div style="margin-bottom: 15px;">
      <strong>File Size:</strong> ${(result.stats?.total_content / 1024).toFixed(1)} KB
    </div>
    <button onclick="this.parentElement.remove()" style="
      background: #2196F3; 
      color: white; 
      border: none; 
      padding: 8px 16px; 
      border-radius: 4px; 
      cursor: pointer;
    ">Close</button>
  `;

  document.body.appendChild(container);
}

/**
 * Handle file selection with streaming support
 */
async function handleFileSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  console.log('File selected:', file.name, file.size, file.type);
  
  // Validate file type
  if (!file.type.includes('text') && !file.name.endsWith('.txt')) {
    showNotification(MESSAGES.INVALID_FILE_TYPE, 'error');
    return;
  }
  
  // Use streaming for files larger than 1MB, traditional for smaller files
  if (file.size > 1024 * 1024) {
    await processFileWithStreaming(file);
  } else {
    // Use traditional analysis for small files
    try {
      const content = await file.text();
      const response = await browser.runtime.sendMessage({
        type: 'ANALYZE_FILE',
        data: { content, fileName: file.name }
      });
      
      if (response.success) {
        showResults(response.result, file.name);
        showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
      } else {
        showNotification(response.error || MESSAGES.ANALYSIS_FAILED, 'error');
      }
    } catch (error) {
      console.error('Traditional analysis failed:', error);
      showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
    }
  }
}

/**
 * Monitor file uploads
 */
function monitorFileUploads(): void {
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
          if (element.querySelector && typeof element.querySelector === 'function') {
            const fileInputs = element.querySelectorAll('input[type="file"]');
            fileInputs.forEach(input => {
              input.addEventListener('change', handleFileSelect);
            });
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorFileUploads);
} else {
  monitorFileUploads();
}

console.log('SquareX Security Scanner Content Script initialized');
