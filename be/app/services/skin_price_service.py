import logging
import re
from datetime import datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import models

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

class SkinPriceService:
    def __init__(self):
        self.url = "https://api.skinport.com/v1/items"
        self.params = {"app_id": 730, "currency": "PLN"}
        self.headers = {"Accept-Encoding": "br"}
        self.skin_regex = re.compile(r"^(★\s)?(StatTrak™\s|Souvenir\s)?(.+?)\s\|\s(.+?)\s\((.+?)\)$")

    async def update_prices(self, db: AsyncSession):
        async with httpx.AsyncClient() as client:
            response = await client.get(self.url, params=self.params, headers=self.headers)
            response.raise_for_status()
            data = response.json()

        wears_db = await db.execute(select(models.WearType))
        wears_map = {w.name: w.wear_id for w in wears_db.scalars().all()}

        weapons_db = await db.execute(select(models.Weapon))
        weapons_map = {w.name: w.weapon_id for w in weapons_db.scalars().all()}

        skins_db = await db.execute(select(models.Skin))
        skins_map = {(s.weapon_id, s.name): s.skin_id for s in skins_db.scalars().all()}

        rarity_stmt = select(models.Rarity).where(models.Rarity.name.ilike('%★%'))
        rarity_result = await db.execute(rarity_stmt)
        knife_rarity = rarity_result.scalars().first()
        knife_rarity_id = knife_rarity.rarity_id if knife_rarity else None

        skin_variants_db = await db.execute(select(models.SkinVariant))
        skin_variants_map = {(sv.skin_id, sv.wear_id, sv.stattrack): sv for sv in skin_variants_db.scalars().all()}

        updated_count = 0
        new_skins_created = 0
        new_variants_count = 0

        for r in data:
            full_name = r.get("market_hash_name")
            price = r.get("min_price")
            version = r.get("version")
            quantity = r.get("quantity", 0)

            match = self.skin_regex.match(full_name)
            if not match:
                continue

            is_knife = match.group(1) is not None
            is_stattrack = match.group(2) == "StatTrak™ "
            weapon_name = match.group(3)
            skin_name = match.group(4)
            wear_name = match.group(5)

            # If skin has a version, like Doppler (Ruby, Sapphire, etc.)
            if version:
                skin_name = f"{skin_name} ({version})"

            weapon_id = weapons_map.get(weapon_name)
            wear_id = wears_map.get(wear_name)

            if not weapon_id or not wear_id:
                continue

            skin_id = skins_map.get((weapon_id, skin_name))

            if not skin_id and is_knife:
                new_skin = models.Skin(
                    name=skin_name,
                    weapon_id=weapon_id,
                    rarity_id=knife_rarity_id,
                    float_min=r.get("float_min"),
                    float_max=r.get("float_max"),
                )
                db.add(new_skin)
                await db.flush()

                skin_id = new_skin.skin_id
                skins_map[(weapon_id, skin_name)] = skin_id
                new_skins_created += 1

            if skin_id:
                variant_key = (skin_id, wear_id, is_stattrack)
                variant = skin_variants_map.get(variant_key)

                if not variant:
                    variant = models.SkinVariant(
                        skin_id=skin_id,
                        wear_id=wear_id,
                        stattrack=is_stattrack,
                        last_price=price,
                        quantity=quantity

                    )
                    db.add(variant)
                    skin_variants_map[variant_key] = variant
                    new_variants_count += 1
                else:
                    variant.last_price = price
                    variant.quantity = quantity
                    variant.updated_at = datetime.utcnow()


                new_price = models.SkinPrice(
                    skin_id=skin_id,
                    wear_id=wear_id,
                    stattrack=is_stattrack,
                    price=price,
                    currency="PLN"
                )
                db.add(new_price)
                updated_count += 1

                if updated_count % 500 == 0:
                    await db.flush()

        await db.commit()
        logger.info(f"Finished. {new_skins_created} added (including versions), updated {updated_count} prices.")
        return updated_count

    async def calculate_historical_changes(self, db: AsyncSession):
        now = datetime.utcnow()
        intervals = {
            "1h": now - timedelta(hours=1),
            "24h": now - timedelta(days=1),
            "7d": now - timedelta(days=7)
        }
        variants_result = await db.execute(select(models.SkinVariant))
        variants = variants_result.scalars().all()

        for variant in variants:
            for label, time_threshold in intervals.items():
                stmt = (
                    select(models.SkinPrice.price)
                    .where(
                        models.SkinPrice.skin_id == variant.skin_id,
                        models.SkinPrice.wear_id == variant.wear_id,
                        models.SkinPrice.stattrack == variant.stattrack,
                        models.SkinPrice.updated_at <= time_threshold
                    )
                    .order_by(models.SkinPrice.updated_at.desc())
                    .limit(1)
                )

                old_price_result = await db.execute(stmt)
                old_price = old_price_result.scalar_one_or_none()

                if old_price and old_price > 0:
                    diff = ((variant.last_price - old_price) / old_price) * 100
                    if label == "1h":
                        variant.change_1h = diff
                    elif label == "24h":
                        variant.change_24h = diff
                    elif label == "7d":
                        variant.change_7d = diff

        await db.commit()
        logger.info("Historical changes updated.")
        return len(variants)



