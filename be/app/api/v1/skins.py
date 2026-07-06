from fastapi import APIRouter, Depends, Query

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import SkinPaginatedRead
from app.schemas.schemas import SkinDetailsRead
from app.services.skin_service import SkinService
import uuid

skin_service = SkinService()

router = APIRouter()


@router.get("/", response_model=SkinPaginatedRead)
async def get_skins(
        db: AsyncSession = Depends(get_db),
        skip: int = Query(0, ge=0),
        limit: int = Query(40, ge=1, le=100),
        search: str | None = None,
        rarity: str | None = None,
        collection: str | None = None,
        wear: str | None = None,
        stattrack: bool | None = None,
        souvenir: bool | None = None
):
    items, total = await skin_service.get_skins_list(
        db,
        skip=skip,
        limit=limit,
        search=search,
        rarity=rarity,
        collection=collection,
        wear=wear,
        stattrack=stattrack,
        souvenir=souvenir
    )

    return {
        "items": items,
        "total": total
    }

@router.get("/{variant_id}", response_model=SkinDetailsRead)
async def get_skin_details(
        variant_id: uuid.UUID,
        db: AsyncSession = Depends(get_db)
):
    details = await skin_service.get_skin_details(db, variant_id)
    return details
