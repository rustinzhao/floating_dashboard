import os
from typing import Protocol

from .models import (
    ActiveTicket,
    AtqRow,
    DashboardFilters,
    DashboardResponse,
    FilterOptions,
    Overview,
    ResultMetric,
    SummaryMetric,
)


class DashboardRepository(Protocol):
    def get_dashboard(self, filters: DashboardFilters) -> DashboardResponse:
        ...

    def get_active_ticket(self, atq_id: str, filters: DashboardFilters) -> ActiveTicket | None:
        ...


class MockDashboardRepository:
    build_versions = ["release_5.203", "release_5.202", "release_5.201"]

    def get_dashboard(self, filters: DashboardFilters) -> DashboardResponse:
        build_version = self._build_version(filters)
        tickets = self._tickets_for_release(build_version)
        rows = [
            row.model_copy(update={"hasActiveTicket": row.id in tickets})
            for row in self._rows_for_release(build_version)
        ]

        return DashboardResponse(
            filterOptions=FilterOptions(
                serviceVersions=["dc_2026.05", "dc_2026.04", "dc_2026.03"],
                phoneModels=["Pixel 9 Pro", "Pixel 9", "Pixel 8a", "Galaxy S25"],
                buildVersions=self.build_versions,
            ),
            overview=self._overview_for_release(build_version),
            rows=rows,
        )

    def get_active_ticket(self, atq_id: str, filters: DashboardFilters) -> ActiveTicket | None:
        return self._tickets_for_release(self._build_version(filters)).get(atq_id)

    def _build_version(self, filters: DashboardFilters) -> str:
        if filters.build_version in self.build_versions:
            return filters.build_version

        return self.build_versions[0]

    def _metric(self, label: str, value: str, status: str) -> ResultMetric:
        return ResultMetric(label=label, value=value, status=status)

    def _base_rows(self) -> list[AtqRow]:
        metric = self._metric
        return [
            AtqRow(
                id="atq-9-9",
                code="ATQ 9.9",
                description="L/R Sync - Microseconds",
                domain="Audio",
                target="Classic: 200 LE: 26",
                classic=metric("MAX Shift Audio - 95% Tile", "No Data", "no-data"),
                le=metric("MAX Shift Audio - 95% Tile", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-3",
                code="ATQ 10.3",
                description="Multipoint connection success between LE devices",
                domain="Audio",
                target="99%",
                classic=metric("SUCCESS_RATE", "Not Measured", "neutral"),
                le=metric("SUCCESS_RATE", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-5",
                code="ATQ 10.5",
                description="MP + SASS Off Media_switch_latency - Seconds",
                domain="Audio",
                target="3",
                classic=metric("Result Connectivity 95%", "0.79", "pass"),
                le=metric("Result Connectivity 95%", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-6",
                code="ATQ 10.6",
                description="Multipoint Connection times - Seconds",
                domain="Audio",
                target="7",
                classic=metric("Result Connectivity 95%", "6.77", "pass"),
                le=metric("Result Connectivity 95%", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-7",
                code="ATQ 10.7",
                description="Multipoint Connection time (2 hosts)",
                domain="Audio",
                target="15",
                classic=metric("Result Connectivity 95%", "9.78", "pass"),
                le=metric("Result Connectivity 95%", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-9",
                code="ATQ 10.9",
                description="MP + SASS false positive switching rate",
                domain="Audio",
                target="0.5%",
                classic=metric("100% - SUCCESS_RATE", "0.00%", "pass"),
                le=metric("100% - SUCCESS_RATE", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-10",
                code="ATQ 10.10",
                description="MP + SASS successful switching rate",
                domain="Audio",
                target="99%",
                classic=metric("SUCCESS_RATE", "91.89%", "fail"),
                le=metric("SUCCESS_RATE", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-19",
                code="ATQ 10.19",
                description="Number of glitches per hour in QA tests",
                domain="Audio",
                target="1.40",
                classic=metric("Glitches + GAPs", "No Data", "no-data"),
                le=metric("Glitches + GAPs", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-11-2",
                code="ATQ 11.2",
                description="Reconnect after phone handoff",
                domain="Connectivity",
                target="95%",
                classic=metric("SUCCESS_RATE", "97.22%", "pass"),
                le=metric("SUCCESS_RATE", "96.13%", "pass"),
            ),
            AtqRow(
                id="atq-11-4",
                code="ATQ 11.4",
                description="Device discovery to first stream",
                domain="Connectivity",
                target="4",
                classic=metric("P95 Seconds", "4.81", "fail"),
                le=metric("P95 Seconds", "3.34", "pass"),
            ),
            AtqRow(
                id="atq-12-1",
                code="ATQ 12.1",
                description="Sustained playback battery drift",
                domain="Power",
                target="2.5%",
                classic=metric("Median Drift", "1.8%", "pass"),
                le=metric("Median Drift", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-13-8",
                code="ATQ 13.8",
                description="Pairing prompt retry recovery",
                domain="Pairing",
                target="98%",
                classic=metric("SUCCESS_RATE", "98.10%", "pass"),
                le=metric("SUCCESS_RATE", "94.60%", "fail"),
            ),
        ]

    def _rows_for_release(self, build_version: str) -> list[AtqRow]:
        metric = self._metric
        overrides = {
            "release_5.203": {
                "atq-10-19": {"classic": metric("Glitches + GAPs", "2.05", "fail")},
            },
            "release_5.202": {
                "atq-10-3": {"classic": metric("SUCCESS_RATE", "92.40%", "fail")},
                "atq-10-6": {"classic": metric("Result Connectivity 95%", "7.84", "fail")},
                "atq-10-10": {"classic": metric("SUCCESS_RATE", "99.12%", "pass")},
                "atq-11-4": {"classic": metric("P95 Seconds", "3.92", "pass")},
                "atq-12-1": {"classic": metric("Median Drift", "3.1%", "fail")},
                "atq-13-8": {"le": metric("SUCCESS_RATE", "97.90%", "pass")},
            },
            "release_5.201": {
                "atq-9-9": {"classic": metric("MAX Shift Audio - 95% Tile", "243", "fail")},
                "atq-10-5": {"classic": metric("Result Connectivity 95%", "3.24", "fail")},
                "atq-10-10": {"classic": metric("SUCCESS_RATE", "99.41%", "pass")},
                "atq-11-2": {"le": metric("SUCCESS_RATE", "89.70%", "fail")},
                "atq-11-4": {"classic": metric("P95 Seconds", "3.77", "pass")},
                "atq-13-8": {"le": metric("SUCCESS_RATE", "98.80%", "pass")},
            },
        }
        release_overrides = overrides.get(build_version, {})

        return [
            row.model_copy(update=release_overrides.get(row.id, {}))
            for row in self._base_rows()
        ]

    def _overview_for_release(self, build_version: str) -> Overview:
        rows = self._rows_for_release(build_version)
        return Overview(
            top40=[
                SummaryMetric(label="Classic Pass", value=sum(row.classic.status == "pass" for row in rows)),
                SummaryMetric(label="Classic Fail", value=sum(row.classic.status == "fail" for row in rows)),
                SummaryMetric(label="LE Pass", value=sum(row.le.status == "pass" for row in rows)),
                SummaryMetric(label="LE Fail", value=sum(row.le.status == "fail" for row in rows)),
            ],
            nonTop40=[
                SummaryMetric(label="Classic Pass", value={"release_5.203": 11, "release_5.202": 9, "release_5.201": 13}[build_version]),
                SummaryMetric(label="Classic Fail", value={"release_5.203": 2, "release_5.202": 4, "release_5.201": 1}[build_version]),
                SummaryMetric(label="LE Pass", value={"release_5.203": 0, "release_5.202": 2, "release_5.201": 3}[build_version]),
                SummaryMetric(label="LE Fail", value={"release_5.203": 0, "release_5.202": 1, "release_5.201": 2}[build_version]),
            ],
        )

    def _tickets_for_release(self, build_version: str) -> dict[str, ActiveTicket]:
        common = {
            "atq-9-9": ActiveTicket(
                ticketId="ATQBUG-1842",
                title=f"Investigate missing L/R sync telemetry for {build_version}",
                status="Active",
                owner="audio-runtime",
                queue="Classic Audio",
                updatedAt="18 min ago",
            ),
            "atq-10-3": ActiveTicket(
                ticketId="ATQBUG-1907",
                title="LE multipoint success metric waiting on BigQuery daily partition",
                status="Active",
                owner="le-connectivity",
                queue="LE Metrics",
                updatedAt="32 min ago",
            ),
            "atq-10-10": ActiveTicket(
                ticketId="ATQBUG-1775",
                title="Regression in SASS switching success rate for Pixel 9 Pro",
                status="In Review",
                owner="sass-core",
                queue="Top 40 Failures",
                updatedAt="7 min ago",
            ),
            "atq-11-4": ActiveTicket(
                ticketId="ATQBUG-1931",
                title="Discovery latency exceeds p95 target on cold start",
                status="Active",
                owner="bt-platform",
                queue="Connectivity",
                updatedAt="1 hr ago",
            ),
            "atq-13-8": ActiveTicket(
                ticketId="ATQBUG-1868",
                title="LE pairing retry flow fails after consent dialog timeout",
                status="Active",
                owner="pairing-ui",
                queue="Pairing",
                updatedAt="44 min ago",
            ),
        }

        release_tickets = {
            "release_5.203": common,
            "release_5.202": {
                "atq-10-6": ActiveTicket(
                    ticketId="ATQBUG-2019",
                    title="Multipoint connection time exceeds target on release_5.202",
                    status="Active",
                    owner="bt-platform",
                    queue="Top 40 Failures",
                    updatedAt="12 min ago",
                ),
                "atq-12-1": ActiveTicket(
                    ticketId="ATQBUG-1998",
                    title="Battery drift regression under sustained playback",
                    status="Active",
                    owner="power-audio",
                    queue="Power",
                    updatedAt="28 min ago",
                ),
            },
            "release_5.201": {
                "atq-10-5": ActiveTicket(
                    ticketId="ATQBUG-1655",
                    title="Media switch latency exceeds p95 target on older build",
                    status="In Review",
                    owner="sass-core",
                    queue="Classic Audio",
                    updatedAt="2 hr ago",
                ),
            },
        }

        return release_tickets.get(build_version, common)


class BigQueryDashboardRepository:
    """BigQuery-backed repository.

    Set DATA_SOURCE=bigquery and BQ_ATQ_TABLE=project.dataset.table to enable this path.
    The table is expected to expose dashboard rows plus active ticket columns. Keep the
    mock repository as the local development fallback while the warehouse schema settles.
    """

    def __init__(self) -> None:
        self.table = os.getenv("BQ_ATQ_TABLE", "")
        self.project = os.getenv("BQ_PROJECT_ID") or None
        self._fallback = MockDashboardRepository()

    def get_dashboard(self, filters: DashboardFilters) -> DashboardResponse:
        if not self.table:
            return self._fallback.get_dashboard(filters)

        from google.cloud import bigquery

        client = bigquery.Client(project=self.project)
        query = f"""
            SELECT
              atq_id,
              atq_code,
              description,
              domain,
              target,
              classic_label,
              classic_value,
              classic_status,
              le_label,
              le_value,
              le_status,
              has_active_ticket
            FROM `{self.table}`
            WHERE (@service_version = '' OR service_version = @service_version)
              AND (@phone_model = '' OR phone_model = @phone_model)
              AND (@build_version = '' OR build_version = @build_version)
            ORDER BY sort_order
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("service_version", "STRING", filters.service_version),
                bigquery.ScalarQueryParameter("phone_model", "STRING", filters.phone_model),
                bigquery.ScalarQueryParameter("build_version", "STRING", filters.build_version),
            ]
        )
        rows = [
            AtqRow(
                id=row.atq_id,
                code=row.atq_code,
                description=row.description,
                domain=row.domain,
                target=row.target,
                hasActiveTicket=bool(row.has_active_ticket),
                classic=ResultMetric(label=row.classic_label, value=row.classic_value, status=row.classic_status),
                le=ResultMetric(label=row.le_label, value=row.le_value, status=row.le_status),
            )
            for row in client.query(query, job_config=job_config).result()
        ]

        payload = self._fallback.get_dashboard(filters)
        payload.rows = rows
        return payload

    def get_active_ticket(self, atq_id: str, filters: DashboardFilters) -> ActiveTicket | None:
        if not self.table:
            return self._fallback.get_active_ticket(atq_id, filters)

        from google.cloud import bigquery

        client = bigquery.Client(project=self.project)
        query = f"""
            SELECT
              active_ticket_id,
              active_ticket_title,
              active_ticket_status,
              active_ticket_owner,
              active_ticket_queue,
              active_ticket_updated_at
            FROM `{self.table}`
            WHERE atq_id = @atq_id
              AND (@service_version = '' OR service_version = @service_version)
              AND (@phone_model = '' OR phone_model = @phone_model)
              AND (@build_version = '' OR build_version = @build_version)
              AND active_ticket_id IS NOT NULL
            ORDER BY active_ticket_updated_at DESC
            LIMIT 1
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("atq_id", "STRING", atq_id),
                bigquery.ScalarQueryParameter("service_version", "STRING", filters.service_version),
                bigquery.ScalarQueryParameter("phone_model", "STRING", filters.phone_model),
                bigquery.ScalarQueryParameter("build_version", "STRING", filters.build_version),
            ]
        )
        rows = list(client.query(query, job_config=job_config).result())
        if not rows:
            return None

        row = rows[0]
        return ActiveTicket(
            ticketId=row.active_ticket_id,
            title=row.active_ticket_title,
            status=row.active_ticket_status,
            owner=row.active_ticket_owner,
            queue=row.active_ticket_queue,
            updatedAt=str(row.active_ticket_updated_at),
        )


def create_repository() -> DashboardRepository:
    if os.getenv("DATA_SOURCE", "mock").lower() == "bigquery":
        return BigQueryDashboardRepository()

    return MockDashboardRepository()
