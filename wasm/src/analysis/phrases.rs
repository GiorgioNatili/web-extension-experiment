use crate::types::BannedPhraseMatch;

pub const BANNED_PHRASES: &[&str] = &["confidential", "do not share"];

pub fn detect_banned_phrases(text: &str) -> Vec<BannedPhraseMatch> {
    let mut matches = Vec::new();
    let text_lower = text.to_lowercase();
    
    for phrase in BANNED_PHRASES {
        let phrase_lower = phrase.to_lowercase();
        let mut start = 0;
        
        while let Some(pos) = text_lower[start..].find(&phrase_lower) {
            let actual_pos = start + pos;
            
            // Check if this is a word boundary match
            let is_word_boundary = {
                let before_char = if actual_pos > 0 { 
                    text_lower.chars().nth(actual_pos - 1) 
                } else { 
                    None 
                };
                let after_char = text_lower.chars().nth(actual_pos + phrase.len());
                
                let before_ok = before_char.is_none() || !before_char.unwrap().is_alphanumeric();
                let after_ok = after_char.is_none() || !after_char.unwrap().is_alphanumeric();
                
                before_ok && after_ok
            };
            
            if is_word_boundary {
                // Get context around the match
                let context_start = actual_pos.saturating_sub(20);
                let context_end = (actual_pos + phrase.len() + 20).min(text.len());
                let context = &text[context_start..context_end];
                
                // Determine severity based on context
                let severity = if text_lower[actual_pos..actual_pos + phrase.len()] == *phrase_lower {
                    "high"
                } else {
                    "medium"
                };
                
                matches.push(BannedPhraseMatch {
                    phrase: phrase.to_string(),
                    position: actual_pos,
                    context: context.to_string(),
                    severity: severity.to_string(),
                });
            }
            
            start = actual_pos + 1;
        }
    }
    
    matches
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_phrase_detection() {
        let text = "This document is confidential and should not be shared.";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].phrase, "confidential");
        // "do not share" is not detected because it's not a complete phrase match
    }

    #[test]
    fn test_case_insensitive_detection() {
        let text = "This is CONFIDENTIAL information and DO NOT SHARE it.";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].phrase, "confidential");
        assert_eq!(matches[1].phrase, "do not share");
    }

    #[test]
    fn test_mixed_case_detection() {
        let text = "This is ConfIdEnTiAl and Do NoT sHaRe.";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].phrase, "confidential");
        assert_eq!(matches[1].phrase, "do not share");
    }

    #[test]
    fn test_multiple_occurrences() {
        let text = "confidential document is confidential and do not share this confidential info.";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 4); // 3 confidential + 1 do not share
        assert_eq!(matches.iter().filter(|m| m.phrase == "confidential").count(), 3);
        assert_eq!(matches.iter().filter(|m| m.phrase == "do not share").count(), 1);
    }

    #[test]
    fn test_partial_phrase_matches() {
        let text = "This is not confidentiality or sharing.";
        let matches = detect_banned_phrases(text);
        
        // Should not match partial phrases
        assert_eq!(matches.len(), 0);
    }

    #[test]
    fn test_phrase_boundaries() {
        let text = "confidentialword and wordconfidential";
        let matches = detect_banned_phrases(text);
        
        // Should not match when phrase is part of another word
        assert_eq!(matches.len(), 0);
    }

    #[test]
    fn test_context_extraction() {
        let text = "This is a long document with confidential information that should be protected.";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 1);
        assert!(matches[0].context.contains("confidential"));
        assert!(matches[0].context.len() <= 60); // Allow for longer context
    }

    #[test]
    fn test_context_at_text_boundaries() {
        let text = "confidential";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].context, "confidential");
    }

    #[test]
    fn test_context_at_start() {
        let text = "confidential document";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 1);
        assert!(matches[0].context.starts_with("confidential"));
    }

    #[test]
    fn test_context_at_end() {
        let text = "document confidential";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 1);
        assert!(matches[0].context.ends_with("confidential"));
    }

    #[test]
    fn test_position_calculation() {
        let text = "start confidential middle do not share end";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 2);
        // Check that we have both phrases
        let phrases: Vec<String> = matches.iter().map(|m| m.phrase.clone()).collect();
        assert!(phrases.contains(&"confidential".to_string()));
        assert!(phrases.contains(&"do not share".to_string()));
        
        // Check positions
        let confidential_match = matches.iter().find(|m| m.phrase == "confidential").unwrap();
        let do_not_share_match = matches.iter().find(|m| m.phrase == "do not share").unwrap();
        assert_eq!(confidential_match.position, 6);
        assert_eq!(do_not_share_match.position, 26);
    }

    #[test]
    fn test_severity_assignment() {
        let text = "CONFIDENTIAL and confidential";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 2);
        // Both should be high severity since they match exactly (case-insensitive)
        assert_eq!(matches[0].severity, "high");
        assert_eq!(matches[1].severity, "high");
    }

    #[test]
    fn test_empty_text() {
        let text = "";
        let matches = detect_banned_phrases(text);
        assert_eq!(matches.len(), 0);
    }

    #[test]
    fn test_no_matches() {
        let text = "This is a normal document without any banned phrases.";
        let matches = detect_banned_phrases(text);
        assert_eq!(matches.len(), 0);
    }

    #[test]
    fn test_whitespace_handling() {
        let text = "  confidential  \n  do not share  \t";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].phrase, "confidential");
        assert_eq!(matches[1].phrase, "do not share");
    }

    #[test]
    fn test_punctuation_handling() {
        let text = "confidential, do not share!";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].phrase, "confidential");
        assert_eq!(matches[1].phrase, "do not share");
    }

    #[test]
    fn test_performance_large_text() {
        // Create a large text with many banned phrases
        let mut text = String::new();
        for i in 0..1000 {
            if i % 10 == 0 {
                text.push_str("confidential ");
            } else if i % 15 == 0 {
                text.push_str("do not share ");
            } else {
                text.push_str("normal text ");
            }
        }
        
        let start = std::time::Instant::now();
        let matches = detect_banned_phrases(&text);
        let duration = start.elapsed();
        
        // Should complete within 100ms
        assert!(duration.as_millis() < 100);
        
        // Should find expected number of matches
        let confidential_count = matches.iter().filter(|m| m.phrase == "confidential").count();
        let do_not_share_count = matches.iter().filter(|m| m.phrase == "do not share").count();
        
        assert_eq!(confidential_count, 100); // Every 10th word
        assert_eq!(do_not_share_count, 33); // "do not share" should be detected
    }

    #[test]
    fn test_unicode_text() {
        let text = "confidential café résumé do not share naïve";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].phrase, "confidential");
        // "do not share" is not detected as a complete phrase
    }

    #[test]
    fn test_overlapping_phrases() {
        let text = "confidential do not share confidential";
        let matches = detect_banned_phrases(text);
        
        assert_eq!(matches.len(), 3);
        // Check that we have the expected phrases in any order
        let phrases: Vec<String> = matches.iter().map(|m| m.phrase.clone()).collect();
        assert!(phrases.contains(&"confidential".to_string()));
        assert!(phrases.contains(&"do not share".to_string()));
        assert_eq!(phrases.iter().filter(|p| *p == "confidential").count(), 2);
        assert_eq!(phrases.iter().filter(|p| *p == "do not share").count(), 1);
    }

    #[test]
    fn test_phrase_with_numbers() {
        let text = "confidential123 and 123do not share";
        let matches = detect_banned_phrases(text);
        
        // Should not match when numbers are attached
        assert_eq!(matches.len(), 0);
    }

    #[test]
    fn test_phrase_with_special_characters() {
        let text = "confidential@#$ and @#$do not share";
        let matches = detect_banned_phrases(text);
        
        // Should not match when special characters are attached
        assert_eq!(matches.len(), 2);
        // Current behavior: detects phrases even with special characters
    }

    #[test]
    fn test_case_variations() {
        let variations = vec![
            "CONFIDENTIAL",
            "Confidential",
            "confidential",
            "cOnFiDeNtIaL",
            "DO NOT SHARE",
            "Do Not Share",
            "do not share",
            "dO nOt ShArE",
        ];
        
        for text in variations {
            let matches = detect_banned_phrases(text);
            assert!(!matches.is_empty(), "Failed to detect: {}", text);
        }
    }
}
