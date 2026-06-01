//! Post-processing and guards for speech-to-text (Whisper) output.

/// Known Whisper hallucinations on silence/low audio (especially PT-BR training data).
const HALLUCINATION_PHRASES: &[&str] = &[
    "legenda adriana zanotto",
    "legendas adriana",
    "legendado por",
    "legendas por",
    "amara.org",
    "obrigado por assistir",
    "thanks for watching",
    "thank you for watching",
    "inscreva-se no canal",
    "subscribe to",
    "continue assistindo",
    "aplausos",
    "www.",
    "http://",
    "https://",
    // Echo of instructional prompts (Whisper repeats the `prompt` field on silence)
    "apenas o que foi dito em voz alta",
    "transcrição de fala ao vivo",
    "reunião, chamada ou conversa",
];

/// Returns true when the transcript is likely a Whisper hallucination, not real speech.
pub fn is_whisper_hallucination(text: &str) -> bool {
    let t = text.trim();
    if t.is_empty() {
        return true;
    }
    let lower = t.to_lowercase();
    // Subtitle credit pattern: "Legenda <Name>" or "Legendas <Name>"
    if lower.starts_with("legenda ") || lower.starts_with("legendas ") {
        let rest = lower
            .trim_start_matches("legenda ")
            .trim_start_matches("legendas ")
            .trim();
        if rest.chars().count() <= 48 && !rest.contains('?') && !rest.contains('!') {
            return true;
        }
    }
    for phrase in HALLUCINATION_PHRASES {
        if lower.contains(phrase) {
            return true;
        }
    }
    false
}

pub const NO_SPEECH_MARKER: &str = "WHISPER_NO_SPEECH";

/// Maps Whisper `language` field (often English name) to ISO-639-1 for storage/translation.
pub fn normalize_detected_language(raw: &str) -> String {
    let lower = raw.trim().to_lowercase();
    if lower.len() == 2 || lower.len() == 3 {
        return lower.chars().take(2).collect();
    }
    if lower.contains("portugu") {
        return "pt".into();
    }
    if lower.contains("english") || lower == "inglês" || lower == "ingles" {
        return "en".into();
    }
    if lower.contains("spanish") || lower.contains("espanhol") {
        return "es".into();
    }
    if lower.contains("french") || lower.contains("francês") || lower.contains("frances") {
        return "fr".into();
    }
    if lower.contains("german") || lower.contains("alemão") || lower.contains("alemao") {
        return "de".into();
    }
    lower.chars().take(8).collect()
}

/// Resolves transcript language tag from user choice + optional API detection.
/// Human-readable language name for translation prompts (ISO-639-1 codes).
pub fn language_label_for_prompt(code: &str) -> String {
    match code.trim().to_lowercase().as_str() {
        "" | "auto" | "und" => "the source language".into(),
        "pt" | "pt-br" => "Brazilian Portuguese".into(),
        "en" => "English".into(),
        "es" => "Spanish".into(),
        "fr" => "French".into(),
        "de" => "German".into(),
        "it" => "Italian".into(),
        "ja" => "Japanese".into(),
        "zh" => "Chinese".into(),
        other => other.to_string(),
    }
}

/// Builds the user-turn message for a translation request.
/// If context hints are present, they help the model adapt register and terminology.
pub fn translation_user_message(text: &str, context_hints: Option<&str>) -> String {
    match context_hints {
        Some(hints) if !hints.trim().is_empty() => {
            format!(
                "Context (use this to adapt register and terminology, do not translate it):\n{hints}\n\nText to translate:\n{text}"
            )
        }
        _ => text.to_string(),
    }
}

/// System prompt for chat-based translation (not Whisper).
pub fn translation_system_prompt(source_language: &str, target_language: &str) -> String {
    let src = language_label_for_prompt(source_language);
    let tgt = language_label_for_prompt(target_language);
    format!(
        "You are a professional human interpreter fluent in both {src} and {tgt}. \
         Your task is to convey the full meaning of the speaker's words in natural, idiomatic {tgt} — \
         the way a native speaker would actually say it. \
         Do NOT translate word-for-word; instead, preserve the intent, tone, register, and cultural nuance of the original. \
         Idiomatic expressions, slang, and figures of speech must be rendered with their equivalent in {tgt}, not a literal rendering. \
         Output only the final translation in {tgt}, with no explanations, brackets, quotes, or alternatives."
    )
}

pub fn normalize_language_code(code: &str) -> String {
    let lang = code.trim().to_lowercase();
    if lang.is_empty() || lang == "auto" || lang == "und" {
        return String::new();
    }
    lang.split('-').next().unwrap_or(&lang).chars().take(8).collect()
}

pub fn resolve_transcript_language(
    source_choice: Option<&str>,
    detected: Option<&str>,
) -> String {
    let choice = source_choice.unwrap_or("auto").trim().to_lowercase();
    if !choice.is_empty() && choice != "auto" {
        return choice.chars().take(8).collect();
    }
    detected
        .map(|d| normalize_detected_language(d))
        .unwrap_or_else(|| "auto".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_adriana_zanotto_hallucination() {
        assert!(is_whisper_hallucination("Legenda Adriana Zanotto"));
        assert!(is_whisper_hallucination("  legenda adriana zanotto  "));
    }

    #[test]
    fn detects_prompt_echo() {
        assert!(is_whisper_hallucination("Apenas o que foi dito em voz alta."));
    }

    #[test]
    fn accepts_real_speech() {
        assert!(!is_whisper_hallucination(
            "Precisamos revisar o cronograma do projeto amanhã."
        ));
    }
}
