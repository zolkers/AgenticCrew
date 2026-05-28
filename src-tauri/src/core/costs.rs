use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct ModelCallEstimate {
    pub provider: String,
    pub model: String,
    pub agent_id: String,
    pub input_tokens: u64,
    pub cached_tokens: u64,
    pub output_tokens: u64,
    pub estimated_cost_usd: f64,
}

impl ModelCallEstimate {
    pub fn uncached_input_tokens(&self) -> u64 {
        self.input_tokens.saturating_sub(self.cached_tokens)
    }
}

#[cfg(test)]
mod tests {
    use super::ModelCallEstimate;

    #[test]
    fn model_call_estimate_tracks_uncached_input_tokens() {
        let estimate = ModelCallEstimate {
            provider: "openai".to_owned(),
            model: "gpt-4o".to_owned(),
            agent_id: "developer".to_owned(),
            input_tokens: 6_200,
            cached_tokens: 5_400,
            output_tokens: 900,
            estimated_cost_usd: 0.00032,
        };

        assert_eq!(estimate.uncached_input_tokens(), 800);
    }

    #[test]
    fn uncached_input_tokens_never_underflows() {
        let estimate = ModelCallEstimate {
            provider: "openai".to_owned(),
            model: "gpt-4o".to_owned(),
            agent_id: "developer".to_owned(),
            input_tokens: 100,
            cached_tokens: 200,
            output_tokens: 10,
            estimated_cost_usd: 0.0,
        };

        assert_eq!(estimate.uncached_input_tokens(), 0);
    }
}
