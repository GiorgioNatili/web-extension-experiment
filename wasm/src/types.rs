use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub top_words: Vec<(String, usize)>,
    pub banned_phrases: Vec<BannedPhraseMatch>,
    pub pii_patterns: Vec<PIIPattern>,
    pub entropy: f64,
    pub is_obfuscated: bool,
    pub decision: String,
    pub reason: String,
    pub risk_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BannedPhraseMatch {
    pub phrase: String,
    pub position: usize,
    pub context: String,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PIIPattern {
    pub type_: String,
    pub pattern: String,
    pub position: usize,
    pub confidence: f64,
}
