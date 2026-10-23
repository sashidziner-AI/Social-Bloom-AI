"""Service for fetching and caching LinkedIn organization (company) pages."""

import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.linkedin_organization import LinkedInOrganization

logger = logging.getLogger(__name__)

REQUIRED_ORG_SCOPES = {"r_organization_social", "w_organization_social", "rw_organization_admin"}


async def check_token_scopes() -> dict:
    """Introspect the LinkedIn token and return scope information."""
    if not settings.LINKEDIN_ACCESS_TOKEN:
        return {"connected": False, "scopes": [], "missing_org_scopes": list(REQUIRED_ORG_SCOPES)}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://www.linkedin.com/oauth/v2/introspectToken",
            data={
                "token": settings.LINKEDIN_ACCESS_TOKEN,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
        )
        if resp.status_code != 200:
            return {"connected": True, "scopes": [], "missing_org_scopes": list(REQUIRED_ORG_SCOPES), "error": "introspection_failed"}

        data = resp.json()
        if not data.get("active"):
            return {"connected": False, "scopes": [], "missing_org_scopes": list(REQUIRED_ORG_SCOPES), "error": "token_expired"}

        granted = {s.strip() for s in data.get("scope", "").split(",")}
        missing = REQUIRED_ORG_SCOPES - granted
        return {
            "connected": True,
            "scopes": sorted(granted),
            "missing_org_scopes": sorted(missing),
            "has_org_access": len(missing) == 0,
        }


async def fetch_and_cache_orgs(db: Session) -> list[LinkedInOrganization]:
    """Fetch organization pages from LinkedIn API and cache in database."""
    if not settings.LINKEDIN_ACCESS_TOKEN:
        logger.warning("LinkedIn not connected, cannot fetch organizations")
        return []

    # First check if we actually have the required scopes
    scope_info = await check_token_scopes()
    if not scope_info.get("has_org_access"):
        missing = scope_info.get("missing_org_scopes", [])
        logger.warning(
            "LinkedIn token missing organization scopes: %s. "
            "Enable 'Community Management API' product on your LinkedIn app at "
            "https://www.linkedin.com/developers/apps, then re-authorize.",
            missing,
        )
        return get_cached_orgs(db)

    rest_headers = {
        "Authorization": f"Bearer {settings.LINKEDIN_ACCESS_TOKEN}",
        "LinkedIn-Version": "202504",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        # Step 1: Get organization ACLs (admin roles) via Community Management API
        resp = await client.get(
            "https://api.linkedin.com/rest/organizationAcls",
            params={
                "q": "roleAssignee",
                "role": "ADMINISTRATOR",
            },
            headers=rest_headers,
        )

        if resp.status_code != 200:
            logger.error(
                "Failed to fetch LinkedIn org ACLs: %s %s",
                resp.status_code,
                resp.text,
            )
            return get_cached_orgs(db)

        data = resp.json()
        elements = data.get("elements", [])
        logger.info("LinkedIn organizationAcls returned %d elements", len(elements))

        # Step 2: Extract organization URNs and fetch details for each
        orgs = []
        for elem in elements:
            org_urn = elem.get("organization")
            if not org_urn:
                continue

            # Extract numeric org ID from URN like "urn:li:organization:123456"
            org_id = org_urn.rsplit(":", 1)[-1]
            if not org_id:
                continue

            # Fetch organization details
            org_resp = await client.get(
                f"https://api.linkedin.com/rest/organizations/{org_id}",
                headers=rest_headers,
            )

            if org_resp.status_code != 200:
                logger.warning(
                    "Failed to fetch org %s details: %s %s",
                    org_id,
                    org_resp.status_code,
                    org_resp.text,
                )
                name = f"Organization {org_id}"
                vanity_name = ""
                logo_url = None
            else:
                org_data = org_resp.json()
                name = org_data.get("localizedName", f"Organization {org_id}")
                vanity_name = org_data.get("vanityName", "")
                logo_raw = org_data.get("logoV2", {}).get("original", None)
                # LinkedIn may return a URN (urn:li:digitalmediaAsset:...)
                # instead of an actual image URL - discard those
                logo_url = logo_raw if logo_raw and logo_raw.startswith("http") else None

            existing = db.query(LinkedInOrganization).filter(
                LinkedInOrganization.org_id == org_id
            ).first()

            if existing:
                existing.name = name
                existing.logo_url = logo_url
                existing.vanity_name = vanity_name
                orgs.append(existing)
            else:
                org = LinkedInOrganization(
                    org_id=org_id,
                    name=name,
                    logo_url=logo_url,
                    vanity_name=vanity_name,
                )
                db.add(org)
                orgs.append(org)

        db.commit()
        logger.info("Cached %d LinkedIn organizations", len(orgs))
        return orgs


def get_cached_orgs(db: Session) -> list[LinkedInOrganization]:
    """Return all cached LinkedIn organizations."""
    orgs = db.query(LinkedInOrganization).order_by(LinkedInOrganization.name).all()
    # Sanitize any URN-style logo_urls that were cached before the fix
    for org in orgs:
        if org.logo_url and not org.logo_url.startswith("http"):
            org.logo_url = None
    return orgs


async def refresh_orgs_if_stale(db: Session) -> list[LinkedInOrganization]:
    """Refresh organizations if cache is older than 1 hour."""
    latest = (
        db.query(LinkedInOrganization)
        .order_by(LinkedInOrganization.updated_at.desc().nullslast())
        .first()
    )

    stale_threshold = datetime.now(timezone.utc) - timedelta(hours=1)

    if not latest or not latest.updated_at or latest.updated_at < stale_threshold:
        return await fetch_and_cache_orgs(db)

    return get_cached_orgs(db)
