from decimal import Decimal

from pydantic import BaseModel, ConfigDict, NonNegativeInt


class ModelCallEstimate(BaseModel):
    model_config = ConfigDict(frozen=True)

    provider: str
    model: str
    agent_id: str
    input_tokens: NonNegativeInt
    cached_tokens: NonNegativeInt
    output_tokens: NonNegativeInt
    estimated_cost_usd: Decimal

    @property
    def uncached_input_tokens(self) -> int:
        return self.input_tokens - self.cached_tokens
