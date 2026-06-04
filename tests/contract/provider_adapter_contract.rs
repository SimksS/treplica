use provider_core::hosted::{validate_hosted_config, HostedProviderConfig};
use provider_core::ollama::{validate_configuration as validate_ollama, OllamaAdapter};
use provider_core::openai_compatible::{
    validate_configuration as validate_openai_compat, OpenAiCompatibleAdapter,
};
use provider_core::{
    GuidanceRequest, PrivacyMode, ProviderAdapter, ProviderErrorCode, ProviderKind,
    SessionContextInput, TranscriptSnippet,
};

#[tokio::test]
async fn local_provider_succeeds_without_credentials() {
    let adapter = OllamaAdapter::default();
    assert!(adapter.metadata().is_local);
    assert!(!adapter.metadata().requires_credentials);
    assert!(adapter.validate_privacy(PrivacyMode::LocalOnly).is_ok());
}

#[tokio::test]
async fn hosted_blocked_in_local_only_mode() {
    let adapter = OpenAiCompatibleAdapter::new(
        "https://api.openai.com/v1",
        "gpt-4o-mini",
        Some("test-key".into()),
        false,
        "Hosted",
    );
    let err = adapter.validate_privacy(PrivacyMode::LocalOnly).unwrap_err();
    match err {
        provider_core::ProviderError::Structured { code, .. } => {
            assert_eq!(code, ProviderErrorCode::PrivacyBlocked);
        }
    }
}

#[tokio::test]
async fn validation_rejects_missing_fields() {
    assert!(validate_ollama(None, Some("m")).is_err());
    assert!(validate_openai_compat(Some("http://x"), Some("m"), None, false).is_err());
    let hosted = HostedProviderConfig {
        provider_kind: ProviderKind::Openai,
        display_name: "OpenAI".into(),
        base_url: String::new(),
        model: "gpt".into(),
        credential_ref: None,
    };
    assert!(validate_hosted_config(&hosted).is_err());
}

#[tokio::test]
async fn guidance_returns_structured_output_with_grounding() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_guidance(GuidanceRequest {
            session_context: SessionContextInput {
                role: Some("vendas".into()),
                objective: Some("fechar contrato".into()),
                ..Default::default()
            },
            recent_transcript: vec![TranscriptSnippet {
                speaker_label: Some("Cliente".into()),
                text: "O preço está alto".into(),
                confidence: 0.9,
            }],
            suggestion_type: None,
            privacy_mode: PrivacyMode::LocalOnly,
            context_image_data_urls: vec![],
            conversation: vec![],
        })
        .await
        .expect("guidance");
    assert!(!response.text.is_empty());
    assert!(!response.grounding_summary.is_empty());
    assert!(!response.content_left_device);
}
