# CLAUDE.md - Social Bloom AI Project Rules

> Project-specific rules for Claude Code. This file is read automatically.

---

## Project Overview

**Project Name:** Social Bloom AI
**Description:** AI-powered platform that automates the complete social media content lifecycle — from idea to publishing — with multi-level approval workflows for teams and agencies.
**Tech Stack:**
- Backend: FastAPI + Python 3.11+
- Frontend: React + Vite + TypeScript
- Database: PostgreSQL + SQLAlchemy
- Auth: Email/Password (JWT-based)all
- UI: Tailwind CSS + shadcn/ui

---

## Project Structure

```
social-bloom-ai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── content_request.py
│   │   │   ├── creative.py
│   │   │   ├── approval.py
│   │   │   ├── publish_job.py
│   │   │   ├── analytics.py
│   │   │   └── audit_log.py
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   └── auth/
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   └── types/
│   └── package.json
├── .claude/
│   └── commands/
├── skills/
├── agents/
└── PRPs/
```

---

## Code Standards

### Python (Backend)
```python
# ALWAYS use type hints
def get_content_request(db: Session, request_id: int) -> ContentRequest:
    pass

# ALWAYS use async endpoints
@router.get("/content-requests/{id}")
async def get_content_request(id: int, db: Session = Depends(get_db)):
    pass
```

### TypeScript (Frontend)
```typescript
// ALWAYS define interfaces for props and data
interface ContentRequest {
  id: number;
  title: string;
  platform: "facebook" | "linkedin" | "instagram" | "twitter";
  status: "draft" | "pending_review" | "reviewed" | "approved" | "rejected" | "published";
}

// NO any types allowed
const fetchContentRequests = async (): Promise<ContentRequest[]> => {
  // ...
};
```

---

## Forbidden Patterns

### Backend
- `print()` → use `logging` module
- Plain text passwords → use bcrypt
- Hardcoded secrets → use environment variables
- `SELECT *` → specify columns
- Skipping input validation

### Frontend
- `any` type in TypeScript
- `console.log` in production
- Inline styles → use Tailwind CSS
- Skipping error handling in async operations

---

## Module-Specific Rules

### Content Requests
- All content requests must belong to a user (created_by FK)
- Status must be one of: draft, pending_review, reviewed, approved, rejected, published
- Status transitions must follow the workflow: draft → pending_review → reviewed → approved → published
- AI generation endpoints must be idempotent

### Creative Generation
- Every creative must be linked to a content_request_id
- creative_type must be one of: image, video, carousel
- Status must be one of: pending, generating, generated, designer_review, designer_replaced, approved, rejected
- File uploads must validate type (image/video) and enforce size limits

### Approval Workflow
- Two approval levels: team_lead → manager
- Rejection requires mandatory comments
- All approval actions must be logged in ApprovalHistory
- Only users with team_lead or manager role can approve

### Publishing
- All publish actions must be logged in AuditLog
- Failed publishes must support retry with exponential backoff
- Platform API credentials must be stored securely (env vars)

---

## API Conventions

- All endpoints prefixed with `/api/v1/`
- Use plural nouns for resources: `/content-requests`, `/creatives`, `/approvals`
- Return appropriate HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad Request
  - 401: Unauthorized
  - 403: Forbidden (wrong role)
  - 404: Not Found
  - 409: Conflict

---

## Authentication & RBAC

### JWT Configuration
- Access token expires: 30 minutes
- Refresh token expires: 7 days
- Algorithm: HS256

### Roles
| Role | Permissions |
|------|-------------|
| Admin | Full access, user management, system settings |
| Manager | Final approval, view all content, publish |
| Team Lead | First-level approval, manage team content |
| Creator | Create/edit content requests, view own content |
| Designer | Review/replace creatives, upload assets |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/social_bloom_ai

# Auth
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Services
OPENAI_API_KEY=sk-...
# or ANTHROPIC_API_KEY=sk-ant-...

# Social Platform APIs
FACEBOOK_ACCESS_TOKEN=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
INSTAGRAM_ACCESS_TOKEN=...
TWITTER_API_KEY=...
TWITTER_API_SECRET=...

# File Storage
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=50

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Docker
docker-compose up -d

# Tests
pytest backend/tests -v
cd frontend && npm test

# Linting
ruff check backend/
cd frontend && npm run lint
```

---

## Validation

```bash
ruff check backend/ && pytest
npm run lint && npm run type-check
docker-compose build
```

---

## Commit Message Format

```
feat(content): add AI caption generation endpoint
fix(approval): fix team lead approval permission check
refactor(publish): extract platform adapter pattern
test(creative): add upload validation tests
docs: update API documentation
```

---

## Skills Reference

| Task | Skill |
|------|-------|
| Database models | skills/DATABASE.md |
| API + Auth | skills/BACKEND.md |
| React + UI | skills/FRONTEND.md |
| Testing | skills/TESTING.md |
| Deployment | skills/DEPLOYMENT.md |

---

## Agents

| Agent | Role |
|-------|------|
| DATABASE-AGENT | Models + migrations |
| BACKEND-AGENT | API + auth + AI integration |
| FRONTEND-AGENT | UI + pages + components |
| DEVOPS-AGENT | Docker + CI/CD |
| TEST-AGENT | Unit + integration tests |
| REVIEW-AGENT | Security + code quality |

---

## Workflow

```
1. Edit INITIAL.md (define product)
2. /generate-prp INITIAL.md
3. /execute-prp PRPs/social-bloom-ai-prp.md
```
