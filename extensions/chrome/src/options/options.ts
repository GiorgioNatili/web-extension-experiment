import { CONFIG, MESSAGES } from 'shared';

console.log('SquareX File Scanner Options Page loaded');

// DOM elements
let entropyInput: HTMLInputElement | null = null;
let riskInput: HTMLInputElement | null = null;
let bannedPhrasesTextarea: HTMLTextAreaElement | null = null;
let stopwordsTextarea: HTMLTextAreaElement | null = null;
let saveButton: HTMLButtonElement | null = null;
let resetButton: HTMLButtonElement | null = null;
let saveStatus: HTMLElement | null = null;

// Initialize options page
async function initializeOptions() {
  console.log('Initializing options page...');
  
  // Get DOM elements
  entropyInput = document.getElementById('entropyThreshold') as HTMLInputElement;
  riskInput = document.getElementById('riskThreshold') as HTMLInputElement;
  bannedPhrasesTextarea = document.getElementById('bannedPhrases') as HTMLTextAreaElement;
  stopwordsTextarea = document.getElementById('stopwords') as HTMLTextAreaElement;
  saveButton = document.getElementById('saveButton') as HTMLButtonElement;
  resetButton = document.getElementById('resetButton') as HTMLButtonElement;
  saveStatus = document.getElementById('saveStatus');
  
  // Load current settings
  const result = await chrome.storage.local.get([
    'scannerEnabled',
    'entropyThreshold',
    'riskThreshold',
    'bannedPhrases',
    'stopwords'
  ]);
  
  // Set form values
  if (entropyInput) {
    entropyInput.value = result.entropyThreshold || CONFIG.ENTROPY_THRESHOLD.toString();
  }
  if (riskInput) {
    riskInput.value = result.riskThreshold || CONFIG.RISK_THRESHOLD.toString();
  }
  if (bannedPhrasesTextarea) {
    bannedPhrasesTextarea.value = result.bannedPhrases || 'malware,virus,trojan';
  }
  if (stopwordsTextarea) {
    stopwordsTextarea.value = result.stopwords || 'the,a,an,and,or,but,in,on,at,to,for,of,with,by';
  }
  
  // Set up event listeners
  if (saveButton) {
    saveButton.addEventListener('click', saveSettings);
  }
  if (resetButton) {
    resetButton.addEventListener('click', resetSettings);
  }
  
  console.log('Options page initialized');
}

// Save settings
async function saveSettings() {
  if (!saveButton || !saveStatus) return;
  
  try {
    // Disable button during save
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    // Validate inputs
    const entropyThreshold = parseFloat(entropyInput?.value || '4.8');
    const riskThreshold = parseFloat(riskInput?.value || '0.6');
    
    if (isNaN(entropyThreshold) || entropyThreshold < 0 || entropyThreshold > 10) {
      if (saveStatus) {
        saveStatus.textContent = 'Invalid entropy threshold';
        saveStatus.className = 'save-status error';
      }
      return;
    }
    
    if (isNaN(riskThreshold) || riskThreshold < 0 || riskThreshold > 1) {
      if (saveStatus) {
        saveStatus.textContent = 'Invalid risk threshold';
        saveStatus.className = 'save-status error';
      }
      return;
    }
    
    // Save settings
    await chrome.storage.local.set({
      entropyThreshold: entropyInput?.value || '4.8',
      riskThreshold: riskInput?.value || '0.6',
      bannedPhrases: bannedPhrasesTextarea?.value || '',
      stopwords: stopwordsTextarea?.value || ''
    });
    
    if (saveStatus) {
      saveStatus.textContent = 'Settings saved successfully!';
      saveStatus.className = 'save-status success';
    }
    
    // Clear status after delay
    setTimeout(() => {
      if (saveStatus) {
        saveStatus.textContent = '';
        saveStatus.className = '';
      }
    }, 3000);
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    if (saveStatus) {
      saveStatus.textContent = 'Error saving settings';
      saveStatus.className = 'save-status error';
    }
  } finally {
    // Re-enable button
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save';
    }
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!resetButton || !saveStatus) return;
  
  try {
    // Disable button during reset
    resetButton.disabled = true;
    resetButton.textContent = 'Resetting...';
    
    // Reset to defaults
    if (entropyInput) {
      entropyInput.value = CONFIG.ENTROPY_THRESHOLD.toString();
    }
    if (riskInput) {
      riskInput.value = CONFIG.RISK_THRESHOLD.toString();
    }
    if (bannedPhrasesTextarea) {
      bannedPhrasesTextarea.value = 'malware,virus,trojan';
    }
    if (stopwordsTextarea) {
      stopwordsTextarea.value = 'the,a,an,and,or,but,in,on,at,to,for,of,with,by';
    }
    
    // Save default values
    await chrome.storage.local.set({
      entropyThreshold: CONFIG.ENTROPY_THRESHOLD.toString(),
      riskThreshold: CONFIG.RISK_THRESHOLD.toString(),
      bannedPhrases: 'malware,virus,trojan',
      stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
    });
    
    if (saveStatus) {
      saveStatus.textContent = 'Settings reset to defaults';
      saveStatus.className = 'save-status success';
    }
    
  } catch (error) {
    console.error('Failed to reset settings:', error);
    if (saveStatus) {
      saveStatus.textContent = 'Error resetting settings';
      saveStatus.className = 'save-status error';
    }
  } finally {
    // Re-enable button
    if (resetButton) {
      resetButton.disabled = false;
      resetButton.textContent = 'Reset';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeOptions);
