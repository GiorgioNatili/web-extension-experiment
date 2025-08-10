import { CONFIG } from 'shared';

console.log('SquareX File Scanner Options loaded');

interface Settings {
  entropyThreshold: number;
  riskThreshold: number;
  maxFileSize: number;
}

const defaultSettings: Settings = {
  entropyThreshold: CONFIG.ENTROPY_THRESHOLD,
  riskThreshold: CONFIG.RISK_THRESHOLD,
  maxFileSize: CONFIG.MAX_FILE_SIZE / (1024 * 1024) // Convert to MB
};

document.addEventListener('DOMContentLoaded', () => {
  const entropyThresholdInput = document.getElementById('entropyThreshold') as HTMLInputElement;
  const riskThresholdInput = document.getElementById('riskThreshold') as HTMLInputElement;
  const maxFileSizeInput = document.getElementById('maxFileSize') as HTMLInputElement;
  const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
  const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
  
  // Load current settings
  loadSettings();
  
  // Handle button clicks
  saveButton.addEventListener('click', saveSettings);
  resetButton.addEventListener('click', resetSettings);
  
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(defaultSettings);
      
      entropyThresholdInput.value = settings.entropyThreshold.toString();
      riskThresholdInput.value = settings.riskThreshold.toString();
      maxFileSizeInput.value = settings.maxFileSize.toString();
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults
      entropyThresholdInput.value = defaultSettings.entropyThreshold.toString();
      riskThresholdInput.value = defaultSettings.riskThreshold.toString();
      maxFileSizeInput.value = defaultSettings.maxFileSize.toString();
    }
  }
  
  async function saveSettings() {
    try {
      const settings: Settings = {
        entropyThreshold: parseFloat(entropyThresholdInput.value),
        riskThreshold: parseFloat(riskThresholdInput.value),
        maxFileSize: parseInt(maxFileSizeInput.value)
      };
      
      await chrome.storage.sync.set(settings);
      alert('Settings saved successfully!');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings: ' + error);
    }
  }
  
  async function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        await chrome.storage.sync.clear();
        loadSettings();
        alert('Settings reset to defaults!');
        
      } catch (error) {
        console.error('Failed to reset settings:', error);
        alert('Failed to reset settings: ' + error);
      }
    }
  }
});
