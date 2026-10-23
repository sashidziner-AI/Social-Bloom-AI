# PRP: Social Bloom AI

> Implementation blueprint for parallel agent execution

---

## METADATA

| Field | Value |
|-------|-------|
| **Product** | Social Bloom AI |
| **Type** | SaaS |
| **Version** | 1.0 |
| **Created** | 2026-04-01 |
| **Complexity** | High |

---

## PRODUCT OVERVIEW

**Description:** AI-powered platform that automates the complete social media content lifecycle — from idea to publishing — with multi-level approval workflows for teams and agencies. Users submit content requirements, AI generates captions, descriptions, hashtags, and visual creatives. A two-level approval system (Team Lead -> Manager) ensures quality before auto-publishing to Facebook, LinkedIn, Instagram, and Twitter/X.

**Value Proposition:** Eliminates manual content creation bottlenecks by combining AI generation with structured approval workflows, enabling teams to produce and publish social media content 10x faster while maintaining brand quality standards.

**MVP Scope:**
- [ ] User registration and login with role-based access (Admin, Manager, Team Lead, Creator, Designer)
- [ ] Content request creation and AI generation (captions, descriptions, hashtags)
- [ ] Creative generation (AI-generated images) linked to content requests
- [ ] Two-level approval workflow (Team Lead -> Manager) for content and creatives
- [ ] Auto-publishing to Facebook, LinkedIn, Instagram, Twitter/X
- [ ] Publishing scheduling and calendar view
- [ ] Status tracking across all stages
- [ ] Audit trail logging
- [ ] Main dashboard with key metrics
- [ ] File uploads for designer creative replacements

---

## TECH STACK

| Layer | Technology | Skill Reference |
|-------|------------|-----------------|
| Backend | FastAPI + Python 3.11+ | skills/BACKEND.md |
| Frontend | React + TypeScript + Vite | skills/FRONTEND.md |
| Database | PostgreSQL + SQLAlchemy | skills/DATABASE.md |
| Auth | JWT + bcrypt (HS256) | skills/BACKEND.md |
| UI | Tailwind CSS + shadcn/ui | skills/FRONTEND.md |
| Testing | pytest + React Testing Library | skills/TESTING.md |
| Deployment | Docker + GitHub Actions | skills/DEPLOYMENT.md |

---

## DATABASE MODELS

### User Model
```
User:
  - id (PK), email (unique), hashed_password, full_name
  - role (admin/manager/team_lead/creator/designer)
  - avatar_url, is_active, is_verified
  - created_at, updated_at
```

### RefreshToken Model
```
RefreshToken:
  - id (PK), user_id (FK -> User), token (unique)
  - expires_at, revoked
  - created_at
```

### ContentRequest Model
```
ContentRequest:
  - id (PK), title
  - platform (facebook/linkedin/instagram/twitter)
  - tone (professional/casual/humorous/inspirational/educational)
  - target_audience, topic
  - keywords (JSON array)
  - generated_caption, generated_description
  - generated_hashtags (JSON array)
  - status (draft/pending_review/reviewed/approved/rejected/published)
  - created_by (FK -> User), assigned_to (FK -> User)
  - created_at, updated_at
```

### Creative Model
```
Creative:
  - id (PK), content_request_id (FK -> ContentRequest)
  - creative_type (image/video/carousel)
  - prompt, ai_generated_url, designer_uploaded_url, final_url
  - status (pending/generating/generated/designer_review/designer_replaced/approved/rejected)
  - notes
  - created_by (FK -> User), reviewed_by (FK -> User)
  - created_at, updated_at
```

### CreativeAsset Model
```
CreativeAsset:
  - id (PK), creative_id (FK -> Creative)
  - asset_url, asset_type (image/video)
  - order_index
  - created_at
```

### Approval Model
```
Approval:
  - id (PK), entity_type (content_request/creative), entity_id
  - approval_level (team_lead/manager)
  - status (pending/approved/rejected/revision_requested)
  - reviewer_id (FK -> User), comments
  - decided_at, created_at
```

