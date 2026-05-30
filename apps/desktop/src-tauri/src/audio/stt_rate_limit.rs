use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Spacing between cloud STT requests (Groq free tier ~30 RPM; we target ~18 RPM).
pub const DEFAULT_MIN_STT_INTERVAL_MS: u64 = 3_200;

pub struct SttRateLimiter {
    last_sent: Mutex<Option<Instant>>,
    min_interval: Duration,
}

impl SttRateLimiter {
    pub fn new(min_interval_ms: u64) -> Self {
        Self {
            last_sent: Mutex::new(None),
            min_interval: Duration::from_millis(min_interval_ms),
        }
    }

    pub fn ms_until_next(&self) -> u64 {
        let Ok(guard) = self.last_sent.lock() else {
            return 0;
        };
        let Some(last) = *guard else {
            return 0;
        };
        let elapsed = last.elapsed();
        if elapsed >= self.min_interval {
            0
        } else {
            (self.min_interval - elapsed).as_millis() as u64
        }
    }

    pub fn can_send_now(&self) -> bool {
        self.ms_until_next() == 0
    }

    pub fn mark_sent(&self) {
        if let Ok(mut guard) = self.last_sent.lock() {
            *guard = Some(Instant::now());
        }
    }
}

impl Default for SttRateLimiter {
    fn default() -> Self {
        Self::new(DEFAULT_MIN_STT_INTERVAL_MS)
    }
}
