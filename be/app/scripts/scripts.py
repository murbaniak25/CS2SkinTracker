import vdf
import os
import sys
import asyncio
import httpx
from pathlib import Path

sys.path.append(os.getcwd())

from sqlalchemy import select
from app.db.session import SessionLocal
import app.models as models

BASE_DIR = Path(os.getcwd())
DATA_DIR = BASE_DIR / "data"


def load_vdf(path):
    if not path.exists():
        return None
    try:
        with open(path, 'r', encoding='utf-16') as f:
            return vdf.load(f)
    except UnicodeError:
        with open(path, 'r', encoding='utf-8') as f:
            return vdf.load(f)
    except Exception as e:
        print(f"Error: {e}")
        return None


items_dict = load_vdf(DATA_DIR / "items_game.txt")
tokens_dict = load_vdf(DATA_DIR / "csgo_english.txt")


def clean_dictionaries(raw_items, raw_tokens):
    if not raw_items or not raw_tokens:
        print("Error: Wrong input data")
        return None, None

    items_root = raw_items.get('items_game')
    lang_section = raw_tokens.get('lang', {})
    tokens_root = lang_section.get('Tokens', {})
    tokens_clean = {k.lower(): v for k, v in tokens_root.items()}

    return items_root, tokens_clean


async def seed_rarities():
    items, tokens = clean_dictionaries(items_dict, tokens_dict)
    if items is None or tokens is None:
        print("Wrong input data")
        return

    rarities_section = items.get('rarities', {})
    colors_section = items.get('colors', {})

    async with SessionLocal() as db:
        try:
            for key, data in rarities_section.items():
                if key == 'unusual':
                    continue

                loc_key = data.get('loc_key_weapon').lower()
                color_key = data.get('color')
                real_name = tokens.get(loc_key)
                color_data = colors_section.get(color_key)
                hex_value = color_data.get('hex_color')

                stmt = select(models.Rarity).filter_by(name=real_name)
                result = await db.execute(stmt)
                exists = result.scalar_one_or_none()
                if not exists:
                    db.add(models.Rarity(name=real_name, color_hex=hex_value))
                    print(f"Added: {real_name}")

            gold_name = "★"
            gold_color = "#ffd700"

            gold_stmt = select(models.Rarity).filter_by(name=gold_name)
            gold_result = await db.execute(gold_stmt)

            if not gold_result.scalar_one_or_none():
                db.add(models.Rarity(name=gold_name, color_hex=gold_color))
                print(f"Added: {gold_name}")

            await db.commit()

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()

async def seed_wear_types():
    async with SessionLocal() as db:
        try:
            wears = [
                "Factory New",
                "Minimal Wear",
                "Field-Tested",
                "Well-Worn",
                "Battle-Scarred",
                "Not Painted"
            ]
            for wear in wears:
                stmt = select(models.WearType).filter_by(name=wear)
                result = await db.execute(stmt)
                exists = result.scalar_one_or_none()
                if not exists:
                    db.add(models.WearType(name=wear))
                    print(f"Added: {wear}")
            await db.commit()
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()

async def seed_weapons():
    async with SessionLocal() as db:
        items, tokens = clean_dictionaries(items_dict, tokens_dict)
        if items is None or tokens is None:
            print("Wrong input data")
            return
        items_section = items.get('items', {})
        prefabs_section = items.get('prefabs', {})

        SKIP_KEYWORDS = [
            'flashbang',
            'grenade',
            'molotov',
            'decoy',
            'healthshot',
            'case'
        ]
        try:
            for key, data in items_section.items():
                prefab = data.get('prefab')

                if not prefab:
                    continue
                if 'melee_unusual' not in prefab and 'weapon' not in prefab:
                    continue

                if any(bad in prefab for bad in SKIP_KEYWORDS):
                    continue

                if prefab == 'melee_unusual':
                    raw_token = data.get('item_name')
                else:
                    raw_token = prefabs_section.get(prefab, {}).get('item_name')

                clean_tag = raw_token.replace("#", "").lower()
                weapon = tokens.get(clean_tag)
                stmt = select(models.Weapon).filter_by(name=weapon)
                result = await db.execute(stmt)
                exists = result.scalar_one_or_none()
                if not exists:
                    db.add(models.Weapon(name=weapon))
                    print(f"Added: {weapon}")

            await db.commit()
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()

