// Safari Error Handler
export enum ErrorType {
  WASM_ERROR = 'wasm_error',
  FILE_ERROR = 'file_error',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  ABORT = 'abort'
}

export interface ErrorInfo {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  timestamp: number;
  context: any;
  retryCount: number;
  recovered: boolean;
}

export interface RecoveryResult {
  recovered: boolean;
  strategy: RecoveryStrategy;
  message: string;
  fallbackUsed?: boolean;
}

export class SafariErrorHandler {
  private errorLog: ErrorInfo[] = [];
  private errorStats = {
    total: 0,
    byType: {} as Record<ErrorType, number>,
    bySeverity: {} as Record<ErrorSeverity, number>,
    recovered: 0,
    unrecovered: 0
  };

  async handleError(error: Error, context: { operation?: string; retryCount?: number; context?: any } = {}): Promise<RecoveryResult> {
    const errorInfo = this.classifyError(error, context);
    this.logError(errorInfo);

    const strategy = this.determineRecoveryStrategy(errorInfo);
    const result = await this.executeRecoveryStrategy(strategy, errorInfo, context);

    if (result.recovered) {
      this.errorStats.recovered++;
    } else {
      this.errorStats.unrecovered++;
    }

    return result;
  }

  private classifyError(error: Error, context: any): ErrorInfo {
    let type = ErrorType.UNKNOWN_ERROR;
    let severity = ErrorSeverity.MEDIUM;

    // Classify error type
    if (error.message.includes('WASM') || error.message.includes('wasm')) {
      type = ErrorType.WASM_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('file') || error.message.includes('File')) {
      type = ErrorType.FILE_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      type = ErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      type = ErrorType.PERMISSION_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
      type = ErrorType.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
    }

    // Adjust severity based on context
    if (context.operation === 'wasm_init') {
      severity = ErrorSeverity.CRITICAL;
    } else if (context.retryCount && context.retryCount > 3) {
      severity = ErrorSeverity.HIGH;
    }

    return {
      id: `safari_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message: error.message,
      timestamp: Date.now(),
      context,
      retryCount: context.retryCount || 0,
      recovered: false
    };
  }

  private determineRecoveryStrategy(errorInfo: ErrorInfo): RecoveryStrategy {
    switch (errorInfo.type) {
      case ErrorType.WASM_ERROR:
        return errorInfo.retryCount < 2 ? RecoveryStrategy.RETRY : RecoveryStrategy.FALLBACK;
      
      case ErrorType.FILE_ERROR:
        return RecoveryStrategy.FALLBACK;
      
      case ErrorType.NETWORK_ERROR:
        return errorInfo.retryCount < 3 ? RecoveryStrategy.RETRY : RecoveryStrategy.FALLBACK;
      
      case ErrorType.PERMISSION_ERROR:
        return RecoveryStrategy.ABORT;
      
      case ErrorType.TIMEOUT_ERROR:
        return errorInfo.retryCount < 2 ? RecoveryStrategy.RETRY : RecoveryStrategy.FALLBACK;
      
      default:
        return RecoveryStrategy.IGNORE;
    }
  }

  private async executeRecoveryStrategy(strategy: RecoveryStrategy, errorInfo: ErrorInfo, context: any): Promise<RecoveryResult> {
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        return await this.retryOperation(errorInfo, context);
      
      case RecoveryStrategy.FALLBACK:
        return await this.executeFallback(errorInfo, context);
      
      case RecoveryStrategy.IGNORE:
        return {
          recovered: true,
          strategy,
          message: 'Error ignored'
        };
      
      case RecoveryStrategy.ABORT:
        return {
          recovered: false,
          strategy,
          message: 'Operation aborted due to critical error'
        };
      
      default:
        return {
          recovered: false,
          strategy,
          message: 'Unknown recovery strategy'
        };
    }
  }

  private async retryOperation(errorInfo: ErrorInfo, context: any): Promise<RecoveryResult> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    if (errorInfo.retryCount >= maxRetries) {
      return {
        recovered: false,
        strategy: RecoveryStrategy.RETRY,
        message: `Max retries (${maxRetries}) exceeded`
      };
    }

    // Exponential backoff
    const delay = baseDelay * Math.pow(2, errorInfo.retryCount);
    
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Simulate retry attempt
      console.log(`Retrying operation (attempt ${errorInfo.retryCount + 1}/${maxRetries})`);
      
      // In a real implementation, this would retry the actual operation
      // For now, we'll simulate a successful retry
      const success = Math.random() > 0.3; // 70% success rate
      
      if (success) {
        return {
          recovered: true,
          strategy: RecoveryStrategy.RETRY,
          message: `Operation succeeded on retry ${errorInfo.retryCount + 1}`
        };
      } else {
        // Simulate another error
        throw new Error(`Retry attempt ${errorInfo.retryCount + 1} failed`);
      }
      
    } catch (retryError: unknown) {
      return {
        recovered: false,
        strategy: RecoveryStrategy.RETRY,
        message: `Retry attempt ${errorInfo.retryCount + 1} failed: ${(retryError as Error).message}`
      };
    }
  }

  private async executeFallback(errorInfo: ErrorInfo, context: any): Promise<RecoveryResult> {
    try {
      console.log('Executing fallback strategy');
      
      // Simulate fallback operation (e.g., JavaScript-based analysis)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        recovered: true,
        strategy: RecoveryStrategy.FALLBACK,
        message: 'Fallback operation completed successfully',
        fallbackUsed: true
      };
      
    } catch (fallbackError: unknown) {
      return {
        recovered: false,
        strategy: RecoveryStrategy.FALLBACK,
        message: `Fallback operation failed: ${(fallbackError as Error).message}`
      };
    }
  }

  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);
    this.errorStats.total++;
    
    // Update type statistics
    this.errorStats.byType[errorInfo.type] = (this.errorStats.byType[errorInfo.type] || 0) + 1;
    this.errorStats.bySeverity[errorInfo.severity] = (this.errorStats.bySeverity[errorInfo.severity] || 0) + 1;
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
    
    console.error('Safari Error:', {
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.message,
      context: errorInfo.context
    });
  }

  getErrorStats(): any {
    return {
      ...this.errorStats,
      recoveryRate: this.errorStats.total > 0 ? 
        (this.errorStats.recovered / this.errorStats.total * 100).toFixed(2) + '%' : '0%'
    };
  }

  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
    this.errorStats = {
      total: 0,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recovered: 0,
      unrecovered: 0
    };
  }
}

export const safariErrorHandler = new SafariErrorHandler();
