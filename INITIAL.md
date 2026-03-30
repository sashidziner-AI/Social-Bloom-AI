# INITIAL.md - Social Bloom AI Product Definition

> AI-powered platform that automates the complete social media content lifecycle — from idea to publishing — with multi-level approval workflows for teams and agencies.

---

## PRODUCT

### Name
Social Bloom AI

### Description
Social Bloom AI is a micro SaaS platform that automates the complete social media content lifecycle from idea to publishing. Users submit content requirements, which are processed by AI agents to generate captions, descriptions, hashtags, and visual creatives (images, videos, carousels). The system includes a structured workflow where content is reviewed by team leads and approved by managers before moving forward. Once approved, AI generates visual creatives that designers can review or replace if needed. A multi-level approval system ensures both content and design meet brand and business standards. The platform maintains clear status tracking at every stage for transparency and control. After final approval, the system automatically publishes posts across Facebook, LinkedIn, Instagram, and Twitter/X. It logs publishing results and maintains an audit trail for accountability.

### Target User
Content creators, social media marketers, marketing teams, and agencies who need to streamline their social media production workflow with AI automation and team collaboration.

### Type
- [x] SaaS (Software as a Service)

---

## TECH STACK

| Layer | Choice |
|-------|--------|
| Backend | FastAPI + Python 3.11+ |
| Frontend | React + Vite + TypeScript |
| Database | PostgreSQL + SQLAlchemy |
| Auth | Email/Password (JWT-based) |
| UI | Tailwind CSS + shadcn/ui |
| Payments | None (deferred to post-MVP) |

---

## MODULES

### Module 1: Authentication (Required)

**Description:** User authentication, authorization, and role-based access control (RBAC). Supports roles: Admin, Manager, Team Lead, Content Creator, Designer.

**Models:**
```
User:
  - id, email, hashed_password, full_name
  - role (admin/manager/team_lead/creator/designer)
  - avatar_url, is_active, is_verified
  - created_at, updated_at

RefreshToken:
  - id, user_id (FK), token, expires_at, revoked, created_at
```

**Endpoints:**
```
POST /api/v1/auth/register        - Create new account
POST /api/v1/auth/login           - Login with email/password
POST /api/v1/auth/refresh         - Refresh access token
POST /api/v1/auth/logout          - Revoke refresh token
POST /api/v1/auth/forgot-password - Request password reset
POST /api/v1/auth/reset-password  - Reset password with token
GET  /api/v1/auth/me              - Get current user profile
PUT  /api/v1/auth/me              - Update profile
```

**Pages:**
```
/login            - Login page
/register         - Registration page
/forgot-password  - Forgot password page
/reset-password   - Reset password page
/profile          - User profile page (protected)
```

---

### Module 2: Content Requests

**Description:** Users submit content requirements that AI processes to generate captions, descriptions, and hashtags. Each request targets a specific platform and audience.

**Models:**
```
ContentRequest:
  - id, title
  - platform (facebook/linkedin/instagram/twitter)
  - tone (professional/casual/humorous/inspirational/educational)
  - target_audience, topic
  - keywords (JSON array)
  - generated_caption, generated_description
  - generated_hashtags (JSON array)
  - status (draft/pending_review/reviewed/approved/rejected/published)
  - created_by (FK user_id), assigned_to (FK user_id)
  - created_at, updated_at
```

**Endpoints:**
```
POST /api/v1/content-requests              - Create new content request
GET  /api/v1/content-requests              - List (filters: status, platform, created_by)
GET  /api/v1/content-requests/{id}         - Get details
PUT  /api/v1/content-requests/{id}         - Update
DELETE /api/v1/content-requests/{id}       - Delete (draft only)
POST /api/v1/content-requests/{id}/generate    - Trigger AI generation
POST /api/v1/content-requests/{id}/regenerate  - Re-trigger AI generation
PUT  /api/v1/content-requests/{id}/status      - Update status
```

**Pages:**
```
/content-requests          - List view with filters and search
/content-requests/new      - Create new content request form
/content-requests/{id}     - Detail view with generated content preview
/content-requests/{id}/edit - Edit content request
```

---

### Module 3: Creative Generation

**Description:** AI generates visual creatives (images, videos, carousels) linked to content requests. Designers can review AI output and upload replacements if needed.

**Models:**
```
Creative:
  - id, content_request_id (FK)
  - creative_type (image/video/carousel)
  - prompt, ai_generated_url, designer_uploaded_url, final_url
  - status (pending/generating/generated/designer_review/designer_replaced/approved/rejected)
  - notes
  - created_by (FK user_id), reviewed_by (FK user_id)
  - created_at, updated_at

CreativeAsset:
  - id, creative_id (FK)
  - asset_url, asset_type (image/video)
  - order_index, created_at
```

