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
    TicketBundle,
)


class DashboardRepository(Protocol):
    def get_dashboard(self, filters: DashboardFilters) -> DashboardResponse:
        ...

    def get_active_ticket(self, atq_id: str, filters: DashboardFilters) -> ActiveTicket | None:
        ...

    def get_ticket_bundle(self, atq_id: str, filters: DashboardFilters) -> TicketBundle:
        ...


class MockDashboardRepository:
    build_versions = ["release_5.203", "release_5.202", "release_5.201"]

    def get_dashboard(self, filters: DashboardFilters) -> DashboardResponse:
        build_version = self._build_version(filters)
        child_tickets = self._child_tickets_for_release(build_version)
        rows = [
            row.model_copy(update={
                "hasActiveTicket": row.id in child_tickets,
                "hasChildTicket": row.id in child_tickets,
            })
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
        return self._child_tickets_for_release(self._build_version(filters)).get(atq_id)

    def get_ticket_bundle(self, atq_id: str, filters: DashboardFilters) -> TicketBundle:
        build_version = self._build_version(filters)
        row = next((item for item in self._rows_for_release(build_version) if item.id == atq_id), None)
        if row is None:
            row = next(item for item in self._base_rows() if item.id == atq_id)

        return TicketBundle(
            masterTicket=self._master_ticket_for_row(row, build_version),
            childTicket=self._child_tickets_for_release(build_version).get(atq_id),
        )

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
                atqExplanation="Measures left/right audio synchronization drift. Large values can cause stereo image shift or audible echo.",
                domain="Audio",
                target="Classic: 200 LE: 26",
                targetExplanation="Classic passes when the 95th percentile shift is at or below 200 microseconds. LE uses a stricter 26 microsecond target.",
                classic=metric("MAX Shift Audio - 95% Tile", "No Data", "no-data"),
                le=metric("MAX Shift Audio - 95% Tile", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-3",
                code="ATQ 10.3",
                description="Multipoint connection success between LE devices",
                atqExplanation="Checks whether two LE devices can complete multipoint connection flows without dropping the active session.",
                domain="Audio",
                target="99%",
                targetExplanation="Success rate should be at least 99% across the selected build, model, and service version.",
                classic=metric("SUCCESS_RATE", "Not Measured", "neutral"),
                le=metric("SUCCESS_RATE", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-5",
                code="ATQ 10.5",
                description="MP + SASS Off Media_switch_latency - Seconds",
                atqExplanation="Measures media switch latency when multipoint is enabled and SASS is disabled.",
                domain="Audio",
                target="3",
                targetExplanation="The 95th percentile media switch latency should be 3 seconds or less.",
                classic=metric("Result Connectivity 95%", "0.79", "pass"),
                le=metric("Result Connectivity 95%", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-6",
                code="ATQ 10.6",
                description="Multipoint Connection times - Seconds",
                atqExplanation="Tracks how long multipoint connection setup takes during repeated connection attempts.",
                domain="Audio",
                target="7",
                targetExplanation="The 95th percentile connection setup time should be 7 seconds or less.",
                classic=metric("Result Connectivity 95%", "6.77", "pass"),
                le=metric("Result Connectivity 95%", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-7",
                code="ATQ 10.7",
                description="Multipoint Connection time (2 hosts)",
                atqExplanation="Measures the end-to-end connection time when two host devices participate in a multipoint scenario.",
                domain="Audio",
                target="15",
                targetExplanation="The multipoint two-host connection flow should complete within 15 seconds.",
                classic=metric("Result Connectivity 95%", "9.78", "pass"),
                le=metric("Result Connectivity 95%", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-9",
                code="ATQ 10.9",
                description="MP + SASS false positive switching rate",
                atqExplanation="Measures how often switching is triggered when it should not happen.",
                domain="Audio",
                target="0.5%",
                targetExplanation="False positive switching should remain at or below 0.5% of attempts.",
                classic=metric("100% - SUCCESS_RATE", "0.00%", "pass"),
                le=metric("100% - SUCCESS_RATE", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-10",
                code="ATQ 10.10",
                description="MP + SASS successful switching rate",
                atqExplanation="Measures whether SASS chooses and switches to the expected active audio source.",
                domain="Audio",
                target="99%",
                targetExplanation="Successful switching should reach at least 99% for this release slice.",
                classic=metric("SUCCESS_RATE", "91.89%", "fail"),
                le=metric("SUCCESS_RATE", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-10-19",
                code="ATQ 10.19",
                description="Number of glitches per hour in QA tests",
                atqExplanation="Counts audible glitch events observed during long-running QA playback tests.",
                domain="Audio",
                target="1.40",
                targetExplanation="The glitch rate should stay at or below 1.40 events per hour.",
                classic=metric("Glitches + GAPs", "No Data", "no-data"),
                le=metric("Glitches + GAPs", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-11-2",
                code="ATQ 11.2",
                description="Reconnect after phone handoff",
                atqExplanation="Validates reconnect reliability after audio ownership moves from one phone to another.",
                domain="Connectivity",
                target="95%",
                targetExplanation="At least 95% of reconnect attempts should complete successfully.",
                classic=metric("SUCCESS_RATE", "97.22%", "pass"),
                le=metric("SUCCESS_RATE", "96.13%", "pass"),
            ),
            AtqRow(
                id="atq-11-4",
                code="ATQ 11.4",
                description="Device discovery to first stream",
                atqExplanation="Measures the latency from device discovery to the first usable audio stream.",
                domain="Connectivity",
                target="4",
                targetExplanation="The 95th percentile discovery-to-stream time should be 4 seconds or less.",
                classic=metric("P95 Seconds", "4.81", "fail"),
                le=metric("P95 Seconds", "3.34", "pass"),
            ),
            AtqRow(
                id="atq-12-1",
                code="ATQ 12.1",
                description="Sustained playback battery drift",
                atqExplanation="Checks battery percentage drift during sustained playback sessions.",
                domain="Power",
                target="2.5%",
                targetExplanation="Median battery drift should stay at or below 2.5% for the test window.",
                classic=metric("Median Drift", "1.8%", "pass"),
                le=metric("Median Drift", "No Data", "no-data"),
            ),
            AtqRow(
                id="atq-13-8",
                code="ATQ 13.8",
                description="Pairing prompt retry recovery",
                atqExplanation="Verifies that pairing can recover after a prompt timeout or retry path.",
                domain="Pairing",
                target="98%",
                targetExplanation="Retry recovery should succeed at least 98% of the time.",
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

    def _master_ticket_for_row(self, row: AtqRow, build_version: str) -> ActiveTicket:
        ticket_suffix = row.code.replace("ATQ ", "").replace(".", "")
        owner_by_domain = {
            "Audio": "audio-runtime",
            "Connectivity": "bt-platform",
            "Pairing": "pairing-ui",
            "Power": "power-audio",
        }

        return ActiveTicket(
            ticketId=f"ATQMASTER-{ticket_suffix}",
            title=f"{row.code} {build_version} certification tracking",
            status="Open",
            owner=owner_by_domain.get(row.domain, "atq-triage"),
            queue=f"{row.domain} ATQ",
            updatedAt="Today",
        )

    def _child_tickets_for_release(self, build_version: str) -> dict[str, ActiveTicket]:
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
              atq_explanation,
              domain,
              target,
              target_explanation,
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
                atqExplanation=row.atq_explanation,
                domain=row.domain,
                target=row.target,
                targetExplanation=row.target_explanation,
                hasActiveTicket=bool(row.has_active_ticket),
                hasChildTicket=bool(row.has_active_ticket),
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

    def get_ticket_bundle(self, atq_id: str, filters: DashboardFilters) -> TicketBundle:
        if not self.table:
            return self._fallback.get_ticket_bundle(atq_id, filters)

        payload = self.get_dashboard(filters)
        row = next((item for item in payload.rows if item.id == atq_id), None)
        if row is None:
            return self._fallback.get_ticket_bundle(atq_id, filters)

        return TicketBundle(
            masterTicket=self._fallback._master_ticket_for_row(row, self._fallback._build_version(filters)),
            childTicket=self.get_active_ticket(atq_id, filters),
        )


def create_repository() -> DashboardRepository:
    if os.getenv("DATA_SOURCE", "mock").lower() == "bigquery":
        return BigQueryDashboardRepository()

    return MockDashboardRepository()
