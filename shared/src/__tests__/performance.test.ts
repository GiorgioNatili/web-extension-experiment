import { PerformanceCollector, PerformanceAnalyzer, PerformanceThresholdChecker } from '../utils/performance';
import { PerformanceMetrics } from '../schema';

describe('PerformanceCollector', () => {
  let collector: PerformanceCollector;

  beforeEach(() => {
    collector = new PerformanceCollector();
  });

  describe('start', () => {
    test('should initialize collector state', () => {
      collector.start();
      
      // Test that we can mark timing points
      collector.mark('test');
      expect(() => collector.generateMetrics(1000)).not.toThrow();
    });
  });

  describe('mark', () => {
    test('should record timing points', () => {
      collector.start();
      collector.mark('file_read');
      collector.mark('wasm_analysis');
      
      const metrics = collector.generateMetrics(1000);
      expect(metrics.timing.file_read_ms).toBeGreaterThan(0);
      expect(metrics.timing.wasm_analysis_ms).toBeGreaterThan(0);
    });
  });

  describe('recordMemoryUsage', () => {
    test('should record memory snapshots', () => {
      collector.start();
      collector.recordMemoryUsage(1024 * 1024); // 1MB
      collector.recordMemoryUsage(2 * 1024 * 1024); // 2MB
      
      const metrics = collector.generateMetrics(1000);
      expect(metrics.memory.peak_memory_bytes).toBe(2 * 1024 * 1024);
    });
  });

  describe('recordError', () => {
    test('should increment error count', () => {
      collector.start();
      collector.recordError();
      collector.recordError();
      
      const metrics = collector.generateMetrics(1000);
      expect(metrics.errors.error_count).toBe(2);
      expect(metrics.errors.completed_successfully).toBe(false);
    });
  });

  describe('recordWarning', () => {
    test('should increment warning count', () => {
      collector.start();
      collector.recordWarning();
      collector.recordWarning();
      collector.recordWarning();
      
      const metrics = collector.generateMetrics(1000);
      expect(metrics.errors.warning_count).toBe(3);
    });
  });

  describe('recordRecoveryAttempt', () => {
    test('should increment recovery attempts', () => {
      collector.start();
      collector.recordRecoveryAttempt();
      
      const metrics = collector.generateMetrics(1000);
      expect(metrics.errors.recovery_attempts).toBe(1);
    });
  });

  describe('generateMetrics', () => {
    test('should generate complete metrics', () => {
      collector.start();
      collector.mark('file_read');
      collector.mark('wasm_analysis');
      collector.recordMemoryUsage(1024 * 1024);
      collector.recordError();
      
      const metrics = collector.generateMetrics(1000, 512 * 1024);
      
      expect(metrics.timing.total_ms).toBeGreaterThan(0);
      expect(metrics.memory.peak_memory_bytes).toBe(1024 * 1024);
      expect(metrics.memory.wasm_memory_bytes).toBe(512 * 1024);
      expect(metrics.throughput.bytes_per_second).toBeGreaterThan(0);
      expect(metrics.resources.cpu_cores_used).toBeGreaterThan(0);
      expect(metrics.quality.accuracy_score).toBe(0.95);
      expect(metrics.errors.error_count).toBe(1);
      expect(metrics.errors.completed_successfully).toBe(false);
    });

    test('should calculate throughput correctly', async () => {
      collector.start();
      
      // Simulate 1 second of processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = collector.generateMetrics(1000);
      expect(metrics.throughput.bytes_per_second).toBeGreaterThan(0);
      expect(metrics.throughput.chars_per_second).toBeGreaterThan(0);
    });
  });
});

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
  });

  describe('addMetrics', () => {
    test('should add metrics to history', () => {
      const metrics: PerformanceMetrics = {
        timing: {
          file_read_ms: 100,
          wasm_analysis_ms: 500,
          js_processing_ms: 200,
          ui_update_ms: 50,
          total_ms: 850
        },
        memory: {
          peak_memory_bytes: 52428800,
          final_memory_bytes: 26214400,
          wasm_memory_bytes: 10485760,
          js_memory_bytes: 15728640
        },
        throughput: {
          bytes_per_second: 1000000,
          chars_per_second: 1000000,
          chunks_per_second: 1,
          avg_chunk_time_ms: 850
        },
        resources: {
          cpu_cores_used: 4
        },
        quality: {
          accuracy_score: 0.95,
          false_positive_rate: 0.02,
          false_negative_rate: 0.03,
          confidence_level: 0.9
        },
        errors: {
          error_count: 0,
          warning_count: 1,
          recovery_attempts: 0,
          completed_successfully: true
        }
      };

      analyzer.addMetrics(metrics);
      
      const summary = analyzer.getSummary();
      expect(summary.total_operations).toBe(1);
      expect(summary.successful_operations).toBe(1);
      expect(summary.failed_operations).toBe(0);
    });

    test('should limit history to 100 entries', () => {
      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 1000000, chars_per_second: 1000000, chunks_per_second: 1, avg_chunk_time_ms: 850 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      // Add 101 entries
      for (let i = 0; i < 101; i++) {
        analyzer.addMetrics(metrics);
      }

      const summary = analyzer.getSummary();
      expect(summary.total_operations).toBe(100);
    });
  });

  describe('analyzeTrends', () => {
    test('should return stable for insufficient data', () => {
      const trends = analyzer.analyzeTrends();
      expect(trends.processing_time_trend).toBe('stable');
      expect(trends.memory_usage_trend).toBe('stable');
      expect(trends.throughput_trend).toBe('stable');
    });

    test('should detect improving trends', () => {
      const baseMetrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 1000000, chars_per_second: 1000000, chunks_per_second: 1, avg_chunk_time_ms: 850 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      // Add older, slower metrics
      for (let i = 0; i < 3; i++) {
        analyzer.addMetrics({
          ...baseMetrics,
          timing: { ...baseMetrics.timing, total_ms: 1000 },
          throughput: { ...baseMetrics.throughput, bytes_per_second: 800000 }
        });
      }

      // Add newer, faster metrics
      for (let i = 0; i < 3; i++) {
        analyzer.addMetrics({
          ...baseMetrics,
          timing: { ...baseMetrics.timing, total_ms: 600 },
          throughput: { ...baseMetrics.throughput, bytes_per_second: 1200000 }
        });
      }

      const trends = analyzer.analyzeTrends();
      expect(trends.processing_time_trend).toBe('improving');
      expect(trends.throughput_trend).toBe('improving');
    });

    test('should detect degrading trends', () => {
      const baseMetrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 1000000, chars_per_second: 1000000, chunks_per_second: 1, avg_chunk_time_ms: 850 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      // Add older, faster metrics
      for (let i = 0; i < 3; i++) {
        analyzer.addMetrics({
          ...baseMetrics,
          timing: { ...baseMetrics.timing, total_ms: 600 },
          throughput: { ...baseMetrics.throughput, bytes_per_second: 1200000 }
        });
      }

      // Add newer, slower metrics
      for (let i = 0; i < 3; i++) {
        analyzer.addMetrics({
          ...baseMetrics,
          timing: { ...baseMetrics.timing, total_ms: 1000 },
          throughput: { ...baseMetrics.throughput, bytes_per_second: 800000 }
        });
      }

      const trends = analyzer.analyzeTrends();
      expect(trends.processing_time_trend).toBe('degrading');
      expect(trends.throughput_trend).toBe('degrading');
    });
  });

  describe('getSummary', () => {
    test('should calculate summary statistics', () => {
      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 1000000, chars_per_second: 1000000, chunks_per_second: 1, avg_chunk_time_ms: 850 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      analyzer.addMetrics(metrics);
      analyzer.addMetrics({ ...metrics, errors: { ...metrics.errors, completed_successfully: false } });

      const summary = analyzer.getSummary();
      expect(summary.total_operations).toBe(2);
      expect(summary.successful_operations).toBe(1);
      expect(summary.failed_operations).toBe(1);
      expect(summary.average_processing_time_ms).toBe(850);
    });
  });
});

