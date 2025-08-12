/**
 * SquareX Browser Extension - Schema Definitions and Validators
 * 
 * This file contains all shared types, interfaces, and validation functions
 * used across the browser extensions and WASM module integration.
 */

import { z } from 'zod';

// ============================================================================
// Core Analysis Types
// ============================================================================

/**
 * Analysis result from WASM module
 */
interface WasmAnalysisResult {
  /** Overall risk score (0.0 - 1.0) */
  risk_score: number;
  /** Final decision: 'allow' | 'block' */
  decision: 'allow' | 'block';
  /** List of reasons for the decision */
  reasons: string[];
  /** Word frequency analysis results */
  top_words: Array<[string, number]>;
  /** Detected banned phrases */
  banned_phrases: BannedPhraseMatch[];
  /** Detected PII patterns */
  pii_patterns: PIIPattern[];
  /** Calculated entropy value */
  entropy: number;
  /** Processing statistics */
  stats: ProcessingStats;
}

/**
 * Banned phrase match with context
 */
interface BannedPhraseMatch {
  /** The banned phrase that was found */
  phrase: string;
  /** Position in the text where it was found */
  position: number;
  /** Context around the match */
  context: string;
  /** Severity level of the banned phrase */
  severity: 'low' | 'medium' | 'high';
}

/**
 * PII pattern detection result
 */
interface PIIPattern {
  /** Type of PII detected */
  type: 'phone' | 'email' | 'ssn' | 'credit_card' | 'ip_address' | 'custom';
  /** The detected pattern */
  pattern: string;
  /** Position in the text */
  position: number;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Custom regex pattern if applicable */
  custom_regex?: string;
}

/**
 * Processing statistics for streaming analysis
 */
interface ProcessingStats {
  /** Total number of chunks processed */
  total_chunks: number;
  /** Total content length in characters */
  total_content_length: number;
  /** Number of unique words found */
  unique_words: number;
  /** Number of banned phrases detected */
  banned_phrase_count: number;
  /** Number of PII patterns found */
  pii_pattern_count: number;
  /** Processing time in milliseconds */
  processing_time_ms: number;
  /** Performance metrics */
  performance: PerformanceMetrics;
}

/**
 * Comprehensive performance metrics
 */
