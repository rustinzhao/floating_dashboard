from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import ActiveTicket, DashboardFilters, DashboardResponse
from .repository import create_repository

app = FastAPI(title="ATQ Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repository = create_repository()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard(
    service_version: str = Query(default="", alias="serviceVersion"),
    phone_model: str = Query(default="", alias="phoneModel"),
    build_version: str = Query(default="release_5.203", alias="buildVersion"),
) -> DashboardResponse:
    filters = DashboardFilters(
        service_version=service_version,
        phone_model=phone_model,
        build_version=build_version,
    )
    return repository.get_dashboard(filters)


@app.get("/api/atqs/{atq_id}/active-ticket", response_model=ActiveTicket | None)
def get_active_ticket(
    atq_id: str,
    service_version: str = Query(default="", alias="serviceVersion"),
    phone_model: str = Query(default="", alias="phoneModel"),
    build_version: str = Query(default="release_5.203", alias="buildVersion"),
) -> ActiveTicket | None:
    filters = DashboardFilters(
        service_version=service_version,
        phone_model=phone_model,
        build_version=build_version,
    )
    return repository.get_active_ticket(atq_id, filters)
