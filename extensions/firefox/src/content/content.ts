// Firefox content script
import { CONFIG, MESSAGES } from 'shared';
import { getFileInfo, isValidTextFile, readFileAsText } from 'shared';
import { createElement, createProgressBar } from 'shared';

console.log('SquareX Security Scanner Content Script loaded');
// Proactively signal multiple times in case the page script attaches late
try {
  window.postMessage({ source: 'squarex-extension', ready: true }, '*');
  setTimeout(() => {
    try { window.postMessage({ source: 'squarex-extension', ready: true }, '*'); } catch (_) {}
  }, 500);
  setTimeout(() => {
    try { window.postMessage({ source: 'squarex-extension', ready: true }, '*'); } catch (_) {}
  }, 1500);
} catch (_) {}

// Message bridge for test pages (parity with Chrome)
window.addEventListener('message', async (event: MessageEvent) => {
  try {
    if (event.source !== window) return;
    const data: any = (event as any).data;
    if (!data || data.source !== 'squarex-test' || !data.payload) return;

    const correlationId = data.correlationId || null;
    try {
      const response = await (browser as any).runtime.sendMessage(data.payload);
      window.postMessage({ source: 'squarex-extension', correlationId, response }, '*');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.postMessage({ source: 'squarex-extension', correlationId, error: message }, '*');
    }
  } catch (_) {
    // ignore bridge errors
  }
});

// Signal presence to the page for faster detection
try {
  window.postMessage({ source: 'squarex-extension', ready: true }, '*');
} catch (_) {}

// Listen for extension ready signal from background script
browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'EXTENSION_READY' && message.source === 'squarex-extension') {
    console.log('[FF] Received extension ready signal from background script');
    try {
      window.postMessage({ source: 'squarex-extension', ready: true }, '*');
    } catch (_) {}
  }
});

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

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  return `firefox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate file before processing
 */
function validateFileForProcessing(file: File): void {
  // Check if file exists
  if (!file) {
    throw new Error('Invalid file: file is null or undefined');
  }
  
  // Check file size
  if (file.size === 0) {
    throw new Error('Invalid file: file is empty (0 bytes)');
  }
  
  // Check file size limits (100MB max)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 100MB`);
  }
  
  // Check file name
  if (!file.name || file.name.trim() === '') {
    throw new Error('Invalid file: file has no name');
  }
  
  // Check file type
  if (!file.type) {
    console.warn('[FF] File has no MIME type, proceeding with validation');
  }
  
  console.log('[FF] File validation passed:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  });
}

/**
 * Validate file content before WASM processing
 */
function validateFileContent(content: string, fileName: string): void {
  // Check if content exists
  if (!content) {
    throw new Error(`Invalid content: file "${fileName}" has no content`);
  }
  
  // Check content length
  if (content.length === 0) {
    throw new Error(`Invalid content: file "${fileName}" is empty`);
  }
  
  // Check for reasonable content length (prevent memory issues)
  const MAX_CONTENT_LENGTH = 50 * 1024 * 1024; // 50MB
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content too large: ${(content.length / 1024 / 1024).toFixed(1)}MB exceeds maximum of 50MB`);
  }
  
  console.log('[FF] Content validation passed:', {
    fileName: fileName,
    contentLength: content.length,
    hasContent: content.length > 0
  });
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
  `;
  closeButton.addEventListener('click', () => {
    if (resultsPanel) {
      resultsPanel.remove();
      resultsPanel = null;
    }
  });

  header.appendChild(title);
  header.appendChild(closeButton);
  resultsPanel.appendChild(header);

  // Add welcome message and instructions
  const welcomeDiv = document.createElement('div');
  welcomeDiv.style.cssText = `
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    margin-bottom: 20px;
    border-left: 4px solid #007bff;
  `;
  welcomeDiv.innerHTML = `
    <h4 style="margin: 0 0 10px 0; color: #007bff;">Welcome to SquareX File Scanner</h4>
    <p style="margin: 0; font-size: 13px; color: #666;">
      This extension monitors file uploads and analyzes them for security risks.
      Upload a text file to see analysis results here.
    </p>
  `;
  resultsPanel.appendChild(welcomeDiv);

  // Add results table
  const resultsTable = createResultsTable();
  resultsPanel.appendChild(resultsTable);

  document.body.appendChild(resultsPanel);
  console.log('[FF] Results panel created and visible');
}

