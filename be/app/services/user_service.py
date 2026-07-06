from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy import select
from app.models.models import UserSkin
import re

class UserService:
    async def fetch_steam_inventory(self, steam_id: int):
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
            key = str(prop.get("asset_id"))

            float_val = None

            for detail in prop.get("asset_properties", []):
                if detail.get("name") == "Wear Rating":
                    float_val = detail.get("float_value")
                    break

            properties_map[key] = float_val

        inventory_items = []
        for asset in data.get("assets", []):
            key = f"{asset['asset_id']}_{asset['instanceid']}"
            desc = description_map.get(key)
            asset_id = str(asset.get("asset_id"))

            if desc and desc.get("marketable") == 1:
                item_float = properties_map.get(asset_id)

                item_data = {
                    "asset_id": asset_id,
                    "market_hash_name": desc.get("market_hash_name"),
                    "float_value": item_float
                }

                inventory_items.append(item_data)

        return inventory_items




