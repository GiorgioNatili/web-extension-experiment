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
  
  // Performance messages
  PERFORMANCE_OPTIMAL: 'Performance is optimal',
  PERFORMANCE_DEGRADED: 'Performance is degraded',
  PERFORMANCE_CRITICAL: 'Performance is critical',
  MEMORY_USAGE_HIGH: 'High memory usage detected',
  PROCESSING_SLOW: 'Processing is slower than expected',
  THROUGHPUT_LOW: 'Low throughput detected',
  
  // Performance metrics
  METRICS_COLLECTING: 'Collecting performance metrics...',
  METRICS_ANALYZING: 'Analyzing performance data...',
  METRICS_REPORT_READY: 'Performance report ready',
  METRICS_TREND_IMPROVING: 'Performance trend is improving',
  METRICS_TREND_STABLE: 'Performance trend is stable',
  METRICS_TREND_DEGRADING: 'Performance trend is degrading',
  
  // Resource utilization
  CPU_USAGE_NORMAL: 'CPU usage is normal',
  CPU_USAGE_HIGH: 'High CPU usage detected',
  MEMORY_USAGE_NORMAL: 'Memory usage is normal',
  MEMORY_USAGE_CRITICAL: 'Critical memory usage detected',
  NETWORK_USAGE_NORMAL: 'Network usage is normal',
  DISK_IO_NORMAL: 'Disk I/O is normal',
  
  // Quality metrics
  ACCURACY_HIGH: 'Analysis accuracy is high',
  ACCURACY_MEDIUM: 'Analysis accuracy is medium',
  ACCURACY_LOW: 'Analysis accuracy is low',
  FALSE_POSITIVES_LOW: 'Low false positive rate',
  FALSE_POSITIVES_HIGH: 'High false positive rate',
  CONFIDENCE_HIGH: 'High confidence in results',
  CONFIDENCE_LOW: 'Low confidence in results',
} as const;
