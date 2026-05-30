use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::Engine;
use keyring::Entry;
use rand::RngCore;

/// Persists provider secrets in an encrypted on-disk vault; OS keychain holds the vault key.
pub struct CredentialStore {
    service: String,
    fallback_dir: PathBuf,
    cache: Mutex<std::collections::HashMap<String, String>>,
    vault_key: Mutex<Option<[u8; 32]>>,
}

const VAULT_PREFIX: &str = "TREV1:";
const MASTER_KEY_REF: &str = "treplica-vault-master";

impl CredentialStore {
    pub fn new(service: impl Into<String>, data_dir: &Path) -> Self {
        let fallback_dir = data_dir.join("credential-vault");
        let _ = fs::create_dir_all(&fallback_dir);
        Self {
            service: service.into(),
            fallback_dir,
            cache: Mutex::new(std::collections::HashMap::new()),
            vault_key: Mutex::new(None),
        }
    }

    pub fn store(&self, credential_ref: &str, secret: String) -> Result<(), String> {
        let trimmed = secret.trim();
        if trimmed.is_empty() {
            return Err("API key cannot be empty".into());
        }

        self.store_fallback(credential_ref, trimmed)?;

        if let Err(e) = self.store_keyring(credential_ref, trimmed) {
            eprintln!(
                "credential keyring store failed for {credential_ref}: {e}; using encrypted disk vault"
            );
        }

        let mut guard = self.cache.lock().map_err(|e| e.to_string())?;
        guard.insert(credential_ref.to_string(), trimmed.to_string());
        Ok(())
    }

    pub fn get(&self, credential_ref: &str) -> Result<Option<String>, String> {
        if let Ok(guard) = self.cache.lock() {
            if let Some(v) = guard.get(credential_ref) {
                return Ok(Some(v.clone()));
            }
        }

        let from_keyring = self.get_keyring(credential_ref).ok().flatten();
        let from_fallback = self.get_fallback(credential_ref)?;
        let value = pick_non_empty(from_keyring, from_fallback);

        if let Some(ref v) = value {
            if let Ok(mut guard) = self.cache.lock() {
                guard.insert(credential_ref.to_string(), v.clone());
            }
        }
        Ok(value)
    }

    pub fn delete(&self, credential_ref: &str) -> Result<(), String> {
        let _ = self.delete_keyring(credential_ref);
        let _ = self.delete_fallback(credential_ref);
        if let Ok(mut guard) = self.cache.lock() {
            guard.remove(credential_ref);
        }
        Ok(())
    }

    pub fn has(&self, credential_ref: &str) -> bool {
        self.get(credential_ref)
            .ok()
            .flatten()
            .is_some_and(|k| !k.trim().is_empty())
    }

    fn entry(&self, credential_ref: &str) -> Result<Entry, String> {
        Entry::new(&self.service, credential_ref).map_err(|e| e.to_string())
    }

    fn store_keyring(&self, credential_ref: &str, secret: &str) -> Result<(), String> {
        self.entry(credential_ref)?
            .set_password(secret)
            .map_err(|e| e.to_string())
    }

