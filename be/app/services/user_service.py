from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy import select, delete, desc, and_

from app.core.utils import get_utc_now
from app.models.models import UserSkin, WearType, Weapon, Skin, User, Rarity, SkinVariant, UserPortfolioSnapshot
import re

class UserService:
    async def fetch_steam_inventory(self, steam_id: str):
        url = f"https://steamcommunity.com/inventory/{steam_id}/730/2?l=english&count=2000"

        async with AsyncClient() as client:
            response = await client.get(url)

            if response.status_code == 403:
                raise HTTPException(status_code=403, detail="This inventory is private")
            elif response.status_code == 429:
                raise HTTPException(status_code=429,
                                    detail="Rate limit exceeded")
            elif response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Could not fetch inventory")

            data = response.json()

            if "assets" not in data or "descriptions" not in data:
                return []

            parsed_inventory = self.parse_steam_inventory(data)

            return parsed_inventory

    def parse_steam_inventory(self, data):
        description_map = {}
        for desc in data.get("descriptions", []):
            key = f"{desc['classid']}_{desc['instanceid']}"
            description_map[key] = desc

        properties_map = {}
        for prop in data.get("asset_properties", []):
            key = str(prop.get("assetid"))

            float_val = None

            for detail in prop.get("asset_properties", []):
                if detail.get("name") == "Wear Rating":
                    raw_float = detail.get("float_value")
                    if raw_float is not None:
                        try:
                            float_val = float(raw_float)
                        except (ValueError, TypeError):
                            float_val = None
                    break

            properties_map[key] = float_val

        inventory_items = []
        for asset in data.get("assets", []):
            key = f"{asset['classid']}_{asset['instanceid']}"
            desc = description_map.get(key)
            asset_id = str(asset.get("assetid"))

            if desc and desc.get("marketable") == 1:
                item_float = properties_map.get(asset_id)

                item_data = {
                    "asset_id": asset_id,
                    "market_hash_name": desc.get("market_hash_name"),
                    "float_value": item_float
                }

                inventory_items.append(item_data)

        return inventory_items

    async def sync_user_inventory_db(self, db: AsyncSession, user_id, parsed_items: list):
        wears_res = await db.execute(select(WearType))
        wears_map = {w.name: w.wear_id for w in wears_res.scalars().all()}

        weapons_res = await db.execute(select(Weapon))
        weapons_map = {w.name: w.weapon_id for w in weapons_res.scalars().all()}

        skins_res = await db.execute(select(Skin))
        skins_map = {(s.weapon_id, s.name): s.skin_id for s in skins_res.scalars().all()}

        user_skins_to_add = []

        for item in parsed_items:
            parsed_name = self.parse_market_hash_name(item["market_hash_name"])

            weapon_name = parsed_name["weapon_name"]
            skin_name = parsed_name["skin_name"]
            wear_name = parsed_name["wear_name"]

            weapon_id = weapons_map.get(weapon_name)
            if not weapon_id:
                continue

            if not skin_name:
                skin_name = weapon_name

            skin_id = skins_map.get((weapon_id, skin_name))
            if not skin_id:
                continue

            wear_id = wears_map.get(wear_name) if wear_name else None

            new_user_skin = UserSkin(
                user_id=user_id,
                skin_id=skin_id,
                wear_id=wear_id,
                stattrack=parsed_name["stattrack"],
                souvenir=parsed_name["souvenir"],
                float_value=item.get("float_value"),
                fetched_at=get_utc_now()
            )

            user_skins_to_add.append(new_user_skin)

        await db.execute(delete(UserSkin).where(UserSkin.user_id == user_id))

        if user_skins_to_add:
            db.add_all(user_skins_to_add)

        await db.flush()

        inventory_dump_stmt = (
            select(
                Weapon.name.label("weapon_name"),
                Skin.name.label("skin_name"),
                WearType.name.label("wear_name"),
                UserSkin.float_value,
                UserSkin.stattrack,
                UserSkin.souvenir,
                SkinVariant.last_price,
                SkinVariant.change_24h,
                Skin.image_url,
                Rarity.color_hex.label("rarity_color")
            )
            .select_from(UserSkin)
            .join(Skin, UserSkin.skin_id == Skin.skin_id)
            .join(Weapon, Skin.weapon_id == Weapon.weapon_id)
            .outerjoin(WearType, UserSkin.wear_id == WearType.wear_id)
            .outerjoin(Rarity, Skin.rarity_id == Rarity.rarity_id)
            .outerjoin(
                SkinVariant,
                and_(
                    UserSkin.skin_id == SkinVariant.skin_id,
                    UserSkin.wear_id == SkinVariant.wear_id,
                    UserSkin.stattrack == SkinVariant.stattrack,
                    UserSkin.souvenir == SkinVariant.souvenir
                )
            )
            .where(UserSkin.user_id == user_id)
        )

        items_res = await db.execute(inventory_dump_stmt)
        items_list = items_res.mappings().all()

        grouped_items = {}
        total_value = 0.0

        for item in items_list:
            price = item["last_price"] or 0.0
            total_value += price

            item_key = (
                item["weapon_name"],
                item["skin_name"],
                item["wear_name"],
                item["stattrack"],
                item["souvenir"]
            )

            if item_key not in grouped_items:
                grouped_items[item_key] = {
                    "weapon": item["weapon_name"],
                    "skin": item["skin_name"],
                    "wear": item["wear_name"],
                    "stattrack": item["stattrack"],
                    "souvenir": item["souvenir"],
                    "price": price,
                    "quantity": 1,
                    "floats": [item["float_value"]] if item["float_value"] else [],
                    "image_url": item["image_url"],
                    "change_24h": item["change_24h"] or 0.0,
                    "rarity_color": item["rarity_color"] or "#9ca3af"
                }
            else:
                grouped_items[item_key]["quantity"] += 1
                if item["float_value"]:
                    grouped_items[item_key]["floats"].append(item["float_value"])

        snapshot_json_data = list(grouped_items.values())

        new_snapshot = UserPortfolioSnapshot(
            user_id=user_id,
            total_value=total_value,
            items_count=len(items_list),
            currency="PLN",
            items_data=snapshot_json_data
        )
        db.add(new_snapshot)

        user_res = await db.execute(select(User).where(User.user_id == user_id))
        user = user_res.scalar_one_or_none()
        if user:
            user.last_inventory_synced = get_utc_now()

        await db.commit()

    def parse_market_hash_name(self, market_hash_name):
        parsed: dict[str, str | bool | None] = {
            "weapon_name": None,
            "skin_name": None,
            "wear_name": None,
            "stattrack": False,
            "souvenir": False
        }

        if "StatTrak™ " in market_hash_name:
            parsed["stattrack"] = True
            market_hash_name = market_hash_name.replace("StatTrak™ ", "")

        elif "Souvenir " in market_hash_name:
            parsed["souvenir"] = True
            market_hash_name = market_hash_name.replace("Souvenir ", "")

        if " | " in market_hash_name:
            parts = market_hash_name.split(" | ", 1)
            parsed["weapon_name"] = parts[0].strip()
            rest = parts[1].strip()

            wear_match = re.search(r" \(([^)]+)\)$", rest)
            if wear_match:
                parsed["wear_name"] = wear_match.group(1)
                parsed["skin_name"] = rest[:wear_match.start()].strip()
            else:
                parsed["skin_name"] = rest
        else:
            parsed["weapon_name"] = market_hash_name.strip()

        return parsed

    async def get_user_inventory(self, db: AsyncSession, user_id):
        stmt = (select(
            Skin.skin_id,
            Weapon.name.label("weapon_name"),
            Skin.name.label("skin_name"),
            WearType.name.label("wear_name"),
            UserSkin.stattrack,
            UserSkin.souvenir,
            Rarity.color_hex.label("rarity_color"),
            Skin.image_url,
            SkinVariant.last_price,
            SkinVariant.change_1h,
            SkinVariant.change_24h,
            SkinVariant.change_7d
        )
            .select_from(UserSkin)
            .join(Skin, UserSkin.skin_id == Skin.skin_id)
            .join(Weapon, Skin.weapon_id == Weapon.weapon_id)
            .outerjoin(WearType, UserSkin.wear_id == WearType.wear_id)
            .outerjoin(Rarity, Skin.rarity_id == Rarity.rarity_id)
            .outerjoin(
            SkinVariant,
            and_(
                UserSkin.skin_id == SkinVariant.skin_id,
                UserSkin.wear_id == SkinVariant.wear_id,
                UserSkin.stattrack == SkinVariant.stattrack,
                UserSkin.souvenir == SkinVariant.souvenir
            )
        )
            .where(UserSkin.user_id == user_id)
            .order_by(desc(SkinVariant.last_price).nulls_last())
        )
        result = await db.execute(stmt)
        return result.mappings().all()

    async def get_inventory_history(self, db: AsyncSession, user_id):
        stmt = (
            select(UserPortfolioSnapshot)
            .where(UserPortfolioSnapshot.user_id == user_id)
            .order_by(UserPortfolioSnapshot.created_at.desc())
        )

        result = await db.execute(stmt)
        snapshots = result.scalars().all()

        return snapshots