**Endpoints:**
```
POST /api/v1/creatives              - Create creative linked to content request
GET  /api/v1/creatives              - List (filters: status, type, content_request_id)
GET  /api/v1/creatives/{id}         - Get details
PUT  /api/v1/creatives/{id}         - Update
DELETE /api/v1/creatives/{id}       - Delete
POST /api/v1/creatives/{id}/generate - Trigger AI creative generation
POST /api/v1/creatives/{id}/upload   - Designer uploads replacement
PUT  /api/v1/creatives/{id}/status   - Update status
```

**Pages:**
```
/creatives          - Gallery/list view of all creatives
/creatives/{id}     - Detail with side-by-side AI vs designer comparison
/creatives/{id}/review - Designer review page with upload option
```

---

### Module 4: Approval Workflow

**Description:** Two-level approval system. Team Lead reviews content and creatives first, then Manager gives final approval. Supports approval, rejection with comments, and revision requests.

**Models:**
```
Approval:
  - id, entity_type (content_request/creative), entity_id
  - approval_level (team_lead/manager)
  - status (pending/approved/rejected/revision_requested)
  - reviewer_id (FK user_id), comments
  - decided_at, created_at

ApprovalHistory:
  - id, approval_id (FK)
  - action (submitted/approved/rejected/revision_requested)
  - actor_id (FK user_id), comments
  - created_at
```

**Endpoints:**
```
POST /api/v1/approvals                              - Submit item for approval
GET  /api/v1/approvals                              - List pending (filters: level, status, reviewer)
GET  /api/v1/approvals/{id}                         - Get details with history
PUT  /api/v1/approvals/{id}/approve                 - Approve item
PUT  /api/v1/approvals/{id}/reject                  - Reject with comments
PUT  /api/v1/approvals/{id}/request-revision        - Request revision with comments
GET  /api/v1/approvals/history/{entity_type}/{entity_id} - Approval history for entity
```

**Pages:**
```
/approvals      - Approval queue (Team Lead and Manager views)
/approvals/{id} - Approval detail with content/creative preview and actions
```

---

### Module 5: Publishing & Scheduling

**Description:** After final approval, automatically publishes posts to Facebook, LinkedIn, Instagram, and Twitter/X. Supports scheduling and logs all publishing results with audit trail.

**Models:**
```
PublishJob:
  - id, content_request_id (FK), creative_id (FK)
  - platform (facebook/linkedin/instagram/twitter)
  - scheduled_at, published_at
  - status (scheduled/publishing/published/failed/cancelled)
  - platform_post_id, platform_post_url
  - error_message, retry_count
  - created_by (FK user_id)
  - created_at, updated_at

AuditLog:
  - id, entity_type, entity_id
  - action, actor_id (FK user_id)
  - details (JSON), ip_address
  - created_at
```

**Endpoints:**
```
POST /api/v1/publish              - Create publish job (immediate or scheduled)
GET  /api/v1/publish              - List (filters: platform, status, date range)
GET  /api/v1/publish/{id}         - Get details
PUT  /api/v1/publish/{id}/cancel  - Cancel scheduled publish
POST /api/v1/publish/{id}/retry   - Retry failed publish
GET  /api/v1/publish/calendar     - Calendar view of scheduled posts
GET  /api/v1/audit-logs           - Audit trail (admin/manager only)
GET  /api/v1/audit-logs/{entity_type}/{entity_id} - Audit trail for entity
```

**Pages:**
```
/publish          - Publishing dashboard with calendar view
/publish/{id}     - Publish job details with platform response
/publish/schedule - Schedule new publication
/audit-log        - Audit trail viewer (admin/manager)
```

---

### Module 6: Dashboard

**Description:** Overview dashboard with key metrics, recent activity, and quick actions.

**Pages:**
```
/dashboard - Main dashboard with widgets:
  - Content requests by status (chart)
  - Pending approvals count
  - Publishing stats (published/failed/scheduled)
  - Recent activity feed
  - Quick action buttons (new content request, view approvals)

/settings - User settings and preferences
```

---

### Module 7: Admin Panel

**Description:** Admin-only management interface for user management, system settings, and platform statistics.

**Endpoints:**
```
GET  /api/v1/admin/users       - List all users with filters
PUT  /api/v1/admin/users/{id}  - Update user role/status
DELETE /api/v1/admin/users/{id} - Deactivate user
GET  /api/v1/admin/stats       - Platform-wide statistics
GET  /api/v1/admin/settings    - Get system settings
PUT  /api/v1/admin/settings    - Update system settings
```

**Pages:**
```
/admin          - Admin dashboard with platform stats
/admin/users    - User management table
/admin/settings - System settings
```

---

### Module 8: Analytics Dashboard

**Description:** Content performance metrics, publishing analytics, and team productivity reports.