/**
 * Create ARIA-accessible results table
 */
function createResultsTable(): HTMLElement {
  const tableContainer = document.createElement('div');
  tableContainer.setAttribute('role', 'table');
  tableContainer.setAttribute('aria-label', 'File analysis results');

  const tableHeader = document.createElement('div');
  tableHeader.setAttribute('role', 'row');
  tableHeader.style.cssText = `
    display: grid;
    grid-template-columns: ${uiMode === 'compact' ? '1fr 80px 80px 80px' : '1fr 100px 100px 100px'};
    gap: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    font-weight: bold;
    font-size: 14px;
  `;

  const headers = ['File', 'Status', 'Risk', 'Action'];
  headers.forEach((headerText, index) => {
    const header = document.createElement('div');
    header.setAttribute('role', 'columnheader');
    header.textContent = headerText;
    header.style.cssText = `
      padding: 8px;
      text-align: ${index === 0 ? 'left' : 'center'};
    `;
    tableHeader.appendChild(header);
  });

  tableContainer.appendChild(tableHeader);

  // Add table body
  const tableBody = document.createElement('div');
  tableBody.setAttribute('role', 'rowgroup');
  tableContainer.appendChild(tableBody);

  return tableContainer;
}

/**
 * Add result row to the table
 */
function addResultRow(fileName: string, status: string, riskScore: number, action: string): void {
  if (!resultsPanel) {
    createResultsPanel();
  }

  const tableBody = resultsPanel?.querySelector('[role="rowgroup"]');
  if (!tableBody) return;

  const row = document.createElement('div');
  row.setAttribute('role', 'row');
  row.style.cssText = `
    display: grid;
    grid-template-columns: ${uiMode === 'compact' ? '1fr 80px 80px 80px' : '1fr 100px 100px 100px'};
    gap: 10px;
    padding: 10px;
    border-bottom: 1px solid #eee;
    align-items: center;
    font-size: 14px;
  `;

  const fileNameCell = document.createElement('div');
  fileNameCell.setAttribute('role', 'cell');
  fileNameCell.textContent = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
  fileNameCell.title = fileName;
  fileNameCell.style.cssText = 'padding: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

  const statusCell = document.createElement('div');
  statusCell.setAttribute('role', 'cell');
  statusCell.textContent = status;
  statusCell.style.cssText = `
    padding: 8px;
    text-align: center;
    font-weight: bold;
    color: ${status === 'Blocked' ? '#dc3545' : status === 'Allowed' ? '#28a745' : '#ffc107'};
  `;

  const riskCell = document.createElement('div');
  riskCell.setAttribute('role', 'cell');
  riskCell.textContent = `${(riskScore * 100).toFixed(0)}%`;
  riskCell.style.cssText = `
    padding: 8px;
    text-align: center;
    color: ${riskScore > 0.7 ? '#dc3545' : riskScore > 0.3 ? '#ffc107' : '#28a745'};
  `;

  const actionCell = document.createElement('div');
  actionCell.setAttribute('role', 'cell');
  actionCell.style.cssText = 'padding: 8px; text-align: center;';

  if (action === 'Blocked') {
    const overrideButton = document.createElement('button');
    overrideButton.textContent = 'Override';
    overrideButton.setAttribute('aria-label', `Override block for ${fileName}`);
    overrideButton.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    overrideButton.addEventListener('click', () => handleOverride(fileName));
    actionCell.appendChild(overrideButton);
  } else {
    actionCell.textContent = action;
  }

  row.appendChild(fileNameCell);
  row.appendChild(statusCell);
  row.appendChild(riskCell);
  row.appendChild(actionCell);

  tableBody.appendChild(row);
}

/**
 * Handle file override (user allows blocked file)
 */