interface PerformanceMetrics {
  /** Total processing time breakdown */
  timing: {
    /** Time spent reading file */
    file_read_ms: number;
    /** Time spent in WASM analysis */
    wasm_analysis_ms: number;
    /** Time spent in JavaScript processing */
    js_processing_ms: number;
    /** Time spent in UI updates */
    ui_update_ms: number;
    /** Total end-to-end processing time */
    total_ms: number;
  };
  /** Memory usage statistics */
  memory: {
    /** Peak memory usage in bytes */
    peak_memory_bytes: number;
    /** Final memory usage in bytes */
    final_memory_bytes: number;
    /** Memory allocated for WASM module */
    wasm_memory_bytes: number;
    /** Memory used by JavaScript */
    js_memory_bytes: number;
  };
  /** Throughput metrics */
  throughput: {
    /** Processing speed in bytes per second */
    bytes_per_second: number;
    /** Characters processed per second */
    chars_per_second: number;
    /** Chunks processed per second */
    chunks_per_second: number;
    /** Average chunk processing time in milliseconds */
    avg_chunk_time_ms: number;
  };
  /** Resource utilization */
  resources: {
    /** CPU usage percentage (if available) */
    cpu_usage_percent?: number;
    /** Number of CPU cores used */
    cpu_cores_used: number;
    /** Network bandwidth used in bytes */
    network_bytes?: number;
    /** Disk I/O operations count */
    disk_io_operations?: number;
  };
  /** Quality metrics */
  quality: {
    /** Analysis accuracy score (0.0 - 1.0) */
    accuracy_score: number;
    /** False positive rate */
    false_positive_rate: number;
    /** False negative rate */
    false_negative_rate: number;
    /** Confidence level of results */
    confidence_level: number;
  };
  /** Error tracking */
  errors: {
    /** Number of errors encountered */
    error_count: number;
    /** Number of warnings */
    warning_count: number;
    /** Recovery attempts made */
    recovery_attempts: number;
    /** Whether processing completed successfully */
    completed_successfully: boolean;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Streaming analysis configuration
 */
interface StreamingConfig {
  /** Words to exclude from frequency analysis */
  stopwords: string[];
  /** Threshold for obfuscation detection (0.0 - 8.0) */
  entropy_threshold: number;
  /** Threshold for blocking decisions (0.0 - 1.0) */
  risk_threshold: number;
  /** Maximum number of words to return in frequency analysis */
  max_words: number;
  /** Phrases to detect as banned content */
  banned_phrases: string[];
  /** Custom PII detection patterns */
  custom_pii_patterns?: CustomPIIPattern[];
  /** Chunk size for processing (in bytes) */
  chunk_size?: number;
}

/**
 * Custom PII detection pattern
 */
interface CustomPIIPattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Human-readable name */
  name: string;
  /** Regular expression pattern */
  regex: string;
  /** Type of PII this pattern detects */
  type: 'phone' | 'email' | 'ssn' | 'credit_card' | 'ip_address' | 'custom';
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Whether this pattern is enabled */
  enabled: boolean;
}

// ============================================================================
// Extension Communication Types
// ============================================================================

/**
 * Message types for extension communication
 */
type MessageType = 
  | 'ANALYZE_FILE'
  | 'ANALYSIS_PROGRESS'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_ERROR'
  | 'CONFIG_UPDATE'
  | 'STATUS_REQUEST'
  | 'STATUS_RESPONSE'
  | 'PERFORMANCE_METRICS'
  | 'PERFORMANCE_REPORT'
  | 'STREAM_INIT'
  | 'STREAM_CHUNK'
  | 'STREAM_FINALIZE'
  | 'STREAM_PROGRESS'
  | 'STREAM_ERROR';

/**
 * Base message interface
 */
interface BaseMessage {
  /** Unique message identifier */
  id: string;
  /** Message type */
  type: MessageType;
  /** Timestamp when message was created */
  timestamp: number;
  /** Source extension ID */
  source: string;
  /** Target extension ID or 'background' */
  target: string;
}

/**
 * File analysis request message
 */
interface AnalyzeFileMessage extends BaseMessage {
  type: 'ANALYZE_FILE';
  /** File information */
  file: WasmFileInfo;
  /** Analysis configuration */
  config?: Partial<StreamingConfig>;
  /** Whether to use streaming analysis */
  use_streaming?: boolean;
}

/**
 * Analysis progress update message
 */
interface AnalysisProgressMessage extends BaseMessage {
  type: 'ANALYSIS_PROGRESS';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current stage of analysis */
  stage: 'reading' | 'analyzing' | 'complete';
  /** Human-readable status message */
  message: string;
  /** Estimated time remaining in milliseconds */
  estimated_time_ms?: number;
}

/**
 * Analysis completion message
 */
interface AnalysisCompleteMessage extends BaseMessage {
  type: 'ANALYSIS_COMPLETE';
  /** Analysis results */
  result: WasmAnalysisResult;
  /** Processing statistics */
  stats: ProcessingStats;
}

/**
 * Analysis error message
 */
interface AnalysisErrorMessage extends BaseMessage {
  type: 'ANALYSIS_ERROR';
  /** Error information */
  error: WasmErrorInfo;
  /** File that caused the error */
  file?: WasmFileInfo;
}

/**
 * Configuration update message
 */
interface ConfigUpdateMessage extends BaseMessage {
  type: 'CONFIG_UPDATE';
  /** Updated configuration */
  config: StreamingConfig;
  /** Whether to apply immediately */
  apply_immediately: boolean;
}

/**
 * Status request message
 */
interface StatusRequestMessage extends BaseMessage {
  type: 'STATUS_REQUEST';
  /** Requested status information */
  requested_info: ('config' | 'stats' | 'health')[];
}

/**
 * Status response message
 */
interface StatusResponseMessage extends BaseMessage {
  type: 'STATUS_RESPONSE';
  /** Current configuration */
  config: StreamingConfig;
  /** Processing statistics */
  stats: ProcessingStats;
  /** Extension health status */
  health: ExtensionHealth;
}

/**
 * Performance metrics message
 */
interface PerformanceMetricsMessage extends BaseMessage {
  type: 'PERFORMANCE_METRICS';
  /** Performance metrics for current operation */
  metrics: PerformanceMetrics;
  /** Operation identifier */
  operation_id: string;
  /** Stage of operation */
  stage: 'start' | 'progress' | 'complete';
}

/**
 * Performance report message
 */
interface PerformanceReportMessage extends BaseMessage {
  type: 'PERFORMANCE_REPORT';
  /** Aggregated performance statistics */
  report: {
    /** Time period covered */
    period: {
      start: number;
      end: number;
      duration_ms: number;
    };
    /** Summary statistics */
    summary: {
      total_operations: number;
      successful_operations: number;
      failed_operations: number;
      average_processing_time_ms: number;
      total_data_processed_bytes: number;
    };
    /** Performance metrics by operation type */
    by_operation: Record<string, {
      count: number;
      avg_time_ms: number;
      avg_memory_bytes: number;
      success_rate: number;
    }>;
    /** Performance trends */
    trends: {
      processing_time_trend: 'improving' | 'stable' | 'degrading';
      memory_usage_trend: 'stable' | 'increasing' | 'decreasing';
      throughput_trend: 'improving' | 'stable' | 'degrading';
    };
  };
}

/**
 * Stream initialization message
 */
interface StreamInitMessage extends BaseMessage {
  type: 'STREAM_INIT';
  /** File information */
  file: WasmFileInfo;
  /** Analysis configuration */
  config?: Partial<StreamingConfig>;
  /** Operation identifier */
  operation_id: string;
  /** Expected total chunks */
  expected_chunks?: number;
}

/**
 * Stream chunk message
 */
interface StreamChunkMessage extends BaseMessage {
  type: 'STREAM_CHUNK';
  /** Operation identifier */
  operation_id: string;
  /** Chunk data */
  chunk: {
    /** Chunk index (0-based) */
    index: number;
    /** Chunk data as string */
    data: string;
    /** Whether this is the last chunk */
    is_last: boolean;
  };
  /** Backpressure control */
  backpressure?: {
    /** Whether to pause sending more chunks */
    pause: boolean;
    /** Resume after this many milliseconds */
    resume_after_ms?: number;
  };
}

/**
 * Stream finalize message
 */
interface StreamFinalizeMessage extends BaseMessage {
  type: 'STREAM_FINALIZE';
  /** Operation identifier */
  operation_id: string;
  /** Whether to force completion */
  force?: boolean;
}

/**
 * Stream progress message
 */
interface StreamProgressMessage extends BaseMessage {
  type: 'STREAM_PROGRESS';
  /** Operation identifier */
  operation_id: string;
  /** Progress information */
  progress: {
    /** Current chunk being processed */
    current_chunk: number;
    /** Total chunks expected */
    total_chunks: number;
    /** Progress percentage (0-100) */
    percentage: number;
    /** Processing statistics */
    stats: ProcessingStats;
    /** Estimated time remaining in milliseconds */
    estimated_time_ms?: number;
  };
}

/**
 * Stream error message
 */
interface StreamErrorMessage extends BaseMessage {
  type: 'STREAM_ERROR';
  /** Operation identifier */
  operation_id: string;
  /** Error information */
  error: WasmErrorInfo;
  /** Whether the operation can be retried */
  retryable: boolean;
}

// ============================================================================
// Extension Health and Status Types
// ============================================================================

/**
 * Extension health status
 */
interface ExtensionHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Last successful analysis timestamp */
  last_successful_analysis?: number;
  /** Error count in last 24 hours */
  error_count_24h: number;
  /** WASM module status */
  wasm_status: 'loaded' | 'loading' | 'error';
  /** Memory usage in bytes */
  memory_usage_bytes: number;
  /** Processing queue length */
  queue_length: number;
}

