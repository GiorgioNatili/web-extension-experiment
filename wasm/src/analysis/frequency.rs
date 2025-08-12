use std::collections::HashMap;

pub fn analyze_word_frequency(text: &str, max_words: usize) -> Vec<(String, usize)> {
    // Normalize text: lowercase and split into words
    let text_lower = text.to_lowercase();
    let words: Vec<&str> = text_lower
        .split_whitespace()
        .filter(|word| !word.is_empty())
        .collect();

    // Count word frequencies
    let mut word_counts: HashMap<String, usize> = HashMap::new();
    for word in words {
        // Clean word: keep only alphanumeric characters
        let clean_word: String = word.chars()
            .filter(|c| c.is_alphanumeric())
            .collect();
        
        if !clean_word.is_empty() {
            *word_counts.entry(clean_word).or_insert(0) += 1;
        }
    }

    // Sort by frequency (descending) and then alphabetically
    let mut sorted_words: Vec<(String, usize)> = word_counts.into_iter().collect();
    sorted_words.sort_by(|a, b| {
        b.1.cmp(&a.1) // Sort by frequency descending
            .then(a.0.cmp(&b.0)) // Then alphabetically
    });

    // Return top N words
    sorted_words.into_iter().take(max_words).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_word_frequency() {
        let text = "hello world hello test world";
        let result = analyze_word_frequency(text, 3);
        
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], ("hello".to_string(), 2));
        assert_eq!(result[1], ("world".to_string(), 2));
        assert_eq!(result[2], ("test".to_string(), 1));
    }

    #[test]
    fn test_case_insensitive() {
        let text = "Hello WORLD hello World";
        let result = analyze_word_frequency(text, 2);
        
        assert_eq!(result[0], ("hello".to_string(), 2));
        assert_eq!(result[1], ("world".to_string(), 2));
    }

    #[test]
    fn test_punctuation_handling() {
        let text = "hello, world! hello. world?";
        let result = analyze_word_frequency(text, 2);
        
        assert_eq!(result[0], ("hello".to_string(), 2));
        assert_eq!(result[1], ("world".to_string(), 2));
    }

    #[test]
    fn test_unicode_characters() {
        let text = "café résumé naïve";
        let result = analyze_word_frequency(text, 3);
        
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], ("café".to_string(), 1));
        assert_eq!(result[1], ("naïve".to_string(), 1));
        assert_eq!(result[2], ("résumé".to_string(), 1));
    }

    #[test]
    fn test_numbers_and_symbols() {
        let text = "test123 test 123 test-123 test_123";
        let result = analyze_word_frequency(text, 4);
        
        assert_eq!(result.len(), 3);
        // Check that we have the expected words
        let words: Vec<String> = result.iter().map(|(word, _)| word.clone()).collect();
        assert!(words.contains(&"test".to_string()));
        assert!(words.contains(&"test123".to_string()));
        assert!(words.contains(&"123".to_string()));
    }

    #[test]
    fn test_empty_text() {
        let text = "";
        let result = analyze_word_frequency(text, 10);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_whitespace_only() {
        let text = "   \n\t  ";
        let result = analyze_word_frequency(text, 10);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_single_word() {
        let text = "hello";
        let result = analyze_word_frequency(text, 10);
        
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], ("hello".to_string(), 1));
    }

    #[test]
    fn test_max_words_limit() {
        let text = "a b c d e f g h i j k";
        let result = analyze_word_frequency(text, 5);
        
        assert_eq!(result.len(), 5);
        assert_eq!(result[0], ("a".to_string(), 1));
        assert_eq!(result[1], ("b".to_string(), 1));
        assert_eq!(result[2], ("c".to_string(), 1));
        assert_eq!(result[3], ("d".to_string(), 1));
        assert_eq!(result[4], ("e".to_string(), 1));
    }

    #[test]
    fn test_large_vocabulary() {
        let text = "the quick brown fox jumps over the lazy dog the quick brown fox jumps over the lazy dog";
        let result = analyze_word_frequency(text, 10);
        
        assert_eq!(result.len(), 8); // 8 unique words
        // Check that we have the expected words
        let words: Vec<String> = result.iter().map(|(word, _)| word.clone()).collect();
        assert!(words.contains(&"the".to_string()));
        assert!(words.contains(&"quick".to_string()));
        assert!(words.contains(&"brown".to_string()));
        assert!(words.contains(&"fox".to_string()));
        assert!(words.contains(&"jumps".to_string()));
        assert!(words.contains(&"over".to_string()));
        assert!(words.contains(&"lazy".to_string()));
        assert!(words.contains(&"dog".to_string()));
        
        // Check that all words appear at least twice
        for (_, count) in &result {
            assert!(*count >= 2);
        }
    }

    #[test]
    fn test_mixed_content() {
        let text = "Hello123 world! @#$%^&*() test 456";
        let result = analyze_word_frequency(text, 5);
        
        assert_eq!(result.len(), 4);
        // Check that we have the expected words
        let words: Vec<String> = result.iter().map(|(word, _)| word.clone()).collect();
        assert!(words.contains(&"hello123".to_string()));
        assert!(words.contains(&"world".to_string()));
        assert!(words.contains(&"test".to_string()));
        assert!(words.contains(&"456".to_string()));
    }

    #[test]
    fn test_performance_large_text() {
        // Create a large text with many repeated words
        let words = vec!["test", "word", "hello", "world", "example"];
        let mut large_text = String::new();
        
        for i in 0..1000 {
            large_text.push_str(&format!("{} ", words[i % words.len()]));
        }
        
        let start = std::time::Instant::now();
        let result = analyze_word_frequency(&large_text, 10);
        let duration = start.elapsed();
        
        // Should complete within 10ms
        assert!(duration.as_millis() < 10);
        assert_eq!(result.len(), 5);
        
        // Each word should appear 200 times
        for (_word, count) in result {
            assert_eq!(count, 200);
        }
    }

    #[test]
    fn test_alphabetical_sorting() {
        let text = "zebra apple banana";
        let result = analyze_word_frequency(text, 3);
        
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], ("apple".to_string(), 1));
        assert_eq!(result[1], ("banana".to_string(), 1));
        assert_eq!(result[2], ("zebra".to_string(), 1));
    }

    #[test]
    fn test_special_characters_only() {
        let text = "!@#$%^&*()";
        let result = analyze_word_frequency(text, 10);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_mixed_case_and_punctuation() {
        let text = "Hello, World! HELLO world...";
        let result = analyze_word_frequency(text, 2);
        
        assert_eq!(result.len(), 2);
        assert_eq!(result[0], ("hello".to_string(), 2));
        assert_eq!(result[1], ("world".to_string(), 2));
    }
}
