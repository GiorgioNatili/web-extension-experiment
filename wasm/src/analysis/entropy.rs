use std::collections::HashMap;

pub fn calculate_shannon_entropy(text: &str) -> f64 {
    if text.is_empty() {
        return 0.0;
    }

    // Normalize text: lowercase and remove whitespace/punctuation
    let normalized: String = text
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect();

    if normalized.is_empty() {
        return 0.0;
    }

    // Calculate character frequencies
    let mut char_counts: HashMap<char, usize> = HashMap::new();
    for c in normalized.chars() {
        *char_counts.entry(c).or_insert(0) += 1;
    }

    let text_len = normalized.len() as f64;
    let mut entropy = 0.0;

    // Calculate Shannon entropy: -∑(p_i * log₂(p_i))
    for count in char_counts.values() {
        let probability = *count as f64 / text_len;
        if probability > 0.0 {
            entropy -= probability * probability.log2();
        }
    }

    entropy
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_entropy_calculation() {
        let text = "hello world";
        let entropy = calculate_shannon_entropy(text);
        
        // Human-readable text should have moderate entropy
        assert!(entropy > 2.0 && entropy < 4.5);
    }

    #[test]
    fn test_empty_text() {
        let text = "";
        let entropy = calculate_shannon_entropy(text);
        assert_eq!(entropy, 0.0);
    }

    #[test]
    fn test_whitespace_only() {
        let text = "   \n\t  ";
        let entropy = calculate_shannon_entropy(text);
        assert_eq!(entropy, 0.0);
    }

    #[test]
    fn test_punctuation_only() {
        let text = "!@#$%^&*()";
        let entropy = calculate_shannon_entropy(text);
        assert_eq!(entropy, 0.0);
    }

    #[test]
    fn test_single_character() {
        let text = "a";
        let entropy = calculate_shannon_entropy(text);
        assert_eq!(entropy, 0.0); // Single character has zero entropy
    }

    #[test]
    fn test_repeated_character() {
        let text = "aaaaa";
        let entropy = calculate_shannon_entropy(text);
        assert_eq!(entropy, 0.0); // Repeated character has zero entropy
    }

    #[test]
    fn test_two_characters_equal_frequency() {
        let text = "ababababab";
        let entropy = calculate_shannon_entropy(text);
        assert_eq!(entropy, 1.0); // Two equally frequent characters = 1 bit
    }

    #[test]
    fn test_four_characters_equal_frequency() {
        let text = "abcdabcdabcd";
        let entropy = calculate_shannon_entropy(text);
        assert_eq!(entropy, 2.0); // Four equally frequent characters = 2 bits
    }

    #[test]
    fn test_human_readable_text() {
        let text = "This is a normal human-readable text with regular words and sentences.";
        let entropy = calculate_shannon_entropy(text);
        
        // Human-readable text typically has entropy between 3.5 and 4.5
        assert!(entropy >= 3.5 && entropy <= 4.5);
    }

    #[test]
    fn test_technical_text() {
        let text = "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet.";
        let entropy = calculate_shannon_entropy(text);
        
        // Technical text with all letters should have higher entropy
        assert!(entropy >= 4.0 && entropy <= 4.8);
    }

    #[test]
    fn test_random_text() {
        let text = "xqjklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz";
        let entropy = calculate_shannon_entropy(text);
        
        // Random-looking text should have higher entropy
        assert!(entropy >= 4.0);
    }

    #[test]
    fn test_encoded_text() {
        let text = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";
        let entropy = calculate_shannon_entropy(text);
        
        // Encoded text should have high entropy
        assert!(entropy >= 4.5);
    }

    #[test]
    fn test_case_insensitive() {
        let text1 = "Hello World";
        let text2 = "hello world";
        let text3 = "HELLO WORLD";
        
        let entropy1 = calculate_shannon_entropy(text1);
        let entropy2 = calculate_shannon_entropy(text2);
        let entropy3 = calculate_shannon_entropy(text3);
        
        // All should have the same entropy (case-insensitive)
        assert!((entropy1 - entropy2).abs() < 0.001);
        assert!((entropy1 - entropy3).abs() < 0.001);
    }

    #[test]
    fn test_punctuation_removal() {
        let text1 = "hello, world!";
        let text2 = "hello world";
        
        let entropy1 = calculate_shannon_entropy(text1);
        let entropy2 = calculate_shannon_entropy(text2);
        
        // Should have the same entropy (punctuation removed)
        assert!((entropy1 - entropy2).abs() < 0.001);
    }

    #[test]
    fn test_whitespace_removal() {
        let text1 = "hello world";
        let text2 = "hello  world";
        let text3 = "hello\nworld";
        let text4 = "hello\tworld";
        
        let entropy1 = calculate_shannon_entropy(text1);
        let entropy2 = calculate_shannon_entropy(text2);
        let entropy3 = calculate_shannon_entropy(text3);
        let entropy4 = calculate_shannon_entropy(text4);
        
        // All should have the same entropy (whitespace removed)
        assert!((entropy1 - entropy2).abs() < 0.001);
        assert!((entropy1 - entropy3).abs() < 0.001);
        assert!((entropy1 - entropy4).abs() < 0.001);
    }

    #[test]
    fn test_numbers_only() {
        let text = "1234567890";
        let entropy = calculate_shannon_entropy(text);
        
        // Numbers only should have moderate entropy
        assert!(entropy > 2.0 && entropy < 4.0);
    }

    #[test]
    fn test_mixed_alphanumeric() {
        let text = "abc123def456ghi789";
        let entropy = calculate_shannon_entropy(text);
        
        // Mixed alphanumeric should have higher entropy
        assert!(entropy > 3.0 && entropy < 4.5);
    }

    #[test]
    fn test_unicode_characters() {
        let text = "café résumé naïve";
        let entropy = calculate_shannon_entropy(text);
        
        // Unicode text should have moderate entropy
        assert!(entropy > 2.0 && entropy < 4.5);
    }

    #[test]
    fn test_unicode_numbers() {
        let text = "一二三四五六七八九十";
        let entropy = calculate_shannon_entropy(text);
        
        // Unicode numbers should have entropy
        assert!(entropy > 0.0);
    }

    #[test]
    fn test_emoji_text() {
        let text = "hello 😀 world 🌍 test 🚀";
        let entropy = calculate_shannon_entropy(text);
        
        // Emoji text should have entropy (only alphanumeric characters considered)
        assert!(entropy > 0.0);
    }

    #[test]
    fn test_boundary_conditions() {
        // Test entropy around the 4.8 threshold
        let low_entropy_text = "the quick brown fox jumps over the lazy dog";
        let high_entropy_text = "abcdefghijklmnopqrstuvwxyz1234567890";
        
        let low_entropy = calculate_shannon_entropy(low_entropy_text);
        let high_entropy = calculate_shannon_entropy(high_entropy_text);
        
        // Low entropy text should be below 4.8
        assert!(low_entropy < 4.8);
        
        // High entropy text should be above 4.8
        assert!(high_entropy > 4.8);
    }

    #[test]
    fn test_short_text_handling() {
        let short_texts = vec![
            "a",
            "ab",
            "abc",
            "abcd",
            "abcde",
        ];
        
        for text in short_texts {
            let entropy = calculate_shannon_entropy(text);
            // Short text should have low entropy
            assert!(entropy <= 3.0);
        }
    }

    #[test]
    fn test_long_text_consistency() {
        let base_text = "the quick brown fox jumps over the lazy dog";
        let mut long_text = String::new();
        
        // Repeat the text many times
        for _ in 0..100 {
            long_text.push_str(base_text);
            long_text.push(' ');
        }
        
        let entropy = calculate_shannon_entropy(&long_text);
        
        // Long text should have consistent entropy with base text
        let base_entropy = calculate_shannon_entropy(base_text);
        assert!((entropy - base_entropy).abs() < 0.1);
    }

    #[test]
    fn test_performance_large_text() {
        // Create a large text with many characters
        let mut large_text = String::new();
        for i in 0..10000 {
            large_text.push_str(&format!("word{} ", i % 100));
        }
        
        let start = std::time::Instant::now();
        let entropy = calculate_shannon_entropy(&large_text);
        let duration = start.elapsed();
        
        // Should complete within 50ms
        assert!(duration.as_millis() < 50);
        
        // Should have reasonable entropy
        assert!(entropy > 0.0 && entropy < 5.0);
    }

    #[test]
    fn test_machine_generated_text() {
        // Simulate machine-generated text with high entropy
        let mut machine_text = String::new();
        for i in 0..1000 {
            machine_text.push_str(&format!("{:x}", i % 16)); // Hexadecimal
        }
        
        let entropy = calculate_shannon_entropy(&machine_text);
        
        // Machine-generated text should have high entropy
        assert!(entropy > 3.0);
    }

    #[test]
    fn test_encrypted_looking_text() {
        // Simulate encrypted-looking text
        let encrypted_text = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";
        let entropy = calculate_shannon_entropy(encrypted_text);
        
        // Encrypted-looking text should have very high entropy
        assert!(entropy > 4.5);
    }

    #[test]
    fn test_repetitive_patterns() {
        let patterns = vec![
            "abababababababababab",
            "abcabcabcabcabcabc",
            "abcdabcdabcdabcd",
        ];
        
        for pattern in patterns {
            let entropy = calculate_shannon_entropy(pattern);
            // Repetitive patterns should have lower entropy
            assert!(entropy < 3.0);
        }
    }

    #[test]
    fn test_entropy_monotonicity() {
        // Test that adding more variety increases entropy
        let text1 = "aaaa";
        let text2 = "aabb";
        let text3 = "abcd";
        
        let entropy1 = calculate_shannon_entropy(text1);
        let entropy2 = calculate_shannon_entropy(text2);
        let entropy3 = calculate_shannon_entropy(text3);
        
        assert!(entropy1 < entropy2);
        assert!(entropy2 < entropy3);
    }

    #[test]
    fn test_entropy_range() {
        // Test that entropy is always in valid range [0, log2(alphabet_size)]
        let test_texts = vec![
            "",
            "a",
            "ab",
            "abc",
            "abcd",
            "abcdefghijklmnopqrstuvwxyz",
            "abcdefghijklmnopqrstuvwxyz0123456789",
        ];
        
        for text in test_texts {
            let entropy = calculate_shannon_entropy(text);
            assert!(entropy >= 0.0);
            
            // Maximum entropy for alphanumeric is log2(36) ≈ 5.17
            assert!(entropy <= 5.2);
        }
    }

    #[test]
    fn test_entropy_consistency() {
        // Test that entropy calculation is consistent
        let text = "the quick brown fox jumps over the lazy dog";
        let entropy1 = calculate_shannon_entropy(text);
        let entropy2 = calculate_shannon_entropy(text);
        
        assert!((entropy1 - entropy2).abs() < 0.000001);
    }

    #[test]
    fn test_special_characters_ignored() {
        let text1 = "hello world";
        let text2 = "hello@#$%^&*()world";
        let text3 = "hello\n\t\rworld";
        
        let entropy1 = calculate_shannon_entropy(text1);
        let entropy2 = calculate_shannon_entropy(text2);
        let entropy3 = calculate_shannon_entropy(text3);
        
        // All should have the same entropy (special characters ignored)
        assert!((entropy1 - entropy2).abs() < 0.001);
        assert!((entropy1 - entropy3).abs() < 0.001);
    }
}
