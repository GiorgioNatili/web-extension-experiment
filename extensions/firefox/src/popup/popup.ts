// Firefox popup script

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
  const optionsBtn = document.getElementById('optionsBtn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const fileCountSpan = document.getElementById('fileCount') as HTMLSpanElement;
  const threatCountSpan = document.getElementById('threatCount') as HTMLSpanElement;

  // Load current status
  const result = await browser.storage.local.get(['scannerEnabled', 'fileCount', 'threatCount']);
  const scannerEnabled = result.scannerEnabled !== false; // Default to true
  const fileCount = result.fileCount || 0;
  const threatCount = result.threatCount || 0;

  // Update UI
  updateStatus(scannerEnabled);
  fileCountSpan.textContent = fileCount.toString();
  threatCountSpan.textContent = threatCount.toString();

  // Toggle scanner
  toggleBtn.addEventListener('click', async () => {
    const newStatus = !scannerEnabled;
    await browser.storage.local.set({ scannerEnabled: newStatus });
    updateStatus(newStatus);
  });

  // Open options
  optionsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

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
});
