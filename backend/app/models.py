from typing import Literal

from pydantic import BaseModel


ResultStatus = Literal["pass", "fail", "no-data", "neutral"]


class DashboardFilters(BaseModel):
    service_version: str = ""
    phone_model: str = ""
    build_version: str = "release_5.203"


class SummaryMetric(BaseModel):
    label: str
    value: int


class ResultMetric(BaseModel):
    label: str
    value: str
    status: ResultStatus


class AtqRow(BaseModel):
    id: str
    code: str
    description: str
    domain: str
    target: str
    classic: ResultMetric
    le: ResultMetric


class FilterOptions(BaseModel):
    serviceVersions: list[str]
    phoneModels: list[str]
    buildVersions: list[str]


class Overview(BaseModel):
    top40: list[SummaryMetric]
    nonTop40: list[SummaryMetric]


class DashboardResponse(BaseModel):
    filterOptions: FilterOptions
    overview: Overview
    rows: list[AtqRow]


class ActiveTicket(BaseModel):
    ticketId: str
    title: str
    status: str
    owner: str
    queue: str
    updatedAt: str
