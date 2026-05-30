fn main() {
    tauri_build::build();

    // On macOS, compile the Objective-C speech-recognition bridge (SFSpeechRecognizer)
    // and link the required system frameworks. Other targets skip this entirely.
    // CARGO_CFG_TARGET_OS reflects the build target, which is what we want here.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        println!("cargo:rerun-if-changed=native/treplica_speech.m");
        cc::Build::new()
            .file("native/treplica_speech.m")
            .flag("-fobjc-arc")
            .compile("treplica_speech");
        println!("cargo:rustc-link-lib=framework=Speech");
        println!("cargo:rustc-link-lib=framework=Foundation");
    }
}
