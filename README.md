# Floating ATQ Dashboard

Angular + FastAPI shell for an ATQ dashboard with a BigQuery-ready backend data layer.

## Project Layout

- `frontend/` - Angular dashboard UI
- `backend/` - FastAPI API with mock data by default

## Run Locally

Start the API:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the Angular app:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

## Current API

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/atqs/{atq_id}/active-ticket`
- `GET /api/atqs/{atq_id}/tickets`

The frontend calls the ticket bundle endpoint when opening a tooltip. Every tooltip can show the ATQ's master ticket plus an optional child ticket.
The first table column labels each row's domain. ATQ and Target cells show explanatory tooltips; Classic and LE result cells show ticket context for the selected KPI.

Rows are sorted client-side by action priority:

1. failing ATQs with no child ticket
2. failing ATQs with a child ticket already active
3. ATQs with no data
4. non-failing rows

The mock API returns different results, master tickets, and child tickets for each build version so the sorting behavior can be tested locally.

## BigQuery Hook

The backend uses mock data unless BigQuery mode is enabled:

```bash
DATA_SOURCE=bigquery
BQ_PROJECT_ID=your-gcp-project
BQ_ATQ_TABLE=project.dataset.table
```

The expected table shape is documented in `backend/app/repository.py`. Adjust the SQL there once the final warehouse schema is confirmed.