describe('PerformanceThresholdChecker', () => {
  let checker: PerformanceThresholdChecker;

  beforeEach(() => {
    checker = new PerformanceThresholdChecker();
  });

  describe('checkPerformance', () => {
    test('should accept good performance', () => {
      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 2000000, chars_per_second: 2000000, chunks_per_second: 2, avg_chunk_time_ms: 425 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      const result = checker.checkPerformance(metrics);
      expect(result.is_acceptable).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    test('should flag slow processing', () => {
      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 1000, wasm_analysis_ms: 5000, js_processing_ms: 2000, ui_update_ms: 500, total_ms: 8500 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 2000000, chars_per_second: 2000000, chunks_per_second: 2, avg_chunk_time_ms: 4250 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      const result = checker.checkPerformance(metrics);
      expect(result.is_acceptable).toBe(false);
      expect(result.issues).toContain('Processing time exceeds threshold');
      expect(result.recommendations).toContain('Consider optimizing analysis algorithms or reducing file size');
    });

    test('should flag high memory usage', () => {
      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 200 * 1024 * 1024, final_memory_bytes: 150 * 1024 * 1024, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 2000000, chars_per_second: 2000000, chunks_per_second: 2, avg_chunk_time_ms: 425 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      const result = checker.checkPerformance(metrics);
      expect(result.is_acceptable).toBe(false);
      expect(result.issues).toContain('Memory usage exceeds threshold');
      expect(result.recommendations).toContain('Consider implementing memory cleanup or reducing chunk size');
    });

    test('should flag low throughput', () => {
      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 500000, chars_per_second: 500000, chunks_per_second: 0.5, avg_chunk_time_ms: 1700 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      const result = checker.checkPerformance(metrics);
      expect(result.is_acceptable).toBe(false);
      expect(result.issues).toContain('Throughput below threshold');
      expect(result.recommendations).toContain('Consider optimizing I/O operations or using streaming processing');
    });

    test('should flag high error rate', () => {
      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 100, wasm_analysis_ms: 500, js_processing_ms: 200, ui_update_ms: 50, total_ms: 850 },
        memory: { peak_memory_bytes: 52428800, final_memory_bytes: 26214400, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 2000000, chars_per_second: 2000000, chunks_per_second: 2, avg_chunk_time_ms: 425 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 10, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      const result = checker.checkPerformance(metrics);
      expect(result.is_acceptable).toBe(false);
      expect(result.issues).toContain('Error rate exceeds threshold');
      expect(result.recommendations).toContain('Review error handling and improve robustness');
    });
  });

  describe('updateThresholds', () => {
    test('should update thresholds', () => {
      checker.updateThresholds({
        max_processing_time_ms: 10000,
        max_memory_usage_bytes: 200 * 1024 * 1024
      });

      const metrics: PerformanceMetrics = {
        timing: { file_read_ms: 1000, wasm_analysis_ms: 5000, js_processing_ms: 2000, ui_update_ms: 500, total_ms: 8500 },
        memory: { peak_memory_bytes: 150 * 1024 * 1024, final_memory_bytes: 100 * 1024 * 1024, wasm_memory_bytes: 10485760, js_memory_bytes: 15728640 },
        throughput: { bytes_per_second: 2000000, chars_per_second: 2000000, chunks_per_second: 2, avg_chunk_time_ms: 4250 },
        resources: { cpu_cores_used: 4 },
        quality: { accuracy_score: 0.95, false_positive_rate: 0.02, false_negative_rate: 0.03, confidence_level: 0.9 },
        errors: { error_count: 0, warning_count: 1, recovery_attempts: 0, completed_successfully: true }
      };

      const result = checker.checkPerformance(metrics);
      expect(result.is_acceptable).toBe(true);
    });
  });
});
