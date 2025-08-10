export const MESSAGES = {
  // Success messages
  ANALYSIS_COMPLETE: 'File analysis completed successfully',
  FILE_ALLOWED: 'File upload allowed',
  FILE_BLOCKED: 'File upload blocked for security reasons',
  
  // Error messages
  FILE_TOO_LARGE: 'File is too large to process',
  INVALID_FILE_TYPE: 'Only .txt files are supported',
  ANALYSIS_FAILED: 'File analysis failed',
  WASM_LOAD_ERROR: 'Failed to load analysis engine',
  
  // Progress messages
  READING_FILE: 'Reading file...',
  ANALYZING_CONTENT: 'Analyzing content...',
  CALCULATING_ENTROPY: 'Calculating entropy...',
  DETECTING_PATTERNS: 'Detecting patterns...',
  
  // UI messages
  LOADING: 'Loading...',
  PROCESSING: 'Processing...',
  COMPLETE: 'Complete',
  
  // Decision reasons
  REASON_SAFE: 'No security concerns detected',
  REASON_BANNED_PHRASES: 'Contains banned phrases',
  REASON_PII_DETECTED: 'Contains potential PII',
  REASON_HIGH_ENTROPY: 'High entropy content detected',
} as const;
