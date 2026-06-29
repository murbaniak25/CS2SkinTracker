from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.schemas import MarketOverviewRead
from app.services.skin_service import SkinService

router = APIRouter()

@router.get("/overview", response_model=MarketOverviewRead)
async def get_market_stats(db: AsyncSession = Depends(get_db)):
    skin_svc = SkinService()
    return await skin_svc.get_market_overview(db)