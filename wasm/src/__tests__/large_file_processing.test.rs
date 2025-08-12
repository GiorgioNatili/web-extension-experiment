use wasm_bindgen_test::*;
use wasm::WasmModule;
use wasm::streaming::{StreamingAnalyzer, StreamingConfig, ProcessingStats};

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_large_file_streaming_analysis() {
    // Test streaming analysis with a large file (simulated)
    let mut analyzer = StreamingAnalyzer::new(StreamingConfig::default());
    
    // Simulate processing a 1GB file in 1MB chunks
    let chunk_size = 1024 * 1024; // 1MB chunks
    let total_size = 1024 * 1024 * 1024; // 1GB
    let num_chunks = total_size / chunk_size;
    
    // Create test data with known patterns
    let test_chunk = create_test_chunk(chunk_size);
    
    for _ in 0..num_chunks {
        analyzer.process_chunk(&test_chunk);
    }
    
    let result = analyzer.finalize();
    
    // Verify results
    assert!(result.is_ok());
    let analysis = result.unwrap();
    
    // Should detect patterns across the entire file
    assert!(analysis.banned_phrases.len() > 0);
    assert!(analysis.pii_patterns.len() > 0);
    assert!(analysis.top_words.len() > 0);
}

#[wasm_bindgen_test]
fn test_memory_management_large_files() {
    // Test memory usage during large file processing
    let mut analyzer = StreamingAnalyzer::new(StreamingConfig::default());
    
    // Process multiple large chunks to test memory management
    let chunk_size = 10 * 1024 * 1024; // 10MB chunks
    let num_chunks = 100; // 1GB total
    
    for i in 0..num_chunks {
        let chunk = create_varied_chunk(chunk_size, i);
        analyzer.process_chunk(&chunk);
        
        // Check that memory usage remains reasonable
        let stats = analyzer.get_stats();
        assert!(stats.total_processed <= (i + 1) * chunk_size);
    }
    
    let result = analyzer.finalize();
    assert!(result.is_ok());
}

#[wasm_bindgen_test]
fn test_performance_large_file_processing() {
    // Test performance benchmarks for large file processing
    let mut analyzer = StreamingAnalyzer::new(StreamingConfig::default());
    
    let start_time = web_sys::window()
        .unwrap()
        .performance()
        .unwrap()
        .now();
    
    // Process 100MB of data
    let chunk_size = 1024 * 1024; // 1MB chunks
    let num_chunks = 100;
    
    for _ in 0..num_chunks {
        let chunk = create_performance_test_chunk(chunk_size);
        analyzer.process_chunk(&chunk);
    }
    
    let result = analyzer.finalize();
    assert!(result.is_ok());
    
    let end_time = web_sys::window()
        .unwrap()
        .performance()
        .unwrap()
        .now();
    
    let processing_time = end_time - start_time;
    
    // Should process 100MB in under 5 seconds
    assert!(processing_time < 5000.0);
}

#[wasm_bindgen_test]
fn test_error_recovery_during_streaming() {
    // Test error recovery when processing fails mid-stream
    let mut analyzer = StreamingAnalyzer::new(StreamingConfig::default());
    
    // Process some valid chunks
    for i in 0..5 {
        let chunk = create_test_chunk(1024 * 1024);
        analyzer.process_chunk(&chunk);
    }
    
    // Simulate an error (invalid chunk)
    let invalid_chunk = vec![0u8; 1024 * 1024]; // All null bytes
    analyzer.process_chunk(&invalid_chunk);
    
    // Continue processing after error
    for i in 0..5 {
        let chunk = create_test_chunk(1024 * 1024);
        analyzer.process_chunk(&chunk);
    }
    
    // Should still be able to finalize
    let result = analyzer.finalize();
    assert!(result.is_ok());
}

#[wasm_bindgen_test]
fn test_streaming_with_custom_config() {
    // Test streaming with custom configuration
    let config = StreamingConfig {
        stopwords: vec!["the".to_string(), "and".to_string(), "or".to_string()],
        entropy_threshold: 4.5,
        risk_threshold: 0.7,
        max_words: 50,
        banned_phrases: vec!["confidential".to_string(), "secret".to_string()],
    };
    
    let mut analyzer = StreamingAnalyzer::new(config);
    
    // Process large file with custom config
    let chunk_size = 1024 * 1024;
    let num_chunks = 50; // 50MB
    
    for _ in 0..num_chunks {
        let chunk = create_custom_config_test_chunk(chunk_size);
        analyzer.process_chunk(&chunk);
    }
    
    let result = analyzer.finalize();
    assert!(result.is_ok());
    
    let analysis = result.unwrap();
    
    // Verify custom config was applied
    assert!(analysis.top_words.len() <= 50);
    
    // Check that stopwords were filtered
    let words: Vec<String> = analysis.top_words.iter().map(|(w, _)| w.clone()).collect();
    assert!(!words.contains(&"the".to_string()));
    assert!(!words.contains(&"and".to_string()));
}

