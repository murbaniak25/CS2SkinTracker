from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import models

class CollectionService:
    async def get_collections(self, db: AsyncSession): # Poprawiona nazwa metody
        stmt = select(models.Collection).order_by(models.Collection.name)
        result = await db.execute(stmt)
        return result.scalars().all()