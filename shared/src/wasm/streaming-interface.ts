import { 
  WasmAnalysisResult, 
  ProcessingStats, 
  StreamingConfig, 
  PerformanceMetrics 
} from '../schema';

/**
 * Streaming WASM module interface
 */
export interface StreamingWASMModule {
  /**
   * Initialize streaming analysis
   */
  init(config?: Partial<StreamingConfig>): Promise<void>;
  
  /**
   * Process a chunk of data
   */
  processChunk(chunk: string): Promise<ProcessingStats>;
  
  /**
   * Finalize analysis and get results
   */
  finalize(): Promise<WasmAnalysisResult>;
  
  /**
   * Get current processing statistics
   */
  getStats(): ProcessingStats;
  
  /**
   * Reset the analyzer state
   */
  reset(): Promise<void>;
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<StreamingConfig>): Promise<void>;
}

/**
 * Streaming WASM loader interface
 */
export interface StreamingWASMLoader {
  /**
   * Load the streaming WASM module
   */
  load(): Promise<StreamingWASMModule>;
  
  /**
   * Check if module is loaded
   */
  isLoaded(): boolean;
  
  /**
   * Unload the module
   */
  unload(): Promise<void>;
}

/**
 * Streaming operation state
 */
export interface StreamingOperation {
  /** Operation identifier */
  id: string;
  /** File information */
  file: {
    name: string;
    size: number;
    type: string;
  };
  /** Analysis configuration */
  config: StreamingConfig;
  /** Current processing state */
  state: 'initializing' | 'processing' | 'paused' | 'completed' | 'error';
  /** Processing statistics */
  stats: ProcessingStats;
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Error information if any */
  error?: string;
  /** Start timestamp */
  startTime: number;
  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Backpressure control interface
 */
export interface BackpressureControl {
  /** Whether processing should be paused */
  pause: boolean;
  /** Resume after this many milliseconds */
  resumeAfterMs?: number;
  /** Current queue size */
  queueSize: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Processing rate (chunks per second) */
  processingRate: number;
}

/**
 * Streaming operation manager
 */
export interface StreamingOperationManager {
  /**
   * Initialize a new streaming operation
   */
  initOperation(
    operationId: string, 
    file: { name: string; size: number; type: string },
    config?: Partial<StreamingConfig>
  ): Promise<StreamingOperation>;
  
  /**
   * Process a chunk for an operation
   */
  processChunk(
    operationId: string, 
    chunkIndex: number, 
    chunkData: string, 
    isLast: boolean
  ): Promise<{
    stats: ProcessingStats;
    backpressure: BackpressureControl;
  }>;
  
  /**
   * Finalize an operation
   */
  finalizeOperation(operationId: string, force?: boolean): Promise<WasmAnalysisResult>;
  
  /**
   * Get operation status
   */
  getOperation(operationId: string): StreamingOperation | null;
  
  /**
   * Cancel an operation
   */
  cancelOperation(operationId: string): Promise<void>;
  
  /**
   * Get all active operations
   */
  getActiveOperations(): StreamingOperation[];
  
  /**
   * Clean up completed operations
   */
  cleanup(): Promise<void>;
}
