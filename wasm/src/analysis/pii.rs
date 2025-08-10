use crate::types::PIIPattern;
use regex::Regex;
use lazy_static::lazy_static;

lazy_static! {
    static ref PII_REGEX: Regex = Regex::new(r"\b\d{9,12}\b").unwrap();
}

pub fn detect_pii_patterns(text: &str) -> Vec<PIIPattern> {
    let mut patterns = Vec::new();
    
    for mat in PII_REGEX.find_iter(text) {
        patterns.push(PIIPattern {
            pattern: mat.as_str().to_string(),
            position: mat.start(),
            confidence: 0.8,
        });
    }
    
    patterns
}
