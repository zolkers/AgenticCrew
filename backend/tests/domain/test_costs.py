from decimal import Decimal

from agentos_core.domain.costs import ModelCallEstimate


def test_model_call_estimate_tracks_token_cost_inputs() -> None:
    estimate = ModelCallEstimate(
        provider="openai",
        model="gpt-4o",
        agent_id="developer",
        input_tokens=6200,
        cached_tokens=5400,
        output_tokens=900,
        estimated_cost_usd=Decimal("0.00032"),
    )

    assert estimate.estimated_cost_usd == Decimal("0.00032")
    assert estimate.uncached_input_tokens == 800
