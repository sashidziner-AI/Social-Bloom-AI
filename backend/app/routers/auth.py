import logging
import secrets
import urllib.parse

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.auth import RefreshTokenRequest, RegisterRequest, Token
from app.schemas.user import UserResponse, UserUpdate
from app.services import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    user = auth_service.register_user(db, data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    user = auth_service.authenticate_user(db, form.username, form.password)
    return auth_service.create_tokens(db, user)


@router.post("/refresh", response_model=Token)
async def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)) -> Token:
    return auth_service.refresh_tokens(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    auth_service.revoke_refresh_token(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.get("/me/permissions")
async def my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    """Return the current user's effective permissions as a flat dict."""
    from app.services.admin_service import check_user_permission
    from app.permissions import get_all_permission_keys

    result = {}
    for key in get_all_permission_keys():
        result[key] = check_user_permission(db, current_user, key)
    return result


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


def _persist_env_var(key: str, value: str) -> None:
    """Update a key in the backend .env file."""
    import os
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", ".env")
    env_path = os.path.abspath(env_path)
    lines = []
    found = False
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            found = True
            break
    if not found:
        lines.append(f"{key}={value}\n")
    with open(env_path, "w") as f:
        f.writelines(lines)
    logger.info("Persisted %s to %s", key, env_path)


# --- LinkedIn OAuth2 ---


@router.get("/linkedin")
async def linkedin_auth():
    """Redirect user to LinkedIn OAuth2 authorization page."""
    params = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "scope": "openid profile email w_member_social r_organization_social w_organization_social rw_organization_admin",
        "state": "socialbloom_linkedin",
    })
    return RedirectResponse(f"https://www.linkedin.com/oauth/v2/authorization?{params}")


@router.get("/linkedin/callback")
async def linkedin_callback(code: str | None = None, error: str | None = None, error_description: str | None = None):
    """Exchange LinkedIn authorization code for access token."""
    if error or not code:
        logger.error("LinkedIn OAuth error: %s - %s", error, error_description)
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/settings?linkedin=error&detail={error_description or error or 'no_code'}"
        )
    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if token_resp.status_code != 200:
            logger.error("LinkedIn token exchange failed: %s", token_resp.text)
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/settings?linkedin=error&detail={token_resp.text[:100]}"
            )

        token_data = token_resp.json()
        access_token = token_data["access_token"]

        # Get LinkedIn profile to retrieve the person URN
        profile_resp = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_data = profile_resp.json() if profile_resp.status_code == 200 else {}
        linkedin_sub = profile_data.get("sub", "")

        # Store token in settings at runtime
        settings.LINKEDIN_ACCESS_TOKEN = access_token

        # Persist token to .env file so it survives restarts
        _persist_env_var("LINKEDIN_ACCESS_TOKEN", access_token)

        logger.info(
            "LinkedIn OAuth successful. Token expires in %ss. LinkedIn user: %s",
            token_data.get("expires_in"),
            linkedin_sub,
        )

        return RedirectResponse(
            f"{settings.FRONTEND_URL}/settings?linkedin=connected"
        )


@router.get("/linkedin/status")
async def linkedin_status():
    """Check if LinkedIn is connected."""
    connected = bool(settings.LINKEDIN_ACCESS_TOKEN)
    return {"connected": connected, "platform": "linkedin"}


# --- Facebook OAuth2 ---
#
# Flow:
#   1. /facebook         -> redirect user to Facebook for consent
#   2. /facebook/callback -> exchange code for a SHORT-lived user token,
#                            extend to LONG-lived user token (~60d),
#                            redirect to settings page
#   3. /facebook/pages    -> list the Pages this user can manage
#                            (frontend renders a dropdown)
#   4. /facebook/select-page -> persist the chosen Page's Page Access Token
#                               into FACEBOOK_ACCESS_TOKEN + FACEBOOK_PAGE_ID
#
# Posting in platform_adapters.FacebookAdapter then targets that Page.


_FB_PAGE_SCOPES = "pages_show_list,pages_manage_posts,pages_read_engagement,business_management"

# Cookie used to bind the OAuth state token to the browser session that
# initiated /facebook. Verified in /facebook/callback to defeat CSRF.
_FB_STATE_COOKIE = "fb_oauth_state"


@router.post("/facebook/start")
async def facebook_start(
    _: User = Depends(require_role(UserRole.admin)),
):
    """Mint the OAuth URL + state cookie. Admin-only. Returns JSON; frontend
    navigates to `url` on receipt. We POST + JSON (instead of a 302 redirect)
    so the bearer token can be attached — browsers don't send Authorization
    headers on top-level <a href> navigations.
    """
    if not settings.FACEBOOK_APP_ID:
        raise HTTPException(status_code=400, detail="FACEBOOK_APP_ID not configured")
    state = secrets.token_urlsafe(32)
    params = urllib.parse.urlencode({
        "client_id": settings.FACEBOOK_APP_ID,
        "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
        "scope": _FB_PAGE_SCOPES,
        "response_type": "code",
        "state": state,
    })
    from fastapi.responses import JSONResponse
    resp = JSONResponse(
        content={"url": f"https://www.facebook.com/v21.0/dialog/oauth?{params}"}
    )
    # HttpOnly + SameSite=Lax: survives the top-level redirect back from
    # facebook.com but is unreadable from JS.
    resp.set_cookie(
        key=_FB_STATE_COOKIE,
        value=state,
        max_age=600,
        httponly=True,
        secure=settings.FACEBOOK_REDIRECT_URI.lower().startswith("https://"),
        samesite="lax",
        path="/api/v1/auth/facebook",
    )
    return resp


