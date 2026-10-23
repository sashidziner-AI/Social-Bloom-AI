# Social Bloom AI

AI-powered platform that automates the social media content lifecycle — from idea to publishing — with multi-level approval workflows for teams and agencies managing multiple client companies.

## What it does

- **Content requests**: creators draft content requests per company/platform, which move through a status workflow (`draft → pending_review → reviewed → approved → published`).
- **AI creative generation**: generates image/video/carousel creatives per content request, with designer review and manual replacement/editing.
- **Multi-level approvals**: team lead → manager approval chain, with mandatory comments on rejection and a full approval history.
- **Publishing**: schedules and publishes approved content to connected social platforms (Facebook, LinkedIn, Instagram, Twitter), with retry/backoff on failure and an audit log of every publish action.
- **Companies**: supports multiple client companies/brands, each with its own platform credentials (e.g. LinkedIn organization) and content templates.
- **Analytics**: content- and team-level performance views.
- **Admin & RBAC**: role-based permissions (Admin, Manager, Team Lead, Creator, Designer) with per-role and per-user permission overrides.

## Tech stack

- **Backend**: FastAPI + Python, SQLAlchemy + Alembic, PostgreSQL
- **Frontend**: React + Vite + TypeScript, Tailwind CSS + shadcn/ui
- **Auth**: JWT (access + refresh tokens)

## Project structure

```
backend/
  app/
    models/       # SQLAlchemy models (users, companies, content requests, creatives, approvals, publish jobs, analytics, audit log)
    routers/       # FastAPI endpoints (auth, companies, content_requests, creatives, approvals, publish, analytics, admin, audit_logs)
    services/      # business logic + AI/platform integrations
    schemas/       # Pydantic request/response schemas
  alembic/         # DB migrations
  tests/

frontend/
  src/
    pages/         # content requests, creatives, approvals, publish, analytics, companies, admin, settings
    hooks/         # data-fetching hooks per resource
    services/      # API clients
    components/
```

## Running locally

```bash
# Backend (from backend/)
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (from frontend/)
npm install
npm run dev
```

The frontend dev server proxies `/api` and `/uploads` to the backend. See `backend/.env.example` for required environment variables (database, JWT secret, AI provider keys, social platform credentials).

## Testing

```bash
pytest backend/tests -v
cd frontend && npm test
```
