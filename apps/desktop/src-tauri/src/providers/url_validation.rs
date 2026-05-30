use url::Url;

const KNOWN_HOSTS: &[&str] = &[
    "api.openai.com",
    "api.groq.com",
    "integrate.api.nvidia.com",
    "api.anthropic.com",
    "openrouter.ai",
    "api.together.xyz",
    "api.mistral.ai",
    "generativelanguage.googleapis.com",
];

/// Validates provider base URLs to reduce SSRF and credential exfiltration risk.
pub fn validate_provider_base_url(
    provider_kind: &str,
    base_url: &str,
    allow_custom_endpoint: bool,
) -> Result<(), String> {
    let trimmed = base_url.trim();
    if trimmed.is_empty() {
        return Err("base_url is required".into());
    }
    let parsed = Url::parse(trimmed).map_err(|_| "base_url must be a valid URL".to_string())?;

    let host = parsed
        .host_str()
        .ok_or_else(|| "base_url must include a host".to_string())?
        .to_lowercase();

    if is_blocked_host(&host) {
        return Err("base_url points to a blocked host".into());
    }

    let scheme = parsed.scheme().to_lowercase();
    let is_loopback = host == "localhost" || host == "127.0.0.1" || host == "::1";

    match provider_kind {
        "ollama" => {
            if scheme != "http" && scheme != "https" {
                return Err("ollama base_url must use http or https".into());
            }
            if !is_loopback && !allow_custom_endpoint {
                return Err(
                    "ollama must use a loopback address unless custom endpoints are enabled".into(),
                );
            }
            Ok(())
        }
        "openai" | "groq" | "nvidia" | "anthropic" => {
            if scheme != "https" {
                return Err(format!("{provider_kind} requires https base_url"));
            }
            if !host_matches_known(&host, provider_kind) {
                return Err(format!("{provider_kind} base_url host is not in the allowlist"));
            }
            Ok(())
        }
        "openai_compatible" | "custom_api" => {
            if allow_custom_endpoint {
                if scheme != "https" && !(scheme == "http" && is_loopback) {
                    return Err(
                        "custom endpoints must use https, or http only on loopback".into(),
                    );
                }
                if !is_loopback && is_private_ip_range(&host) {
                    return Err(
                        "custom endpoints cannot target private network addresses; \
                         use the Ollama provider for local models"
                            .into(),
                    );
                }
                Ok(())
            } else if scheme == "https"
                && (KNOWN_HOSTS.iter().any(|h| host == *h)
                    || host.ends_with(".openai.azure.com"))
            {
                Ok(())
            } else {
                Err(
                    "enable custom endpoint in provider settings or use a known hosted URL"
                        .into(),
                )
            }
        }
        _ => {
            if scheme != "https" && !(scheme == "http" && is_loopback) {
                return Err("unsupported provider_kind URL scheme".into());
            }
            Ok(())
        }
    }
}

fn host_matches_known(host: &str, provider_kind: &str) -> bool {
    match provider_kind {
        "openai" => host == "api.openai.com",
        "groq" => host == "api.groq.com",
        "nvidia" => host == "integrate.api.nvidia.com",
        "anthropic" => host == "api.anthropic.com",
        _ => KNOWN_HOSTS.iter().any(|h| host == *h),
    }
}

fn is_blocked_host(host: &str) -> bool {
    // Cloud instance metadata endpoint (GCP)
    if host == "metadata.google.internal" {
        return true;
    }
    // APIPA / AWS + Azure IMDS range (169.254.0.0/16)
    if host.starts_with("169.254.") {
        return true;
    }
    // Unspecified IPv4
    if host == "0.0.0.0" {
        return true;
    }
    false
}

/// Returns true for RFC-1918 private IP ranges and IPv6 ULA/link-local addresses.
/// Used to prevent openai_compatible custom endpoints from targeting internal hosts.
/// Ollama (a local provider kind) is exempt from this check.
fn is_private_ip_range(host: &str) -> bool {
    // 10.0.0.0/8
    if host.starts_with("10.") {
        return true;
    }
    // 192.168.0.0/16
    if host.starts_with("192.168.") {
        return true;
    }
    // 172.16.0.0/12 — covers 172.16.x.x through 172.31.x.x
    if let Some(rest) = host.strip_prefix("172.") {
        if let Some(second) = rest.split('.').next() {
            if let Ok(n) = second.parse::<u8>() {
                if (16..=31).contains(&n) {
                    return true;
                }
            }
        }
    }
    // IPv6 link-local (fe80::/10) and ULA (fc00::/7).
    // Parse as Ipv6Addr so the check never fires on domain names like fc-staging.example.com.
    if let Ok(addr) = host.parse::<std::net::Ipv6Addr>() {
        let [first, second, ..] = addr.octets();
        if first == 0xfe && (second & 0xc0) == 0x80 {
            return true; // link-local
        }
        if first & 0xfe == 0xfc {
            return true; // ULA
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_metadata_host() {
        assert!(validate_provider_base_url(
            "openai_compatible",
            "https://metadata.google.internal/",
            true,
        )
        .is_err());
    }

    #[test]
    fn allows_openai_default() {
        assert!(validate_provider_base_url("openai", "https://api.openai.com/v1", false,).is_ok());
    }

    #[test]
    fn rejects_subdomain_of_known_host() {
        assert!(
            validate_provider_base_url("openai", "https://evil.api.openai.com/v1", false,).is_err()
        );
    }

    #[test]
    fn blocks_rfc1918_for_custom_endpoint() {
        for addr in &[
            "https://192.168.1.1/v1",
            "https://10.0.0.1/v1",
            "https://172.16.0.1/v1",
            "https://172.31.255.255/v1",
        ] {
            assert!(
                validate_provider_base_url("openai_compatible", addr, true).is_err(),
                "{addr} should be blocked"
            );
        }
    }

    #[test]
    fn allows_rfc1918_for_ollama() {
        assert!(
            validate_provider_base_url("ollama", "http://192.168.1.100:11434", true).is_ok()
        );
    }

    #[test]
    fn allows_known_custom_api_without_flag() {
        assert!(
            validate_provider_base_url("openai_compatible", "https://api.openai.com/v1", false)
                .is_ok()
        );
    }

    #[test]
    fn rejects_unknown_host_without_flag() {
        assert!(
            validate_provider_base_url(
                "openai_compatible",
                "https://my-custom-api.example.com/v1",
                false
            )
            .is_err()
        );
    }

    #[test]
    fn blocks_ipv6_ula_and_link_local() {
        for addr in &[
            "https://[fc00::1]/v1",
            "https://[fd12:3456::1]/v1",
            "https://[fe80::1]/v1",
        ] {
            assert!(
                validate_provider_base_url("openai_compatible", addr, true).is_err(),
                "{addr} should be blocked as private IPv6"
            );
        }
    }

    #[test]
    fn allows_domain_starting_with_fc_or_fd() {
        // Domains beginning with "fc" or "fd" are not IPv6 ULA and must not be blocked.
        assert!(
            validate_provider_base_url(
                "openai_compatible",
                "https://fc-api.example.com/v1",
                true
            )
            .is_ok(),
            "fc-api.example.com is a valid custom endpoint domain"
        );
    }
}
