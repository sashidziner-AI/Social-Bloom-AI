---
name: repo-review
description: >
  Review recent changes in the repository — identify what changed, summarize diffs, flag potential issues,
  and provide a structured changelog. Use this skill whenever the user asks to review changes, see what's new,
  understand recent commits, get a repo changelog, audit recent work, or wants a summary of what happened
  in the codebase. Also trigger when the user says things like "what changed", "review the repo",
  "summarize recent work", "show me what's different", or "catch me up on the codebase".
---

# Repo Review Skill

Review and summarize recent changes in the repository with structured, actionable output.

## When to Use

- User wants to understand what changed recently
- User asks for a code review of recent commits
- User wants a changelog or summary of work done
- User needs to catch up on codebase changes after being away
- User wants to audit recent modifications for quality, security, or completeness

## Workflow

### Step 1: Gather Change Context

Run these git commands to understand the scope of changes:

```bash
# Recent commit history with stats
git log --oneline --stat -N  # where N = number of commits to review (default: 10)

# For a specific range, use:
git log --oneline --stat <from>..<to>

# Show authors and frequency
git shortlog -sn --no-merges -N

# Files changed with diff summary
git diff <base>..HEAD --stat
```

If the user specifies a time range, commit range, or number of commits, use that. Otherwise default to the last 10 commits or since the last tag.

### Step 2: Categorize Changes

Group changed files into these categories:

| Category | Patterns |
|----------|----------|
| **Backend API** | `backend/app/routers/`, `backend/app/schemas/` |
| **Backend Services** | `backend/app/services/` |
| **Database/Models** | `backend/app/models/`, `backend/alembic/` |
| **Auth & Security** | `backend/app/auth/`, `backend/app/permissions.py`, `backend/app/dependencies.py` |
| **Frontend Pages** | `frontend/src/pages/` |
| **Frontend Components** | `frontend/src/components/` |
| **Frontend Services** | `frontend/src/services/`, `frontend/src/hooks/` |
| **Tests** | `backend/tests/`, `frontend/src/test/` |
| **DevOps/Config** | `docker-compose*`, `Dockerfile`, `.github/`, `*.yml`, `*.ini` |
| **Documentation** | `*.md`, `CLAUDE.md`, `INITIAL.md` |

### Step 3: Produce the Review

Output a structured review with these sections:

#### 3a. Overview
- Commit range reviewed (hashes, dates, authors)
- Total files changed, lines added/removed
- One-paragraph executive summary

#### 3b. Changes by Category
For each category with changes:
- List key files modified
- Summarize what changed and why (read the diffs for non-trivial changes)
- Note any new modules, endpoints, or features introduced

#### 3c. Potential Issues (Flag if Found)
Scan for these patterns in the diff:

- **Security**: hardcoded secrets, missing auth checks, SQL injection vectors, `print()` in backend code
- **Quality**: `any` types in TypeScript, `console.log` in production code, inline styles instead of Tailwind
- **Missing tests**: new endpoints or services without corresponding test files
- **Config concerns**: sensitive values in committed files, missing `.env.example` entries
- **Breaking changes**: removed or renamed public API endpoints, changed DB schemas without migrations

For each issue found, cite the file and line, explain the concern, and suggest a fix.

#### 3d. Stats Summary
```
Commits:      X
Files changed: Y
Insertions:   +Z
Deletions:    -W
Authors:      [list]
```

### Step 4: Offer Follow-up Actions

After the review, suggest relevant next steps:
- "Want me to look deeper into any specific area?"
- "Should I run the tests to verify these changes?"
- "Want me to check for any missing test coverage?"
- "Should I review the API endpoints for consistency?"

## Customization

The user can narrow the review scope:
- **By area**: "review only backend changes"
- **By time**: "review changes from last week"
- **By commit**: "review commits abc123..def456"
- **By author**: "review what alice committed"
- **By focus**: "review for security issues only"

Adapt the output to match the requested scope — skip irrelevant categories and focus the issue scan accordingly.

## Output Format

Use markdown with clear headers. Keep summaries concise but include enough detail to be actionable. Use tables for structured data. Link to specific files with `file_path:line_number` format when flagging issues.