### ApprovalHistory Model
```
ApprovalHistory:
  - id (PK), approval_id (FK -> Approval)
  - action (submitted/approved/rejected/revision_requested)
  - actor_id (FK -> User), comments
  - created_at
```

### PublishJob Model
```
PublishJob:
  - id (PK), content_request_id (FK -> ContentRequest), creative_id (FK -> Creative)
  - platform (facebook/linkedin/instagram/twitter)
  - scheduled_at, published_at
  - status (scheduled/publishing/published/failed/cancelled)
  - platform_post_id, platform_post_url
  - error_message, retry_count
  - created_by (FK -> User)
  - created_at, updated_at
```

### AuditLog Model
```
AuditLog:
  - id (PK), entity_type, entity_id
  - action, actor_id (FK -> User)
  - details (JSON), ip_address
  - created_at
```

### Analytics Model
```
Analytics:
  - id (PK), content_request_id (FK -> ContentRequest), platform
  - impressions, clicks, likes, shares, comments
  - engagement_rate
  - fetched_at, created_at
```

### Relationships
```
User 1--* ContentRequest (created_by)
User 1--* Creative (created_by, reviewed_by)
User 1--* Approval (reviewer_id)
User 1--* PublishJob (created_by)
User 1--* AuditLog (actor_id)
ContentRequest 1--* Creative
ContentRequest 1--* PublishJob
ContentRequest 1--* Analytics
Creative 1--* CreativeAsset
Creative 1--* PublishJob
Approval 1--* ApprovalHistory
```

---

## MODULES

### Module 1: Authentication
**Agents:** DATABASE-AGENT + BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/register | Create new account | Public |
| POST | /api/v1/auth/login | Login with email/password | Public |
| POST | /api/v1/auth/refresh | Refresh access token | Public |
| POST | /api/v1/auth/logout | Revoke refresh token | Required |
| POST | /api/v1/auth/forgot-password | Request password reset | Public |
| POST | /api/v1/auth/reset-password | Reset password with token | Public |
| GET | /api/v1/auth/me | Get current user profile | Required |
| PUT | /api/v1/auth/me | Update profile | Required |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /login | LoginPage | LoginForm, GradientButton, AuthLayout |
| /register | RegisterPage | RegisterForm, RoleSelect, AuthLayout |
| /forgot-password | ForgotPasswordPage | ForgotPasswordForm, AuthLayout |
| /reset-password | ResetPasswordPage | ResetPasswordForm, AuthLayout |
| /profile | ProfilePage | ProfileForm, AvatarUpload, Sidebar |

---

### Module 2: Content Requests
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/content-requests | Create new content request | Creator+ |
| GET | /api/v1/content-requests | List with filters (status, platform, created_by) | Required |
| GET | /api/v1/content-requests/{id} | Get details | Required |
| PUT | /api/v1/content-requests/{id} | Update | Owner/Admin |
| DELETE | /api/v1/content-requests/{id} | Delete (draft only) | Owner/Admin |
| POST | /api/v1/content-requests/{id}/generate | Trigger AI generation | Creator+ |
| POST | /api/v1/content-requests/{id}/regenerate | Re-trigger AI generation | Creator+ |
| PUT | /api/v1/content-requests/{id}/status | Update status | Role-based |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /content-requests | ContentRequestListPage | RequestTable, StatusFilter, PlatformFilter, SearchBar, Pagination |
| /content-requests/new | CreateContentRequestPage | ContentRequestForm, PlatformSelect, ToneSelect, KeywordInput |
| /content-requests/{id} | ContentRequestDetailPage | RequestDetail, GeneratedContentPreview, StatusBadge, ActionButtons |
| /content-requests/{id}/edit | EditContentRequestPage | ContentRequestForm (prefilled) |

---