/**
 * File information for analysis
 */
interface WasmFileInfo {
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Last modified timestamp */
  lastModified: number;
  /** File hash for deduplication */
  hash?: string;
  /** Whether file is encrypted */
  is_encrypted?: boolean;
}

/**
 * Error information
 */
interface WasmErrorInfo {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: any;
  /** Stack trace if available */
  stack?: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for PerformanceMetrics
 */
const PerformanceMetricsSchema = z.object({
  timing: z.object({
    file_read_ms: z.number(),
    wasm_analysis_ms: z.number(),
    js_processing_ms: z.number(),
    ui_update_ms: z.number(),
    total_ms: z.number()
  }),
  memory: z.object({
    peak_memory_bytes: z.number(),
    final_memory_bytes: z.number(),
    wasm_memory_bytes: z.number(),
    js_memory_bytes: z.number()
  }),
  throughput: z.object({
    bytes_per_second: z.number(),
    chars_per_second: z.number(),
    chunks_per_second: z.number(),
    avg_chunk_time_ms: z.number()
  }),
  resources: z.object({
    cpu_usage_percent: z.number().optional(),
    cpu_cores_used: z.number(),
    network_bytes: z.number().optional(),
    disk_io_operations: z.number().optional()
  }),
  quality: z.object({
    accuracy_score: z.number().min(0).max(1),
    false_positive_rate: z.number().min(0).max(1),
    false_negative_rate: z.number().min(0).max(1),
    confidence_level: z.number().min(0).max(1)
  }),
  errors: z.object({
    error_count: z.number(),
    warning_count: z.number(),
    recovery_attempts: z.number(),
    completed_successfully: z.boolean()
  })
});

/**
 * Zod schema for WasmAnalysisResult
 */
const WasmAnalysisResultSchema = z.object({
  risk_score: z.number().min(0).max(1),
  decision: z.enum(['allow', 'block']),
  reasons: z.array(z.string()),
  top_words: z.array(z.tuple([z.string(), z.number()])),
  banned_phrases: z.array(z.object({
    phrase: z.string(),
    position: z.number(),
    context: z.string(),
    severity: z.enum(['low', 'medium', 'high'])
  })),
  pii_patterns: z.array(z.object({
    type: z.enum(['phone', 'email', 'ssn', 'credit_card', 'ip_address', 'custom']),
    pattern: z.string(),
    position: z.number(),
    confidence: z.number().min(0).max(1),
    custom_regex: z.string().optional()
  })),
  entropy: z.number(),
  stats: z.object({
    total_chunks: z.number(),
    total_content_length: z.number(),
    unique_words: z.number(),
    banned_phrase_count: z.number(),
    pii_pattern_count: z.number(),
    processing_time_ms: z.number(),
    performance: PerformanceMetricsSchema
  })
});

/**
 * Zod schema for StreamingConfig
 */
const StreamingConfigSchema = z.object({
  stopwords: z.array(z.string()),
  entropy_threshold: z.number().min(0).max(8),
  risk_threshold: z.number().min(0).max(1),
  max_words: z.number().min(1).max(1000),
  banned_phrases: z.array(z.string()),
  custom_pii_patterns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    regex: z.string(),
    type: z.enum(['phone', 'email', 'ssn', 'credit_card', 'ip_address', 'custom']),
    confidence: z.number().min(0).max(1),
    enabled: z.boolean()
  })).optional(),
  chunk_size: z.number().min(1024).max(10485760).optional() // 1KB to 10MB
});

