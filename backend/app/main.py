import os
import random
import time

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import ActiveTicket, DashboardFilters, DashboardResponse, TicketBundle
from .repository import create_repository

app = FastAPI(title="ATQ Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:4300",
        "http://127.0.0.1:4300",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repository = create_repository()


def _simulate_demo_latency(kind: str) -> None:
    if os.getenv("DATA_SOURCE", "mock").lower() == "bigquery":
        return

    if os.getenv("DEMO_LATENCY", "true").lower() in {"0", "false", "no", "off"}:
        return

    ranges = {
        "dashboard": (0.9, 1.6),
        "ticket": (0.45, 0.9),
    }
    lower, upper = ranges.get(kind, (0.3, 0.6))
    time.sleep(random.uniform(lower, upper))


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
    _simulate_demo_latency("dashboard")
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
    _simulate_demo_latency("ticket")
    return repository.get_active_ticket(atq_id, filters)


@app.get("/api/atqs/{atq_id}/tickets", response_model=TicketBundle)
def get_ticket_bundle(
    atq_id: str,
    service_version: str = Query(default="", alias="serviceVersion"),
    phone_model: str = Query(default="", alias="phoneModel"),
    build_version: str = Query(default="release_5.203", alias="buildVersion"),
) -> TicketBundle:
    filters = DashboardFilters(
        service_version=service_version,
        phone_model=phone_model,
        build_version=build_version,
    )
    _simulate_demo_latency("ticket")
    return repository.get_ticket_bundle(atq_id, filters)
