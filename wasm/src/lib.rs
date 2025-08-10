use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

mod analysis;
mod utils;
mod types;

use analysis::{frequency, phrases, pii, entropy};
use types::{AnalysisResult, AnalysisRequest};

#[wasm_bindgen]
pub struct WasmModule {
    // Module state and configuration
}

#[wasm_bindgen]
impl WasmModule {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmModule {
        WasmModule {}
    }

    /// Analyze file content and return security analysis results
    pub fn analyze_file(&self, content: &str) -> Result<JsValue, JsValue> {
        let request = AnalysisRequest {
            content: content.to_string(),
        };
        
        let result = self.perform_analysis(&request)?;
        
        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Calculate Shannon entropy for text content
    pub fn calculate_entropy(&self, text: &str) -> f64 {
        entropy::calculate_shannon_entropy(text)
    }

    /// Find banned phrases in text
    pub fn find_banned_phrases(&self, text: &str) -> Result<JsValue, JsValue> {
        let matches = phrases::detect_banned_phrases(text);
        serde_wasm_bindgen::to_value(&matches)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Detect PII patterns in text
    pub fn detect_pii_patterns(&self, text: &str) -> Result<JsValue, JsValue> {
        let patterns = pii::detect_pii_patterns(text);
        serde_wasm_bindgen::to_value(&patterns)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Get top words by frequency
    pub fn get_top_words(&self, text: &str, count: usize) -> Result<JsValue, JsValue> {
        let words = frequency::analyze_word_frequency(text, count);
        serde_wasm_bindgen::to_value(&words)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

impl WasmModule {
    fn perform_analysis(&self, request: &AnalysisRequest) -> Result<AnalysisResult, JsValue> {
        let content = &request.content;
        
        // Perform all analysis tasks
        let top_words = frequency::analyze_word_frequency(content, 10);
        let banned_phrases = phrases::detect_banned_phrases(content);
        let pii_patterns = pii::detect_pii_patterns(content);
        let entropy = entropy::calculate_shannon_entropy(content);
        
        // Calculate risk score and decision
        let risk_score = self.calculate_risk_score(&top_words, &banned_phrases, &pii_patterns, entropy);
        let decision = if risk_score >= 0.6 { "block" } else { "allow" };
        let reason = self.generate_reason(&banned_phrases, &pii_patterns, entropy);
        
        Ok(AnalysisResult {
            top_words,
            banned_phrases,
            pii_patterns,
            entropy,
            is_obfuscated: entropy > 4.8,
            decision: decision.to_string(),
            reason,
            risk_score,
        })
    }

    fn calculate_risk_score(
        &self,
        top_words: &[(String, usize)],
        banned_phrases: &[types::BannedPhraseMatch],
        pii_patterns: &[types::PIIPattern],
        entropy: f64,
    ) -> f64 {
        let banned_weight = 0.4;
        let pii_weight = 0.3;
        let entropy_weight = 0.2;
        let size_weight = 0.1;
        
        let banned_score = if banned_phrases.is_empty() { 0.0 } else { 1.0 };
        let pii_score = if pii_patterns.is_empty() { 0.0 } else { 1.0 };
        let entropy_score = if entropy > 4.8 { 1.0 } else { entropy / 4.8 };
        
        banned_score * banned_weight +
        pii_score * pii_weight +
        entropy_score * entropy_weight
    }

    fn generate_reason(
        &self,
        banned_phrases: &[types::BannedPhraseMatch],
        pii_patterns: &[types::PIIPattern],
        entropy: f64,
    ) -> String {
        let mut reasons = Vec::new();
        
        if !banned_phrases.is_empty() {
            reasons.push(format!("Found {} banned phrase(s)", banned_phrases.len()));
        }
        
        if !pii_patterns.is_empty() {
            reasons.push(format!("Detected {} PII pattern(s)", pii_patterns.len()));
        }
        
        if entropy > 4.8 {
            reasons.push("High entropy content detected (possible obfuscation)".to_string());
        }
        
        if reasons.is_empty() {
            "No security concerns detected".to_string()
        } else {
            reasons.join("; ")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entropy_calculation() {
        let normal_text = "This is a normal text with regular words.";
        let entropy = entropy::calculate_shannon_entropy(normal_text);
        assert!(entropy > 3.0 && entropy < 4.5);
    }

    #[test]
    fn test_banned_phrases() {
        let text = "This document is confidential and should not be shared.";
        let matches = phrases::detect_banned_phrases(text);
        assert!(!matches.is_empty());
        assert_eq!(matches[0].phrase, "confidential");
    }

    #[test]
    fn test_pii_detection() {
        let text = "My phone number is 1234567890 and my SSN is 987654321.";
        let patterns = pii::detect_pii_patterns(text);
        assert_eq!(patterns.len(), 2);
    }

    #[test]
    fn test_word_frequency() {
        let text = "hello world hello test world";
        let words = frequency::analyze_word_frequency(text, 3);
        assert_eq!(words[0].0, "hello");
        assert_eq!(words[0].1, 2);
    }
}
