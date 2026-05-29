use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordModelCallEstimateRequest {
    pub provider: String,
    pub model: String,
    pub agent_id: String,
    pub input_tokens: u64,
    pub cached_tokens: u64,
    pub output_tokens: u64,
    pub estimated_cost_usd: f64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelCallEstimateError {
    EmptyField { field: &'static str },
    InvalidCost,
}

impl std::fmt::Display for ModelCallEstimateError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModelCallEstimateError::EmptyField { field } => {
                write!(formatter, "{field} is required")
            }
            ModelCallEstimateError::InvalidCost => {
                write!(formatter, "estimated cost must be finite and non-negative")
            }
        }
    }
}

impl std::error::Error for ModelCallEstimateError {}

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

impl TryFrom<RecordModelCallEstimateRequest> for ModelCallEstimate {
    type Error = ModelCallEstimateError;

    fn try_from(request: RecordModelCallEstimateRequest) -> Result<Self, Self::Error> {
        let provider = validate_required("provider", request.provider)?;
        let model = validate_required("model", request.model)?;
        let agent_id = validate_required("agent id", request.agent_id)?;
        if !request.estimated_cost_usd.is_finite() || request.estimated_cost_usd < 0.0 {
            return Err(ModelCallEstimateError::InvalidCost);
        }

        Ok(Self {
            provider,
            model,
            agent_id,
            input_tokens: request.input_tokens,
            cached_tokens: request.cached_tokens,
            output_tokens: request.output_tokens,
            estimated_cost_usd: request.estimated_cost_usd,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ModelPricing {
    input_per_million: f64,
    cached_input_per_million: f64,
    output_per_million: f64,
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

fn validate_required(field: &'static str, value: String) -> Result<String, ModelCallEstimateError> {
    let value = value.trim();
    if value.is_empty() {
        return Err(ModelCallEstimateError::EmptyField { field });
    }

    Ok(value.to_owned())
}

impl ModelCallEstimate {
    pub fn uncached_input_tokens(&self) -> u64 {
        self.input_tokens.saturating_sub(self.cached_tokens)
    }

    pub fn estimate_cost(&self, pricing: &ModelPricing) -> f64 {
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
    fn model_pricing_rejects_negative_prices_for_all_fields() {
        let cases = [
            (
                "input_per_million",
                ModelPricing::new(-1.0, 0.5, 8.0),
                PricingError::NegativePrice {
                    field: "input_per_million",
                    value: -1.0,
                },
            ),
            (
                "cached_input_per_million",
                ModelPricing::new(2.0, -0.5, 8.0),
                PricingError::NegativePrice {
                    field: "cached_input_per_million",
                    value: -0.5,
                },
            ),
            (
                "output_per_million",
                ModelPricing::new(2.0, 0.5, -8.0),
                PricingError::NegativePrice {
                    field: "output_per_million",
                    value: -8.0,
                },
            ),
        ];

        for (field, actual, expected) in cases {
            assert_eq!(actual, Err(expected), "{field} should reject negatives");
        }
    }

    #[test]
    fn model_pricing_rejects_infinity_for_all_fields() {
        let cases = [
            (
                "input_per_million",
                ModelPricing::new(f64::INFINITY, 0.5, 8.0),
                PricingError::NonFinitePrice {
                    field: "input_per_million",
                    value: f64::INFINITY,
                },
            ),
            (
                "cached_input_per_million",
                ModelPricing::new(2.0, f64::INFINITY, 8.0),
                PricingError::NonFinitePrice {
                    field: "cached_input_per_million",
                    value: f64::INFINITY,
                },
            ),
            (
                "output_per_million",
                ModelPricing::new(2.0, 0.5, f64::INFINITY),
                PricingError::NonFinitePrice {
                    field: "output_per_million",
                    value: f64::INFINITY,
                },
            ),
        ];

        for (field, actual, expected) in cases {
            assert_eq!(actual, Err(expected), "{field} should reject infinity");
        }
    }

    #[test]
    fn model_pricing_rejects_nan_for_all_fields() {
        let cases = [
            (
                "input_per_million",
                ModelPricing::new(f64::NAN, 0.5, 8.0),
                "input_per_million",
            ),
            (
                "cached_input_per_million",
                ModelPricing::new(2.0, f64::NAN, 8.0),
                "cached_input_per_million",
            ),
            (
                "output_per_million",
                ModelPricing::new(2.0, 0.5, f64::NAN),
                "output_per_million",
            ),
        ];

        for (case_name, actual, expected_field) in cases {
            match actual {
                Err(PricingError::NonFinitePrice { field, value }) => {
                    assert_eq!(field, expected_field, "{case_name} should report field");
                    assert!(value.is_nan(), "{case_name} should preserve NaN value");
                }
                other => panic!("{case_name} should reject NaN, got {other:?}"),
            }
        }
    }
}
