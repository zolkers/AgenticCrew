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

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ModelPricing {
    pub input_per_million: f64,
    pub cached_input_per_million: f64,
    pub output_per_million: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PricingError {
    NegativePrice { field: &'static str, value: f64 },
    NonFinitePrice { field: &'static str, value: f64 },
}

impl std::fmt::Display for PricingError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PricingError::NegativePrice { field, value } => {
                write!(formatter, "{field} must be non-negative, got {value}")
            }
            PricingError::NonFinitePrice { field, value } => {
                write!(formatter, "{field} must be finite, got {value}")
            }
        }
    }
}

impl std::error::Error for PricingError {}

impl ModelPricing {
    pub fn new(
        input_per_million: f64,
        cached_input_per_million: f64,
        output_per_million: f64,
    ) -> Result<Self, PricingError> {
        let pricing = Self {
            input_per_million,
            cached_input_per_million,
            output_per_million,
        };

        pricing.validate()?;

        Ok(pricing)
    }

    fn validate(&self) -> Result<(), PricingError> {
        validate_price("input_per_million", self.input_per_million)?;
        validate_price("cached_input_per_million", self.cached_input_per_million)?;
        validate_price("output_per_million", self.output_per_million)
    }
}

fn validate_price(field: &'static str, value: f64) -> Result<(), PricingError> {
    if !value.is_finite() {
        return Err(PricingError::NonFinitePrice { field, value });
    }

    if value < 0.0 {
        return Err(PricingError::NegativePrice { field, value });
    }

    Ok(())
}

impl ModelCallEstimate {
    pub fn uncached_input_tokens(&self) -> u64 {
        self.input_tokens.saturating_sub(self.cached_tokens)
    }

    pub fn estimate_cost(&self, pricing: &ModelPricing) -> f64 {
        if pricing.validate().is_err() {
            return 0.0;
        }

        let uncached_input_cost =
            self.uncached_input_tokens() as f64 / 1_000_000.0 * pricing.input_per_million;
        let cached_input_cost = self.cached_tokens.min(self.input_tokens) as f64 / 1_000_000.0
            * pricing.cached_input_per_million;
        let output_cost = self.output_tokens as f64 / 1_000_000.0 * pricing.output_per_million;

        uncached_input_cost + cached_input_cost + output_cost
    }
}

#[cfg(test)]
mod tests {
    use super::{ModelCallEstimate, ModelPricing, PricingError};

    fn assert_cost_close(actual: f64, expected: f64) {
        const EPSILON: f64 = 0.000_000_001;

        assert!(
            (actual - expected).abs() <= EPSILON,
            "expected {actual} to be within {EPSILON} of {expected}"
        );
    }

    fn estimate(input_tokens: u64, cached_tokens: u64, output_tokens: u64) -> ModelCallEstimate {
        ModelCallEstimate {
            provider: "openai".to_owned(),
            model: "gpt-4o".to_owned(),
            agent_id: "developer".to_owned(),
            input_tokens,
            cached_tokens,
            output_tokens,
            estimated_cost_usd: 0.0,
        }
    }

    fn pricing() -> ModelPricing {
        ModelPricing::new(2.0, 0.5, 8.0).expect("valid pricing")
    }

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

    #[test]
    fn estimate_cost_prices_uncached_input_tokens() {
        let estimate = estimate(1_250_000, 250_000, 0);

        assert_cost_close(estimate.estimate_cost(&pricing()), 2.125);
    }

    #[test]
    fn estimate_cost_prices_cached_input_tokens() {
        let estimate = estimate(1_000_000, 400_000, 0);

        assert_cost_close(estimate.estimate_cost(&pricing()), 1.4);
    }

    #[test]
    fn estimate_cost_prices_output_tokens() {
        let estimate = estimate(0, 0, 375_000);

        assert_cost_close(estimate.estimate_cost(&pricing()), 3.0);
    }

    #[test]
    fn estimate_cost_caps_cached_tokens_at_input_tokens() {
        let estimate = estimate(100_000, 250_000, 0);

        assert_cost_close(estimate.estimate_cost(&pricing()), 0.05);
    }

    #[test]
    fn model_pricing_rejects_negative_prices() {
        assert_eq!(
            ModelPricing::new(-1.0, 0.5, 8.0),
            Err(PricingError::NegativePrice {
                field: "input_per_million",
                value: -1.0,
            })
        );
    }

    #[test]
    fn model_pricing_rejects_non_finite_prices() {
        assert_eq!(
            ModelPricing::new(2.0, f64::INFINITY, 8.0),
            Err(PricingError::NonFinitePrice {
                field: "cached_input_per_million",
                value: f64::INFINITY,
            })
        );
    }

    #[test]
    fn estimate_cost_never_returns_negative_for_invalid_public_pricing() {
        let estimate = estimate(1_000_000, 0, 0);
        let invalid_pricing = ModelPricing {
            input_per_million: -2.0,
            cached_input_per_million: 0.0,
            output_per_million: 0.0,
        };

        assert_cost_close(estimate.estimate_cost(&invalid_pricing), 0.0);
    }
}
