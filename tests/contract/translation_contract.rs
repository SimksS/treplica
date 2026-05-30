use provider_core::ollama::OllamaAdapter;
use provider_core::{
    PrivacyMode, ProviderAdapter, TranslationRequest,
};

#[tokio::test]
async fn translation_returns_text_and_confidence() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_translation(TranslationRequest {
            source_language: "pt-BR".into(),
            target_language: "en".into(),
            text: "Qual o ROI esperado?".into(),
            context_hints: None,
            privacy_mode: PrivacyMode::LocalOnly,
        })
        .await
        .expect("translation");
    assert!(response.text.contains("EN") || response.text.contains("en"));
    assert!(response.confidence > 0.5);
    assert!(!response.content_left_device);
}

#[tokio::test]
async fn uncertain_input_marks_uncertain_translation() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_translation(TranslationRequest {
            source_language: "pt-BR".into(),
            target_language: "en".into(),
            text: "???".into(),
            context_hints: None,
            privacy_mode: PrivacyMode::LocalOnly,
        })
        .await
        .expect("translation");
    assert!(response.is_uncertain);
    assert!(response.confidence < 0.6);
    assert!(response.uncertainty_notes.is_some());
}
