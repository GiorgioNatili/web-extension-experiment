// Safari content script
import { CONFIG, MESSAGES } from 'shared';
import { getFileInfo, isValidTextFile, readFileAsText } from 'shared';
import { createElement, createProgressBar } from 'shared';
// Defer importing wasm glue to avoid breaking content script load if init fails
let wasmNs: any | null = null;

console.log('SquareX Security Scanner Safari Content Script loaded');

// Configuration
const CHUNK_SIZE = CONFIG.CHUNK_SIZE; // 1MB chunks

// UI elements for progress tracking
let progressContainer: HTMLElement | null = null;
let progressBar: HTMLElement | null = null;
let statusText: HTMLElement | null = null;

// File interception and UI state
let fileInterceptionEnabled = true;
let uiMode: 'compact' | 'sidebar' = 'compact';
let resultsPanel: HTMLElement | null = null;
let interceptedFiles = new Map<string, any>();

// WASM init state
let wasmInitialized = false;
let wasmInitFailed = false;

async function ensureWasm(): Promise<void> {
  if (wasmInitialized || wasmInitFailed) return;
  try {
    if (!wasmNs) {
      // Use the same approach as the shared loader - dynamic import with runtime URL
      const wasmJsUrl = browser.runtime.getURL('wasm.js');
      const wasmBinaryUrl = browser.runtime.getURL('wasm_bg.wasm');
      console.log('[Content] Loading WASM with URLs:', { wasmJsUrl, wasmBinaryUrl });
      
      wasmNs = await import(/* webpackIgnore: true */ wasmJsUrl);
    }
    // Initialize with explicit wasm URL using object parameter format
    await wasmNs.default({ module_or_path: browser.runtime.getURL('wasm_bg.wasm') });
    wasmInitialized = true;
    console.log('[Content] WASM initialized successfully');
  } catch (e) {
    console.error('[Content] WASM init failed:', e);
    wasmInitFailed = true;
  }
}

/**
 * Message bridge: allow test pages to communicate with the extension via window.postMessage
 * This avoids calling browser.runtime APIs directly from webpages, which requires an extensionId.
 */
