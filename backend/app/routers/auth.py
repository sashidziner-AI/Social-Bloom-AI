import logging

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
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