#[wasm_bindgen_test]
fn test_concurrent_streaming_processing() {
    // Test multiple streaming analyzers working concurrently
    let mut analyzers = vec![];
    
    // Create multiple analyzers
    for i in 0..3 {
        let config = StreamingConfig {
            stopwords: vec![],
            entropy_threshold: 4.8,
            risk_threshold: 0.5,
            max_words: 100,
            banned_phrases: vec!["confidential".to_string()],
        };
        analyzers.push(StreamingAnalyzer::new(config));
    }
    
    // Process chunks across all analyzers
    let chunk_size = 1024 * 1024;
    let num_chunks = 10;
    
    for chunk_idx in 0..num_chunks {
        let chunk = create_concurrent_test_chunk(chunk_size, chunk_idx);
        
        for analyzer in &mut analyzers {
            analyzer.process_chunk(&chunk);
        }
    }
    
    // Finalize all analyzers
    for analyzer in &mut analyzers {
        let result = analyzer.finalize();
        assert!(result.is_ok());
    }
}

#[wasm_bindgen_test]
fn test_streaming_statistics_tracking() {
    // Test comprehensive statistics tracking during streaming
    let mut analyzer = StreamingAnalyzer::new(StreamingConfig::default());
    
    let chunk_size = 1024 * 1024;
    let num_chunks = 20;
    
    for i in 0..num_chunks {
        let chunk = create_stats_test_chunk(chunk_size, i);
        analyzer.process_chunk(&chunk);
        
        let stats = analyzer.get_stats();
        
        // Verify statistics are accurate
        assert_eq!(stats.total_processed, (i + 1) * chunk_size);
        assert!(stats.chunks_processed == i + 1);
        assert!(stats.current_entropy >= 0.0);
        assert!(stats.current_entropy <= 5.0);
    }
    
    let final_stats = analyzer.get_stats();
    assert_eq!(final_stats.total_processed, num_chunks * chunk_size);
    assert_eq!(final_stats.chunks_processed, num_chunks);
}

// Helper functions to create test data

fn create_test_chunk(size: usize) -> String {
    let mut chunk = String::new();
    let words = vec![
        "confidential", "document", "secret", "information",
        "phone", "1234567890", "email", "test@example.com",
        "normal", "text", "content", "data"
    ];
    
    while chunk.len() < size {
        for word in &words {
            chunk.push_str(word);
            chunk.push(' ');
            if chunk.len() >= size {
                break;
            }
        }
    }
    
    chunk.truncate(size);
    chunk
}

fn create_varied_chunk(size: usize, chunk_index: usize) -> String {
    let mut chunk = String::new();
    let base_words = vec!["word", "text", "content", "data"];
    
    // Vary content based on chunk index
    let special_words = if chunk_index % 10 == 0 {
        vec!["confidential", "secret", "private"]
    } else if chunk_index % 5 == 0 {
        vec!["phone", "1234567890", "email", "test@example.com"]
    } else {
        vec![]
    };
    
    let all_words = [base_words, special_words].concat();
    
    while chunk.len() < size {
        for word in &all_words {
            chunk.push_str(word);
            chunk.push(' ');
            if chunk.len() >= size {
                break;
            }
        }
    }
    
    chunk.truncate(size);
    chunk
}

fn create_performance_test_chunk(size: usize) -> String {
    // Create chunk optimized for performance testing
    let mut chunk = String::new();
    let words = vec!["performance", "test", "chunk", "data"];
    
    while chunk.len() < size {
        for word in &words {
            chunk.push_str(word);
            chunk.push(' ');
            if chunk.len() >= size {
                break;
            }
        }
    }
    
    chunk.truncate(size);
    chunk
}

fn create_custom_config_test_chunk(size: usize) -> String {
    let mut chunk = String::new();
    let words = vec![
        "the", "and", "or", "confidential", "secret",
        "important", "document", "information", "data"
    ];
    
    while chunk.len() < size {
        for word in &words {
            chunk.push_str(word);
            chunk.push(' ');
            if chunk.len() >= size {
                break;
            }
        }
    }
    
    chunk.truncate(size);
    chunk
}

fn create_concurrent_test_chunk(size: usize, chunk_index: usize) -> String {
    let mut chunk = String::new();
    let words = vec![
        "concurrent", "processing", "chunk", &chunk_index.to_string(),
        "confidential", "data", "analysis"
    ];
    
    while chunk.len() < size {
        for word in &words {
            chunk.push_str(word);
            chunk.push(' ');
            if chunk.len() >= size {
                break;
            }
        }
    }
    
    chunk.truncate(size);
    chunk
}

fn create_stats_test_chunk(size: usize, chunk_index: usize) -> String {
    let mut chunk = String::new();
    let words = vec![
        "stats", "tracking", "chunk", &chunk_index.to_string(),
        "confidential", "information", "processing"
    ];
    
    while chunk.len() < size {
        for word in &words {
            chunk.push_str(word);
            chunk.push(' ');
            if chunk.len() >= size {
                break;
            }
        }
    }
    
    chunk.truncate(size);
    chunk
}