async def seed_collections():
    async with SessionLocal() as db:
        items, tokens = clean_dictionaries(items_dict, tokens_dict)
        if items is None or tokens is None:
            print("Wrong input data")
            return
        collections_section = items.get('item_sets',{})
        try:
            for key, data in collections_section.items():
                name_token_raw = data.get('name')
                name_token = name_token_raw.replace("#", "").lower()
                name = tokens.get(name_token)
                if 'Collection' not in name or 'X-Ray' in name:
                    continue
                stmt = select(models.Collection).filter_by(name=name)
                result = await db.execute(stmt)
                exists = result.scalar_one_or_none()
                if not exists:
                    db.add(models.Collection(name=name))
                    print(f"Added: {name}")
            await db.commit()
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


async def seed_cases():
    async with SessionLocal() as db:
        items, tokens = clean_dictionaries(items_dict, tokens_dict)
        if items is None or tokens is None:
            print("Wrong input data")
            return
        items_section = items.get('items', {})

        try:
            for key, data in items_section.items():
                prefab = data.get('prefab')

                if not prefab:
                    continue

                if prefab == 'weapon_case' or prefab == 'weapon_case_base':
                    raw_token = data.get('item_name')
                    clean_tag = raw_token.replace("#", "").lower()
                    case = tokens.get(clean_tag)

                    if 'case' in case.lower():
                        raw_collection_token = data.get('tags').get('ItemSet').get('tag_text')
                        clean_collection_tag = raw_collection_token.replace("#", "").lower()
                        collection = tokens.get(clean_collection_tag)
                        stmt = select(models.Case).filter_by(name=case)
                        result = await db.execute(stmt)
                        exists = result.scalar_one_or_none()
                        if not exists:
                            coll_stmt = select(models.Collection).filter_by(name=collection)
                            result = await db.execute(coll_stmt)
                            collection_obj = result.scalar_one_or_none()
                            if not collection_obj:
                                print(f"Warning: Collection '{collection}' not found for case '{case}'")
                            db.add(models.Case(name=case, collection=collection_obj))
                            print(f"Added: {case}")

            await db.commit()
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()


