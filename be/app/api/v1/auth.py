from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from starlette.responses import RedirectResponse

from app.db.session import get_db
from app.models.models import User
from dotenv import load_dotenv

from app.schemas.schemas import UserMeResponse
from app.services.auth_service import AuthService
from app.core.config import settings

from app.core.security import get_current_user

load_dotenv()
router = APIRouter()

@router.get("/steam/login")
async def steam_login():
    auth_svc = AuthService(frontend_url=settings.FRONTEND_URL, backend_url=settings.BACKEND_URL,
                           steam_api_key=settings.STEAM_API_KEY, steam_openid_url=settings.STEAM_OPENID_URL)
    redirect_url = await auth_svc.steam_login()
    return RedirectResponse(url=redirect_url)

@router.get("/steam/callback")
async def steam_callback(request: Request, db: AsyncSession = Depends(get_db)):
    auth_svc = AuthService(frontend_url=settings.FRONTEND_URL, backend_url=settings.BACKEND_URL,
                           steam_api_key=settings.STEAM_API_KEY, steam_openid_url=settings.STEAM_OPENID_URL)
    redirect_url = await auth_svc.steam_callback(request, db)
    return RedirectResponse(url=redirect_url)

@router.get("/me", response_model=UserMeResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

