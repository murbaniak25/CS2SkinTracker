from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func, or_, desc, tuple_, text
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from app import models
import uuid

class SkinService:
    async def get_skins_list(
            self,
            db: AsyncSession,
            skip: int,
            limit: int,
            search: str | None = None,
            rarity: str | None = None,
            collection: str | None = None,
            wear: str | None = None,
            stattrack: bool | None = None
    ):
        query = (
            select(models.SkinVariant)
            .join(models.Skin)
            .join(models.Weapon, models.Skin.weapon_id == models.Weapon.weapon_id)
            .join(models.WearType, models.SkinVariant.wear_id == models.WearType.wear_id)
            .join(models.Rarity, models.Skin.rarity_id == models.Rarity.rarity_id)
            .options(
                joinedload(models.SkinVariant.skin).joinedload(models.Skin.weapon),
                joinedload(models.SkinVariant.wear),
                joinedload(models.SkinVariant.skin).joinedload(models.Skin.rarity)
            )
            .where(models.SkinVariant.last_price.is_not(None))
        )

        if search:
            query = query.where(
                or_(
                    models.Skin.name.ilike(f"%{search}%"),
                    models.Weapon.name.ilike(f"%{search}%")
                )
            )

        if rarity:
            query = query.where(models.Rarity.name == rarity)

        if collection:
            query = query.join(models.Collection, models.Skin.collection_id == models.Collection.collection_id)
            query = query.where(models.Collection.name == collection)

        if wear:
            query = query.where(models.WearType.name == wear)

        if stattrack is not None:
            query = query.where(models.SkinVariant.stattrack == stattrack)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(models.Weapon.name, models.Skin.name, desc(models.SkinVariant.last_price))
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        variants = result.unique().scalars().all()

        items = []
        for v in variants:
            items.append({
                "skin_id": v.variant_id,
                "weapon_name": v.skin.weapon.name,
                "skin_name": v.skin.name,
                "wear_name": v.wear.name,
                "stattrack": v.stattrack,
                "rarity_color": v.skin.rarity.color_hex if v.skin.rarity else None,
                "image_url": v.skin.image_url,
                "last_price": v.last_price,
                "change_1h": v.change_1h,
                "change_24h": v.change_24h,
                "change_7d": v.change_7d,
            })

        return items, total

    async def get_skin_details(self, db: AsyncSession, variant_id: uuid.UUID):
        stmt = (
            select(
                models.Skin.skin_id,
                models.SkinVariant.wear_id,
                models.Weapon.name.label("weapon_name"),
                models.Skin.name.label("skin_name"),
                models.WearType.name.label("wear_name"),
                models.SkinVariant.stattrack,
                models.Rarity.color_hex,
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
            .join(models.Rarity, models.Skin.rarity_id == models.Rarity.rarity_id)
            .where(models.SkinVariant.variant_id == variant_id))


        res = await db.execute(stmt)
        skin_info = res.first()

        if not skin_info:
            return None

        hour_bucket = func.date_trunc('hour', models.SkinPrice.updated_at)

        history_stmt = (
            select(
                models.SkinPrice.price,
                models.SkinPrice.updated_at
            )
            .distinct(hour_bucket)
            .where(
                models.SkinPrice.skin_id == skin_info.skin_id, models.SkinPrice.wear_id == skin_info.wear_id, models.SkinPrice.stattrack == skin_info.stattrack)
            .order_by(hour_bucket.desc(), models.SkinPrice.updated_at.desc())
            .limit(24)
        )

        res = await db.execute(history_stmt)
        history = res.all()

        return {
            "skin_id": skin_info.skin_id,
            "weapon_name": skin_info.weapon_name,
            "skin_name": skin_info.skin_name,
            "wear_name": skin_info.wear_name,
            "stattrack": skin_info.stattrack,
            "rarity_color": skin_info.color_hex,
            "image_url": skin_info.image_url,
            "last_price": skin_info.last_price,
            "change_1h": skin_info.change_1h,
            "change_24h": skin_info.change_24h,
            "change_7d": skin_info.change_7d,
            "price_history": [
                {"point": h.price, "updated_at": h.updated_at} for h in history[::-1]
            ]
        }

    async def calculate_market_index(self, db: AsyncSession):
        stmt = (
            select(
                models.SkinVariant.skin_id,
                models.SkinVariant.wear_id,
                models.SkinVariant.stattrack,
                models.SkinVariant.last_price
            )
            .where(models.SkinVariant.last_price >= 50.0)
            .order_by(desc(models.SkinVariant.quantity))
            .limit(100)
        )
        res = await db.execute(stmt)
        top_skins = res.all()

        if not top_skins:
            return {"current_value": 0, "change_24h": 0, "chart_data": []}

        current_avg = sum(s.last_price for s in top_skins) / len(top_skins)
        top_criteria = [(s.skin_id, s.wear_id, s.stattrack) for s in top_skins]

        history_stmt = (
            select(
                func.date_trunc("hour", models.SkinPrice.updated_at).label("hour"),
                func.avg(models.SkinPrice.price).label("avg_price"),
            )
            .where(
                tuple_(
                    models.SkinPrice.skin_id,
                    models.SkinPrice.wear_id,
                    models.SkinPrice.stattrack
                ).in_(top_criteria)
            )
            .where(
                models.SkinPrice.updated_at >= (datetime.now(timezone.utc) - timedelta(hours=25)).replace(tzinfo=None))
            .group_by(text("hour"))
            .order_by(text("hour"))
        )

        res_history = await db.execute(history_stmt)
        rows = res_history.all()
        chart_data = [round(float(row.avg_price), 2) for row in rows]

        change_24h = 0

        if len(chart_data) > 1:
            start_price = chart_data[0]
            change_24h = ((current_avg - start_price) / start_price) * 100

            if abs(change_24h) > 80:
                change_24h = 1.25
        nominal_diff = 0

        if chart_data:
            first_price = chart_data[0]
            last_price = current_avg

            nominal_diff = last_price - first_price
            change_24h = (nominal_diff / first_price) * 100

        return {
            "current_value": round(current_avg, 2),
            "change_24h": round(change_24h, 6),
            "chart_data": chart_data
        }

    async def get_market_overview(self, db: AsyncSession):
        index_data = await self.calculate_market_index(db)

        stats_stmt = select(
            func.count(models.SkinVariant.variant_id).label("total_variants"),
            func.count(models.SkinVariant.variant_id)
            .filter(models.SkinVariant.change_24h > 0)
            .label("up_variants"),
            func.sum(models.SkinVariant.quantity).label("total_volume")
        ).where(models.SkinVariant.last_price.is_not(None))

        res = await db.execute(stats_stmt)
        stats = res.one()

        total = stats.total_variants or 1
        up = stats.up_variants or 0
        volume = stats.total_volume or 0
        sentiment_pct = (up / total) * 100

        return {
            "index": index_data,
            "sentiment": {
                "sentiment_value": round(sentiment_pct, 6),
                "label": "Bullish" if sentiment_pct > 50 else "Bearish"
            },
            "volume": {
                "market_volume": int(volume)
            }
        }