async def seed_skins():
    count = 0
    items, tokens = clean_dictionaries(items_dict, tokens_dict)
    if items is None or tokens is None:
        return

    url = "https://raw.githubusercontent.com/ByMykel/CSGO-API/refs/heads/main/public/api/en/skins.json"
    api_map = {}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            if response.status_code == 200:
                external_skins = response.json()
                api_map = {item['name']: {
                    'rarity': item.get('rarity', {}).get('name'),
                    'image': item.get('image')
                } for item in external_skins}
                print(f"Załadowano {len(api_map)} rekordów z API.")
        except Exception as e:
            print(f"Błąd API: {e}. Kontynuuję z VDF (może być błędne rarity).")

    item_sets_section = items.get('item_sets', {})
    paint_kits = items.get('paint_kits', {})
    items_def = items.get('items', {})
    prefabs_section = items.get('prefabs', {})

    async with SessionLocal() as db:
        try:
            res_coll = await db.execute(select(models.Collection))
            db_collections_map = {c.name: c.collection_id for c in res_coll.scalars().all()}

            res_weap = await db.execute(select(models.Weapon))
            db_weapons_map = {w.name: w.weapon_id for w in res_weap.scalars().all()}

            res_rar = await db.execute(select(models.Rarity))
            db_rarities_map = {r.name: r.rarity_id for r in res_rar.scalars().all()}

            pk_map = {}
            for tag, data in paint_kits.items():
                internal_name = data.get('name')
                if not internal_name: continue
                f_min = float(data.get('wear_remap_min', 0.0))
                f_max = float(data.get('wear_remap_max', 1.0))
                desc_tag = data.get('description_tag', '').replace('#', '').lower()
                real_name = tokens.get(desc_tag)
                if real_name:
                    pk_map[internal_name.lower()] = (real_name, f_min, f_max)

            weapon_tag_map = {}
            for key, data in items_def.items():
                tech_name = data.get('name')
                if not tech_name: continue
                token = data.get('item_name') or prefabs_section.get(data.get('prefab', ''), {}).get('item_name')
                if token:
                    weapon_tag_map[tech_name.lower()] = tokens.get(token.replace("#", "").lower())

            processed_skins = set()
            for key, data in item_sets_section.items():
                coll_name = tokens.get(data.get('name', '').replace("#", "").lower())
                if coll_name not in db_collections_map: continue

                items_in_set = data.get('items', {})
                for item_str in items_in_set:
                    parts = item_str.split(']')
                    if len(parts) < 2: continue
                    paint_kit_tag = parts[0].replace('[', '').lower()
                    weapon_tag = parts[1].lower()

                    weapon = weapon_tag_map.get(weapon_tag)
                    skin_info = pk_map.get(paint_kit_tag)
                    if not weapon or not skin_info: continue

                    skin_name = skin_info[0]
                    full_name = f"{weapon} | {skin_name}"

                    api_data = api_map.get(full_name)
                    if api_data and api_data['rarity']:
                        rarity_name = api_data['rarity']
                    else:
                        continue

                    rarity_id = db_rarities_map.get(rarity_name)
                    image_url = api_data.get('image') if api_data else None

                    if not rarity_id: continue

                    if (db_weapons_map[weapon], skin_name) in processed_skins: continue
                    processed_skins.add((db_weapons_map[weapon], skin_name))

                    stmt = select(models.Skin).filter_by(name=skin_name, weapon_id=db_weapons_map[weapon])
                    result = await db.execute(stmt)
                    if not result.scalar_one_or_none():
                        new_skin = models.Skin(
                            name=skin_name,
                            float_min=skin_info[1],
                            float_max=skin_info[2],
                            collection_id=db_collections_map[coll_name],
                            weapon_id=db_weapons_map[weapon],
                            rarity_id=rarity_id,
                            image_url=image_url
                        )
                        db.add(new_skin)
                        print(f"Added: {full_name} ({rarity_name})")
                        count += 1

            await db.commit()
            print(f"Dodano: {count} skinów.")
        except Exception as e:
            print(f"Błąd: {e}")
            await db.rollback()

async def seed_images():
    url = "https://raw.githubusercontent.com/ByMykel/CSGO-API/refs/heads/main/public/api/en/skins.json"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            if response.status_code != 200:
                print("Error during request")
                return
            external_skins = response.json()
        except Exception as e:
            print(f"Error: {e}")
            return

        image_map = {item['name']: item['image'] for item in external_skins if 'image' in item}
        print(f"Loaded {len(image_map)} images.")

        async with SessionLocal() as db:
            try:
                stmt = select(models.Skin, models.Weapon.name).join(models.Weapon)
                result = await db.execute(stmt)
                skins_to_update = result.all()

                count = 0
                for skin_obj, weapon_name in skins_to_update:
                    full_name = f"{weapon_name} | {skin_obj.name}"
                    image_url = image_map.get(full_name)

                    if image_url:
                        skin_obj.image_url = image_url
                        count += 1

                await db.commit()
                print(f"Updated: {count} images")

            except Exception as e:
                print(f"Error during image seeding: {e}")
                await db.rollback()



async def main():
    await seed_rarities()
    await seed_wear_types()
    await seed_weapons()
    await seed_collections()
    await seed_cases()
    await seed_skins()
    await seed_images()

if __name__ == "__main__":
    asyncio.run(main())