from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import models

class RarityService:
    async def get_rarities(self, db: AsyncSession):
        stmt = select(models.Rarity).where(models.Rarity.name != 'Stock').order_by(models.Rarity.name)
        result = await db.execute(stmt)
        return result.scalars().all()