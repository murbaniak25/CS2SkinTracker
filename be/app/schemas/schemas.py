from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional

class BaseRead(BaseModel):
    model_config = ConfigDict(from_attributes = True)

class WearTypeRead(BaseRead):
    wear_id: UUID
    name: str

class RarityRead(BaseRead):
    rarity_id: UUID
    name: str
    color_hex: str

class CollectionRead(BaseRead):
    collection_id: UUID
    name: str

class WeaponRead(BaseRead):
    weapon_id: UUID
    name:str

class CaseRead(BaseRead):
    case_id: UUID
    collection: CollectionRead
    name: str

class SkinRead(BaseRead):
    skin_id: UUID
    name:str
    image_url: Optional[str] = None
    float_min: float
    float_max: float
    collection: Optional[CollectionRead] = None
    weapon: WeaponRead
    rarity: RarityRead