### Module 3: Creative Generation
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/creatives | Create creative linked to content request | Creator+ |
| GET | /api/v1/creatives | List with filters (status, type, content_request_id) | Required |
| GET | /api/v1/creatives/{id} | Get details | Required |
| PUT | /api/v1/creatives/{id} | Update | Owner/Designer |
| DELETE | /api/v1/creatives/{id} | Delete | Owner/Admin |
| POST | /api/v1/creatives/{id}/generate | Trigger AI creative generation | Creator+ |
| POST | /api/v1/creatives/{id}/upload | Designer uploads replacement | Designer+ |
| PUT | /api/v1/creatives/{id}/status | Update status | Role-based |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /creatives | CreativeGalleryPage | CreativeGrid, CreativeCard, StatusFilter, TypeFilter |
| /creatives/{id} | CreativeDetailPage | CreativePreview, SideBySideComparison, StatusBadge |
| /creatives/{id}/review | CreativeReviewPage | AIPreview, UploadZone, ComparisonSlider, ApproveRejectButtons |

---

### Module 4: Approval Workflow
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/approvals | Submit item for approval | Creator+ |
| GET | /api/v1/approvals | List pending (filters: level, status, reviewer) | TeamLead/Manager |
| GET | /api/v1/approvals/{id} | Get details with history | Required |
| PUT | /api/v1/approvals/{id}/approve | Approve item | TeamLead/Manager |
| PUT | /api/v1/approvals/{id}/reject | Reject with comments (mandatory) | TeamLead/Manager |
| PUT | /api/v1/approvals/{id}/request-revision | Request revision with comments | TeamLead/Manager |
| GET | /api/v1/approvals/history/{entity_type}/{entity_id} | Approval history for entity | Required |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /approvals | ApprovalQueuePage | ApprovalTable, LevelTabs, StatusFilter, PendingCount |
| /approvals/{id} | ApprovalDetailPage | ContentPreview, CreativePreview, ApprovalActions, CommentBox, HistoryTimeline |

---

### Module 5: Publishing & Scheduling
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/publish | Create publish job (immediate or scheduled) | Manager+ |
| GET | /api/v1/publish | List (filters: platform, status, date range) | Required |
| GET | /api/v1/publish/{id} | Get details | Required |
| PUT | /api/v1/publish/{id}/cancel | Cancel scheduled publish | Manager+ |
| POST | /api/v1/publish/{id}/retry | Retry failed publish | Manager+ |
| GET | /api/v1/publish/calendar | Calendar view of scheduled posts | Required |
| GET | /api/v1/audit-logs | Audit trail (admin/manager only) | Admin/Manager |
| GET | /api/v1/audit-logs/{entity_type}/{entity_id} | Audit trail for entity | Admin/Manager |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /publish | PublishDashboardPage | PublishTable, CalendarView, StatusFilter, PlatformFilter |
| /publish/{id} | PublishDetailPage | PublishStatus, PlatformResponse, RetryButton, AuditTrail |
| /publish/schedule | SchedulePublishPage | ScheduleForm, DateTimePicker, PlatformSelect, ContentPreview |
| /audit-log | AuditLogPage | AuditTable, EntityFilter, DateRangeFilter |

---

### Module 6: Dashboard
**Agents:** FRONTEND-AGENT + BACKEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/dashboard/stats | Dashboard statistics | Required |
| GET | /api/v1/dashboard/recent-activity | Recent activity feed | Required |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /dashboard | DashboardPage | StatsCards, ContentByStatusChart, PendingApprovalsWidget, PublishingStatsWidget, RecentActivityFeed, QuickActions |
| /settings | SettingsPage | SettingsForm, NotificationPreferences |

---

### Module 7: Admin Panel
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/admin/users | List all users with filters | Admin |
| PUT | /api/v1/admin/users/{id} | Update user role/status | Admin |
| DELETE | /api/v1/admin/users/{id} | Deactivate user | Admin |
| GET | /api/v1/admin/stats | Platform-wide statistics | Admin |
| GET | /api/v1/admin/settings | Get system settings | Admin |
| PUT | /api/v1/admin/settings | Update system settings | Admin |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /admin | AdminDashboardPage | PlatformStatsCards, UsageCharts, SystemHealth |
| /admin/users | UserManagementPage | UserTable, RoleDropdown, StatusToggle, UserSearch |
| /admin/settings | SystemSettingsPage | SettingsForm, APIKeyManager, PlatformConfig |

