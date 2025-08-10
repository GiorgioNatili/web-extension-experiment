use std::collections::HashMap;

pub fn analyze_word_frequency(text: &str, count: usize) -> Vec<(String, usize)> {
    let mut word_counts: HashMap<String, usize> = HashMap::new();
    
    // Normalize text and count words
    for word in text.split_whitespace() {
        let normalized = word.to_lowercase()
            .chars()
            .filter(|c| c.is_alphanumeric())
            .collect::<String>();
        
        if !normalized.is_empty() {
            *word_counts.entry(normalized).or_insert(0) += 1;
        }
    }
    
    // Sort by frequency and take top N
    let mut sorted_words: Vec<(String, usize)> = word_counts.into_iter().collect();
    sorted_words.sort_by(|a, b| b.1.cmp(&a.1));
    
    sorted_words.into_iter().take(count).collect()
}
