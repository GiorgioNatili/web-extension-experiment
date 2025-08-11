use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::types::{AnalysisResult, BannedPhraseMatch, PIIPattern};

/// Configuration for streaming analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingConfig {
    /// List of stopwords to exclude from frequency analysis
    pub stopwords: Vec<String>,
    /// Entropy threshold for obfuscation detection
    pub entropy_threshold: f64,
    /// Risk threshold for blocking decisions
    pub risk_threshold: f64,
    /// Maximum words to return in frequency analysis
    pub max_words: usize,
    /// Banned phrases to detect
    pub banned_phrases: Vec<String>,
}

impl Default for StreamingConfig {
    fn default() -> Self {
        Self {
            stopwords: vec![
                "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
                "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does",
                "did", "will", "would", "could", "should", "may", "might", "can", "this", "that",
                "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
                "us", "them", "my", "your", "his", "her", "its", "our", "their", "mine", "yours",
                "hers", "ours", "theirs"
            ].into_iter().map(|s| s.to_string()).collect(),
            entropy_threshold: 4.8,
            risk_threshold: 0.6,
            max_words: 10,
            banned_phrases: vec!["confidential".to_string(), "do not share".to_string()],
        }
    }
}

/// Streaming analysis state
#[derive(Debug, Serialize, Deserialize)]
pub struct StreamingAnalyzer {
    config: StreamingConfig,
    word_counts: HashMap<String, usize>,
    total_chunks: usize,
    total_content: String,
    banned_phrase_matches: Vec<BannedPhraseMatch>,
    pii_patterns: Vec<PIIPattern>,
}

impl StreamingAnalyzer {
    /// Initialize a new streaming analyzer with configuration
    pub fn new(config: StreamingConfig) -> Self {
        Self {
            config,
            word_counts: HashMap::new(),
            total_chunks: 0,
            total_content: String::new(),
            banned_phrase_matches: Vec::new(),
            pii_patterns: Vec::new(),
        }
    }

    /// Initialize with default configuration
    pub fn init() -> Self {
        Self::new(StreamingConfig::default())
    }

    /// Process a chunk of text content
    pub fn process_chunk(&mut self, chunk: &str) -> Result<(), String> {
        self.total_chunks += 1;
        self.total_content.push_str(chunk);
        
        // Process word frequency (excluding stopwords)
        let words = self.tokenize_text(chunk);
        for word in words {
            if !self.config.stopwords.contains(&word) {
                *self.word_counts.entry(word).or_insert(0) += 1;
            }
        }
        
        // Process banned phrases
        let chunk_matches = self.detect_banned_phrases_in_chunk(chunk);
        self.banned_phrase_matches.extend(chunk_matches);
        
        // Process PII patterns
        let chunk_pii = self.detect_pii_patterns_in_chunk(chunk);
        self.pii_patterns.extend(chunk_pii);
        
        Ok(())
    }

    /// Finalize analysis and return results
    pub fn finalize(&self) -> Result<AnalysisResult, String> {
        if self.total_content.is_empty() {
            return Err("No content processed".to_string());
        }
        
        // Get top words (excluding stopwords)
        let mut sorted_words: Vec<(String, usize)> = self.word_counts
            .iter()
            .filter(|(word, _)| !self.config.stopwords.contains(word))
            .map(|(word, count)| (word.clone(), *count))
            .collect();
        sorted_words.sort_by(|a, b| b.1.cmp(&a.1));
        let top_words: Vec<(String, usize)> = sorted_words.into_iter().take(self.config.max_words).collect();
        
        // Calculate entropy
        let entropy = self.calculate_entropy(&self.total_content);
        
        // Calculate risk score
        let risk_score = self.calculate_risk_score(&top_words, &self.banned_phrase_matches, &self.pii_patterns, entropy);
        
        // Generate decision and reason
        let decision = if risk_score >= self.config.risk_threshold { "block" } else { "allow" };
        let reason = self.generate_reason(&self.banned_phrase_matches, &self.pii_patterns, entropy);
        
        Ok(AnalysisResult {
            top_words,
            banned_phrases: self.banned_phrase_matches.clone(),
            pii_patterns: self.pii_patterns.clone(),
            entropy,
            is_obfuscated: entropy > self.config.entropy_threshold,
            decision: decision.to_string(),
            reason,
            risk_score,
        })
    }

    /// Get current processing statistics
    pub fn get_stats(&self) -> ProcessingStats {
        ProcessingStats {
            total_chunks: self.total_chunks,
            total_content_length: self.total_content.len(),
            unique_words: self.word_counts.len(),
            banned_phrase_count: self.banned_phrase_matches.len(),
            pii_pattern_count: self.pii_patterns.len(),
        }
    }

    /// Update configuration
    pub fn update_config(&mut self, config: StreamingConfig) {
        self.config = config;
    }

    // Private helper methods
    fn tokenize_text(&self, text: &str) -> Vec<String> {
        text.to_lowercase()
            .split_whitespace()
            .map(|word| word.chars().filter(|c| c.is_alphanumeric()).collect::<String>())
            .filter(|word| !word.is_empty())
            .collect()
    }

    fn detect_banned_phrases_in_chunk(&self, chunk: &str) -> Vec<BannedPhraseMatch> {
        let mut matches = Vec::new();
        let chunk_lower = chunk.to_lowercase();
        
        for phrase in &self.config.banned_phrases {
            let mut start = 0;
            while let Some(pos) = chunk_lower[start..].find(phrase) {
                let actual_pos = start + pos;
                matches.push(BannedPhraseMatch {
                    phrase: phrase.clone(),
                    position: actual_pos,
                    count: 1,
                });
                start = actual_pos + phrase.len();
            }
        }
        
        matches
    }