@router.get("/facebook/callback")
async def facebook_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    error_reason: str | None = None,
    fb_oauth_state: str | None = Cookie(default=None, alias=_FB_STATE_COOKIE),
):
    """Exchange the Facebook auth code for a long-lived user access token.

    Authorization here is delegated to the signed state cookie set by
    /facebook (which is itself admin-gated). The callback can't carry a
    bearer token because it's a top-level redirect from facebook.com.
    """
    def _clear_state(resp: RedirectResponse) -> RedirectResponse:
        resp.delete_cookie(_FB_STATE_COOKIE, path="/api/v1/auth/facebook")
        return resp

    if error or not code:
        logger.error("Facebook OAuth error: %s - %s", error, error_description or error_reason)
        return _clear_state(RedirectResponse(
            f"{settings.FRONTEND_URL}/settings?facebook=error&detail={urllib.parse.quote(error_description or error or error_reason or 'no_code')}"
        ))
    if not state or not fb_oauth_state or not secrets.compare_digest(state, fb_oauth_state):
        logger.warning("Facebook callback rejected: state mismatch (likely CSRF or expired session)")
        return _clear_state(RedirectResponse(
            f"{settings.FRONTEND_URL}/settings?facebook=error&detail=state_mismatch"
        ))
    if not (settings.FACEBOOK_APP_ID and settings.FACEBOOK_APP_SECRET):
        return _clear_state(RedirectResponse(
            f"{settings.FRONTEND_URL}/settings?facebook=error&detail=app_credentials_missing"
        ))

    async with httpx.AsyncClient(timeout=30) as client:
        # Step 1: exchange code for a short-lived user access token
        token_resp = await client.get(
            "https://graph.facebook.com/v21.0/oauth/access_token",
            params={
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
                "code": code,
            },
        )
        if token_resp.status_code != 200:
            logger.error("Facebook token exchange failed: %s", token_resp.text)
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/settings?facebook=error&detail={urllib.parse.quote(token_resp.text[:120])}"
            )
        short_token = token_resp.json().get("access_token")
        if not short_token:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/settings?facebook=error&detail=no_token_in_response"
            )

        # Step 2: exchange short-lived for long-lived user token (~60 days)
        long_resp = await client.get(
            "https://graph.facebook.com/v21.0/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "fb_exchange_token": short_token,
            },
        )
        long_token = long_resp.json().get("access_token", short_token) if long_resp.status_code == 200 else short_token

    # Store the USER token temporarily — page tokens are minted in /facebook/pages.
    # FACEBOOK_ACCESS_TOKEN is only finalized once the user picks a Page.
    settings.FACEBOOK_APP_USER_TOKEN = long_token  # in-memory only
    _persist_env_var("FACEBOOK_APP_USER_TOKEN", long_token)

    logger.info("Facebook OAuth successful; user token obtained (length=%d)", len(long_token))
    return _clear_state(RedirectResponse(f"{settings.FRONTEND_URL}/settings?facebook=pick_page"))


@router.get("/facebook/pages")
async def facebook_pages(
    _: User = Depends(require_role(UserRole.admin)),
):
    """List Pages this user can manage. Returns each Page's id and name (tokens stay server-side)."""
    user_token = getattr(settings, "FACEBOOK_APP_USER_TOKEN", "") or ""
    if not user_token:
        # Fallback: a manually pasted token may itself be a user token
        user_token = settings.FACEBOOK_ACCESS_TOKEN
    if not user_token:
        return {"pages": [], "error": "not_connected"}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://graph.facebook.com/v21.0/me/accounts",
            params={"access_token": user_token, "fields": "id,name,access_token,category,tasks"},
        )
        if resp.status_code != 200:
            logger.error("Facebook pages fetch failed: %s", resp.text)
            return {"pages": [], "error": resp.json().get("error", {}).get("message", resp.text[:200])}
        data = resp.json().get("data", [])
        # Don't ship the page tokens to the browser — keep them server-side.
        # The frontend just selects by id; the backend resolves the token.
        global _FB_PAGE_TOKENS_CACHE
        _FB_PAGE_TOKENS_CACHE = {p["id"]: p["access_token"] for p in data if p.get("access_token")}
        return {
            "pages": [
                {
                    "id": p["id"],
                    "name": p.get("name", ""),
                    "category": p.get("category", ""),
                }
                for p in data
            ],
            "selected_page_id": settings.FACEBOOK_PAGE_ID,
        }


# In-memory cache of page_id -> page_access_token, populated by /facebook/pages
_FB_PAGE_TOKENS_CACHE: dict[str, str] = {}


@router.post("/facebook/select-page")
async def facebook_select_page(
    page_id: str,
    _: User = Depends(require_role(UserRole.admin)),
):
    """Persist the chosen Page's access token as the active FACEBOOK_ACCESS_TOKEN."""
    page_token = _FB_PAGE_TOKENS_CACHE.get(page_id)
    if not page_token:
        raise HTTPException(
            status_code=400,
            detail="page_id not in cache — call GET /facebook/pages first",
        )

    settings.FACEBOOK_ACCESS_TOKEN = page_token
    settings.FACEBOOK_PAGE_ID = page_id
    _persist_env_var("FACEBOOK_ACCESS_TOKEN", page_token)
    _persist_env_var("FACEBOOK_PAGE_ID", page_id)
    logger.info("Facebook Page selected: id=%s", page_id)
    return {"ok": True, "page_id": page_id}


@router.get("/facebook/status")
async def facebook_status(
    _: User = Depends(get_current_user),
):
    """Check Facebook connection state. Auth required (any logged-in user)."""
    return {
        "connected": bool(settings.FACEBOOK_ACCESS_TOKEN),
        "page_id": settings.FACEBOOK_PAGE_ID,
        "user_token_present": bool(getattr(settings, "FACEBOOK_APP_USER_TOKEN", "")),
        "platform": "facebook",
    }
