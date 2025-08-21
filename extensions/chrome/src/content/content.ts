import { CONFIG, MESSAGES } from 'shared';
import { getFileInfo, isValidTextFile, readFileAsText } from 'shared';
import { createElement, showNotification, createProgressBar } from 'shared';
// Defer importing wasm glue to avoid breaking content script load if init fails
let wasmNs: any | null = null;

console.log('SquareX File Scanner Content Script loaded');

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
      const wasmJsUrl = chrome.runtime.getURL('wasm.js');
      const wasmBinaryUrl = chrome.runtime.getURL('wasm_bg.wasm');
      console.log('[Content] Loading WASM with URLs:', { wasmJsUrl, wasmBinaryUrl });
      
      wasmNs = await import(/* webpackIgnore: true */ wasmJsUrl);
    }
    // Initialize with explicit wasm URL using object parameter format
    await wasmNs.default({ module_or_path: chrome.runtime.getURL('wasm_bg.wasm') });
    wasmInitialized = true;
    console.log('[Content] WASM initialized successfully');
  } catch (e) {
    console.error('[Content] WASM init failed:', e);
    wasmInitFailed = true;
  }
}

/**
 * Message bridge: allow test pages to communicate with the extension via window.postMessage
 * This avoids calling chrome.runtime APIs directly from webpages, which requires an extensionId.
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
        const response = await chrome.runtime.sendMessage(data.payload);
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
  return `chrome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    return await analyzeFile(content, file.name);
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

// Monitor file input changes
function setupFileMonitoring() {
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
          const fileInputs = element.querySelectorAll('input[type="file"]');
          fileInputs.forEach(input => {
            interceptFileInput(input as HTMLInputElement); // Intercept file inputs
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
    if (resultsPanel) {
      createResultsPanel();
    }
    
    showNotification(`Switched to ${uiMode} UI mode`, 'success');
  });
  
  document.body.appendChild(toggle);
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
async function processFileWithStreaming(file: File): Promise<any> {
  const operationId = generateOperationId();
  
  try {
    // Create progress UI
    createProgressUI();
    updateProgress(0, 'Initializing streaming analysis...');
    
    // Initialize local WASM streaming
    await ensureWasm();
    if (!wasmInitialized || !wasmNs) throw new Error('WASM not available');
    const moduleInstance = new (wasmNs as any).WasmModule();
    let analyzer = moduleInstance.init_streaming();
    
    updateProgress(10, 'Processing file chunks...');
    
    // Process chunks
    let offset = 0;
    let chunkIndex = 0;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      // Convert Blob to File for readFileAsText
      const chunkFile = new File([chunk], `chunk_${chunkIndex}`, { type: file.type });
      const chunkText = await readFileAsText(chunkFile);
      
      // Update analyzer with processed chunk
      analyzer = moduleInstance.process_chunk(analyzer, chunkText);
      
      offset += CHUNK_SIZE;
      chunkIndex++;
      
      const progress = Math.min(90, 10 + (chunkIndex / totalChunks) * 80);
      updateProgress(progress, `Processing chunk ${chunkIndex}/${totalChunks}...`);
    }
    
    updateProgress(95, 'Finalizing analysis...');
    
    // Finalize locally
    const raw = moduleInstance.finalize_streaming(analyzer);
    const stats = moduleInstance.get_streaming_stats(analyzer);
    const result = normalizeWasmResult(raw, stats);
    updateProgress(100, 'Analysis complete!');
    showResults(result, file.name);
    showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
    return result;
    
  } catch (error) {
    console.error('Streaming analysis failed:', error);
    showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
  } finally {
    // Remove progress UI after a delay
    setTimeout(removeProgressUI, 2000);
  }
}

async function analyzeFile(content: string, fileName: string): Promise<any> {
  console.log('Analyzing file:', fileName);
  
  // Show progress
  const progressBar = createProgressBar(0);
  document.body.appendChild(progressBar);
  
  try {
    const result = await analyzeFileLocally(content);
    showResults(result, fileName);
    showNotification(MESSAGES.ANALYSIS_COMPLETE, 'success');
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    showNotification(MESSAGES.ANALYSIS_FAILED, 'error');
  } finally {
    progressBar.remove();
  }
}

async function analyzeFileLocally(content: string): Promise<any> {
  await ensureWasm();
  if (!wasmInitialized || !wasmNs) throw new Error('WASM not available');
  
  try {
    const moduleInstance = new (wasmNs as any).WasmModule();
    const analyzer = moduleInstance.init_streaming();
    
    // Process the content
    const updatedAnalyzer = moduleInstance.process_chunk(analyzer, content);
    
    // Finalize and get results
    const raw = moduleInstance.finalize_streaming(updatedAnalyzer);
    const stats = moduleInstance.get_streaming_stats(updatedAnalyzer);
    
    return normalizeWasmResult(raw, stats);
  } catch (error) {
    console.error('[Content] WASM analysis error:', error);
    throw new Error(`WASM analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizeWasmResult(raw: any, stats: any) {
  return {
    topWords: raw?.top_words ?? [],
    bannedPhrases: raw?.banned_phrases ?? [],
    piiPatterns: raw?.pii_patterns ?? [],
    entropy: raw?.entropy ?? 0,
    isObfuscated: raw?.is_obfuscated ?? false,
    decision: raw?.decision ?? 'allow',
    reason: raw?.reason ?? (Array.isArray(raw?.reasons) ? raw.reasons[0] : 'Analysis complete'),
    riskScore: raw?.risk_score ?? 0,
    stats
  };
}

async function handleLocalWasmTest(): Promise<any> {
  try {
    console.log('[Content] Starting local WASM test...');
    await ensureWasm();
    
    if (!wasmInitialized || !wasmNs) {
      console.error('[Content] WASM not available for test');
      return { 
        success: false, 
        wasmLoaded: false, 
        moduleStatus: 'error', 
        error: 'WASM not available - initialization failed' 
      };
    }
    
    console.log('[Content] WASM available, running test...');
    const moduleInstance = new (wasmNs as any).WasmModule();
    const analyzer = moduleInstance.init_streaming();
    const updatedAnalyzer = moduleInstance.process_chunk(analyzer, 'test content');
    const res = moduleInstance.finalize_streaming(updatedAnalyzer);
    
    console.log('[Content] WASM test completed successfully');
    return {
      success: true,
      wasmLoaded: true,
      moduleStatus: 'loaded',
      testResult: `WASM analysis test passed: ${JSON.stringify(res).substring(0, 100)}...`
    };
  } catch (e) {
    console.error('[Content] WASM test failed:', e);
    return {
      success: false,
      wasmLoaded: false,
      moduleStatus: 'error',
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

function showResults(result: any, fileName: string) {
  // Store latest analysis result for popup access
  const analysisResult = {
    ...result,
    fileName,
    timestamp: Date.now()
  };
  chrome.storage.local.set({ latestAnalysisResult: analysisResult });
  
  // Update the test page's results element if it exists
  const testResults = document.getElementById('test-results');
  if (testResults) {
    const riskScore = ((result.riskScore || 0) * 100).toFixed(0);
    const decision = result.decision || 'allow';
    const reason = result.reason || 'Analysis complete';
    
    testResults.innerHTML = `
      <div class="status success">
        <h4>Analysis Complete</h4>
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Risk Score:</strong> ${riskScore}%</p>
        <p><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
    console.log('[Chrome] Updated test-results element with analysis data');
  }
  
  // Also create the extension's own results display
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
  document.addEventListener('DOMContentLoaded', async () => {
    await setupFileMonitoring();
    // Send ready signal to test pages
    window.postMessage({ source: 'squarex-extension', ready: true }, '*');
  });
} else {
  setupFileMonitoring();
  // Send ready signal to test pages
  window.postMessage({ source: 'squarex-extension', ready: true }, '*');
}
