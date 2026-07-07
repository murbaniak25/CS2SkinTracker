export interface Skin {
  skin_id: string;
  weapon_name: string;
  skin_name: string;
  wear_name: string;
  stattrack: boolean;
  souvenir: boolean;
  rarity_color: string;
  image_url: string | null;
  last_price: number;
  change_1h: number | null;
  change_24h: number | null;
  change_7d: number | null;
}

// Definicje pomocnicze dla opcji filtrowania
export interface WeaponOption {
  weapon_id: string;
  name: string;
}

export interface CollectionOption {
  collection_id: string;
  name: string;
}

export interface WearOption {
  wear_id: string;
  name: string;
}

export interface RarityOption {
  rarity_id: string;
  name: string;
  color_hex: string;
}

export interface FilterOptions {
  // Zmiana ze string[] na obiekty, aby pasowało do JSON-a
  weapons: WeaponOption[];
  collections: CollectionOption[];
  rarities: RarityOption[];
  wears: WearOption[];
}

export interface PaginatedSkinResponse {
  items: Skin[];
  total: number;
}

export interface PricePoint {
  point: number;
  updated_at: string;
}

export interface SkinDetails extends Skin {
  price_history: PricePoint[];
}

export interface MarketIndexData {
  current_value: number;
  change_24h: number;
  chart_data: number[];
}

export interface MarketSentimentData {
  sentiment_value: number;
  label: string;
}

export interface MarketVolumeData {
  market_volume: number;
}

export interface MarketOverviewResponse {
  index: MarketIndexData;
  sentiment: MarketSentimentData;
  volume: MarketVolumeData;
}

export interface SkinTradeUpRead {
  skin_id: string;
  variant_id: string;
  weapon_name: string;
  skin_name: string;
  wear_name: string;
  stattrack: boolean;
  last_price: number;
  image_url: string | null;
  collection_name: string | null;
  rarity_name: string;
  float_min: number;
  float_max: number;
}

export interface TradeUpOutcome {
  variant_id: string | null;
  weapon_name: string;
  skin_name: string;
  collection_name: string;
  rarity_name: string;
  image_url: string | null;
  chance: number;
  estimated_float: number;
  estimated_wear: string;
  market_price: number;
  is_profit: boolean;
}

export interface TradeUpSimulationResult {
  avg_float: number;
  total_cost: number;
  outcomes: TradeUpOutcome[];
}

export interface TradeUpRequestItem {
  skin_id: string;
  float_value: number;
}

export interface TradeUpRequest {
  items: TradeUpRequestItem[];
  stattrack: boolean;
}

export interface UserMeResponse {
    user_id: string;
    steam_id: string;
    name: string;
    avatar_url?: string;
    last_login_at: string;
}

export interface InventoryItem {
  weapon: string;
  skin: string;
  wear: string;
  stattrack: boolean;
  souvenir: boolean;
  price: number;
  quantity: number;
  floats: number[];
  image_url?: string;
}

export interface PortfolioSnapshot {
  id: string;
  total_value: number;
  items_count: number;
  currency: string;
  created_at: string;
  items_data: InventoryItem[];
}