// Safari options page script
import { CONFIG, MESSAGES } from 'shared';

let entropyInput: HTMLInputElement | null = null;
let riskInput: HTMLInputElement | null = null;
let bannedPhrasesTextarea: HTMLTextAreaElement | null = null;
let stopwordsTextarea: HTMLTextAreaElement | null = null;
let saveButton: HTMLButtonElement | null = null;
let resetButton: HTMLButtonElement | null = null;
let saveStatus: HTMLElement | null = null;

async function initializeOptions() {
  // Get DOM elements
  entropyInput = document.getElementById('entropyThreshold') as HTMLInputElement;
  riskInput = document.getElementById('riskThreshold') as HTMLInputElement;
  bannedPhrasesTextarea = document.getElementById('bannedPhrases') as HTMLTextAreaElement;
  stopwordsTextarea = document.getElementById('stopwords') as HTMLTextAreaElement;
  saveButton = document.getElementById('saveButton') as HTMLButtonElement;
  resetButton = document.getElementById('resetButton') as HTMLButtonElement;
  saveStatus = document.getElementById('saveStatus');

  // Load current settings
  const result = await browser.storage.local.get([
    'entropyThreshold',
    'riskThreshold',
    'bannedPhrases',
    'stopwords'
  ]);

  // Set default values if not found
  if (entropyInput) {
    entropyInput.value = result.entropyThreshold || '4.8';
  }
  if (riskInput) {
    riskInput.value = result.riskThreshold || '0.6';
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

  // Set up input validation
  if (entropyInput) {
    entropyInput.addEventListener('input', validateEntropyInput);
  }
  if (riskInput) {
    riskInput.addEventListener('input', validateRiskInput);
  }
  if (bannedPhrasesTextarea) {
    bannedPhrasesTextarea.addEventListener('input', validateBannedPhrases);
  }
  if (stopwordsTextarea) {
    stopwordsTextarea.addEventListener('input', validateStopwords);
  }

  console.log('Safari options page initialized');
}

async function saveSettings() {
  if (!saveButton || !saveStatus) return;

  try {
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    // Validate inputs
    const validationResult = validateAllInputs();
    if (!validationResult.isValid) {
      showSaveStatus(validationResult.errorMessage || 'Validation failed', 'error');
      return;
    }

    // Get values
    const settings = {
      entropyThreshold: entropyInput?.value || '4.8',
      riskThreshold: riskInput?.value || '0.6',
      bannedPhrases: bannedPhrasesTextarea?.value || 'malware,virus,trojan',
      stopwords: stopwordsTextarea?.value || 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
    };

    // Save to storage
    await browser.storage.local.set(settings);

    // Show success message
    showSaveStatus('Settings saved successfully!', 'success');

    // Clear validation errors
    clearValidationErrors();

  } catch (error) {
    console.error('Failed to save settings:', error);
    showSaveStatus('Failed to save settings. Please try again.', 'error');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Settings';
    }
  }
}

async function resetSettings() {
  if (!resetButton) return;

  try {
    resetButton.disabled = true;
    resetButton.textContent = 'Resetting...';

    // Reset to default values
    const defaultSettings = {
      entropyThreshold: '4.8',
      riskThreshold: '0.6',
      bannedPhrases: 'malware,virus,trojan',
      stopwords: 'the,a,an,and,or,but,in,on,at,to,for,of,with,by'
    };

    // Update UI
    if (entropyInput) entropyInput.value = defaultSettings.entropyThreshold;
    if (riskInput) riskInput.value = defaultSettings.riskThreshold;
    if (bannedPhrasesTextarea) bannedPhrasesTextarea.value = defaultSettings.bannedPhrases;
    if (stopwordsTextarea) stopwordsTextarea.value = defaultSettings.stopwords;

    // Save to storage
    await browser.storage.local.set(defaultSettings);

    // Show success message
    showSaveStatus('Settings reset to defaults!', 'success');

    // Clear validation errors
    clearValidationErrors();

  } catch (error) {
    console.error('Failed to reset settings:', error);
    showSaveStatus('Failed to reset settings. Please try again.', 'error');
  } finally {
    if (resetButton) {
      resetButton.disabled = false;
      resetButton.textContent = 'Reset to Defaults';
    }
  }
}