/**
 * Zod schema for WasmFileInfo
 */
const WasmFileInfoSchema = z.object({
  name: z.string().min(1),
  size: z.number().min(0),
  type: z.string(),
  lastModified: z.number(),
  hash: z.string().optional(),
  is_encrypted: z.boolean().optional()
});

/**
 * Zod schema for BaseMessage
 */
const BaseMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['ANALYZE_FILE', 'ANALYSIS_PROGRESS', 'ANALYSIS_COMPLETE', 'ANALYSIS_ERROR', 'CONFIG_UPDATE', 'STATUS_REQUEST', 'STATUS_RESPONSE']),
  timestamp: z.number(),
  source: z.string(),
  target: z.string()
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a WasmAnalysisResult object
 */
function validateWasmAnalysisResult(data: unknown): WasmAnalysisResult {
  return WasmAnalysisResultSchema.parse(data);
}

/**
 * Validate a StreamingConfig object
 */
function validateStreamingConfig(data: unknown): StreamingConfig {
  return StreamingConfigSchema.parse(data);
}

/**
 * Validate a WasmFileInfo object
 */
function validateWasmFileInfo(data: unknown): WasmFileInfo {
  return WasmFileInfoSchema.parse(data);
}

/**
 * Validate a BaseMessage object
 */
