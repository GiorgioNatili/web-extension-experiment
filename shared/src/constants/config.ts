export const CONFIG = {
  // File processing
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_CONTENT_SIZE: 50 * 1024 * 1024, // 50MB
  CHUNK_SIZE: 1024 * 1024, // 1MB
  
  // Analysis
  ENTROPY_THRESHOLD: 4.8,
  MAX_WORDS_TO_ANALYZE: 10,
  RISK_THRESHOLD: 0.6,
  
  // UI
  NOTIFICATION_DURATION: 3000, // 3 seconds
  PROGRESS_UPDATE_INTERVAL: 100, // 100ms
  
  // Browser support
  SUPPORTED_BROWSERS: ['chrome', 'firefox', 'safari'] as const,
  
  // Extension
  EXTENSION_NAME: 'SquareX File Scanner',
  EXTENSION_VERSION: '0.1.0',
} as const;