---

### Module 8: Analytics Dashboard
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/analytics/overview | Overall performance metrics | Required |
| GET | /api/v1/analytics/content/{id} | Performance for specific content | Required |
| GET | /api/v1/analytics/platform/{platform} | Per-platform analytics | Required |
| GET | /api/v1/analytics/team | Team productivity metrics | Manager+ |
| GET | /api/v1/analytics/export | Export analytics as CSV | Manager+ |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /analytics | AnalyticsDashboardPage | OverviewCards, EngagementChart, PlatformComparison, DateRangeFilter |
| /analytics/content/{id} | ContentAnalyticsPage | ContentPerformanceChart, MetricsTable, PlatformBreakdown |
| /analytics/team | TeamProductivityPage | TeamTable, ProductivityChart, MemberComparison |

---

## PHASE EXECUTION PLAN

### Phase 1: Foundation (4 agents in parallel)

```yaml
DATABASE-AGENT:
  tasks:
    - Create all SQLAlchemy models (User, ContentRequest, Creative, CreativeAsset, Approval, ApprovalHistory, PublishJob, AuditLog, Analytics)
    - Setup Alembic with initial migration
    - Create database.py with session management
    - Seed data scripts for development
  skill: skills/DATABASE.md
  outputs:
    - backend/app/models/*.py
    - backend/app/database.py
    - backend/alembic/versions/001_initial_schema.py
    - backend/seed_users.py

BACKEND-AGENT:
  tasks:
    - Setup FastAPI main.py with CORS, middleware, routers
    - Create config.py with environment variable loading
    - Setup project structure (routers/, services/, schemas/, auth/)
    - Create base schemas and utilities
  skill: skills/BACKEND.md
  outputs:
    - backend/app/main.py
    - backend/app/config.py
    - backend/requirements.txt

FRONTEND-AGENT:
  tasks:
    - Initialize Vite + React + TypeScript project
    - Setup Tailwind CSS + shadcn/ui
    - Create folder structure (components/, pages/, hooks/, services/, context/, types/)
    - Build base layout components (Sidebar, Header, AuthLayout)
    - Setup React Router with route guards
    - Create API service layer with Axios interceptors
  skill: skills/FRONTEND.md
  outputs:
    - frontend/src/App.tsx
    - frontend/src/components/layout/*
    - frontend/src/context/AuthContext.tsx
    - frontend/src/services/api.ts

DEVOPS-AGENT:
  tasks:
    - Create Dockerfile for backend and frontend
    - Create docker-compose.yml (app + postgres + redis)
    - Setup .env.example files
    - Create GitHub Actions CI/CD pipeline
  skill: skills/DEPLOYMENT.md
  outputs:
    - Dockerfile (backend + frontend)
    - docker-compose.yml
    - .github/workflows/ci.yml
    - .env.example
```

**Validation Gate 1:**
```bash
pip install -r backend/requirements.txt
alembic upgrade head
cd frontend && npm install
docker-compose config
```

---

### Phase 2: Core Modules (backend + frontend parallel per module)

**Phase 2A: Authentication Module**
```yaml
BACKEND-AGENT:
  tasks:
    - JWT token generation and validation
    - Password hashing with bcrypt
    - Auth router (register, login, refresh, logout, forgot/reset password)
    - Auth middleware and dependencies
    - Role-based access control decorators
  outputs:
    - backend/app/auth/jwt.py
    - backend/app/auth/dependencies.py
    - backend/app/routers/auth.py
    - backend/app/schemas/auth.py
    - backend/app/services/auth_service.py

FRONTEND-AGENT:
  tasks:
    - Login page with form validation
    - Register page with role selection
    - Forgot/reset password pages
    - AuthContext with token management
    - Protected route wrapper
    - Profile page
  outputs:
    - frontend/src/pages/auth/*
    - frontend/src/context/AuthContext.tsx
    - frontend/src/components/auth/*
```