window.addEventListener('message', async (event: MessageEvent) => {
  try {
    // Only accept messages from the same window
    if (event.source !== window) return;

    const data: any = (event as any).data;
    if (!data || data.source !== 'squarex-test' || !data.payload) return;

    const correlationId = data.correlationId || null;
    try {
      if (data.payload?.type === 'TEST_WASM_LOADING') {
        const resp = await handleLocalWasmTest();
        console.log('[Content] WASM test response:', resp);
        window.postMessage({ source: 'squarex-extension', correlationId, response: resp }, '*');
      } else if (data.payload?.type === 'ANALYZE_FILE_BRIDGE' && data.payload?.content) {
        const result = await analyzeFileLocally(data.payload.content);
        window.postMessage({ source: 'squarex-extension', correlationId, response: { success: true, result } }, '*');
      } else {
        const response = await browser.runtime.sendMessage(data.payload);
        window.postMessage({ source: 'squarex-extension', correlationId, response }, '*');
      }
    } catch (error) {
      console.error('[Content] Message bridge error:', error);
      const message = error instanceof Error ? error.message : String(error);
      window.postMessage({ source: 'squarex-extension', correlationId, error: message }, '*');
    }
  } catch (e) {
    // Swallow unexpected bridge errors to avoid breaking the page
    console.error('[Content] Unexpected bridge error:', e);
  }
});

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  return `safari_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create ARIA-accessible results panel
 */
function createResultsPanel(): void {
  // Remove existing panel if any
  if (resultsPanel) {
    resultsPanel.remove();
  }

  resultsPanel = document.createElement('div');
  resultsPanel.id = 'squarex-results-panel';
  resultsPanel.setAttribute('role', 'region');
  resultsPanel.setAttribute('aria-label', 'SquareX File Analysis Results');
  resultsPanel.setAttribute('aria-live', 'polite');
  
  const panelStyle = uiMode === 'compact' ? `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 80vh;
    background: white;
    border: 2px solid #007bff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 10001;
    font-family: Arial, sans-serif;
    overflow-y: auto;
  ` : `
    position: fixed;
    top: 0;
    right: 0;
    width: 350px;
    height: 100vh;
    background: white;
    border-left: 2px solid #007bff;
    box-shadow: -4px 0 12px rgba(0,0,0,0.1);
    z-index: 10001;
    font-family: Arial, sans-serif;
    overflow-y: auto;
    padding: 20px;
  `;
  
  resultsPanel.style.cssText = panelStyle;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  `;

  const title = document.createElement('h3');
  title.textContent = 'SquareX File Scanner';
  title.style.margin = '0';
  title.style.color = '#333';
  title.setAttribute('role', 'heading');
  title.setAttribute('aria-level', '3');

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Close results panel');
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  `;
  
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.backgroundColor = '#f0f0f0';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.backgroundColor = 'transparent';
  });
  
  closeButton.addEventListener('click', () => {
    if (resultsPanel) {
      resultsPanel.remove();
      resultsPanel = null;
    }
  });

  header.appendChild(title);
  header.appendChild(closeButton);
  resultsPanel.appendChild(header);

  // Add toggle button for UI mode
  const toggleButton = document.createElement('button');
  toggleButton.textContent = uiMode === 'compact' ? '📋' : '📱';
  toggleButton.setAttribute('aria-label', `Switch to ${uiMode === 'compact' ? 'sidebar' : 'compact'} mode`);
  toggleButton.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  `;
  
  toggleButton.addEventListener('mouseenter', () => {
    toggleButton.style.backgroundColor = '#0056b3';
  });
  
  toggleButton.addEventListener('mouseleave', () => {
    toggleButton.style.backgroundColor = '#007bff';
  });
  
  toggleButton.addEventListener('click', () => {
    uiMode = uiMode === 'compact' ? 'sidebar' : 'compact';
    if (resultsPanel) {
      resultsPanel.remove();
      createResultsPanel();
    }
  });

  resultsPanel.appendChild(toggleButton);
  document.body.appendChild(resultsPanel);
}

/**
 * Create progress UI for file processing
 */
function createProgressUI(): void {
  if (progressContainer) {
    progressContainer.remove();
  }

  progressContainer = document.createElement('div');
  progressContainer.id = 'squarex-progress';
  progressContainer.setAttribute('role', 'status');
  progressContainer.setAttribute('aria-live', 'polite');
  progressContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 2px solid #007bff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
    min-width: 300px;
    max-width: 500px;
  `;

  const title = document.createElement('h4');
  title.textContent = 'Processing File...';
  title.style.margin = '0 0 15px 0';
  title.style.color = '#333';

  progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
  `;

  const progressFill = document.createElement('div');
  progressFill.style.cssText = `
    width: 0%;
    height: 100%;
    background: #007bff;
    transition: width 0.3s ease;
  `;
  progressFill.id = 'squarex-progress-fill';

  statusText = document.createElement('div');
  statusText.textContent = 'Initializing...';
  statusText.style.cssText = `
    font-size: 14px;
    color: #666;
    text-align: center;
  `;

  progressBar.appendChild(progressFill);
  progressContainer.appendChild(title);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(statusText);
  document.body.appendChild(progressContainer);
}

/**
 * Update progress bar
 */
