from fastapi import FastAPI

from agentos_core.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="AgentOS Core")
    app.include_router(health_router)
    return app
