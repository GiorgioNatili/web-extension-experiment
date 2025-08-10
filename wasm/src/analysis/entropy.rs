use std::collections::HashMap;

pub fn calculate_shannon_entropy(text: &str) -> f64 {
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