function handleOverride(fileName: string): void {
  const fileData = interceptedFiles.get(fileName);
  if (fileData) {
    // Allow the file to proceed
    fileData.override = true;
    interceptedFiles.set(fileName, fileData);
    
    // Update UI
    addResultRow(fileName, 'Allowed', fileData.riskScore, 'Override');
    
    // Notify user
    showNotification(`File "${fileName}" has been allowed by user override`, 'success');
  }
}

/**
 * Intercept file input changes
 */
function interceptFileInput(input: HTMLInputElement): void {
  const originalAddEventListener = input.addEventListener;
  
  input.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    if (type === 'change') {
      const wrappedListener = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
        if (files && files.length > 0 && fileInterceptionEnabled) {
          event.preventDefault();
          event.stopPropagation();
          
          // Process each file
          Array.from(files).forEach(file => {
            handleInterceptedFile(file, input);
          });
          
          // Clear the input to prevent form submission
          target.value = '';
        } else {
          // Call original listener if no files or interception disabled
          if (typeof listener === 'function') {
            listener.call(this, event);
          }
        }
      };
      
      originalAddEventListener.call(this, type, wrappedListener, options);
    } else {
      originalAddEventListener.call(this, type, listener, options);
    }
  };
}

/**
 * Handle intercepted file
 */