    fn get_keyring(&self, credential_ref: &str) -> Result<Option<String>, String> {
        match self.entry(credential_ref)?.get_password() {
            Ok(p) if p.trim().is_empty() => Ok(None),
            Ok(p) => Ok(Some(p)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    fn delete_keyring(&self, credential_ref: &str) -> Result<(), String> {
        match self.entry(credential_ref)?.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    fn master_entry(&self) -> Result<Entry, String> {
        Entry::new(&self.service, MASTER_KEY_REF).map_err(|e| e.to_string())
    }

    fn vault_cipher(&self) -> Result<Aes256Gcm, String> {
        let key = self.load_or_create_vault_key()?;
        Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())
    }

    fn master_key_file(&self) -> PathBuf {
        self.fallback_dir.join(".vault-master")
    }

    fn load_or_create_vault_key(&self) -> Result<[u8; 32], String> {
        let mut guard = self.vault_key.lock().map_err(|e| e.to_string())?;
        if let Some(cached) = *guard {
            return Ok(cached);
        }
        let key = self.load_or_create_vault_key_from_disk()?;
        *guard = Some(key);
        Ok(key)
    }

    fn load_or_create_vault_key_from_disk(&self) -> Result<[u8; 32], String> {
        let path = self.master_key_file();
        if path.exists() {
            let bytes = fs::read(&path).map_err(|e| e.to_string())?;
            if bytes.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&bytes);
                return Ok(key);
            }
        }
        if let Ok(p) = self.master_entry()?.get_password() {
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(p.trim()) {
                if bytes.len() == 32 {
                    let mut key = [0u8; 32];
                    key.copy_from_slice(&bytes);
                    fs::write(&path, key).map_err(|e| e.to_string())?;
                    restrict_file_permissions(&path);
                    return Ok(key);
                }
            }
        }
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        fs::write(&path, key).map_err(|e| e.to_string())?;
        restrict_file_permissions(&path);
        let encoded = base64::engine::general_purpose::STANDARD.encode(key);
        if let Err(e) = self.master_entry().and_then(|e| e.set_password(&encoded).map_err(|e| e.to_string())) {
            eprintln!("credential vault keyring store failed: {e}");
        }
        Ok(key)
    }

    fn fallback_path(&self, credential_ref: &str) -> PathBuf {
        let safe: String = credential_ref
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                    c
                } else {
                    '_'
                }
            })
            .collect();
        self.fallback_dir.join(format!("{safe}.key"))
    }

    fn store_fallback(&self, credential_ref: &str, secret: &str) -> Result<(), String> {
        let path = self.fallback_path(credential_ref);
        let cipher = self.vault_cipher()?;
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher
            .encrypt(nonce, secret.as_bytes())
            .map_err(|e| e.to_string())?;
        let mut payload = nonce_bytes.to_vec();
        payload.extend(ciphertext);
        let encoded = format!(
            "{VAULT_PREFIX}{}",
            base64::engine::general_purpose::STANDARD.encode(payload)
        );
        fs::write(&path, encoded.as_bytes()).map_err(|e| e.to_string())?;
        restrict_file_permissions(&path);
        Ok(())
    }

    fn get_fallback(&self, credential_ref: &str) -> Result<Option<String>, String> {
        let path = self.fallback_path(credential_ref);
        if !path.exists() {
            return Ok(None);
        }
        let bytes = fs::read(&path).map_err(|e| e.to_string())?;
        let text = String::from_utf8(bytes).map_err(|e| e.to_string())?;
        if text.trim().is_empty() {
            return Ok(None);
        }
        if let Some(encoded) = text.strip_prefix(VAULT_PREFIX) {
            let payload = base64::engine::general_purpose::STANDARD
                .decode(encoded.trim())
                .map_err(|e| e.to_string())?;
            if payload.len() < 13 {
                return Err("corrupt encrypted credential vault entry".into());
            }
            let (nonce_bytes, ciphertext) = payload.split_at(12);
            let cipher = self.vault_cipher()?;
            let nonce = Nonce::from_slice(nonce_bytes);
            let plain = cipher
                .decrypt(nonce, ciphertext)
                .map_err(|_| "failed to decrypt credential vault entry".to_string())?;
            let secret = String::from_utf8(plain).map_err(|e| e.to_string())?;
            if secret.trim().is_empty() {
                Ok(None)
            } else {
                Ok(Some(secret))
            }
        } else {
            // Legacy plaintext vault: re-encrypt on read.
            let secret = text;
            if secret.trim().is_empty() {
                Ok(None)
            } else {
                if let Err(e) = self.store_fallback(credential_ref, secret.trim()) {
                    eprintln!(
                        "[vault] re-encryption of legacy credential failed for {credential_ref}: {e}"
                    );
                }
                Ok(Some(secret.trim().to_string()))
            }
        }
    }

    fn delete_fallback(&self, credential_ref: &str) -> Result<(), String> {
        let path = self.fallback_path(credential_ref);
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn scrub_for_log(value: &str) -> String {
        if value.len() <= 4 {
            return "***".into();
        }
        format!("{}***", &value[..4])
    }
}

fn pick_non_empty(a: Option<String>, b: Option<String>) -> Option<String> {
    match (a, b) {
        (Some(x), _) if !x.trim().is_empty() => Some(x),
        (_, Some(y)) if !y.trim().is_empty() => Some(y),
        _ => None,
    }
}

#[cfg(unix)]
fn restrict_file_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = fs::metadata(path) {
        let mut perms = meta.permissions();
        perms.set_mode(0o600);
        let _ = fs::set_permissions(path, perms);
    }
}

#[cfg(windows)]
fn restrict_file_permissions(path: &Path) {
    // Best-effort: remove inherited ACEs and grant full control to the current user only.
    // icacls is available on all modern Windows versions. Failure is non-fatal because
    // the OS keychain (DPAPI-backed Windows Credential Manager) is the primary key store.
    if let Some(path_str) = path.to_str() {
        let username = std::env::var("USERNAME").unwrap_or_default();
        if !username.is_empty() {
            let _ = std::process::Command::new("icacls")
                .args([
                    path_str,
                    "/inheritance:r",
                    "/grant:r",
                    &format!("{username}:(F)"),
                ])
                .output();
        }
    }
}

#[cfg(not(any(unix, windows)))]
fn restrict_file_permissions(_path: &Path) {}

impl Default for CredentialStore {
    fn default() -> Self {
        Self::new("treplica-desktop", Path::new("."))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn store_get_delete_roundtrip() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = CredentialStore::new("treplica-test", dir.path());
        let cref = "cred-test-1";
        store.store(cref, "sk-test-secret".into()).expect("store");
        let got = store.get(cref).expect("get").expect("some");
        assert_eq!(got, "sk-test-secret");
        let raw = fs::read_to_string(store.fallback_path(cref)).expect("read file");
        assert!(raw.starts_with(VAULT_PREFIX));
        store.delete(cref).expect("delete");
        assert!(store.get(cref).expect("get after delete").is_none());
    }

    #[test]
    fn persists_across_store_instances() {
        let dir = tempfile::tempdir().expect("tempdir");
        let cref = "cred-persist-2";
        {
            let store = CredentialStore::new("treplica-test", dir.path());
            store
                .store(cref, "sk-persist-secret".into())
                .expect("store");
        }
        let store2 = CredentialStore::new("treplica-test", dir.path());
        let got = store2.get(cref).expect("get").expect("some");
        assert_eq!(got, "sk-persist-secret");
    }
}