**Models:**
```
Analytics:
  - id, content_request_id (FK), platform
  - impressions, clicks, likes, shares, comments
  - engagement_rate
  - fetched_at, created_at
```

**Endpoints:**
```
GET /api/v1/analytics/overview            - Overall performance metrics
GET /api/v1/analytics/content/{id}        - Performance for specific content
GET /api/v1/analytics/platform/{platform} - Per-platform analytics
GET /api/v1/analytics/team                - Team productivity metrics
GET /api/v1/analytics/export              - Export analytics as CSV
```

**Pages:**
```
/analytics             - Analytics dashboard with charts and filters
/analytics/content/{id} - Content-specific performance
/analytics/team        - Team productivity view
```

---

## MVP SCOPE

### Must Have (MVP)
- [x] User registration and login with role-based access
- [x] Content request creation and AI generation (captions, descriptions, hashtags)
- [x] Creative generation (AI-generated images) linked to content requests
- [x] Two-level approval workflow (Team Lead → Manager) for content and creatives
- [x] Auto-publishing to Facebook, LinkedIn, Instagram, Twitter/X
- [x] Publishing scheduling and calendar view
- [x] Status tracking across all stages
- [x] Audit trail logging
- [x] Main dashboard with key metrics
- [x] File uploads for designer creative replacements

### Nice to Have (Post-MVP)
- [ ] Admin Panel with user management
- [ ] Email notifications for approval requests and status changes
- [ ] Analytics dashboard with platform performance metrics
- [ ] Video and carousel creative generation
- [ ] Bulk content request creation
- [ ] Template library for recurring content types
- [ ] Payment integration for subscription plans
- [ ] Team/workspace management

---

## ACCEPTANCE CRITERIA

### Authentication
- [ ] User can register with email/password
- [ ] User can login and receive JWT access + refresh tokens
- [ ] Roles are enforced: Admin, Manager, Team Lead, Creator, Designer
- [ ] Protected routes redirect to login
- [ ] Password reset flow works end-to-end

### Content Requests
- [ ] User can create a content request with all required fields
- [ ] AI generates caption, description, and hashtags from request
- [ ] User can regenerate AI content with modified parameters
- [ ] Content requests can be filtered by status, platform, and creator
- [ ] Status transitions follow workflow: draft → pending_review → reviewed → approved → published

### Creative Generation
- [ ] Creative is linked to a content request
- [ ] AI generates visual creative based on content and prompt
- [ ] Designer can view AI-generated creative and upload replacement
- [ ] Side-by-side comparison view works correctly
- [ ] Creative status tracks through the review pipeline

### Approval Workflow
- [ ] Team Lead can see pending items and approve/reject/request revision
- [ ] Manager can see Team Lead-approved items and give final approval
- [ ] Rejection includes mandatory comments
- [ ] Full approval history is maintained

### Publishing & Scheduling
- [ ] Approved content can be published immediately or scheduled
- [ ] Publishing works for all 4 platforms
- [ ] Failed publishes can be retried
- [ ] Calendar view shows scheduled posts
- [ ] Audit log captures all publishing events

### Quality
- [ ] All API endpoints documented in OpenAPI/Swagger
- [ ] Backend test coverage 80%+
- [ ] Frontend TypeScript strict mode passes
- [ ] Docker builds and runs successfully
- [ ] All forms have proper validation

---

## SPECIAL REQUIREMENTS

### Security
- [x] Rate limiting on auth endpoints
- [x] Input validation on all endpoints
- [x] SQL injection prevention (SQLAlchemy ORM)
- [x] XSS prevention
- [x] Role-based access control on all protected endpoints
- [x] File upload validation (type, size limits)

### Integrations
- [x] Facebook Graph API for publishing
- [x] LinkedIn API for publishing
- [x] Instagram Graph API for publishing
- [x] Twitter/X API v2 for publishing
- [x] AI service for content generation (OpenAI/Claude API)
- [x] AI service for image generation (DALL-E/Stable Diffusion)
- [x] Email service for notifications (post-MVP)
- [ ] Payment provider (deferred)

---

## AGENTS

> These 6 agents will build your product in parallel:

| Agent | Role | Works On |
|-------|------|----------|
| DATABASE-AGENT | Creates all models and migrations | User, ContentRequest, Creative, Approval, PublishJob, Analytics, AuditLog |
| BACKEND-AGENT | Builds API endpoints and services | All modules' backends + AI integration |
| FRONTEND-AGENT | Creates UI pages and components | All modules' frontends + dashboard |
| DEVOPS-AGENT | Sets up Docker, CI/CD, environments | Infrastructure |
| TEST-AGENT | Writes unit and integration tests | All code |
| REVIEW-AGENT | Security and code quality audit | All code |

---

# READY?

```bash
/generate-prp INITIAL.md
```

Then:

```bash
/execute-prp PRPs/social-bloom-ai-prp.md
```
