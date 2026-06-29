from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import FilterOptionsRead
from app.services import (
    WeaponService,
    CollectionService,
    RarityService,
    WearService
)

weapon_svc = WeaponService()
collection_svc = CollectionService()
rarity_svc = RarityService()
wear_svc = WearService()

router = APIRouter()

@router.get("/filters", response_model=FilterOptionsRead)
async def get_filters(db: AsyncSession = Depends(get_db)):
    return {
        "weapons": await weapon_svc.get_weapons(db),
        "collections": await collection_svc.get_collections(db),
        "rarities": await rarity_svc.get_rarities(db),
        "wears": await wear_svc.get_wears(db)
    }