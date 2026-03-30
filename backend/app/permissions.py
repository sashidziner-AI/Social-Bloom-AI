"""
Master permission registry.

Each permission key maps to a dict of role -> default grant.
String values (e.g. "own") are truthy with a qualifier.
"""

PERMISSION_GROUPS: list[dict] = [
    {
        "category": "Content Requests",
        "permissions": [
            {
                "key": "content_requests.create",
                "name": "Create/edit content requests",
                "defaults": {"admin": True, "manager": True, "team_lead": True, "creator": True, "designer": False},
            },
            {
                "key": "content_requests.view_all",
                "name": "View all content",
                "defaults": {"admin": True, "manager": True, "team_lead": True, "creator": False, "designer": False},
            },
        ],
    },
    {
        "category": "AI Generation",
        "permissions": [
            {
                "key": "ai.generate",
                "name": "Generate AI content",
                "defaults": {"admin": True, "manager": True, "team_lead": True, "creator": True, "designer": False},
            },
        ],
    },
    {
        "category": "Creatives",
        "permissions": [
            {
                "key": "creatives.review",
                "name": "Review/replace creatives",
                "defaults": {"admin": True, "manager": True, "team_lead": True, "creator": False, "designer": True},
            },
            {
                "key": "creatives.upload",
                "name": "Upload assets",
                "defaults": {"admin": True, "manager": False, "team_lead": False, "creator": False, "designer": True},
            },
            {
                "key": "creatives.image_preview",
                "name": "Image preview",
                "defaults": {"admin": True, "manager": False, "team_lead": True, "creator": False, "designer": True},
            },
        ],
    },
    {
        "category": "Approvals",
        "permissions": [
            {
                "key": "approvals.first_level",
                "name": "First-level approval",
                "defaults": {"admin": True, "manager": True, "team_lead": True, "creator": False, "designer": False},
            },
            {
                "key": "approvals.final",
                "name": "Final approval",
                "defaults": {"admin": True, "manager": True, "team_lead": False, "creator": False, "designer": False},
            },
            {
                "key": "approvals.reject",
                "name": "Reject (with comments)",
                "defaults": {"admin": True, "manager": True, "team_lead": True, "creator": False, "designer": False},
            },
        ],
    },
    {
        "category": "Publishing",
        "permissions": [
            {
                "key": "publishing.publish",
                "name": "Publish content",
                "defaults": {"admin": True, "manager": True, "team_lead": False, "creator": False, "designer": False},
            },
        ],
    },
    {
        "category": "Administration",
        "permissions": [
            {
                "key": "admin.user_management",
                "name": "User management",
                "defaults": {"admin": True, "manager": False, "team_lead": False, "creator": False, "designer": False},
            },
            {
                "key": "admin.system_settings",
                "name": "System settings",
                "defaults": {"admin": True, "manager": False, "team_lead": False, "creator": False, "designer": False},
            },
            {
                "key": "admin.audit_logs",
                "name": "View audit logs",
                "defaults": {"admin": True, "manager": True, "team_lead": False, "creator": False, "designer": False},
            },
            {
                "key": "admin.analytics",
                "name": "View analytics",
                "defaults": {"admin": True, "manager": True, "team_lead": True, "creator": False, "designer": False},
            },
        ],
    },
]


def get_all_permission_keys() -> list[str]:
    keys = []
    for group in PERMISSION_GROUPS:
        for perm in group["permissions"]:
            keys.append(perm["key"])
    return keys


def get_role_defaults(role: str) -> dict[str, bool]:
    """Return {permission_key: granted} for a given role."""
    result = {}
    for group in PERMISSION_GROUPS:
        for perm in group["permissions"]:
            result[perm["key"]] = bool(perm["defaults"].get(role, False))
    return result
