from app.db.session import SessionLocal
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models import models
import asyncio

variant_id = "0002f6fb-fcb9-4a4d-b036-a28f7ed54bb2"

async def get_skin_details():
    async with SessionLocal() as db:
        stmt = (
            select(
                models.Skin.skin_id,
                models.Weapon.name.label("weapon_name"),
                models.Skin.name.label("skin_name"),
                models.WearType.name.label("wear_name"),
                models.SkinVariant.stattrack,
                models.Skin.image_url,
                models.SkinVariant.last_price,
                models.SkinVariant.change_1h,
                models.SkinVariant.change_24h,
                models.SkinVariant.change_7d
            )
            .select_from(models.SkinVariant)
            .join(models.Skin, models.SkinVariant.skin_id == models.Skin.skin_id)
            .join(models.Weapon, models.Skin.weapon_id == models.Weapon.weapon_id)
            .join(models.WearType, models.SkinVariant.wear_id == models.WearType.wear_id)
            .where(models.SkinVariant.variant_id == variant_id))

        res = await db.execute(stmt)
        skin_info = res.first()

        hour_bucket = func.date_trunc('hour', models.SkinPrice.updated_at)

        history_stmt = (
            select(
                models.SkinPrice.price,
                models.SkinPrice.updated_at
            )
            .distinct(hour_bucket)
            .where(
                models.SkinPrice.skin_id == skin_info.skin_id and models.SkinPrice.wear_id == skin_info.wear_id and models.SkinPrice.stattrack == skin_info.stattrack)
            .order_by(hour_bucket.desc(), models.SkinPrice.updated_at.desc())
            .limit(24)
        )

        res = await db.execute(history_stmt)
        history = res.all()

        print(history)


if __name__ == "__main__":
    asyncio.run(get_skin_details())