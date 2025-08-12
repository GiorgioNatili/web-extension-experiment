import {
  // Types
  WasmAnalysisResult,
  BannedPhraseMatch,
  PIIPattern,
  ProcessingStats,
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
  ExtensionHealth,
  WasmFileInfo,
  WasmErrorInfo,
  Message,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  
  // Schemas
  WasmAnalysisResultSchema,
  StreamingConfigSchema,
  WasmFileInfoSchema,
  BaseMessageSchema,
  
  // Validation Functions
  validateWasmAnalysisResult,
  validateStreamingConfig,
  validateWasmFileInfo,
  validateBaseMessage,
  safeValidate,
  
  // Type Guards
  isWasmAnalysisResult,
  isStreamingConfig,
  isWasmFileInfo,
  
  // Default Configurations
  DEFAULT_STREAMING_CONFIG,
  HIGH_SECURITY_CONFIG,
  LOW_SECURITY_CONFIG
} from '../schema';

describe('Schema Validation', () => {
  describe('WasmAnalysisResult', () => {
    const validAnalysisResult: WasmAnalysisResult = {
      risk_score: 0.75,
      decision: 'block',
      reasons: ['High entropy detected', 'Banned phrase found'],
      top_words: [['confidential', 3], ['internal', 2]],
      banned_phrases: [{
        phrase: 'confidential',
        position: 150,
        context: 'This is confidential information',
        severity: 'high'
      }],
      pii_patterns: [{
        type: 'phone',
        pattern: '123-456-7890',
        position: 200,
        confidence: 0.9
      }],
      entropy: 5.2,
      stats: {
        total_chunks: 4,
        total_content_length: 4096,
        unique_words: 156,
        banned_phrase_count: 1,
        pii_pattern_count: 1,
        processing_time_ms: 1250
      }
    };

    test('should validate correct WasmAnalysisResult', () => {
      expect(() => validateWasmAnalysisResult(validAnalysisResult)).not.toThrow();
    });

    test('should reject invalid risk score', () => {
      const invalid = { ...validAnalysisResult, risk_score: 1.5 };
      expect(() => validateWasmAnalysisResult(invalid)).toThrow();
    });

    test('should reject invalid decision', () => {
      const invalid = { ...validAnalysisResult, decision: 'maybe' as any };
      expect(() => validateWasmAnalysisResult(invalid)).toThrow();
    });

    test('should reject invalid banned phrase severity', () => {
      const invalid = {
        ...validAnalysisResult,
        banned_phrases: [{ ...validAnalysisResult.banned_phrases[0], severity: 'critical' as any }]
      };
      expect(() => validateWasmAnalysisResult(invalid)).toThrow();
    });

    test('should reject invalid PII pattern type', () => {
      const invalid = {
        ...validAnalysisResult,
        pii_patterns: [{ ...validAnalysisResult.pii_patterns[0], type: 'invalid' as any }]
      };
      expect(() => validateWasmAnalysisResult(invalid)).toThrow();
    });

    test('should reject invalid confidence score', () => {
      const invalid = {
        ...validAnalysisResult,
        pii_patterns: [{ ...validAnalysisResult.pii_patterns[0], confidence: 1.5 }]
      };
      expect(() => validateWasmAnalysisResult(invalid)).toThrow();
    });

    test('type guard should return true for valid result', () => {
      expect(isWasmAnalysisResult(validAnalysisResult)).toBe(true);
    });

    test('type guard should return false for invalid result', () => {
      expect(isWasmAnalysisResult({ invalid: 'data' })).toBe(false);
    });

    test('safe validation should return null for invalid data', () => {
      const result = safeValidate(WasmAnalysisResultSchema, { invalid: 'data' });
      expect(result).toBeNull();
    });
  });

  describe('StreamingConfig', () => {
    const validConfig: StreamingConfig = {
      stopwords: ['the', 'a', 'an'],
      entropy_threshold: 4.8,
      risk_threshold: 0.7,
      max_words: 20,
      banned_phrases: ['confidential', 'secret'],
      custom_pii_patterns: [{
        id: 'custom-1',
        name: 'Custom Pattern',
        regex: '\\d{3}-\\d{2}-\\d{4}',
        type: 'ssn',
        confidence: 0.9,
        enabled: true
      }],
      chunk_size: 1048576
    };

    test('should validate correct StreamingConfig', () => {
      expect(() => validateStreamingConfig(validConfig)).not.toThrow();
    });

    test('should reject invalid entropy threshold', () => {
      const invalid = { ...validConfig, entropy_threshold: 10.0 };
      expect(() => validateStreamingConfig(invalid)).toThrow();
    });

    test('should reject invalid risk threshold', () => {
      const invalid = { ...validConfig, risk_threshold: 1.5 };
      expect(() => validateStreamingConfig(invalid)).toThrow();
    });

    test('should reject invalid max words', () => {
      const invalid = { ...validConfig, max_words: 0 };
      expect(() => validateStreamingConfig(invalid)).toThrow();
    });

    test('should reject invalid chunk size', () => {
      const invalid = { ...validConfig, chunk_size: 500 }; // Too small
      expect(() => validateStreamingConfig(invalid)).toThrow();
    });

    test('should reject invalid custom PII pattern type', () => {
      const invalid = {
        ...validConfig,
        custom_pii_patterns: [{ ...validConfig.custom_pii_patterns![0], type: 'invalid' as any }]
      };
      expect(() => validateStreamingConfig(invalid)).toThrow();
    });

    test('type guard should return true for valid config', () => {
      expect(isStreamingConfig(validConfig)).toBe(true);
    });

    test('type guard should return false for invalid config', () => {
      expect(isStreamingConfig({ invalid: 'data' })).toBe(false);
    });
  });

  describe('WasmFileInfo', () => {
    const validFileInfo: WasmFileInfo = {
      name: 'document.txt',
      size: 1024,
      type: 'text/plain',
      lastModified: Date.now(),
      hash: 'abc123',
      is_encrypted: false
    };

    test('should validate correct WasmFileInfo', () => {
      expect(() => validateWasmFileInfo(validFileInfo)).not.toThrow();
    });

    test('should reject empty name', () => {
      const invalid = { ...validFileInfo, name: '' };
      expect(() => validateWasmFileInfo(invalid)).toThrow();
    });

    test('should reject negative size', () => {
      const invalid = { ...validFileInfo, size: -1 };
      expect(() => validateWasmFileInfo(invalid)).toThrow();
    });

    test('should accept optional fields', () => {
      const minimal = {
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
        lastModified: Date.now()
      };
      expect(() => validateWasmFileInfo(minimal)).not.toThrow();
    });

    test('type guard should return true for valid file info', () => {
      expect(isWasmFileInfo(validFileInfo)).toBe(true);
    });

    test('type guard should return false for invalid file info', () => {
      expect(isWasmFileInfo({ invalid: 'data' })).toBe(false);
    });
  });

  describe('BaseMessage', () => {
    const validMessage: BaseMessage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ANALYZE_FILE',
      timestamp: Date.now(),
      source: 'content-script',
      target: 'background'
    };

    test('should validate correct BaseMessage', () => {
      expect(() => validateBaseMessage(validMessage)).not.toThrow();
    });

    test('should reject invalid UUID', () => {
      const invalid = { ...validMessage, id: 'invalid-uuid' };
      expect(() => validateBaseMessage(invalid)).toThrow();
    });

    test('should reject invalid message type', () => {
      const invalid = { ...validMessage, type: 'INVALID_TYPE' as any };
      expect(() => validateBaseMessage(invalid)).toThrow();
    });

    test('should reject missing required fields', () => {
      const invalid = { id: validMessage.id, type: validMessage.type };
      expect(() => validateBaseMessage(invalid as any)).toThrow();
    });
  });

  describe('Message Types', () => {
    test('should validate AnalyzeFileMessage', () => {
      const message: AnalyzeFileMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ANALYZE_FILE',
        timestamp: Date.now(),
        source: 'content-script',
        target: 'background',
        file: {
          name: 'test.txt',
          size: 1024,
          type: 'text/plain',
          lastModified: Date.now()
        },
        config: {
          risk_threshold: 0.6,
          banned_phrases: ['confidential']
        },
        use_streaming: true
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
    });

    test('should validate AnalysisProgressMessage', () => {
      const message: AnalysisProgressMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
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
    });

    test('should validate AnalysisCompleteMessage', () => {
      const message: AnalysisCompleteMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ANALYSIS_COMPLETE',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        result: {
          risk_score: 0.85,
          decision: 'block',
          reasons: ['High entropy detected'],
          top_words: [['confidential', 3]],
          banned_phrases: [],
          pii_patterns: [],
          entropy: 5.2,
          stats: {
            total_chunks: 4,
            total_content_length: 4096,
            unique_words: 156,
            banned_phrase_count: 0,
            pii_pattern_count: 0,
            processing_time_ms: 1250
          }
        },
        stats: {
          total_chunks: 4,
          total_content_length: 4096,
          unique_words: 156,
          banned_phrase_count: 0,
          pii_pattern_count: 0,
          processing_time_ms: 1250
        }
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
    });

    test('should validate AnalysisErrorMessage', () => {
      const message: AnalysisErrorMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ANALYSIS_ERROR',
        timestamp: Date.now(),
        source: 'background',
        target: 'content-script',
        error: {
          code: 'ANALYSIS_FAILED',
          message: 'Failed to analyze file',
          timestamp: Date.now()
        },
        file: {
          name: 'test.txt',
          size: 1024,
          type: 'text/plain',
          lastModified: Date.now()
        }
      };

      expect(() => validateBaseMessage(message)).not.toThrow();
    });
  });

  describe('Default Configurations', () => {
    test('DEFAULT_STREAMING_CONFIG should be valid', () => {
      expect(() => validateStreamingConfig(DEFAULT_STREAMING_CONFIG)).not.toThrow();
    });

    test('HIGH_SECURITY_CONFIG should be valid', () => {
      expect(() => validateStreamingConfig(HIGH_SECURITY_CONFIG)).not.toThrow();
    });

    test('LOW_SECURITY_CONFIG should be valid', () => {
      expect(() => validateStreamingConfig(LOW_SECURITY_CONFIG)).not.toThrow();
    });

    test('HIGH_SECURITY_CONFIG should have lower risk threshold', () => {
      expect(HIGH_SECURITY_CONFIG.risk_threshold).toBeLessThan(DEFAULT_STREAMING_CONFIG.risk_threshold);
    });

    test('LOW_SECURITY_CONFIG should have higher risk threshold', () => {
      expect(LOW_SECURITY_CONFIG.risk_threshold).toBeGreaterThan(DEFAULT_STREAMING_CONFIG.risk_threshold);
    });

    test('HIGH_SECURITY_CONFIG should have more banned phrases', () => {
      expect(HIGH_SECURITY_CONFIG.banned_phrases.length).toBeGreaterThan(DEFAULT_STREAMING_CONFIG.banned_phrases.length);
    });

    test('LOW_SECURITY_CONFIG should have fewer banned phrases', () => {
      expect(LOW_SECURITY_CONFIG.banned_phrases.length).toBeLessThan(DEFAULT_STREAMING_CONFIG.banned_phrases.length);
    });
  });

  describe('Utility Types', () => {
    test('ApiResponse should work with generic types', () => {
      const response: ApiResponse<WasmAnalysisResult> = {
        success: true,
        data: {
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
        metadata: {
          timestamp: Date.now(),
          processing_time_ms: 50,
          version: '1.0.0'
        }
      };

      expect(response.success).toBe(true);
      expect(response.data?.decision).toBe('allow');
    });

    test('PaginatedResponse should work with generic types', () => {
      const response: PaginatedResponse<WasmFileInfo> = {
        success: true,
        data: [{
          name: 'test1.txt',
          size: 100,
          type: 'text/plain',
          lastModified: Date.now()
        }],
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_items: 1,
          items_per_page: 10,
          has_next: false,
          has_previous: false
        }
      };

      expect(response.success).toBe(true);
      expect(response.data?.length).toBe(1);
      expect(response.pagination.current_page).toBe(1);
    });

    test('PaginationParams should be valid', () => {
      const params: PaginationParams = {
        page: 1,
        limit: 10,
        sort_by: 'name',
        sort_order: 'asc'
      };

      expect(params.page).toBe(1);
      expect(params.limit).toBe(10);
      expect(params.sort_order).toBe('asc');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty arrays', () => {
      const config: StreamingConfig = {
        ...DEFAULT_STREAMING_CONFIG,
        stopwords: [],
        banned_phrases: []
      };
      expect(() => validateStreamingConfig(config)).not.toThrow();
    });

    test('should handle null and undefined values', () => {
      expect(safeValidate(WasmAnalysisResultSchema, null)).toBeNull();
      expect(safeValidate(WasmAnalysisResultSchema, undefined)).toBeNull();
    });

    test('should handle malformed data', () => {
      const malformed = {
        risk_score: 'not a number',
        decision: 'invalid',
        reasons: 'not an array'
      };
      expect(safeValidate(WasmAnalysisResultSchema, malformed)).toBeNull();
    });

    test('should handle missing required fields', () => {
      const incomplete = {
        risk_score: 0.5,
        decision: 'allow'
        // Missing other required fields
      };
      expect(safeValidate(WasmAnalysisResultSchema, incomplete)).toBeNull();
    });
  });

  describe('Performance', () => {
    test('should handle large arrays efficiently', () => {
      const largeConfig: StreamingConfig = {
        ...DEFAULT_STREAMING_CONFIG,
        stopwords: Array.from({ length: 1000 }, (_, i) => `word${i}`),
        banned_phrases: Array.from({ length: 100 }, (_, i) => `phrase${i}`)
      };

      const start = performance.now();
      expect(() => validateStreamingConfig(largeConfig)).not.toThrow();
      const end = performance.now();

      // Should complete within 100ms
      expect(end - start).toBeLessThan(100);
    });

    test('should handle nested objects efficiently', () => {
      const complexResult: WasmAnalysisResult = {
        risk_score: 0.5,
        decision: 'allow',
        reasons: Array.from({ length: 100 }, (_, i) => `reason${i}`),
        top_words: Array.from({ length: 100 }, (_, i) => [`word${i}`, i]),
        banned_phrases: Array.from({ length: 50 }, (_, i) => ({
          phrase: `phrase${i}`,
          position: i * 10,
          context: `context${i}`,
          severity: 'medium' as const
        })),
        pii_patterns: Array.from({ length: 25 }, (_, i) => ({
          type: 'phone' as const,
          pattern: `pattern${i}`,
          position: i * 20,
          confidence: 0.8
        })),
        entropy: 4.0,
        stats: {
          total_chunks: 10,
          total_content_length: 10000,
          unique_words: 500,
          banned_phrase_count: 50,
          pii_pattern_count: 25,
          processing_time_ms: 1000
        }
      };

      const start = performance.now();
      expect(() => validateWasmAnalysisResult(complexResult)).not.toThrow();
      const end = performance.now();

      // Should complete within 50ms
      expect(end - start).toBeLessThan(50);
    });
  });
});