function validateBaseMessage(data: unknown): BaseMessage {
  return BaseMessageSchema.parse(data);
}

/**
 * Safe validation that returns null on failure
 */
function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Type guard to check if object is WasmAnalysisResult
 */
function isWasmAnalysisResult(obj: unknown): obj is WasmAnalysisResult {
  return safeValidate(WasmAnalysisResultSchema, obj) !== null;
}

/**
 * Type guard to check if object is StreamingConfig
 */
function isStreamingConfig(obj: unknown): obj is StreamingConfig {
  return safeValidate(StreamingConfigSchema, obj) !== null;
}

/**
 * Type guard to check if object is WasmFileInfo
 */
function isWasmFileInfo(obj: unknown): obj is WasmFileInfo {
  return safeValidate(WasmFileInfoSchema, obj) !== null;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default streaming configuration
 */
const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  stopwords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
  entropy_threshold: 4.8,
  risk_threshold: 0.7,
  max_words: 20,
  banned_phrases: ['confidential', 'do not share', 'internal use only', 'secret', 'classified'],
  chunk_size: 1048576 // 1MB
};

/**
 * High security configuration
 */
const HIGH_SECURITY_CONFIG: StreamingConfig = {
  ...DEFAULT_STREAMING_CONFIG,
  entropy_threshold: 3.5,
  risk_threshold: 0.5,
  banned_phrases: [
    ...DEFAULT_STREAMING_CONFIG.banned_phrases,
    'restricted', 'sensitive', 'private', 'proprietary', 'trade secret'
  ]
};

/**
 * Low security configuration
 */
const LOW_SECURITY_CONFIG: StreamingConfig = {
  ...DEFAULT_STREAMING_CONFIG,
  entropy_threshold: 6.0,
  risk_threshold: 0.9,
  banned_phrases: ['confidential', 'secret']
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Union type of all message types
 */
type Message = 
  | AnalyzeFileMessage
  | AnalysisProgressMessage
  | AnalysisCompleteMessage
  | AnalysisErrorMessage
  | ConfigUpdateMessage
  | StatusRequestMessage
  | StatusResponseMessage
  | PerformanceMetricsMessage
  | PerformanceReportMessage
  | StreamInitMessage
  | StreamChunkMessage
  | StreamFinalizeMessage
  | StreamProgressMessage
  | StreamErrorMessage;

/**
 * Generic response wrapper
 */
interface ApiResponse<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error information if operation failed */
  error?: WasmErrorInfo;
  /** Response metadata */
  metadata?: {
    timestamp: number;
    processing_time_ms: number;
    version: string;
  };
}

/**
 * Pagination parameters
 */
interface PaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Sort field */
  sort_by?: string;
  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Pagination information */
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// ============================================================================
// Export New Types and Functions
// ============================================================================

// Export only the new types that don't conflict with existing ones
export type {
  WasmAnalysisResult,
  BannedPhraseMatch,
  PIIPattern,
  ProcessingStats,
  PerformanceMetrics,
  StreamingConfig,
  CustomPIIPattern,
  MessageType,
  BaseMessage,
  AnalyzeFileMessage,
  AnalysisProgressMessage,
  AnalysisCompleteMessage,
  AnalysisErrorMessage,
  ConfigUpdateMessage,
  StatusRequestMessage,
  StatusResponseMessage,
  PerformanceMetricsMessage,
  PerformanceReportMessage,
  StreamInitMessage,
  StreamChunkMessage,
  StreamFinalizeMessage,
  StreamProgressMessage,
  StreamErrorMessage,
  ExtensionHealth,
  WasmFileInfo,
  WasmErrorInfo,
  Message,
  ApiResponse,
  PaginationParams,
  PaginatedResponse
};

export {
  WasmAnalysisResultSchema,
  PerformanceMetricsSchema,
  StreamingConfigSchema,
  WasmFileInfoSchema,
  BaseMessageSchema,
  validateWasmAnalysisResult,
  validateStreamingConfig,
  validateWasmFileInfo,
  validateBaseMessage,
  safeValidate,
  isWasmAnalysisResult,
  isStreamingConfig,
  isWasmFileInfo,
  DEFAULT_STREAMING_CONFIG,
  HIGH_SECURITY_CONFIG,
  LOW_SECURITY_CONFIG
};
