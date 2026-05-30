use std::sync::Mutex;

#[derive(Debug)]
pub struct AudioCaptureState {
    microphone_owner: Mutex<Option<String>>,
    system_owner: Mutex<Option<String>>,
}

impl AudioCaptureState {
    pub fn new() -> Self {
        Self {
            microphone_owner: Mutex::new(None),
            system_owner: Mutex::new(None),
        }
    }

    pub fn claim(&self, mode: &str, owner: &str) -> Result<(), String> {
        let slot = match mode {
            "microphone" => &self.microphone_owner,
            "system" => &self.system_owner,
            other => return Err(format!("Modo de captura inválido: {other}")),
        };
        let mut guard = slot.lock().map_err(|e| e.to_string())?;
        if let Some(ref existing) = *guard {
            if existing != owner {
                let label = if mode == "microphone" {
                    "Microfone"
                } else {
                    "Áudio do sistema"
                };
                return Err(format!(
                    "{label} já ativo em outra janela. Desative antes de alternar."
                ));
            }
        }
        *guard = Some(owner.to_string());
        Ok(())
    }

    pub fn release(&self, owner: &str) -> Result<(), String> {
        for slot in [&self.microphone_owner, &self.system_owner] {
            if let Ok(mut guard) = slot.lock() {
                if guard.as_deref() == Some(owner) {
                    *guard = None;
                }
            }
        }
        Ok(())
    }

    pub fn release_mode(&self, mode: &str, owner: &str) -> Result<(), String> {
        let slot = match mode {
            "microphone" => &self.microphone_owner,
            "system" => &self.system_owner,
            other => return Err(format!("Modo de captura inválido: {other}")),
        };
        let mut guard = slot.lock().map_err(|e| e.to_string())?;
        if guard.as_deref() == Some(owner) {
            *guard = None;
        }
        Ok(())
    }

    pub fn current_mode(&self) -> Option<String> {
        let mic = self.microphone_owner.lock().ok().and_then(|g| g.clone());
        let sys = self.system_owner.lock().ok().and_then(|g| g.clone());
        if mic.is_some() && sys.is_some() {
            return Some("both".into());
        }
        mic.map(|_| "microphone".into())
            .or_else(|| sys.map(|_| "system".into()))
    }
}
