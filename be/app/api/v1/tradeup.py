from fastapi import APIRouter, Depends


from app.services.tradeup_service import TradeUpService
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import SkinTradeUpRead, TradeUpSimulationResult, TradeUpRequest

tradeup_service = TradeUpService()

router = APIRouter()

@router.get("/available-skins", response_model=list[SkinTradeUpRead])
async def get_skins(
    rarity: str,
    stattrack: bool,
    search: str = None,
    collection: str = None,
    condition: str = None,
    db: AsyncSession = Depends(get_db)
):
    return await tradeup_service.get_rarities_skins(
        db, rarity, stattrack, search, collection, condition
    )

@router.post("/simulate", response_model=TradeUpSimulationResult)
async def simulate_tradeup(
    request: TradeUpRequest,
    db: AsyncSession = Depends(get_db)
):
    return await tradeup_service.calculate_simulation(
        db,
        request.items,
        request.stattrack
    )