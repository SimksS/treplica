use local_store::models::PrivacyMode as ProfilePrivacyMode;
use provider_core::PrivacyMode as RequestPrivacyMode;

use super::router::ResolvedProvider;

/// Returns the privacy mode to attach to provider requests, enforcing the user profile.
pub fn resolve_request_privacy(
    profile_mode: ProfilePrivacyMode,
    provider: &ResolvedProvider,
    session_hosted_acknowledged: bool,
) -> Result<RequestPrivacyMode, String> {
    if is_local_provider(provider) {
        return Ok(RequestPrivacyMode::LocalOnly);
    }

    match profile_mode {
        ProfilePrivacyMode::LocalOnly => Ok(RequestPrivacyMode::LocalOnly),
        ProfilePrivacyMode::HostedDefault => Ok(RequestPrivacyMode::HostedDefault),
        ProfilePrivacyMode::HostedPerSession => {
            if session_hosted_acknowledged {
                Ok(RequestPrivacyMode::HostedPerSession)
            } else {
                Err(
                    "hosted_per_session_requires_acknowledgment: confirme o envio de dados à nuvem nesta sessão"
                        .into(),
                )
            }
        }
    }
}

/// Blocks hosted network calls when profile or session policy forbids them.
pub fn ensure_hosted_request_allowed(
    profile_mode: ProfilePrivacyMode,
    provider: &ResolvedProvider,
    session_hosted_acknowledged: bool,
) -> Result<(), String> {
    let mode = resolve_request_privacy(profile_mode, provider, session_hosted_acknowledged)?;
    if mode == RequestPrivacyMode::LocalOnly && !is_local_provider(provider) {
        return Err(
            "privacy_blocked: modo somente local ativo; providers na nuvem estão bloqueados".into(),
        );
    }
    Ok(())
}

pub fn is_local_provider(provider: &ResolvedProvider) -> bool {
    provider.local_only || provider.provider_kind == "ollama"
}

pub fn profile_privacy_from_repo(
    repo: &local_store::repositories::StoreRepositories<'_>,
) -> Result<ProfilePrivacyMode, String> {
    local_store::provider_repository::ProviderRepository::new(repo.conn())
        .get_default_profile()
        .map(|p| p.privacy_mode)
        .map_err(|e| e.to_string())
}

pub fn resolve_for_session(
    repo: &local_store::repositories::StoreRepositories<'_>,
    session: &local_store::models::Session,
    provider: &ResolvedProvider,
) -> Result<RequestPrivacyMode, String> {
    let profile = profile_privacy_from_repo(repo)?;
    ensure_hosted_request_allowed(
        profile,
        provider,
        session.hosted_data_acknowledged,
    )?;
    resolve_request_privacy(
        profile,
        provider,
        session.hosted_data_acknowledged,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cloud_provider() -> ResolvedProvider {
        ResolvedProvider {
            id: "p1".into(),
            provider_kind: "openai".into(),
            base_url: "https://api.openai.com/v1".into(),
            model: "gpt-4o-mini".into(),
            api_key: Some("sk-test".into()),
            local_only: false,
        }
    }

    #[test]
    fn local_only_profile_uses_local_only_mode() {
        assert_eq!(
            resolve_request_privacy(
                ProfilePrivacyMode::LocalOnly,
                &cloud_provider(),
                true,
            )
            .unwrap(),
            RequestPrivacyMode::LocalOnly
        );
        assert!(ensure_hosted_request_allowed(
            ProfilePrivacyMode::LocalOnly,
            &cloud_provider(),
            true,
        )
        .is_err());
    }

    #[test]
    fn hosted_per_session_requires_ack() {
        assert!(resolve_request_privacy(
            ProfilePrivacyMode::HostedPerSession,
            &cloud_provider(),
            false,
        )
        .is_err());
        assert_eq!(
            resolve_request_privacy(
                ProfilePrivacyMode::HostedPerSession,
                &cloud_provider(),
                true,
            )
            .unwrap(),
            RequestPrivacyMode::HostedPerSession
        );
    }
}
