import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.exceptions import AppException, app_exception_handler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-powered social media content lifecycle automation platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^http://localhost:\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)

from app.routers import (
    admin,
    analytics,
    approvals,
    audit_logs,
    auth,
    content_requests,
    creatives,
    publish,
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(content_requests.router, prefix="/api/v1")
app.include_router(creatives.router, prefix="/api/v1")
app.include_router(approvals.router, prefix="/api/v1")
app.include_router(publish.router, prefix="/api/v1")
app.include_router(audit_logs.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")


# Serve uploaded files (generated images, etc.)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    from app.database import Base, engine
    import app.models.user  # noqa: F401
    import app.models.content_request  # noqa: F401
    import app.models.creative  # noqa: F401
    import app.models.approval  # noqa: F401
    import app.models.publish_job  # noqa: F401
    import app.models.analytics  # noqa: F401
    import app.models.audit_log  # noqa: F401
    import app.models.refresh_token  # noqa: F401
    import app.models.user_permission  # noqa: F401
    import app.models.role_permission_override  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")


@app.get("/health")
async def health():
    return {"status": "healthy", "app": settings.APP_NAME}
