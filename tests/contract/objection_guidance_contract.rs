use provider_core::ollama::OllamaAdapter;
use provider_core::{
    GuidanceRequest, PrivacyMode, ProviderAdapter, SessionContextInput, SuggestionType,
    TranscriptSnippet,
};

#[tokio::test]
async fn objection_request_returns_structured_objection_response() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_guidance(GuidanceRequest {
            session_context: SessionContextInput {
                role: Some("Sales".into()),
                objective: Some("Fechar contrato anual".into()),
                ..Default::default()
            },
            recent_transcript: vec![TranscriptSnippet {
                speaker_label: Some("Prospect".into()),
                text: "Temos uma objeção sobre o preço proposto".into(),
                confidence: 0.92,
            }],
            suggestion_type: Some(SuggestionType::ObjectionResponse),
            privacy_mode: PrivacyMode::LocalOnly,
            context_image_data_urls: vec![],
            conversation: vec![],
        })
        .await
        .expect("guidance");
    assert_eq!(response.suggestion_type, SuggestionType::ObjectionResponse);
    assert!(response.text.contains("preocupação") || response.text.contains("valor"));
    assert!(response.confidence >= 0.6);
    assert!(response.grounding_summary.contains("orientação ao vivo"));
}

#[tokio::test]
async fn follow_up_type_returns_actionable_question() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_guidance(GuidanceRequest {
            session_context: SessionContextInput::default(),
            recent_transcript: vec![TranscriptSnippet {
                speaker_label: None,
                text: "Pode detalhar como funciona a implementação?".into(),
                confidence: 0.9,
            }],
            suggestion_type: Some(SuggestionType::FollowUpQuestion),
            privacy_mode: PrivacyMode::LocalOnly,
            context_image_data_urls: vec![],
            conversation: vec![],
        })
        .await
        .expect("guidance");
    assert_eq!(response.suggestion_type, SuggestionType::FollowUpQuestion);
    assert!(response.text.contains('?'));
}
