from app.models import models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class WearService:
    async def get_wears(self, db: AsyncSession):
        stmt = select(models.WearType).order_by(models.WearType.name)

        result = await db.execute(stmt)
        return result.scalars().all()
