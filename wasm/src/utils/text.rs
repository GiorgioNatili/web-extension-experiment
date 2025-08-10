pub fn normalize_text(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect()
}

pub fn clean_text(text: &str) -> String {
    text.chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}
