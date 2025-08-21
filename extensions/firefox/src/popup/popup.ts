// Firefox popup script

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
  const optionsBtn = document.getElementById('optionsBtn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const fileCountSpan = document.getElementById('fileCount') as HTMLSpanElement;
  const threatCountSpan = document.getElementById('threatCount') as HTMLSpanElement;
  const testBtn = document.getElementById('testWasmButton') as HTMLButtonElement | null;

  // Load current status
  const result = await browser.storage.local.get(['scannerEnabled', 'fileCount', 'threatCount']);
  const scannerEnabled = result.scannerEnabled !== false; // Default to true
  const fileCount = result.fileCount || 0;
  const threatCount = result.threatCount || 0;

  // Initialize sample data if none exists
  await initializeSampleData();

  // Update UI
  updateStatus(scannerEnabled);
  await updateFileStats();
  await updateLatestResults();

  // Toggle scanner
  toggleBtn.addEventListener('click', async () => {
    const current = (await browser.storage.local.get(['scannerEnabled'])).scannerEnabled !== false;
    const newStatus = !current;
    await browser.storage.local.set({ scannerEnabled: newStatus });
    updateStatus(newStatus);
  });

  // Open options
  optionsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

  // Test WASM loading in background
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      try {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        const response = await (browser as any).runtime.sendMessage({ type: 'TEST_WASM_LOADING' });
        console.log('WASM test response (Firefox):', response);
        await updateFileStats();
        await updateLatestResults();
      } catch (e) {
        console.error('WASM test failed (Firefox):', e);
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test WASM';
      }
    });
  }

  function updateStatus(enabled: boolean) {
    if (enabled) {
      statusDiv.textContent = '✅ Scanner Active';
      statusDiv.className = 'status active';
      toggleBtn.textContent = 'Disable Scanner';
      toggleBtn.className = 'btn-primary';
    } else {
      statusDiv.textContent = '❌ Scanner Disabled';
      statusDiv.className = 'status inactive';
      toggleBtn.textContent = 'Enable Scanner';
      toggleBtn.className = 'btn-secondary';
    }
  }

  async function updateFileStats() {
    try {
      const result = await browser.storage.local.get(['fileCount', 'threatCount']);
      const fileCount = result.fileCount || 0;
      const threatCount = result.threatCount || 0;
      
      if (fileCountSpan) fileCountSpan.textContent = fileCount.toString();
      if (threatCountSpan) threatCountSpan.textContent = threatCount.toString();
    } catch (error) {
      console.error('Failed to update file stats:', error);
    }
  }

  async function updateLatestResults() {
    try {
      const result = await browser.storage.local.get(['latestAnalysisResult']);
      
      if (result.latestAnalysisResult) {
        const analysis = result.latestAnalysisResult;
        const riskScore = (analysis.riskScore || analysis.risk_score || 0) * 100;
        const decision = analysis.decision || 'allow';
        const fileName = analysis.fileName || 'Unknown file';
        const reason = analysis.reason || 'Analysis complete';
        
        // Update the stats section with latest analysis
        const statsDiv = document.getElementById('stats');
        if (statsDiv) {
          statsDiv.innerHTML = `
            <p><strong>Files Scanned:</strong> <span id="fileCount">${fileCount}</span></p>
            <p><strong>Threats Detected:</strong> <span id="threatCount">${threatCount}</span></p>
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            <p><strong>Latest Analysis:</strong></p>
            <p style="font-size: 12px; margin: 5px 0;"><strong>File:</strong> ${fileName}</p>
            <p style="font-size: 12px; margin: 5px 0;"><strong>Decision:</strong> ${decision === 'allow' ? 'Allowed' : 'Blocked'}</p>
            <p style="font-size: 12px; margin: 5px 0;"><strong>Risk Score:</strong> ${riskScore.toFixed(0)}%</p>
            <p style="font-size: 12px; margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
            <p style="font-size: 12px; margin: 5px 0;"><strong>Time:</strong> ${new Date(analysis.timestamp || Date.now()).toLocaleTimeString()}</p>
          `;
        }
      } else {
        // Show helpful information when no analysis results exist
        const statsDiv = document.getElementById('stats');
        if (statsDiv) {
          statsDiv.innerHTML = `
            <p><strong>Files Scanned:</strong> <span id="fileCount">${fileCount}</span></p>
            <p><strong>Threats Detected:</strong> <span id="threatCount">${threatCount}</span></p>
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            <p><strong>Latest Analysis:</strong></p>
            <p style="font-size: 12px; margin: 5px 0; color: #666;">No files analyzed yet</p>
            <p style="font-size: 12px; margin: 5px 0; color: #666;"><strong>To see results:</strong></p>
            <ul style="font-size: 11px; margin: 5px 0; padding-left: 15px; color: #666;">
              <li>Upload a text file on any webpage</li>
              <li>Or use the test page at localhost:8080</li>
              <li>Or click "Test WASM" to verify functionality</li>
            </ul>
          `;
        }
      }
    } catch (error) {
      console.error('Failed to update latest results:', error);
      const statsDiv = document.getElementById('stats');
      if (statsDiv) {
        statsDiv.innerHTML = `
          <p><strong>Files Scanned:</strong> <span id="fileCount">${fileCount}</span></p>
          <p><strong>Threats Detected:</strong> <span id="threatCount">${threatCount}</span></p>
          <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
          <p><strong>Latest Analysis:</strong></p>
          <p style="font-size: 12px; margin: 5px 0; color: #f44336;">Error loading results</p>
          <p style="font-size: 11px; margin: 5px 0; color: #666;">Try refreshing the popup</p>
        `;
      }
    }
  }

  // Initialize sample data for demonstration
  async function initializeSampleData() {
    try {
      const result = await browser.storage.local.get(['latestAnalysisResult', 'sampleDataInitialized']);
      
      // Only initialize once
      if (result.sampleDataInitialized) return;
      
      // Create sample analysis result
      const sampleResult = {
        fileName: 'sample.txt',
        decision: 'allow',
        riskScore: 0.12,
        reason: 'Sample data for demonstration',
        entropy: 2.8,
        timestamp: Date.now() - 3600000, // 1 hour ago
        stats: {
          totalChunks: 1,
          totalContent: 512,
          processingTime: 38
        }
      };
      
      await browser.storage.local.set({ 
        latestAnalysisResult: sampleResult,
        sampleDataInitialized: true 
      });
      
      console.log('Sample data initialized for Firefox popup demonstration');
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
    }
  }
});