function validateAllInputs(): { isValid: boolean; errorMessage?: string } {
  // Validate entropy threshold
  const entropyValue = parseFloat(entropyInput?.value || '0');
  if (isNaN(entropyValue) || entropyValue < 0 || entropyValue > 10) {
    return { isValid: false, errorMessage: 'Entropy threshold must be between 0 and 10' };
  }

  // Validate risk threshold
  const riskValue = parseFloat(riskInput?.value || '0');
  if (isNaN(riskValue) || riskValue < 0 || riskValue > 1) {
    return { isValid: false, errorMessage: 'Risk threshold must be between 0 and 1' };
  }

  // Validate banned phrases
  const bannedPhrases = bannedPhrasesTextarea?.value.trim() || '';
  if (bannedPhrases.length === 0) {
    return { isValid: false, errorMessage: 'Banned phrases cannot be empty' };
  }

  // Validate stopwords
  const stopwords = stopwordsTextarea?.value.trim() || '';
  if (stopwords.length === 0) {
    return { isValid: false, errorMessage: 'Stop words cannot be empty' };
  }

  return { isValid: true };
}

function validateEntropyInput() {
  if (!entropyInput) return;

  const value = parseFloat(entropyInput.value);
  const isValid = !isNaN(value) && value >= 0 && value <= 10;

  if (isValid) {
    entropyInput.classList.remove('input-error');
    clearValidationError(entropyInput);
  } else {
    entropyInput.classList.add('input-error');
    showValidationError(entropyInput, 'Entropy threshold must be between 0 and 10');
  }
}

function validateRiskInput() {
  if (!riskInput) return;

  const value = parseFloat(riskInput.value);
  const isValid = !isNaN(value) && value >= 0 && value <= 1;

  if (isValid) {
    riskInput.classList.remove('input-error');
    clearValidationError(riskInput);
  } else {
    riskInput.classList.add('input-error');
    showValidationError(riskInput, 'Risk threshold must be between 0 and 1');
  }
}

function validateBannedPhrases() {
  if (!bannedPhrasesTextarea) return;

  const value = bannedPhrasesTextarea.value.trim();
  const isValid = value.length > 0;

  if (isValid) {
    bannedPhrasesTextarea.classList.remove('input-error');
    clearValidationError(bannedPhrasesTextarea);
  } else {
    bannedPhrasesTextarea.classList.add('input-error');
    showValidationError(bannedPhrasesTextarea, 'Banned phrases cannot be empty');
  }
}

function validateStopwords() {
  if (!stopwordsTextarea) return;

  const value = stopwordsTextarea.value.trim();
  const isValid = value.length > 0;

  if (isValid) {
    stopwordsTextarea.classList.remove('input-error');
    clearValidationError(stopwordsTextarea);
  } else {
    stopwordsTextarea.classList.add('input-error');
    showValidationError(stopwordsTextarea, 'Stop words cannot be empty');
  }
}

function showValidationError(element: HTMLElement, message: string) {
  // Remove existing error message
  clearValidationError(element);

  // Create error message element
  const errorElement = document.createElement('div');
  errorElement.className = 'validation-error';
  errorElement.textContent = message;
  errorElement.id = `${element.id}-error`;

  // Insert after the element
  element.parentNode?.insertBefore(errorElement, element.nextSibling);
}

function clearValidationError(element: HTMLElement) {
  const errorElement = document.getElementById(`${element.id}-error`);
  if (errorElement) {
    errorElement.remove();
  }
}

function clearValidationErrors() {
  const errorElements = document.querySelectorAll('.validation-error');
  errorElements.forEach(element => element.remove());

  // Remove error classes from inputs
  const inputs = document.querySelectorAll('.input-error');
  inputs.forEach(input => input.classList.remove('input-error'));
}

function showSaveStatus(message: string, type: 'success' | 'error') {
  if (!saveStatus) return;

  saveStatus.textContent = message;
  saveStatus.className = `save-status ${type}`;
  saveStatus.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (saveStatus) {
      saveStatus.style.display = 'none';
    }
  }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeOptions);
