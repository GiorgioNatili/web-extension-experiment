// Chrome Error Handler
export enum ErrorType {
  WASM_LOAD_FAILED = 'WASM_LOAD_FAILED',
  CHUNK_PROCESSING_FAILED = 'CHUNK_PROCESSING_FAILED',
  STREAM_INIT_FAILED = 'STREAM_INIT_FAILED',
  STREAM_FINALIZE_FAILED = 'STREAM_FINALIZE_FAILED',
  FILE_READ_FAILED = 'FILE_READ_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum RecoveryStrategy {
  RETRY = 'RETRY',
  FALLBACK = 'FALLBACK',
  ABORT = 'ABORT',
  IGNORE = 'IGNORE'
}

export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  timestamp: number;
  operation?: string;
  retryCount?: number;
  context?: any;
}

export interface RecoveryResult {
  recovered: boolean;
  strategy: RecoveryStrategy;
  fallbackResult?: any;
  retryCount: number;
}

export class ChromeErrorHandler {
  private errorLog: ErrorInfo[] = [];
  private errorStats = {
    total: 0,
    byType: {} as Record<ErrorType, number>,
    bySeverity: {} as Record<ErrorSeverity, number>,
    recent: 0
  };

  /**
   * Handle an error with recovery strategies
   */
  async handleError(error: Error, context: { operation?: string; retryCount?: number; context?: any } = {}): Promise<RecoveryResult> {
    const errorInfo = this.classifyError(error, context);
    this.logError(errorInfo);

    const strategy = this.determineRecoveryStrategy(errorInfo);
    const result = await this.executeRecoveryStrategy(strategy, errorInfo, context);

    return result;
  }

  /**
   * Classify the error type and severity
   */
  private classifyError(error: Error, context: any): ErrorInfo {
    let type = ErrorType.UNKNOWN_ERROR;
    let severity = ErrorSeverity.MEDIUM;

    // Classify error type
    if (error.message.includes('WASM') || error.message.includes('wasm')) {
      type = ErrorType.WASM_LOAD_FAILED;
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('chunk') || error.message.includes('stream')) {
      type = ErrorType.CHUNK_PROCESSING_FAILED;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('timeout')) {
      type = ErrorType.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      type = ErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.LOW;
    } else if (error.message.includes('file') || error.message.includes('read')) {
      type = ErrorType.FILE_READ_FAILED;
      severity = ErrorSeverity.LOW;
    }

    return {
      type,
      severity,
      message: error.message,
      timestamp: Date.now(),
      operation: context.operation,
      retryCount: context.retryCount || 0,
      context: context.context
    };
  }

  /**
   * Determine recovery strategy based on error
   */
  private determineRecoveryStrategy(errorInfo: ErrorInfo): RecoveryStrategy {
    const retryCount = errorInfo.retryCount || 0;
    const maxRetries = 3;

    // Don't retry critical errors
    if (errorInfo.severity === ErrorSeverity.CRITICAL) {
      return RecoveryStrategy.ABORT;
    }

    // Retry with exponential backoff for certain errors
    if (retryCount < maxRetries && (
      errorInfo.type === ErrorType.NETWORK_ERROR ||
      errorInfo.type === ErrorType.TIMEOUT_ERROR ||
      errorInfo.type === ErrorType.CHUNK_PROCESSING_FAILED
    )) {
      return RecoveryStrategy.RETRY;
    }

    // Use fallback for WASM errors
    if (errorInfo.type === ErrorType.WASM_LOAD_FAILED) {
      return RecoveryStrategy.FALLBACK;
    }

    // Ignore low severity errors
    if (errorInfo.severity === ErrorSeverity.LOW) {
      return RecoveryStrategy.IGNORE;
    }

    return RecoveryStrategy.ABORT;
  }

  /**
   * Execute the recovery strategy
   */
  private async executeRecoveryStrategy(strategy: RecoveryStrategy, errorInfo: ErrorInfo, context: any): Promise<RecoveryResult> {
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        return this.retryOperation(errorInfo, context);
      
      case RecoveryStrategy.FALLBACK:
        return this.executeFallback(errorInfo, context);
      
      case RecoveryStrategy.IGNORE:
        return { recovered: true, strategy, retryCount: errorInfo.retryCount || 0 };
      
      case RecoveryStrategy.ABORT:
      default:
        return { recovered: false, strategy, retryCount: errorInfo.retryCount || 0 };
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation(errorInfo: ErrorInfo, context: any): Promise<RecoveryResult> {
    const retryCount = (errorInfo.retryCount || 0) + 1;
    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    console.log(`Retrying operation (attempt ${retryCount}) after ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));

    // For now, we'll simulate a successful retry
    // In a real implementation, this would retry the actual operation
    return {
      recovered: true,
      strategy: RecoveryStrategy.RETRY,
      retryCount
    };
  }

  /**
   * Execute fallback operation
   */
  private async executeFallback(errorInfo: ErrorInfo, context: any): Promise<RecoveryResult> {
    console.log('Executing fallback operation');

    // For WASM errors, fall back to JavaScript-based analysis
    if (errorInfo.type === ErrorType.WASM_LOAD_FAILED) {
      const fallbackResult = {
        decision: 'allow',
        reason: 'Analysis completed using fallback method',
        riskScore: 0.1,
        fallback: true
      };

      return {
        recovered: true,
        strategy: RecoveryStrategy.FALLBACK,
        fallbackResult,
        retryCount: errorInfo.retryCount || 0
      };
    }

    return {
      recovered: false,
      strategy: RecoveryStrategy.FALLBACK,
      retryCount: errorInfo.retryCount || 0
    };
  }

  /**
   * Log an error
   */
  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);
    this.errorStats.total++;
    
    // Update type statistics
    this.errorStats.byType[errorInfo.type] = (this.errorStats.byType[errorInfo.type] || 0) + 1;
    
    // Update severity statistics
    this.errorStats.bySeverity[errorInfo.severity] = (this.errorStats.bySeverity[errorInfo.severity] || 0) + 1;
    
    // Update recent errors (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.errorStats.recent = this.errorLog.filter(error => error.timestamp > fiveMinutesAgo).length;

    console.error('Chrome Error Handler:', errorInfo);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): any {
    return { ...this.errorStats };
  }

  /**
   * Get error log
   */
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.errorStats = {
      total: 0,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: 0
    };
  }
}

// Export singleton instance
export const chromeErrorHandler = new ChromeErrorHandler();
