import { 
  StreamingOperationManager,
  StreamingOperation,
  BackpressureControl 
} from './streaming-interface';
import { StreamingWASMLoaderImpl } from './streaming-loader';
import { 
  WasmAnalysisResult, 
  ProcessingStats, 
  StreamingConfig,
  PerformanceMetrics,
  DEFAULT_STREAMING_CONFIG 
} from '../schema';
import { PerformanceCollector } from '../utils/performance';

/**
 * Streaming operation manager implementation
 */
export class StreamingOperationManagerImpl implements StreamingOperationManager {
  private operations = new Map<string, StreamingOperation>();
  private wasmLoader: StreamingWASMLoaderImpl;
  private maxConcurrentOperations: number;
  private maxQueueSize: number;
  private processingRate: number; // chunks per second
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    maxConcurrentOperations = 3,
    maxQueueSize = 10,
    processingRate = 5 // 5 chunks per second
  ) {
    this.wasmLoader = new StreamingWASMLoaderImpl();
    this.maxConcurrentOperations = maxConcurrentOperations;
    this.maxQueueSize = maxQueueSize;
    this.processingRate = processingRate;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  async initOperation(
    operationId: string, 
    file: { name: string; size: number; type: string },
    config?: Partial<StreamingConfig>
  ): Promise<StreamingOperation> {
    // Check if operation already exists
    if (this.operations.has(operationId)) {
      throw new Error(`Operation ${operationId} already exists`);
    }

    // Check concurrent operations limit
    if (this.operations.size >= this.maxConcurrentOperations) {
      throw new Error('Maximum concurrent operations reached');
    }

    // Load WASM module if not loaded
    const module = await this.wasmLoader.load();
    
    // Initialize the module with configuration
    await module.init(config);
    
    // Create operation
    const operation: StreamingOperation = {
      id: operationId,
      file,
      config: { ...DEFAULT_STREAMING_CONFIG, ...config },
      state: 'initializing',
      stats: {
        total_chunks: 0,
        total_content_length: 0,
        unique_words: 0,
        banned_phrase_count: 0,
        pii_pattern_count: 0,
        processing_time_ms: 0,
        performance: {
          timing: { file_read_ms: 0, wasm_analysis_ms: 0, js_processing_ms: 0, ui_update_ms: 0, total_ms: 0 },
          memory: { peak_memory_bytes: 0, final_memory_bytes: 0, wasm_memory_bytes: 0, js_memory_bytes: 0 },
          throughput: { bytes_per_second: 0, chars_per_second: 0, chunks_per_second: 0, avg_chunk_time_ms: 0 },
          resources: { cpu_cores_used: navigator.hardwareConcurrency || 1 },
          quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
          errors: { error_count: 0, warning_count: 0, recovery_attempts: 0, completed_successfully: true }
        }
      },
      performance: {
        timing: { file_read_ms: 0, wasm_analysis_ms: 0, js_processing_ms: 0, ui_update_ms: 0, total_ms: 0 },
        memory: { peak_memory_bytes: 0, final_memory_bytes: 0, wasm_memory_bytes: 0, js_memory_bytes: 0 },
        throughput: { bytes_per_second: 0, chars_per_second: 0, chunks_per_second: 0, avg_chunk_time_ms: 0 },
        resources: { cpu_cores_used: navigator.hardwareConcurrency || 1 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 0, recovery_attempts: 0, completed_successfully: true }
      },
      startTime: Date.now(),
      lastActivity: Date.now()
    };

    this.operations.set(operationId, operation);
    
    // Update state to processing
    operation.state = 'processing';
    operation.lastActivity = Date.now();

    return operation;
  }

  async processChunk(
    operationId: string, 
    chunkIndex: number, 
    chunkData: string, 
    isLast: boolean
  ): Promise<{
    stats: ProcessingStats;
    backpressure: BackpressureControl;
  }> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.state === 'completed' || operation.state === 'error') {
      throw new Error(`Operation ${operationId} is already ${operation.state}`);
    }

    // Update last activity
    operation.lastActivity = Date.now();

    try {
      // Load WASM module
      const module = await this.wasmLoader.load();
      
      // Process chunk
      const stats = await module.processChunk(chunkData);
      
      // Update operation statistics
      operation.stats = stats;
      operation.performance = stats.performance;
      
      // Mark as completed if this is the last chunk
      if (isLast) {
        operation.state = 'completed';
      }

      // Calculate backpressure
      const backpressure = this.calculateBackpressure(operation);

      return { stats, backpressure };
    } catch (error) {
      operation.state = 'error';
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async finalizeOperation(operationId: string, force = false): Promise<WasmAnalysisResult> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.state === 'error' && !force) {
      throw new Error(`Operation ${operationId} is in error state`);
    }

    try {
      // Load WASM module
      const module = await this.wasmLoader.load();
      
      // Finalize analysis
      const result = await module.finalize();
      
      // Update operation state
      operation.state = 'completed';
      operation.lastActivity = Date.now();
      
      return result;
    } catch (error) {
      operation.state = 'error';
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  getOperation(operationId: string): StreamingOperation | null {
    return this.operations.get(operationId) || null;
  }

  async cancelOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    // Load WASM module and reset
    const module = await this.wasmLoader.load();
    await module.reset();
    
    // Remove operation
    this.operations.delete(operationId);
  }

  getActiveOperations(): StreamingOperation[] {
    return Array.from(this.operations.values()).filter(
      op => op.state === 'initializing' || op.state === 'processing'
    );
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [operationId, operation] of this.operations.entries()) {
      // Remove completed/error operations older than maxAge
      if ((operation.state === 'completed' || operation.state === 'error') &&
          (now - operation.lastActivity) > maxAge) {
        this.operations.delete(operationId);
      }
    }
  }

  private calculateBackpressure(operation: StreamingOperation): BackpressureControl {
    const activeOperations = this.getActiveOperations();
    const queueSize = activeOperations.length;
    
    // Calculate processing rate based on current load
    const currentRate = this.processingRate / Math.max(1, queueSize);
    
    // Determine if we should pause
    const pause = queueSize >= this.maxQueueSize || 
                  operation.stats.processing_time_ms > 5000; // 5 second timeout
    
    // Calculate resume delay
    const resumeAfterMs = pause ? Math.min(1000 * queueSize, 5000) : undefined;
    
    return {
      pause,
      resumeAfterMs,
      queueSize,
      maxQueueSize: this.maxQueueSize,
      processingRate: currentRate
    };
  }

  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(console.error);
    }, 5 * 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.operations.clear();
  }
}
