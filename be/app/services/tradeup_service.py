from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models import models
from uuid import UUID


class TradeUpService:
    RARITY_ORDER = {
        "Consumer Grade": 1,
        "Industrial Grade": 2,
        "Mil-Spec Grade": 3,
        "Restricted": 4,
        "Classified": 5,
        "Covert": 6
    }

    def get_wear_name_from_float(self, f: float) -> str:
        if f < 0.07: return "Factory New"
        if f < 0.15: return "Minimal Wear"
        if f < 0.38: return "Field-Tested"
        if f < 0.45: return "Well-Worn"
        return "Battle-Scarred"

    async def get_rarities_skins(
            self,
            db: AsyncSession,
            rarity: str,
            stattrack: bool,
            search: str | None = None,
            collection: str | None = None,
            condition: str | None = None
    ):
        stmt = (
            select(
                models.SkinVariant.variant_id.label("variant_id"),
                models.Skin.skin_id.label("skin_id"),
                models.Weapon.name.label("weapon_name"),
                models.Skin.name.label("skin_name"),
                models.WearType.name.label("wear_name"),
                models.SkinVariant.stattrack.label("stattrack"),
                models.SkinVariant.souvenir.label("souvenir"),
                models.SkinVariant.last_price.label("last_price"),
                models.Skin.image_url.label("image_url"),
                models.Collection.name.label("collection_name"),
                models.Rarity.name.label("rarity_name"),
                models.Skin.float_min.label("float_min"),
                models.Skin.float_max.label("float_max"),
            )
            .join(models.Skin, models.SkinVariant.skin_id == models.Skin.skin_id)
            .join(models.Weapon, models.Skin.weapon_id == models.Weapon.weapon_id)
            .join(models.WearType, models.SkinVariant.wear_id == models.WearType.wear_id)
            .join(models.Rarity, models.Skin.rarity_id == models.Rarity.rarity_id)
            .join(models.Collection, models.Skin.collection_id == models.Collection.collection_id, isouter=True)
        )

        stmt = stmt.where(models.Rarity.name == rarity)
        stmt = stmt.where(models.SkinVariant.stattrack == stattrack)
        stmt = stmt.where(models.SkinVariant.souvenir == False)

        if search:
            search_filter = f"%{search}%"
            stmt = stmt.where(
                or_(
                    models.Weapon.name.ilike(search_filter),
                    models.Skin.name.ilike(search_filter)
                )
            )

        if collection and collection != "All Collections":
            stmt = stmt.where(models.Collection.name == collection)

        if condition and condition != "Any Condition":
            stmt = stmt.where(models.WearType.name == condition)

        stmt = stmt.order_by(models.Weapon.name.asc(), models.Skin.name.asc())

        result = await db.execute(stmt)
        return [dict(row) for row in result.mappings().all()]

    async def calculate_simulation(self, db: AsyncSession, input_items: list, is_stattrack: bool):
        reverse_rarity_order = {v: k for k, v in self.RARITY_ORDER.items()}

        wear_types_res = await db.execute(select(models.WearType))
        wear_map = {w.name: w.wear_id for w in wear_types_res.scalars().all()}

        unique_skin_ids = list(set([item.skin_id for item in input_items]))

        stmt = (
            select(models.Skin, models.Rarity, models.Collection)
            .join(models.Rarity, models.Skin.rarity_id == models.Rarity.rarity_id)
            .join(models.Collection, models.Skin.collection_id == models.Collection.collection_id)
            .where(models.Skin.skin_id.in_(unique_skin_ids))
        )
        res = await db.execute(stmt)
        skins_data = {row.Skin.skin_id: row for row in res.all()}

        if not skins_data:
            return {"error": "No items found in database"}

        sample_skin = list(skins_data.values())[0]
        input_rarity_name = sample_skin.Rarity.name

        total_cost = 0.0
        collection_counts = {}
        weighted_float_sum = 0.0

        for item in input_items:
            skin_id = item.skin_id
            user_float = item.float_value

            wear_name = self.get_wear_name_from_float(user_float)
            target_wear_id = wear_map.get(wear_name)

            variant_stmt = (
                select(models.SkinVariant.last_price)
                .where(models.SkinVariant.skin_id == skin_id)
                .where(models.SkinVariant.wear_id == target_wear_id)
                .where(models.SkinVariant.stattrack == is_stattrack)
                .where(models.SkinVariant.souvenir == False)
            )
            v_res = await db.execute(variant_stmt)
            price = v_res.scalar_one_or_none() or 0.0

            total_cost += price
            weighted_float_sum += user_float

            coll_id = skins_data[skin_id].Collection.collection_id
            collection_counts[coll_id] = collection_counts.get(coll_id, 0) + 1

        avg_float = weighted_float_sum / 10
        current_rank = self.RARITY_ORDER.get(input_rarity_name)

        if not current_rank or current_rank >= 6:
            return {"error": "Invalid rarity for trade-up"}

        target_rarity_name = reverse_rarity_order.get(current_rank + 1)
        t_rarity_stmt = select(models.Rarity.rarity_id).where(models.Rarity.name == target_rarity_name)
        t_res = await db.execute(t_rarity_stmt)
        target_rarity_id = t_res.scalar_one_or_none()

        outcomes = []
        for coll_id, count in collection_counts.items():
            outcome_stmt = (
                select(models.Skin, models.Collection, models.Weapon)
                .join(models.Collection, models.Skin.collection_id == models.Collection.collection_id)
                .join(models.Weapon, models.Skin.weapon_id == models.Weapon.weapon_id)
                .where(models.Skin.collection_id == coll_id)
                .where(models.Skin.rarity_id == target_rarity_id)
            )
            outcome_res = await db.execute(outcome_stmt)
            possible_skins = outcome_res.all()

            if not possible_skins:
                continue

            chance_per_skin = (count / 10) / len(possible_skins)

            for p_skin_row in possible_skins:
                p_skin = p_skin_row.Skin

                est_float = (avg_float * (p_skin.float_max - p_skin.float_min)) + p_skin.float_min
                out_wear_name = self.get_wear_name_from_float(est_float)
                out_wear_id = wear_map.get(out_wear_name)

                p_variant_stmt = (
                    select(models.SkinVariant.last_price, models.SkinVariant.variant_id)
                    .where(models.SkinVariant.skin_id == p_skin.skin_id)
                    .where(models.SkinVariant.wear_id == out_wear_id)
                    .where(models.SkinVariant.stattrack == is_stattrack)
                    .where(models.SkinVariant.souvenir == False)
                )
                p_v_res = await db.execute(p_variant_stmt)
                price_data = p_v_res.first()

                m_price = price_data[0] if price_data else 0.0
                v_id = price_data[1] if price_data else None

                outcomes.append({
                    "variant_id": str(v_id) if v_id else None,
                    "weapon_name": p_skin_row.Weapon.name,
                    "skin_name": p_skin.name,
                    "collection_name": p_skin_row.Collection.name,
                    "rarity_name": target_rarity_name,
                    "image_url": p_skin.image_url,
                    "chance": round(chance_per_skin * 100, 2),
                    "estimated_float": round(est_float, 10),
                    "estimated_wear": out_wear_name,
                    "market_price": m_price,
                    "is_profit": m_price > total_cost
                })

        return {
            "avg_float": round(avg_float, 10),
            "total_cost": round(total_cost, 2),
            "outcomes": outcomes
        }