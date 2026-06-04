use provider_core::ollama::OllamaAdapter;
use provider_core::{
    GuidanceRequest, PrivacyMode, ProviderAdapter, SessionContextInput, SuggestionType,
    TranscriptSnippet,
};

#[tokio::test]
async fn low_confidence_produces_fallback() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_guidance(GuidanceRequest {
            session_context: SessionContextInput::default(),
            recent_transcript: vec![TranscriptSnippet {
                speaker_label: None,
                text: "???".into(),
                confidence: 0.2,
            }],
            suggestion_type: None,
            privacy_mode: PrivacyMode::LocalOnly,
            context_image_data_urls: vec![],
            conversation: vec![],
        })
        .await
        .expect("response");
    assert_eq!(response.suggestion_type, SuggestionType::Fallback);
    assert!(response.confidence < 0.6);
}

#[tokio::test]
async fn objection_snippet_grounds_objection_response() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_guidance(GuidanceRequest {
            session_context: SessionContextInput::default(),
            recent_transcript: vec![TranscriptSnippet {
                speaker_label: None,
                text: "Tenho uma objeção sobre o contrato".into(),
                confidence: 0.95,
            }],
            suggestion_type: None,
            privacy_mode: PrivacyMode::LocalOnly,
            context_image_data_urls: vec![],
            conversation: vec![],
        })
        .await
        .expect("response");
    assert_eq!(response.suggestion_type, SuggestionType::ObjectionResponse);
    assert!(response.grounding_summary.contains("orientação ao vivo"));
}