**Phase 2B: Content Requests Module**
```yaml
BACKEND-AGENT:
  tasks:
    - Content request CRUD endpoints
    - AI generation service (captions, descriptions, hashtags)
    - Status transition logic with validation
    - Filtering and pagination
  outputs:
    - backend/app/routers/content_requests.py
    - backend/app/schemas/content_request.py
    - backend/app/services/content_service.py
    - backend/app/services/ai_service.py

FRONTEND-AGENT:
  tasks:
    - Content request list page with filters
    - Create/edit content request forms
    - Detail page with generated content preview
    - AI generation trigger with loading states
  outputs:
    - frontend/src/pages/content-requests/*
    - frontend/src/components/content/*
    - frontend/src/hooks/useContentRequests.ts
    - frontend/src/services/contentService.ts
```

**Phase 2C: Creative Generation Module**
```yaml
BACKEND-AGENT:
  tasks:
    - Creative CRUD endpoints
    - AI image generation service integration
    - File upload handling with validation (type + size)
    - Designer review workflow
  outputs:
    - backend/app/routers/creatives.py
    - backend/app/schemas/creative.py
    - backend/app/services/creative_service.py
    - backend/app/services/image_generation_service.py

FRONTEND-AGENT:
  tasks:
    - Creative gallery page
    - Creative detail with side-by-side comparison
    - Designer review page with upload
    - Image upload component with drag-and-drop
  outputs:
    - frontend/src/pages/creatives/*
    - frontend/src/components/creatives/*
    - frontend/src/hooks/useCreatives.ts
    - frontend/src/services/creativeService.ts
```

**Phase 2D: Approval Workflow Module**
```yaml
BACKEND-AGENT:
  tasks:
    - Approval submission and review endpoints
    - Two-level approval logic (team_lead -> manager)
    - Mandatory rejection comments enforcement
    - Approval history tracking
  outputs:
    - backend/app/routers/approvals.py
    - backend/app/schemas/approval.py
    - backend/app/services/approval_service.py

FRONTEND-AGENT:
  tasks:
    - Approval queue page with level tabs
    - Approval detail page with content/creative preview
    - Approve/reject/revision actions with comment modal
    - Approval history timeline
  outputs:
    - frontend/src/pages/approvals/*
    - frontend/src/components/approvals/*
    - frontend/src/hooks/useApprovals.ts
    - frontend/src/services/approvalService.ts
```

**Phase 2E: Publishing & Scheduling Module**
```yaml
BACKEND-AGENT:
  tasks:
    - Publishing endpoints (create, cancel, retry)
    - Platform adapter pattern (Facebook, LinkedIn, Instagram, Twitter)
    - Scheduling with background task execution
    - Retry with exponential backoff
    - Audit log service
  outputs:
    - backend/app/routers/publish.py
    - backend/app/schemas/publish.py
    - backend/app/services/publish_service.py
    - backend/app/services/platform_adapters.py
    - backend/app/services/audit_service.py

FRONTEND-AGENT:
  tasks:
    - Publishing dashboard with table and calendar
    - Publish detail page with platform response
    - Schedule form with date/time picker
    - Audit log viewer
  outputs:
    - frontend/src/pages/publish/*
    - frontend/src/components/publish/*
    - frontend/src/hooks/usePublish.ts
    - frontend/src/services/publishService.ts
```

