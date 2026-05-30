//! Generates minisign key pair for Tauri updater (public key committed; secret local/CI only).
use std::fs;
use std::io::Write;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .expect("repo root")
        .to_path_buf();
    let out_dir = root.join("apps/desktop/updater");
    fs::create_dir_all(&out_dir)?;

    let kp = minisign::KeyPair::generate_unencrypted_keypair()?;
    let pk_box = kp.pk.to_box()?;
    let pk_line = pk_box.to_string();

    let sk_box = kp.sk.to_box(Some("Treplica updater signing key"))?;
    let sk_line = sk_box.to_string();

    let pub_path = out_dir.join("treplica-update.pub");
    let sec_path = out_dir.join("treplica-update.key");
    fs::write(&pub_path, format!("{pk_line}\n"))?;
    fs::write(&sec_path, format!("{sk_line}\n"))?;

    let pub_file_body = format!("{pk_line}\n");
    let pubkey_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        pub_file_body.as_bytes(),
    );
    let conf_hint = out_dir.join("pubkey-for-tauri.conf.txt");
    fs::write(&conf_hint, &pubkey_b64)?;

    let mut stdout = std::io::stdout().lock();
    writeln!(stdout, "Public key written to: {}", pub_path.display())?;
    writeln!(
        stdout,
        "Secret key written to: {} (gitignored — store in CI secrets)",
        sec_path.display()
    )?;
    writeln!(stdout)?;
    writeln!(stdout, "Set in tauri.conf.json plugins.updater.pubkey:")?;
    writeln!(stdout, "{pubkey_b64}")?;
    Ok(())
}
