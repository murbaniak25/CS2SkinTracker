from app.models import models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class WeaponService:
    async def get_weapons(self, db: AsyncSession):
        stmt = select(models.Weapon).order_by(models.Weapon.name)
        result = await db.execute(stmt)
        return result.scalars().all()