function updateProgress(percent: number, status: string): void {
  if (progressContainer && progressBar && statusText) {
    const progressFill = progressBar.querySelector('#squarex-progress-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (statusText) {
      statusText.textContent = status;
    }
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
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'assertive');
  
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#007bff'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type]};
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

/**
 * Monitor file uploads on the page
 */
function monitorFileUploads(): void {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  
  fileInputs.forEach((input: Element) => {
    const fileInput = input as HTMLInputElement;
    
    // Skip if already monitored
    if (fileInput.hasAttribute('data-squarex-monitored')) {
      return;
    }
    
    fileInput.setAttribute('data-squarex-monitored', 'true');
    
    fileInput.addEventListener('change', async (event: Event) => {
      if (!fileInterceptionEnabled) return;
      
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      if (!files || files.length === 0) return;
      
      const file = files[0];
      
      // Only process text files
      if (!isValidTextFile(file)) {
        console.log('[Safari] Skipping non-text file:', file.name);
        return;
      }
      
      console.log('[Safari] Processing file:', file.name, 'Size:', file.size);
      
      try {
        await processFile(file);
      } catch (error) {
        console.error('[Safari] Error processing file:', error);
        showNotification('Error processing file', 'error');
      }
    });
  });
}

/**
 * Process a single file
 */
async function processFile(file: File): Promise<void> {
  const operationId = generateOperationId();
  const fileInfo = getFileInfo(file);
  
  console.log('[Safari] Starting file processing:', fileInfo);
  
  // Create progress UI
  createProgressUI();
  updateProgress(0, 'Reading file...');
  
  try {
    let result: any;
    
    if (file.size <= CHUNK_SIZE) {
      // Small file - process directly
      result = await processSmallFile(file);
    } else {
      // Large file - use streaming
      result = await processLargeFile(file, operationId);
    }
    
    // Show results
    showResults(result, file.name);
    
    // Update progress to 100%
    updateProgress(100, 'Analysis complete');
    
    // Remove progress UI after a short delay
    setTimeout(() => {
      removeProgressUI();
    }, 1000);
    
  } catch (error) {
    console.error('[Safari] File processing failed:', error);
    removeProgressUI();
    showNotification('File analysis failed', 'error');
    throw error;
  }
}

/**
 * Process small files (≤ 1MB) with traditional method
 */
async function processSmallFile(file: File): Promise<any> {
  updateProgress(10, 'Reading file content...');
  
  const content = await readFileAsText(file);
  updateProgress(30, 'Analyzing content...');
  
  const response = await browser.runtime.sendMessage({
    type: 'ANALYZE_FILE',
    data: { content, fileName: file.name }
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Analysis failed');
  }
  
  updateProgress(90, 'Finalizing results...');
  return response.result;
}

/**
 * Process large files (> 1MB) with streaming
 */
async function processLargeFile(file: File, operationId: string): Promise<any> {
  updateProgress(5, 'Initializing streaming analysis...');
  
  // Initialize streaming
  const initResponse = await browser.runtime.sendMessage({
    type: 'STREAM_INIT',
    operation_id: operationId,
    file_info: getFileInfo(file)
  });
  
  if (!initResponse.success) {
    throw new Error('Streaming initialization failed');
  }
  
  updateProgress(10, 'Processing file chunks...');
  
  // Process file in chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let processedChunks = 0;
  
     for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
     const chunk = file.slice(offset, offset + CHUNK_SIZE);
     const chunkContent = await new Promise<string>((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = () => resolve(reader.result as string);
       reader.onerror = () => reject(reader.error);
       reader.readAsText(chunk);
     });
    
    const chunkResponse = await browser.runtime.sendMessage({
      type: 'STREAM_CHUNK',
      operation_id: operationId,
      chunk: chunkContent,
      chunk_index: processedChunks
    });
    
    if (!chunkResponse.success) {
      throw new Error('Chunk processing failed');
    }
    
    processedChunks++;
    const progress = 10 + (processedChunks / totalChunks) * 80;
    updateProgress(progress, `Processing chunk ${processedChunks}/${totalChunks}...`);
  }
  
  updateProgress(90, 'Finalizing analysis...');
  
  // Finalize streaming
  const finalizeResponse = await browser.runtime.sendMessage({
    type: 'STREAM_FINALIZE',
    operation_id: operationId
  });
  
  if (!finalizeResponse.success) {
    throw new Error('Streaming finalization failed');
  }
  
  return finalizeResponse.result;
}

/**
 * Show analysis results
 */
function showResults(result: any, fileName: string): void {
  // Store latest analysis result for consistency
  const analysisResult = {
    ...result,
    fileName,
    timestamp: Date.now()
  };
  browser.storage.local.set({ latestAnalysisResult: analysisResult });
  
  // Update the test page's results element if it exists
  const testResults = document.getElementById('test-results');
  if (testResults) {
    const normalizedRisk = (typeof result?.riskScore === 'number')
      ? result.riskScore
      : (typeof result?.risk_score === 'number' ? result.risk_score : 0);
    const decision = result.decision || 'allow';
    const reason = result.reason || 'Analysis complete';
    testResults.innerHTML = `
      <div class="status success">
        <h4>Analysis Complete</h4>
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Risk Score:</strong> ${(normalizedRisk * 100).toFixed(0)}%</p>
        <p><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
    console.log('[Safari] Updated test-results element with analysis data');
  }
  
  // Create results panel
  if (!resultsPanel) {
    createResultsPanel();
  }
  
  // Clear existing content
  const existingContent = resultsPanel?.querySelector('.results-content');
  if (existingContent) {
    existingContent.remove();
  }
  
  if (!resultsPanel) return;
  
  const content = document.createElement('div');
  content.className = 'results-content';
  
  const riskScore = (result.riskScore || result.risk_score || 0) * 100;
  const decision = result.decision || 'allow';
  const reason = result.reason || 'Analysis complete';
  
  const statusClass = decision === 'allow' ? 'success' : 'error';
  const statusText = decision === 'allow' ? 'Allowed' : 'Blocked';
  
  content.innerHTML = `
    <div class="result-item ${statusClass}">
      <h4>File Analysis Results</h4>
      <div class="result-details">
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Decision:</strong> <span class="decision ${statusClass}">${statusText}</span></p>
        <p><strong>Risk Score:</strong> <span class="risk-score">${riskScore.toFixed(1)}%</span></p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Analysis Time:</strong> ${new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .result-item {
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 15px;
    }
    .result-item.success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }
    .result-item.error {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
    .result-details p {
      margin: 8px 0;
      font-size: 14px;
    }
    .decision {
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .decision.success {
      background: #28a745;
      color: white;
    }
    .decision.error {
      background: #dc3545;
      color: white;
    }
    .risk-score {
      font-weight: bold;
      color: ${riskScore > 70 ? '#dc3545' : riskScore > 30 ? '#ffc107' : '#28a745'};
    }
  `;
  
  content.appendChild(style);
  resultsPanel.appendChild(content);
  
  // Show notification
  const notificationType = decision === 'allow' ? 'success' : 'error';
  const notificationMessage = decision === 'allow' 
    ? `File "${fileName}" allowed (${riskScore.toFixed(1)}% risk)`
    : `File "${fileName}" blocked (${riskScore.toFixed(1)}% risk)`;
  
  showNotification(notificationMessage, notificationType);
}

/**
 * Handle local WASM test
 */
async function handleLocalWasmTest(): Promise<any> {
  try {
    await ensureWasm();
    return { success: true, wasm_loaded: wasmInitialized };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Analyze file locally using WASM
 */
async function analyzeFileLocally(content: string): Promise<any> {
  try {
    await ensureWasm();
    if (!wasmInitialized) {
      throw new Error('WASM not initialized');
    }
    
    // Use WASM module for local analysis
    const result = wasmNs.analyze_content(content);
    return result;
  } catch (error: unknown) {
    console.error('[Content] Local analysis failed:', error);
    throw error as Error;
  }
}

/**
 * Listen for extension ready signal from background script
 */
browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'EXTENSION_READY' && message.source === 'squarex-extension') {
    console.log('[Safari] Received extension ready signal from background script');
    try {
      window.postMessage({ source: 'squarex-extension', ready: true }, '*');
    } catch (_) {}
  }
});

/**
 * Monitor for new file inputs added to the page
 */
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const fileInputs = element.querySelectorAll('input[type="file"]');
          if (fileInputs.length > 0) {
            monitorFileUploads();
          }
        }
      });
    }
  });
});

/**
 * Initialize the content script
 */
function initialize(): void {
  console.log('[Safari] Initializing content script...');
  
  // Monitor existing file inputs
  monitorFileUploads();
  
  // Start observing for new file inputs
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Send ready signal to test pages
  try {
    window.postMessage({ source: 'squarex-extension', ready: true }, '*');
  } catch (_) {}
  
  console.log('[Safari] Content script initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
