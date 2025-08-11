// Firefox options script
declare const browser: any;

document.addEventListener('DOMContentLoaded', async () => {
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
  const saveStatus = document.getElementById('saveStatus') as HTMLDivElement;

  // Load current settings
  const result = await browser.storage.local.get([
    'scannerEnabled',
    'autoScan',
    'entropyThreshold',
    'riskThreshold',
    'maxWords',
    'bannedPhrases',
    'stopwords'
  ]);

  // Set form values
  (document.getElementById('scannerEnabled') as HTMLInputElement).checked = result.scannerEnabled !== false;
  (document.getElementById('autoScan') as HTMLInputElement).checked = result.autoScan !== false;
  (document.getElementById('entropyThreshold') as HTMLInputElement).value = result.entropyThreshold || '4.8';
  (document.getElementById('riskThreshold') as HTMLInputElement).value = result.riskThreshold || '0.6';
  (document.getElementById('maxWords') as HTMLInputElement).value = result.maxWords || '10';
  (document.getElementById('bannedPhrases') as HTMLTextAreaElement).value = result.bannedPhrases || 'confidential\ndo not share\nsecret\ninternal\nclassified';
  (document.getElementById('stopwords') as HTMLTextAreaElement).value = result.stopwords || 'the\na\nan\nand\nor\nbut\nin\non\nat\nto\nfor\nof\nwith\nby\nis\nare\nwas\nwere\nbe\nbeen\nhave\nhas\nhad\ndo\ndoes\ndid\nwill\nwould\ncould\nshould\nmay\nmight\ncan\nthis\nthat\nthese\nthose\ni\nyou\nhe\nshe\nit\nwe\nthey\nme\nhim\nher\nus\nthem\nmy\nyour\nhis\nher\nits\nour\ntheir\nmine\nyours\nhers\nours\ntheirs';

  // Save settings
  saveBtn.addEventListener('click', async () => {
    try {
      const settings = {
        scannerEnabled: (document.getElementById('scannerEnabled') as HTMLInputElement).checked,
        autoScan: (document.getElementById('autoScan') as HTMLInputElement).checked,
        entropyThreshold: parseFloat((document.getElementById('entropyThreshold') as HTMLInputElement).value),
        riskThreshold: parseFloat((document.getElementById('riskThreshold') as HTMLInputElement).value),
        maxWords: parseInt((document.getElementById('maxWords') as HTMLInputElement).value),
        bannedPhrases: (document.getElementById('bannedPhrases') as HTMLTextAreaElement).value,
        stopwords: (document.getElementById('stopwords') as HTMLTextAreaElement).value
      };

      await browser.storage.local.set(settings);
      showSaveStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showSaveStatus('Error saving settings', 'error');
    }
  });

  // Reset to defaults
  resetBtn.addEventListener('click', () => {
    (document.getElementById('scannerEnabled') as HTMLInputElement).checked = true;
    (document.getElementById('autoScan') as HTMLInputElement).checked = true;
    (document.getElementById('entropyThreshold') as HTMLInputElement).value = '4.8';
    (document.getElementById('riskThreshold') as HTMLInputElement).value = '0.6';
    (document.getElementById('maxWords') as HTMLInputElement).value = '10';
    (document.getElementById('bannedPhrases') as HTMLTextAreaElement).value = 'confidential\ndo not share\nsecret\ninternal\nclassified';
    (document.getElementById('stopwords') as HTMLTextAreaElement).value = 'the\na\nan\nand\nor\nbut\nin\non\nat\nto\nfor\nof\nwith\nby\nis\nare\nwas\nwere\nbe\nbeen\nhave\nhas\nhad\ndo\ndoes\ndid\nwill\nwould\ncould\nshould\nmay\nmight\ncan\nthis\nthat\nthese\nthose\ni\nyou\nhe\nshe\nit\nwe\nthey\nme\nhim\nher\nus\nthem\nmy\nyour\nhis\nher\nits\nour\ntheir\nmine\nyours\nhers\nours\ntheirs';
    
    showSaveStatus('Settings reset to defaults', 'success');
  });

  function showSaveStatus(message: string, type: 'success' | 'error') {
    saveStatus.textContent = message;
    saveStatus.className = `save-status ${type}`;
    saveStatus.style.display = 'block';
    
    setTimeout(() => {
      saveStatus.style.display = 'none';
    }, 3000);
  }
});
