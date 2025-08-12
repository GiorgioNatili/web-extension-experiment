// Safari content script
import { CONFIG, MESSAGES } from 'shared';
import { getFileInfo, isValidTextFile, readFileAsText } from 'shared';
import { createElement, createProgressBar } from 'shared';

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

  // Add results table
  const resultsTable = createResultsTable();
  resultsPanel.appendChild(resultsTable);

  document.body.appendChild(resultsPanel);
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

  const tableBody = resultsPanel.querySelector('[role="rowgroup"]');
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
    fileData.riskScore = result.riskScore;
    interceptedFiles.set(file.name, fileData);
    
    // Update UI
    const action = result.decision === 'allow' ? 'Allowed' : 'Blocked';
    addResultRow(file.name, fileData.status, result.riskScore, action);
    
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
    console.error('Error analyzing intercepted file:', error);
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
    const response = await browser.runtime.sendMessage({
      type: 'ANALYZE_FILE',
      data: { content, fileName }
    });
    
    if (response.success) {
      return response.result;
    } else {
      throw new Error(response.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('Analysis failed:', error);
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
    z-index: 10002;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'assertive');

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

/**
 * Process file with streaming
 */
async function processFileWithStreaming(file: File): Promise<any> {
  const operationId = generateOperationId();
  
  try {
    createProgressUI();
    updateProgress(0, 'Initializing streaming analysis...');
    
    // Initialize streaming
    const initResponse = await browser.runtime.sendMessage({
      type: 'STREAM_INIT',
      operation_id: operationId,
      file_info: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });
    
    if (!initResponse.success) {
      throw new Error('Streaming initialization failed');
    }
    
    updateProgress(10, 'Processing file chunks...');
    
    // Process file in chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let chunkIndex = 0;
    
    while (chunkIndex < totalChunks) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = await file.slice(start, end).text();
      
      const chunkResponse = await browser.runtime.sendMessage({
        type: 'STREAM_CHUNK',
        operation_id: operationId,
        chunk,
        chunk_index: chunkIndex
      });
      
      if (!chunkResponse.success) {
        throw new Error('Chunk processing failed');
      }
      
      chunkIndex++;
      const progress = Math.min(90, 10 + (chunkIndex / totalChunks) * 80);
      updateProgress(progress, `Processing chunk ${chunkIndex}/${totalChunks}...`);
    }
    
    updateProgress(95, 'Finalizing analysis...');
    
    // Finalize
    const finalizeResponse = await browser.runtime.sendMessage({
      type: 'STREAM_FINALIZE',
      operation_id: operationId
    });
    
    if (finalizeResponse.success) {
      updateProgress(100, 'Analysis complete!');
      showResults(finalizeResponse.result, file.name);
      showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
      return finalizeResponse.result;
    } else {
      throw new Error('Streaming finalization failed');
    }
    
  } catch (error) {
    console.error('Streaming analysis failed:', error);
    showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
    throw error;
  } finally {
    // Remove progress UI after a delay
    setTimeout(removeProgressUI, 2000);
  }
}

/**
 * Show analysis results
 */
function showResults(result: any, fileName: string): void {
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
    
    showNotification(`Switched to ${uiMode} UI mode`, 'info');
  });
  
  document.body.appendChild(toggle);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorFileUploads);
} else {
  monitorFileUploads();
}

console.log('SquareX Security Scanner Safari Content Script initialized');