**Phase 2F: Dashboard Module**
```yaml
BACKEND-AGENT:
  tasks:
    - Dashboard stats endpoint (aggregate queries)
    - Recent activity feed endpoint
  outputs:
    - backend/app/routers/dashboard.py
    - backend/app/schemas/dashboard.py
    - backend/app/services/dashboard_service.py

FRONTEND-AGENT:
  tasks:
    - Dashboard page with stat cards and charts
    - Content by status chart (recharts)
    - Recent activity feed
    - Quick action buttons
  outputs:
    - frontend/src/pages/DashboardPage.tsx
    - frontend/src/components/dashboard/*
    - frontend/src/hooks/useDashboard.ts
```

**Validation Gate 2:**
```bash
ruff check backend/
cd frontend && npm run lint
cd frontend && npm run type-check
```

---

### Phase 3: Post-MVP Modules

**Phase 3A: Admin Panel**
```yaml
BACKEND-AGENT:
  outputs:
    - backend/app/routers/admin.py
    - backend/app/schemas/admin.py
    - backend/app/services/admin_service.py

FRONTEND-AGENT:
  outputs:
    - frontend/src/pages/admin/*
    - frontend/src/components/admin/*
```

**Phase 3B: Analytics Dashboard**
```yaml
BACKEND-AGENT:
  outputs:
    - backend/app/routers/analytics.py
    - backend/app/schemas/analytics.py
    - backend/app/services/analytics_service.py

FRONTEND-AGENT:
  outputs:
    - frontend/src/pages/analytics/*
    - frontend/src/components/analytics/*
```

---

### Phase 4: Quality (3 agents in parallel)

```yaml
TEST-AGENT:
  tasks:
    - Backend unit tests (pytest) for all services
    - Backend integration tests for all API endpoints
    - Frontend unit tests (React Testing Library) for components
    - Frontend integration tests for pages
    - Target 80%+ coverage
  skill: skills/TESTING.md
  outputs:
    - backend/tests/test_auth.py
    - backend/tests/test_content_requests.py
    - backend/tests/test_creatives.py
    - backend/tests/test_approvals.py
    - backend/tests/test_publish.py
    - frontend/src/__tests__/*

REVIEW-AGENT:
  tasks:
    - Security audit (OWASP top 10)
    - SQL injection prevention check
    - XSS prevention check
    - Auth/RBAC verification
    - Input validation completeness
    - Performance review (N+1 queries, pagination)
  outputs:
    - Review report with findings and fixes

DEVOPS-AGENT:
  tasks:
    - Final Docker build verification
    - CI/CD pipeline test
    - Environment variable documentation
    - Health check endpoints
  outputs:
    - Updated docker-compose.yml
    - CI pipeline passing
```

**Validation Gate 3:**
```bash
pytest backend/tests -v --cov --cov-fail-under=80
cd frontend && npm test
```

**Final Validation:**
```bash
docker-compose build
docker-compose up -d
curl http://localhost:8000/health
curl http://localhost:8000/docs
cd frontend && npm run build
```

---

## VALIDATION GATES

| Gate | Phase | Commands |
|------|-------|----------|
| 1 | Foundation | `pip install -r requirements.txt`, `alembic upgrade head`, `npm install`, `docker-compose config` |
| 2 | Modules | `ruff check backend/`, `npm run lint`, `npm run type-check` |
| 3 | Quality | `pytest --cov --cov-fail-under=80`, `npm test` |
| Final | Release | `docker-compose up -d`, `curl localhost:8000/health`, `npm run build` |

---

## ENVIRONMENT VARIABLES

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

## AGENT ASSIGNMENTS SUMMARY

| Agent | Models | Endpoints | Pages | Tests |
|-------|--------|-----------|-------|-------|
| DATABASE-AGENT | 9 models | - | - | - |
| BACKEND-AGENT | - | 42 endpoints | - | - |
| FRONTEND-AGENT | - | - | 24 pages | - |
| DEVOPS-AGENT | - | - | - | CI/CD |
| TEST-AGENT | - | - | - | All modules |
| REVIEW-AGENT | - | - | - | Security audit |

---

## NEXT STEP

Execute with parallel agents:
```bash
/execute-prp PRPs/social-bloom-ai-prp.md
```
