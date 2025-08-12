import {
  // Message types
  AnalyzeFileMessage,
  AnalysisProgressMessage,
  AnalysisCompleteMessage,
  AnalysisErrorMessage,
  ConfigUpdateMessage,
  StatusRequestMessage,
  StatusResponseMessage,
  
  // Types
  WasmAnalysisResult,
  WasmFileInfo,
  WasmErrorInfo,
  StreamingConfig,
  ExtensionHealth,
  ProcessingStats,
  
  // Validation
  validateBaseMessage,
  safeValidate,
  BaseMessageSchema,
  
  // Configurations
  DEFAULT_STREAMING_CONFIG,
  HIGH_SECURITY_CONFIG,
  LOW_SECURITY_CONFIG
} from '../schema';

// Mock crypto.randomUUID for testing
const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => mockUUID
  },
  writable: true
});

describe('Protocol Communication', () => {
  describe('Message Creation', () => {
    test('should create valid AnalyzeFileMessage', () => {
      const fileInfo: WasmFileInfo = {
        name: 'document.txt',
        size: 1024,
        type: 'text/plain',
        lastModified: Date.now()
      };

      const message: AnalyzeFileMessage = {
        id: crypto.randomUUID(),
        type: 'ANALYZE_FILE',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background',
        file: fileInfo,
        config: {
          risk_threshold: 0.6,
          banned_phrases: ['confidential']
        },
        use_streaming: true
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.id).toBe(mockUUID);
      expect(message.type).toBe('ANALYZE_FILE');
      expect(message.file.name).toBe('document.txt');
    });

    test('should create valid AnalysisProgressMessage', () => {
      const message: AnalysisProgressMessage = {
        id: crypto.randomUUID(),
        type: 'ANALYSIS_PROGRESS',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        progress: 75,
        stage: 'analyzing',
        message: 'Processing chunk 3 of 4...',
        estimated_time_ms: 1500
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.progress).toBe(75);
      expect(message.stage).toBe('analyzing');
    });

    test('should create valid AnalysisCompleteMessage', () => {
      const result: WasmAnalysisResult = {
        risk_score: 0.85,
        decision: 'block',
        reasons: ['High entropy detected', 'Banned phrase found'],
        top_words: [['confidential', 3], ['internal', 2]],
        banned_phrases: [{
          phrase: 'confidential',
          position: 150,
          context: 'This is confidential information',
          severity: 'high'
        }],
        pii_patterns: [],
        entropy: 5.2,
        stats: {
          total_chunks: 4,
          total_content_length: 4096,
          unique_words: 156,
          banned_phrase_count: 1,
          pii_pattern_count: 0,
          processing_time_ms: 1250
        }
      };

      const message: AnalysisCompleteMessage = {
        id: crypto.randomUUID(),
        type: 'ANALYSIS_COMPLETE',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        result: result,
        stats: result.stats
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.result.decision).toBe('block');
      expect(message.result.risk_score).toBe(0.85);
    });

    test('should create valid AnalysisErrorMessage', () => {
      const error: WasmErrorInfo = {
        code: 'ANALYSIS_FAILED',
        message: 'Failed to analyze file due to memory constraints',
        details: { memory_usage: '95%' },
        timestamp: Date.now()
      };

      const message: AnalysisErrorMessage = {
        id: crypto.randomUUID(),
        type: 'ANALYSIS_ERROR',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        error: error,
        file: {
          name: 'large-file.txt',
          size: 10485760, // 10MB
          type: 'text/plain',
          lastModified: Date.now()
        }
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.error.code).toBe('ANALYSIS_FAILED');
      expect(message.file?.size).toBe(10485760);
    });

    test('should create valid ConfigUpdateMessage', () => {
      const config: StreamingConfig = {
        ...DEFAULT_STREAMING_CONFIG,
        risk_threshold: 0.5,
        banned_phrases: ['confidential', 'secret', 'internal']
      };

      const message: ConfigUpdateMessage = {
        id: crypto.randomUUID(),
        type: 'CONFIG_UPDATE',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background',
        config: config,
        apply_immediately: true
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.config.risk_threshold).toBe(0.5);
      expect(message.apply_immediately).toBe(true);
    });

    test('should create valid StatusRequestMessage', () => {
      const message: StatusRequestMessage = {
        id: crypto.randomUUID(),
        type: 'STATUS_REQUEST',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background',
        requested_info: ['config', 'stats', 'health']
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.requested_info).toContain('config');
      expect(message.requested_info).toContain('stats');
      expect(message.requested_info).toContain('health');
    });

    test('should create valid StatusResponseMessage', () => {
      const health: ExtensionHealth = {
        status: 'healthy',
        last_successful_analysis: Date.now(),
        error_count_24h: 0,
        wasm_status: 'loaded',
        memory_usage_bytes: 52428800, // 50MB
        queue_length: 0
      };

      const stats: ProcessingStats = {
        total_chunks: 100,
        total_content_length: 104857600, // 100MB
        unique_words: 5000,
        banned_phrase_count: 25,
        pii_pattern_count: 10,
        processing_time_ms: 5000
      };

      const message: StatusResponseMessage = {
        id: crypto.randomUUID(),
        type: 'STATUS_RESPONSE',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        config: DEFAULT_STREAMING_CONFIG,
        stats: stats,
        health: health
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.health.status).toBe('healthy');
      expect(message.stats.total_chunks).toBe(100);
    });
  });

  describe('Message Validation', () => {
    test('should validate all message types', () => {
      const messageTypes: Array<{ type: string; createMessage: () => any }> = [
        {
          type: 'ANALYZE_FILE',
          createMessage: (): AnalyzeFileMessage => ({
            id: crypto.randomUUID(),
            type: 'ANALYZE_FILE',
            timestamp: Date.now(),
            source: 'content-script',
            target: 'background',
            file: {
              name: 'test.txt',
              size: 100,
              type: 'text/plain',
              lastModified: Date.now()
            }
          })
        },
        {
          type: 'ANALYSIS_PROGRESS',
          createMessage: (): AnalysisProgressMessage => ({
            id: crypto.randomUUID(),
            type: 'ANALYSIS_PROGRESS',
            timestamp: Date.now(),
            source: 'background',
            target: 'content-script',
            progress: 50,
            stage: 'analyzing',
            message: 'Processing...'
          })
        },
        {
          type: 'ANALYSIS_COMPLETE',
          createMessage: (): AnalysisCompleteMessage => ({
            id: crypto.randomUUID(),
            type: 'ANALYSIS_COMPLETE',
            timestamp: Date.now(),
            source: 'background',
            target: 'content-script',
            result: {
              risk_score: 0.5,
              decision: 'allow',
              reasons: ['Low risk'],
              top_words: [],
              banned_phrases: [],
              pii_patterns: [],
              entropy: 3.0,
              stats: {
                total_chunks: 1,
                total_content_length: 100,
                unique_words: 10,
                banned_phrase_count: 0,
                pii_pattern_count: 0,
                processing_time_ms: 50
              }
            },
            stats: {
              total_chunks: 1,
              total_content_length: 100,
              unique_words: 10,
              banned_phrase_count: 0,
              pii_pattern_count: 0,
              processing_time_ms: 50
            }
          })
        },
        {
          type: 'ANALYSIS_ERROR',
          createMessage: (): AnalysisErrorMessage => ({
            id: crypto.randomUUID(),
            type: 'ANALYSIS_ERROR',
            timestamp: Date.now(),
            source: 'background',
            target: 'content-script',
            error: {
              code: 'ERROR',
              message: 'Test error',
              timestamp: Date.now()
            }
          })
        },
        {
          type: 'CONFIG_UPDATE',
          createMessage: (): ConfigUpdateMessage => ({
            id: crypto.randomUUID(),
            type: 'CONFIG_UPDATE',
            timestamp: Date.now(),
            source: 'content-script',
            target: 'background',
            config: DEFAULT_STREAMING_CONFIG,
            apply_immediately: false
          })
        },
        {
          type: 'STATUS_REQUEST',
          createMessage: (): StatusRequestMessage => ({
            id: crypto.randomUUID(),
            type: 'STATUS_REQUEST',
            timestamp: Date.now(),
            source: 'content-script',
            target: 'background',
            requested_info: ['config']
          })
        },
        {
          type: 'STATUS_RESPONSE',
          createMessage: (): StatusResponseMessage => ({
            id: crypto.randomUUID(),
            type: 'STATUS_RESPONSE',
            timestamp: Date.now(),
            source: 'background',
            target: 'content-script',
            config: DEFAULT_STREAMING_CONFIG,
            stats: {
              total_chunks: 0,
              total_content_length: 0,
              unique_words: 0,
              banned_phrase_count: 0,
              pii_pattern_count: 0,
              processing_time_ms: 0
            },
            health: {
              status: 'healthy',
              error_count_24h: 0,
              wasm_status: 'loaded',
              memory_usage_bytes: 0,
              queue_length: 0
            }
          })
        }
      ];

      messageTypes.forEach(({ type, createMessage }) => {
        const message = createMessage();
        expect(() => validateBaseMessage(message)).not.toThrow();
        expect(message.type).toBe(type);
      });
    });

    test('should reject invalid message types', () => {
      const invalidMessage = {
        id: crypto.randomUUID(),
        type: 'INVALID_TYPE',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background'
      };

      expect(() => validateBaseMessage(invalidMessage as any)).toThrow();
    });

    test('should reject messages with invalid UUIDs', () => {
      const invalidMessage = {
        id: 'invalid-uuid',
        type: 'ANALYZE_FILE',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background'
      };

      expect(() => validateBaseMessage(invalidMessage as any)).toThrow();
    });

    test('should reject messages with missing required fields', () => {
      const incompleteMessage = {
        id: crypto.randomUUID(),
        type: 'ANALYZE_FILE'
        // Missing timestamp, source, target
      };

      expect(() => validateBaseMessage(incompleteMessage as any)).toThrow();
    });
  });

  describe('Configuration Management', () => {
    test('should handle different security configurations', () => {
      // Test default configuration
      expect(DEFAULT_STREAMING_CONFIG.risk_threshold).toBe(0.7);
      expect(DEFAULT_STREAMING_CONFIG.entropy_threshold).toBe(4.8);

      // Test high security configuration
      expect(HIGH_SECURITY_CONFIG.risk_threshold).toBe(0.5);
      expect(HIGH_SECURITY_CONFIG.entropy_threshold).toBe(3.5);
      expect(HIGH_SECURITY_CONFIG.banned_phrases.length).toBeGreaterThan(
        DEFAULT_STREAMING_CONFIG.banned_phrases.length
      );

      // Test low security configuration
      expect(LOW_SECURITY_CONFIG.risk_threshold).toBe(0.9);
      expect(LOW_SECURITY_CONFIG.entropy_threshold).toBe(6.0);
      expect(LOW_SECURITY_CONFIG.banned_phrases.length).toBeLessThan(
        DEFAULT_STREAMING_CONFIG.banned_phrases.length
      );
    });

    test('should validate configuration updates', () => {
      const configUpdate: ConfigUpdateMessage = {
        id: crypto.randomUUID(),
        type: 'CONFIG_UPDATE',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background',
        config: HIGH_SECURITY_CONFIG,
        apply_immediately: true
      };

      expect(() => validateBaseMessage(configUpdate)).not.toThrow();
      expect(configUpdate.config.risk_threshold).toBe(0.5);
      expect(configUpdate.apply_immediately).toBe(true);
    });

    test('should handle partial configuration updates', () => {
      const partialConfig = {
        risk_threshold: 0.6,
        banned_phrases: ['custom', 'phrase']
      };

      const configUpdate: ConfigUpdateMessage = {
        id: crypto.randomUUID(),
        type: 'CONFIG_UPDATE',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background',
        config: {
          ...DEFAULT_STREAMING_CONFIG,
          ...partialConfig
        },
        apply_immediately: false
      };

      expect(() => validateBaseMessage(configUpdate)).not.toThrow();
      expect(configUpdate.config.risk_threshold).toBe(0.6);
      expect(configUpdate.config.banned_phrases).toContain('custom');
    });
  });

  describe('Error Handling', () => {
    test('should handle various error types', () => {
      const errorTypes = [
        {
          code: 'WASM_LOAD_FAILED',
          message: 'Failed to load WASM module',
          details: { wasm_size: '2MB' }
        },
        {
          code: 'ANALYSIS_TIMEOUT',
          message: 'Analysis took too long',
          details: { timeout_ms: 30000 }
        },
        {
          code: 'INVALID_FILE_TYPE',
          message: 'Unsupported file type',
          details: { file_type: 'application/pdf' }
        },
        {
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds size limit',
          details: { file_size: '100MB', max_size: '50MB' }
        },
        {
          code: 'MEMORY_ERROR',
          message: 'Insufficient memory',
          details: { available_memory: '100MB', required_memory: '200MB' }
        }
      ];

      errorTypes.forEach((errorInfo) => {
        const error: WasmErrorInfo = {
          ...errorInfo,
          timestamp: Date.now()
        };

        const message: AnalysisErrorMessage = {
          id: crypto.randomUUID(),
          type: 'ANALYSIS_ERROR',
          timestamp: Date.now(),
          source: 'background',
          target: 'content-script',
          error: error
        };

        expect(() => validateBaseMessage(message)).not.toThrow();
        expect(message.error.code).toBe(errorInfo.code);
        expect(message.error.details).toEqual(errorInfo.details);
      });
    });

    test('should handle errors with stack traces', () => {
      const error: WasmErrorInfo = {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        stack: 'Error: Something went wrong\n    at processFile (file.js:10:5)',
        timestamp: Date.now()
      };

      const message: AnalysisErrorMessage = {
        id: crypto.randomUUID(),
        type: 'ANALYSIS_ERROR',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        error: error
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
      expect(message.error.stack).toContain('Error: Something went wrong');
    });
  });

  describe('Health Monitoring', () => {
    test('should handle different health statuses', () => {
      const healthStatuses: Array<{ status: ExtensionHealth['status']; description: string }> = [
        { status: 'healthy', description: 'Extension is working normally' },
        { status: 'degraded', description: 'Extension has some issues but is functional' },
        { status: 'unhealthy', description: 'Extension has critical issues' }
      ];

      healthStatuses.forEach(({ status, description }) => {
        const health: ExtensionHealth = {
          status,
          error_count_24h: status === 'healthy' ? 0 : status === 'degraded' ? 5 : 50,
          wasm_status: status === 'healthy' ? 'loaded' : 'error',
          memory_usage_bytes: 52428800, // 50MB
          queue_length: status === 'healthy' ? 0 : 10
        };

        const message: StatusResponseMessage = {
          id: crypto.randomUUID(),
          type: 'STATUS_RESPONSE',
          timestamp: Date.now(),
          source: 'background',
          target: 'content-script',
          config: DEFAULT_STREAMING_CONFIG,
          stats: {
            total_chunks: 0,
            total_content_length: 0,
            unique_words: 0,
            banned_phrase_count: 0,
            pii_pattern_count: 0,
            processing_time_ms: 0
          },
          health: health
        };

        expect(() => validateBaseMessage(message)).not.toThrow();
        expect(message.health.status).toBe(status);
      });
    });

    test('should handle WASM module statuses', () => {
      const wasmStatuses: Array<ExtensionHealth['wasm_status']> = ['loaded', 'loading', 'error'];

      wasmStatuses.forEach((wasmStatus) => {
        const health: ExtensionHealth = {
          status: wasmStatus === 'loaded' ? 'healthy' : 'degraded',
          error_count_24h: 0,
          wasm_status: wasmStatus,
          memory_usage_bytes: 52428800,
          queue_length: 0
        };

        expect(health.wasm_status).toBe(wasmStatus);
      });
    });
  });

  describe('Performance Monitoring', () => {
    test('should handle processing statistics', () => {
      const stats: ProcessingStats = {
        total_chunks: 100,
        total_content_length: 104857600, // 100MB
        unique_words: 5000,
        banned_phrase_count: 25,
        pii_pattern_count: 10,
        processing_time_ms: 5000
      };

      // Calculate performance metrics
      const chunksPerSecond = stats.total_chunks / (stats.processing_time_ms / 1000);
      const bytesPerSecond = stats.total_content_length / (stats.processing_time_ms / 1000);
      const averageChunkSize = stats.total_content_length / stats.total_chunks;

      expect(chunksPerSecond).toBeGreaterThan(0);
      expect(bytesPerSecond).toBeGreaterThan(0);
      expect(averageChunkSize).toBe(1048576); // 1MB chunks
    });

    test('should handle memory usage monitoring', () => {
      const memoryUsageBytes = 52428800; // 50MB
      const memoryUsageMB = memoryUsageBytes / (1024 * 1024);
      const memoryUsageGB = memoryUsageBytes / (1024 * 1024 * 1024);

      expect(memoryUsageMB).toBe(50);
      expect(memoryUsageGB).toBeCloseTo(0.0488, 3);
    });
  });

  describe('Message Flow Simulation', () => {
    test('should simulate complete analysis workflow', () => {
      const workflow = {
        // 1. File analysis request
        request: {
          id: crypto.randomUUID(),
          type: 'ANALYZE_FILE' as const,
          timestamp: Date.now(),
          source: 'content-script',
          target: 'background',
          file: {
            name: 'document.txt',
            size: 1048576, // 1MB
            type: 'text/plain',
            lastModified: Date.now()
          },
          config: {
            risk_threshold: 0.6,
            banned_phrases: ['confidential']
          },
          use_streaming: true
        },

        // 2. Progress updates
        progress: [
          {
            id: crypto.randomUUID(),
            type: 'ANALYSIS_PROGRESS' as const,
            timestamp: Date.now(),
            source: 'background',
            target: 'content-script',
            progress: 25,
            stage: 'reading' as const,
            message: 'Reading file...'
          },
          {
            id: crypto.randomUUID(),
            type: 'ANALYSIS_PROGRESS' as const,
            timestamp: Date.now(),
            source: 'background',
            target: 'content-script',
            progress: 75,
            stage: 'analyzing' as const,
            message: 'Processing chunk 3 of 4...'
          }
        ],

        // 3. Analysis completion
        completion: {
          id: crypto.randomUUID(),
          type: 'ANALYSIS_COMPLETE' as const,
          timestamp: Date.now(),
          source: 'background',
          target: 'content-script',
          result: {
            risk_score: 0.85,
            decision: 'block' as const,
            reasons: ['High entropy detected', 'Banned phrase found'],
            top_words: [['confidential', 3], ['internal', 2]],
            banned_phrases: [{
              phrase: 'confidential',
              position: 150,
              context: 'This is confidential information',
              severity: 'high' as const
            }],
            pii_patterns: [],
            entropy: 5.2,
            stats: {
              total_chunks: 4,
              total_content_length: 1048576,
              unique_words: 156,
              banned_phrase_count: 1,
              pii_pattern_count: 0,
              processing_time_ms: 1250
            }
          },
          stats: {
            total_chunks: 4,
            total_content_length: 1048576,
            unique_words: 156,
            banned_phrase_count: 1,
            pii_pattern_count: 0,
            processing_time_ms: 1250
          }
        }
      };

      // Validate all messages in the workflow
      expect(() => validateBaseMessage(workflow.request)).not.toThrow();
      workflow.progress.forEach(progress => {
        expect(() => validateBaseMessage(progress)).not.toThrow();
      });
      expect(() => validateBaseMessage(workflow.completion)).not.toThrow();

      // Verify workflow logic
      expect(workflow.request.file.size).toBe(1048576);
      expect(workflow.progress[0].progress).toBe(25);
      expect(workflow.progress[1].progress).toBe(75);
      expect(workflow.completion.result.decision).toBe('block');
      expect(workflow.completion.result.risk_score).toBe(0.85);
    });
  });
});
