from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from datetime import datetime

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

class SkinListRead(BaseRead):
    skin_id: UUID
    weapon_name: str
    skin_name: str
    wear_name: str
    stattrack: bool
    rarity_color: Optional[str]
    image_url: Optional[str]
    last_price: float
    change_1h: Optional[float] = None
    change_24h: Optional[float] = None
    change_7d: Optional[float] = None

class FilterOptionsRead(BaseRead):
    weapons: list[WeaponRead]
    collections: list[CollectionRead]
    rarities: list[RarityRead]
    wears: list[WearTypeRead]

class SkinPaginatedRead(BaseModel):
    items: list[SkinListRead]
    total: int

class PriceHistoryPoint(BaseRead):
    point: float
    updated_at: datetime

class SkinDetailsRead(SkinListRead):
    price_history: list[PriceHistoryPoint]

class MarketIndexRead(BaseRead):
    current_value: float
    change_24h: float
    chart_data: list[float]

class MarketSentimentRead(BaseRead):
    sentiment_value: float
    label: str

class MarketVolumeRead(BaseRead):
    market_volume: int

class MarketOverviewRead(BaseRead):
    index: MarketIndexRead
    sentiment: MarketSentimentRead
    volume: MarketVolumeRead

class SkinTradeUpRead(BaseRead):
    variant_id: UUID
    skin_id: UUID
    weapon_name: str
    skin_name: str
    wear_name: str
    stattrack: bool
    last_price: float
    image_url: Optional[str] = None
    collection_name: Optional[str] = None
    rarity_name: str
    float_min: float
    float_max: float

class TradeUpRequestItem(BaseModel):
    skin_id: UUID
    float_value: float

class TradeUpRequest(BaseModel):
    items: list[TradeUpRequestItem]
    stattrack: bool

class TradeUpOutcome(BaseRead):
    variant_id: UUID
    weapon_name: str
    skin_name: str
    collection_name: str
    rarity_name: str
    image_url: Optional[str] = None
    chance: float
    estimated_float: float
    estimated_wear: str
    market_price: float
    is_profit: bool

class TradeUpSimulationResult(BaseRead):
    avg_float: float
    total_cost: float
    outcomes: list[TradeUpOutcome]

class UserMeResponse(BaseModel):
    user_id: UUID
    steam_id: str
    name: str
    avatar_url: Optional[str] = None
    last_login_at: datetime