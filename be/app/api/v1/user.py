from typing import List

from fastapi import HTTPException

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.schemas import SkinListRead
from app.services.user_service import UserService

router = APIRouter()

@router.post("/sync-inventory")
async def sync_inventory(current_user: User=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_svc = UserService()
    if not current_user:
        raise HTTPException(status_code=404, detail="User has no connected Steam account")

    parsed_items = await user_svc.fetch_steam_inventory(current_user.steam_id)
    await user_svc.sync_user_inventory_db(db, current_user.user_id, parsed_items)

    return {"message": "Inventory synced successfully", "items_count": len(parsed_items)}

@router.get("/inventory", response_model=List[SkinListRead])
async def get_my_inventory(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    user_svc = UserService()
    if not current_user.steam_id:
        raise HTTPException(status_code=400, detail="User has no connected Steam account")
    items = await user_svc.get_user_inventory(db, current_user.user_id)
    return items