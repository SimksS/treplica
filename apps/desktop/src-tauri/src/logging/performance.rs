use std::time::Instant;

use local_store::repositories::StoreRepositories;
use serde_json::json;

use super::audit::write_audit;

/// Budgets from specs/001-treplica-product-spec/plan.md
pub const BUDGET_TRANSCRIPT_MS: u64 = 1_000;
pub const BUDGET_GUIDANCE_MS: u64 = 3_000;
pub const BUDGET_UI_MS: u64 = 100;
pub const BUDGET_LOCAL_SEARCH_MS: u64 = 1_000;

#[derive(Debug, Clone, Copy)]
pub enum PerformanceMetric {
    TranscriptUpdate,
    Guidance,
    UiStateBuild,
    LocalSearch,
}

impl PerformanceMetric {
    fn name(self) -> &'static str {
        match self {
            Self::TranscriptUpdate => "transcript_update",
            Self::Guidance => "guidance",
            Self::UiStateBuild => "ui_state_build",
            Self::LocalSearch => "local_search",
        }
    }

    fn budget_ms(self) -> u64 {
        match self {
            Self::TranscriptUpdate => BUDGET_TRANSCRIPT_MS,
            Self::Guidance => BUDGET_GUIDANCE_MS,
            Self::UiStateBuild => BUDGET_UI_MS,
            Self::LocalSearch => BUDGET_LOCAL_SEARCH_MS,
        }
    }
}

pub struct PerfSpan {
    metric: PerformanceMetric,
    started: Instant,
    session_id: Option<String>,
}

impl PerfSpan {
    pub fn start(metric: PerformanceMetric, session_id: Option<&str>) -> Self {
        Self {
            metric,
            started: Instant::now(),
            session_id: session_id.map(str::to_string),
        }
    }

    pub fn elapsed_ms(&self) -> u64 {
        self.started.elapsed().as_millis() as u64
    }

    pub fn finish(self, repo: &StoreRepositories<'_>) {
        let duration_ms = self.elapsed_ms();
        let budget_ms = self.metric.budget_ms();
        let within_budget = duration_ms <= budget_ms;
        let severity = if within_budget { "info" } else { "warning" };
        let _ = write_audit(
            repo,
            self.session_id.as_deref(),
            "performance",
            self.metric.name(),
            json!({
                "duration_ms": duration_ms,
                "budget_ms": budget_ms,
                "within_budget": within_budget,
            }),
            severity,
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn budgets_match_plan() {
        assert_eq!(BUDGET_TRANSCRIPT_MS, 1_000);
        assert_eq!(BUDGET_GUIDANCE_MS, 3_000);
        assert_eq!(BUDGET_UI_MS, 100);
        assert_eq!(BUDGET_LOCAL_SEARCH_MS, 1_000);
    }
}
