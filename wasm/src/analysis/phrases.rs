use crate::types::BannedPhraseMatch;

pub const BANNED_PHRASES: &[&str] = &["confidential", "do not share"];

pub fn detect_banned_phrases(text: &str) -> Vec<BannedPhraseMatch> {
    let mut matches = Vec::new();
    let text_lower = text.to_lowercase();
    
    for phrase in BANNED_PHRASES {
        let mut start = 0;
        while let Some(pos) = text_lower[start..].find(phrase) {
            let actual_pos = start + pos;
            matches.push(BannedPhraseMatch {
                phrase: phrase.to_string(),
                position: actual_pos,
                count: 1,
            });
            start = actual_pos + phrase.len();
        }
    }
    
    matches
}
