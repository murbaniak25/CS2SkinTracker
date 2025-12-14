import vdf
import os
import sys
from pathlib import Path

sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models import *

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


def seed_rarities():
    items, tokens = clean_dictionaries(items_dict, tokens_dict)
    if items is None or tokens is None:
        print("Wrong input data")
        return

    rarities_section = items.get('rarities', {})
    colors_section = items.get('colors', {})

    db = SessionLocal()
    try:
        for key, data in rarities_section.items():
            if key == 'unusual':
                continue

            loc_key = data.get('loc_key_weapon').lower()
            color_key = data.get('color')
            real_name = tokens.get(loc_key)
            color_data = colors_section.get(color_key)
            hex_value = color_data.get('hex_color')

            exists = db.query(models.Rarity).filter_by(name=real_name).first()
            if not exists:
                db.add(models.Rarity(name=real_name, color_hex=hex_value))
                print(f"Added: {real_name}")

        gold_name = "★"
        gold_color = "#ffd700"

        if not db.query(models.Rarity).filter_by(name=gold_name).first():
            db.add(models.Rarity(name=gold_name, color_hex=gold_color))
            print(f"Added: {gold_name}")

        db.commit()

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

def seed_wear_types():
    db = SessionLocal()
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
            exists = db.query(models.WearType).filter_by(name=wear).first()
            if not exists:
                db.add(models.WearType(name=wear))
                print(f"Added: {wear}")
        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

def seed_weapons():
    db = SessionLocal()
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
            exists = db.query(models.Weapon).filter_by(name=weapon).first()
            if not exists:
                db.add(models.Weapon(name=weapon))
                print(f"Added: {weapon}")

        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

def seed_collections():
    db = SessionLocal()
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
            exists = db.query(models.Collection).filter_by(name=name).first()
            if not exists:
                db.add(models.Collection(name=name))
                print(f"Added: {name}")
        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


def seed_cases():
    db = SessionLocal()
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
                    exists = db.query(models.Case).filter_by(name=case).first()
                    if not exists:
                        collection_obj = db.query(models.Collection).filter_by(name=collection).first()
                        if not collection_obj:
                            print(f"Warning: Collection '{collection}' not found for case '{case}'")
                        db.add(models.Case(name=case, collection=collection_obj))
                        print(f"Added: {case}")

        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

def seed_skins():
    count=0
    items, tokens = clean_dictionaries(items_dict, tokens_dict)
    if items is None or tokens is None:
        return
    item_sets_section = items.get('item_sets', {})
    paint_kits = items.get('paint_kits', {})
    items_def = items.get('items', {})
    prefabs_section = items.get('prefabs', {})
    paint_kit_rarities = items.get('paint_kits_rarity', {})
    rarities_section = items.get('rarities', {})

    db = SessionLocal()
    try:
        db_collections_map = {c.name: c.collection_id for c in db.query(models.Collection).all()}
        db_weapons_map = {w.name: w.weapon_id for w in db.query(models.Weapon).all()}
        db_rarities_map = {r.name: r.rarity_id for r in db.query(models.Rarity).all()}

        pk_map = {}
        for tag, data in paint_kits.items():
            internal_name = data.get('name')
            float_min = data.get('wear_remap_min')
            float_max = data.get('wear_remap_max')
            if not internal_name:
                continue
            desc_tag = data.get('description_tag')
            if desc_tag:
                clean = desc_tag.replace('#', '').lower()
                real_name = tokens.get(clean)
                if real_name:
                    pk_map[internal_name.lower()] = real_name, float_min, float_max

        weapon_tag_map = {}
        for key, data in items_def.items():
            technical_name = data.get('name')
            if not technical_name:
                continue
            weapon_token_raw = data.get('item_name')
            if not weapon_token_raw:
                prefab_tag = data.get('prefab')
                if prefab_tag:
                    weapon_token_raw = prefabs_section.get(prefab_tag, {}).get('item_name')
            if weapon_token_raw:
                clean_token = weapon_token_raw.replace("#", "").lower()
                real_name = tokens.get(clean_token)
                if real_name:
                    weapon_tag_map[technical_name.lower()] = real_name

        rarities_map = {}
        for key, data in paint_kit_rarities.items():
            paint_kit = key.lower()
            rarity_raw = rarities_section.get(data).get('loc_key_weapon').lower()
            rarity = tokens.get(rarity_raw)
            rarities_map[paint_kit] = rarity

        # Some skins (e.g., Doppler, Gamma Doppler, Tiger Tooth) have multiple internal entries
        # in items_game.txt for different "Phases" (Phase 1-4, Emerald, Sapphire, etc.).
        # However, they all map to the SAME display name (e.g., "Gamma Doppler").
        # This set acts as a runtime cache to track (weapon_id, skin_name) pairs we have already processed.
        # It prevents the script from trying to insert the same skin name for the same weapon multiple times,
        # which would cause a database unique constraint violation crash.

        processed_skins = set()
        count = 0
        for key, data in item_sets_section.items():
            item_set_token_raw = data.get('name')
            item_set_token = item_set_token_raw.replace("#", "").lower()
            collection_name = tokens.get(item_set_token)
            if collection_name not in db_collections_map:
                continue
            items = data.get('items', {})
            for item_str in items:
                parts = item_str.split(']')
                weapon_name_tag = parts[1]
                paint_kit_tag = parts[0].replace('[','').lower()
                weapon = weapon_tag_map[weapon_name_tag]
                skin_name = pk_map[paint_kit_tag][0]
                rarity = rarities_map[paint_kit_tag]
                float_min = pk_map[paint_kit_tag][1]
                float_max = pk_map[paint_kit_tag][2]

                collection_id = db_collections_map[collection_name]
                weapon_id = db_weapons_map[weapon]
                rarity_id = db_rarities_map[rarity]

                if (weapon_id, skin_name) in processed_skins:
                    continue
                processed_skins.add((weapon_id, skin_name))
                exists = db.query(models.Skin).filter_by(name=skin_name, weapon_id=weapon_id).first()
                if not exists:
                    new_skin = Skin(name=skin_name, float_min=float_min, float_max=float_max, collection_id=collection_id, weapon_id = weapon_id, rarity_id = rarity_id)
                    db.add(new_skin)
                    print(f"Added: {weapon} | {skin_name}")
                    count+=1
        db.commit()
        print(f"Added: {count} Skins")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()



if __name__ == "__main__":
    seed_rarities()
    seed_wear_types()
    seed_weapons()
    seed_collections()
    seed_cases()
    seed_skins()