async function handleInterceptedFile(file: File, input: HTMLInputElement): Promise<void> {
  console.log('Intercepting file:', file.name);
  
  // Store file data
  const fileData = {
    file,
    input,
    timestamp: Date.now(),
    status: 'Processing',
    riskScore: 0,
    override: false
  };
  interceptedFiles.set(file.name, fileData);
  
  // Add to results table
  addResultRow(file.name, 'Processing', 0, 'Analyzing...');
  
  try {
    // Validate file before processing
    validateFileForProcessing(file);
    
    // Validate file type
    if (!isValidTextFile(file)) {
      fileData.status = 'Invalid';
      fileData.riskScore = 1.0;
      addResultRow(file.name, 'Invalid', 1.0, 'Blocked');
      showNotification(`File "${file.name}" is not a supported text file type`, 'error');
      return;
    }
    
    // Analyze file
    const result = await analyzeInterceptedFile(file);
    
    // Update file data
    fileData.status = result.decision === 'allow' ? 'Allowed' : 'Blocked';
    const normalizedRisk = (typeof result?.riskScore === 'number')
      ? result.riskScore
      : (typeof result?.risk_score === 'number' ? result.risk_score : 0);
    fileData.riskScore = normalizedRisk;
    interceptedFiles.set(file.name, fileData);
    
    // Update UI
    const action = result.decision === 'allow' ? 'Allowed' : 'Blocked';
    addResultRow(file.name, fileData.status, normalizedRisk, action);
    
    // Show notification
    const message = result.decision === 'allow' 
      ? `File "${file.name}" is safe to upload`
      : `File "${file.name}" has been blocked due to security concerns`;
    showNotification(message, result.decision === 'allow' ? 'success' : 'error');
    
    // Handle blocking
    if (result.decision === 'block' && !fileData.override) {
      // Prevent form submission or file upload
      preventFileUpload(input, file.name);
    }
    
  } catch (error) {
    // Enhanced error logging for Firefox debugging
    console.error('[FF] Detailed file analysis error:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    fileData.status = 'Error';
    fileData.riskScore = 1.0;
    addResultRow(file.name, 'Error', 1.0, 'Blocked');
    showNotification(`Error analyzing file "${file.name}"`, 'error');
  }
}

/**
 * Analyze intercepted file
 */
async function analyzeInterceptedFile(file: File): Promise<any> {
  // Use streaming for files larger than 1MB, traditional for smaller files
  if (file.size > 1024 * 1024) {
    return await processFileWithStreaming(file);
  } else {
    const content = await readFileAsText(file);
    return await analyzeFileContent(content, file.name);
  }
}

/**
 * Analyze file content
 */
async function analyzeFileContent(content: string, fileName: string): Promise<any> {
  try {
    // Validate content before WASM processing
    validateFileContent(content, fileName);
    
    console.log('[FF] Sending analysis request to background script:', {
      fileName: fileName,
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
    const response = await browser.runtime.sendMessage({
      type: 'ANALYZE_FILE',
      data: { content, fileName }
    });
    
    console.log('[FF] Received response from background script:', {
      success: response?.success,
      hasResult: !!response?.result,
      hasError: !!response?.error,
      timestamp: new Date().toISOString()
    });
    
    if (response.success) {
      return response.result;
    } else {
      throw new Error(response.error || 'Analysis failed');
    }
  } catch (error) {
    // Enhanced error logging for Firefox debugging
    console.error('[FF] Detailed analysis error:', {
      fileName: fileName,
      contentLength: content.length,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    throw error;
  }
}

/**
 * Prevent file upload
 */
function preventFileUpload(input: HTMLInputElement, fileName: string): void {
  // Clear the input
  input.value = '';
  
  // Find and disable submit buttons
  const form = input.closest('form');
  if (form) {
    const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    submitButtons.forEach(button => {
      const btn = button as HTMLButtonElement;
      btn.disabled = true;
      btn.title = `Upload blocked due to security concerns with file: ${fileName}`;
    });
  }
  
  // Add visual indicator
  input.style.borderColor = '#dc3545';
  input.style.backgroundColor = '#f8d7da';
  input.title = `File "${fileName}" has been blocked for security reasons`;
  
  // Reset after 5 seconds
  setTimeout(() => {
    input.style.borderColor = '';
    input.style.backgroundColor = '';
    input.title = '';
    
    if (form) {
      const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
      submitButtons.forEach(button => {
        const btn = button as HTMLButtonElement;
        btn.disabled = false;
        btn.title = '';
      });
    }
  }, 5000);
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
  progressContainer.setAttribute('role', 'status');
  progressContainer.setAttribute('aria-live', 'polite');
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
    // Validate file before streaming processing
    validateFileForProcessing(file);
    
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
      
      // Validate chunk content
      if (!content || content.length === 0) {
        console.warn('[FF] Empty chunk detected, skipping');
        continue;
      }

      // Send chunk to background script with retry logic
      let chunkResponse: any;
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
    
    // Update test results with proper error handling
    try {
      const testResults = document.getElementById('test-results');
      if (testResults) {
        const risk = (typeof finalizeResponse.result?.riskScore === 'number')
          ? finalizeResponse.result.riskScore
          : (typeof finalizeResponse.result?.risk_score === 'number' ? finalizeResponse.result.risk_score : 0);
        const decision = finalizeResponse.result?.decision || 'allow';
        const reason = finalizeResponse.result?.reason || 'Analysis complete';
        
        testResults.innerHTML = `
          <div class="status success">
            <h4>Analysis Complete</h4>
            <p><strong>File:</strong> ${file.name}</p>
            <p><strong>Risk Score:</strong> ${(risk * 100).toFixed(0)}%</p>
            <p><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
          </div>
        `;
        console.log('[FF] Test results updated successfully');
      }
    } catch (error) {
      console.error('[FF] Failed to update test results:', error);
    }
    
    if (finalizeResponse.fallback) {
      showNotification('Analysis completed using fallback method', 'info');
    } else {
      showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
    }

  } catch (error) {
    // Enhanced error logging for Firefox streaming analysis
    console.error('[FF] Detailed streaming analysis error:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      operationId: operationId,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    // Try to get error log from background script
    try {
      const errorLogResponse = await browser.runtime.sendMessage({
        type: 'GET_ERROR_LOG'
      });
      
      if (errorLogResponse.error_stats) {
        console.log('[FF] Error statistics:', errorLogResponse.error_stats);
      }
    } catch (logError) {
      console.error('[FF] Failed to get error log:', logError);
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
    console.log('[Firefox] Updated test-results element with analysis data');
  }
  
  // Normalize fields across snake/camel
  const normalizedRisk = (typeof result?.riskScore === 'number')
    ? result.riskScore
    : (typeof result?.risk_score === 'number' ? result.risk_score : 0);
  const totalContent = (result?.stats && (result.stats.total_content ?? result.stats.totalContent)) || 0;

  // Also reflect in the results panel table for consistency with streaming UI
  try {
    const status = result.decision === 'allow' ? 'Allowed' : 'Blocked';
    addResultRow(fileName, status, normalizedRisk, status);
  } catch (_) {}

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
      <strong>Risk Score:</strong> ${(normalizedRisk * 100).toFixed(1)}%
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Processing Time:</strong> ${result.stats?.processing_time || result.stats?.processingTime || 0}ms
    </div>
    <div style="margin-bottom: 15px;">
      <strong>File Size:</strong> ${(totalContent / 1024).toFixed(1)} KB
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
        
        // Update test results with proper error handling
        try {
          const testResults = document.getElementById('test-results');
          if (testResults) {
            const risk = (typeof response.result?.riskScore === 'number')
              ? response.result.riskScore
              : (typeof response.result?.risk_score === 'number' ? response.result.risk_score : 0);
            const decision = response.result?.decision || 'allow';
            const reason = response.result?.reason || 'Analysis complete';
            
            testResults.innerHTML = `
              <div class="status success">
                <h4>Analysis Complete</h4>
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Risk Score:</strong> ${(risk * 100).toFixed(0)}%</p>
                <p><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
              </div>
            `;
            console.log('[FF] Test results updated successfully (traditional analysis)');
          }
        } catch (error) {
          console.error('[FF] Failed to update test results (traditional analysis):', error);
        }
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
  console.log('[FF] Setting up file monitoring...');
  
  const fileInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FF] Found', fileInputs.length, 'file inputs');
  
  fileInputs.forEach(input => {
    interceptFileInput(input as HTMLInputElement); // Intercept file inputs
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
              interceptFileInput(input as HTMLInputElement); // Intercept file inputs
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
  
  // Add UI mode toggle (compact vs sidebar)
  addUIModeToggle();
  
  // Create initial results panel for visibility
  createResultsPanel();
  
  console.log('[FF] File monitoring setup complete');
}

/**
 * Add UI mode toggle for compact vs sidebar
 */
function addUIModeToggle(): void {
  const toggle = document.createElement('div');
  toggle.id = 'squarex-ui-toggle';
  toggle.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #007bff;
    color: white;
    padding: 10px 15px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10002;
    user-select: none;
  `;
  toggle.textContent = `UI: ${uiMode === 'compact' ? 'Compact' : 'Sidebar'}`;
  toggle.setAttribute('role', 'button');
  toggle.setAttribute('aria-label', 'Toggle UI mode between compact and sidebar');
  
  toggle.addEventListener('click', () => {
    uiMode = uiMode === 'compact' ? 'sidebar' : 'compact';
    toggle.textContent = `UI: ${uiMode === 'compact' ? 'Compact' : 'Sidebar'}`;
    
    // Recreate results panel with new mode
    createResultsPanel();
    
    showNotification(`Switched to ${uiMode} UI mode`, 'success');
  });
  
  // Add a button to show results panel if it's closed
  const showPanelButton = document.createElement('div');
  showPanelButton.id = 'squarex-show-panel';
  showPanelButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 200px;
    background: #28a745;
    color: white;
    padding: 10px 15px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10002;
    user-select: none;
  `;
  showPanelButton.textContent = 'Show Results Panel';
  showPanelButton.setAttribute('role', 'button');
  showPanelButton.setAttribute('aria-label', 'Show the SquareX results panel');
  
  showPanelButton.addEventListener('click', () => {
    if (!resultsPanel) {
      createResultsPanel();
      showNotification('Results panel opened', 'success');
    } else {
      showNotification('Results panel is already visible', 'success');
    }
  });
  
  document.body.appendChild(toggle);
  document.body.appendChild(showPanelButton);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorFileUploads);
} else {
  monitorFileUploads();
}

console.log('SquareX Security Scanner Content Script initialized');