    fn detect_pii_patterns_in_chunk(&self, chunk: &str) -> Vec<PIIPattern> {
        use regex::Regex;
        use lazy_static::lazy_static;
        
        lazy_static! {
            static ref PII_REGEX: Regex = Regex::new(r"\b\d{9,12}\b").unwrap();
        }
        
        let mut patterns = Vec::new();
        for mat in PII_REGEX.find_iter(chunk) {
            patterns.push(PIIPattern {
                pattern: mat.as_str().to_string(),
                position: mat.start(),
                confidence: 0.8,
            });
        }
        
        patterns
    }

    fn calculate_entropy(&self, text: &str) -> f64 {
        use std::collections::HashMap;
        
        // Normalize text: lowercase, remove whitespace and punctuation
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
        for ch in normalized.chars() {
            *char_counts.entry(ch).or_insert(0) += 1;
        }

        let total_chars = normalized.len() as f64;
        let mut entropy = 0.0;

        // Calculate Shannon entropy: -∑(p_i * log₂(p_i))
        for count in char_counts.values() {
            let probability = *count as f64 / total_chars;
            if probability > 0.0 {
                entropy -= probability * probability.log2();
            }
        }

        entropy
    }

    fn calculate_risk_score(
        &self,
        _top_words: &[(String, usize)],
        banned_phrases: &[BannedPhraseMatch],
        pii_patterns: &[PIIPattern],
        entropy: f64,
    ) -> f64 {
        let banned_weight = 0.4;
        let pii_weight = 0.3;
        let entropy_weight = 0.2;
        let _size_weight = 0.1;

        let banned_score = if banned_phrases.is_empty() { 0.0 } else { 1.0 };
        let pii_score = if pii_patterns.is_empty() { 0.0 } else { 1.0 };
        let entropy_score = if entropy > self.config.entropy_threshold { 1.0 } else { entropy / self.config.entropy_threshold };

        banned_score * banned_weight +
        pii_score * pii_weight +
        entropy_score * entropy_weight
    }

    fn generate_reason(
        &self,
        banned_phrases: &[BannedPhraseMatch],
        pii_patterns: &[PIIPattern],
        entropy: f64,
    ) -> String {
        let mut reasons = Vec::new();

        if !banned_phrases.is_empty() {
            reasons.push(format!("Found {} banned phrase(s)", banned_phrases.len()));
        }

        if !pii_patterns.is_empty() {
            reasons.push(format!("Detected {} PII pattern(s)", pii_patterns.len()));
        }

        if entropy > self.config.entropy_threshold {
            reasons.push("High entropy content detected (possible obfuscation)".to_string());
        }

        if reasons.is_empty() {
            "No security concerns detected".to_string()
        } else {
            reasons.join("; ")
        }
    }
}

/// Processing statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingStats {
    pub total_chunks: usize,
    pub total_content_length: usize,
    pub unique_words: usize,
    pub banned_phrase_count: usize,
    pub pii_pattern_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_streaming_analyzer_init() {
        let analyzer = StreamingAnalyzer::init();
        assert_eq!(analyzer.total_chunks, 0);
        assert!(analyzer.total_content.is_empty());
    }

    #[test]
    fn test_process_chunk() {
        let mut analyzer = StreamingAnalyzer::init();
        let chunk = "This is a test document with confidential information.";
        
        let result = analyzer.process_chunk(chunk);
        assert!(result.is_ok());
        assert_eq!(analyzer.total_chunks, 1);
        assert!(!analyzer.total_content.is_empty());
    }

    #[test]
    fn test_finalize_with_content() {
        let mut analyzer = StreamingAnalyzer::init();
        analyzer.process_chunk("This is a test document.").unwrap();
        
        let result = analyzer.finalize();
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        assert_eq!(analysis.decision, "allow");
        assert!(!analysis.top_words.is_empty());
    }

    #[test]
    fn test_finalize_without_content() {
        let analyzer = StreamingAnalyzer::init();
        let result = analyzer.finalize();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "No content processed");
    }

    #[test]
    fn test_banned_phrase_detection() {
        let mut analyzer = StreamingAnalyzer::init();
        analyzer.process_chunk("This document is confidential and should not be shared.").unwrap();
        
        let result = analyzer.finalize().unwrap();
        assert!(!result.banned_phrases.is_empty());
        // The decision might be "allow" if the risk score is below threshold
        // We just check that banned phrases were detected
        assert!(result.banned_phrases.iter().any(|p| p.phrase == "confidential"));
    }

    #[test]
    fn test_pii_detection() {
        let mut analyzer = StreamingAnalyzer::init();
        analyzer.process_chunk("My phone number is 1234567890.").unwrap();
        
        let result = analyzer.finalize().unwrap();
        assert!(!result.pii_patterns.is_empty());
    }

    #[test]
    fn test_custom_config() {
        let config = StreamingConfig {
            stopwords: vec!["custom".to_string()],
            entropy_threshold: 3.0,
            risk_threshold: 0.3,
            max_words: 5,
            banned_phrases: vec!["secret".to_string()],
        };
        
        let mut analyzer = StreamingAnalyzer::new(config);
        analyzer.process_chunk("This is a secret document with custom content.").unwrap();
        
        let result = analyzer.finalize().unwrap();
        assert!(!result.banned_phrases.is_empty());
        assert_eq!(result.decision, "block");
    }

    #[test]
    fn test_get_stats() {
        let mut analyzer = StreamingAnalyzer::init();
        analyzer.process_chunk("Test content").unwrap();
        analyzer.process_chunk("More content").unwrap();
        
        let stats = analyzer.get_stats();
        assert_eq!(stats.total_chunks, 2);
        assert!(stats.total_content_length > 0);
        assert!(stats.unique_words > 0);
    }
}
