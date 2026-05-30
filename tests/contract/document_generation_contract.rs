use provider_core::ollama::OllamaAdapter;
use provider_core::{
    DocumentGenerationRequest, PrivacyMode, ProviderAdapter,
};

#[tokio::test]
async fn summary_generation_returns_markdown_content() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_document_generation(DocumentGenerationRequest {
            doc_type: "summary".into(),
            session_title: "Reunião Q2".into(),
            transcript_lines: vec!["Participante: Qual o ROI?".into()],
            suggestion_lines: vec!["answer: Destaque payback".into()],
            privacy_mode: PrivacyMode::LocalOnly,
            system_prompt: None,
        })
        .await
        .expect("document");
    assert!(response.title.contains("Resumo"));
    assert!(response.content.contains("Transcrição") || response.content.contains("ROI"));
    assert!(!response.content_left_device);
}

#[tokio::test]
async fn follow_up_email_has_distinct_title() {
    let adapter = OllamaAdapter::default();
    let response = adapter
        .request_document_generation(DocumentGenerationRequest {
            doc_type: "follow_up_email".into(),
            session_title: "Demo".into(),
            transcript_lines: vec![],
            suggestion_lines: vec![],
            privacy_mode: PrivacyMode::LocalOnly,
            system_prompt: None,
        })
        .await
        .expect("document");
    assert!(response.title.contains("Follow-up"));
}
