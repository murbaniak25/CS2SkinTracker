import { useState, useEffect } from "react";
import api from "../api/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Button from "../components/common/Button";
import type { PortfolioSnapshot } from "../types/api";

const InventoryView = () => {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Pobieranie historii z bazy danych
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<PortfolioSnapshot[]>("/user/portfolio/history");
      setSnapshots(res.data);
    } catch (err) {
      console.error("Failed to fetch portfolio history", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 2. Akcja synchronizacji ze Steam (wywołanie Celery w tle / API)
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.post("/user/sync-inventory");
      await fetchHistory();
    } catch (err) {
      console.error("Failed to sync inventory", err);
      alert("Error syncing inventory. Check console.");
    } finally {
      setIsSyncing(false);
    }
  };

  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  const itemsData = latestSnapshot?.items_data || [];

  const sortedByChange = [...itemsData].sort(
    (a, b) => b.change_24h - a.change_24h,
  );
  const topGainer =
    sortedByChange.length > 0 && sortedByChange[0].change_24h > 0
      ? sortedByChange[0]
      : null;
  const topLoser =
    sortedByChange.length > 0 &&
    sortedByChange[sortedByChange.length - 1].change_24h < 0
      ? sortedByChange[sortedByChange.length - 1]
      : null;

  const mostValuable =
    [...itemsData].sort((a, b) => b.price - a.price)[0] || null;

  const chartData = [...snapshots].reverse().map((snap) => ({
    date: new Date(snap.created_at).toLocaleDateString(),
    value: Number(snap.total_value.toFixed(2)),
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh] text-primary animate-pulse tracking-[0.3em] uppercase font-black text-[12px]">
        Loading Armory...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* SEKCJA 1: HEADER & STATS */}
      <div className="bg-bg border border-border-muted rounded-sm p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-[12px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">
            Current Inventory Value
          </h2>
          <div className="flex items-end gap-3">
            <span className="text-[36px] font-black text-primary leading-none uppercase tracking-tighter">
              {latestSnapshot ? latestSnapshot.total_value.toFixed(2) : "0.00"}{" "}
              PLN
            </span>
            {latestSnapshot && (
              <span className="text-[12px] font-bold text-text-muted uppercase mb-1">
                {latestSnapshot.items_count} Items
              </span>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleSync}
          disabled={isSyncing}
          className="px-8 py-3 bg-[oklch(0.76_0.1_271)] h-[48px] uppercase tracking-widest font-black"
        >
          {isSyncing ? "Syncing..." : "Sync Steam Inventory"}
        </Button>
      </div>
      {/* SEKCJA 1.5: HIGHLIGHTS (MVP, Top Gainer, Top Loser) */}
      {(mostValuable || topGainer || topLoser) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MOST VALUABLE ITEM */}
          {mostValuable && (
            <div
              className="bg-bg border border-border-muted rounded-sm p-4 flex items-center gap-4 shadow-xl border-l-4 transition-all hover:bg-bg-light/10"
              style={{
                borderLeftColor: mostValuable.rarity_color || "var(--primary)",
              }}
            >
              <div className="w-16 h-16 flex-shrink-0 bg-bg-dark/50 rounded-sm p-1">
                {mostValuable.image_url ? (
                  <img
                    src={mostValuable.image_url}
                    alt=""
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] opacity-30">
                    NO IMG
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Most Valuable
                </p>
                <p
                  className="text-[11px] font-black uppercase truncate"
                  style={{ color: mostValuable.rarity_color }}
                >
                  {mostValuable.weapon} | {mostValuable.skin}
                </p>
                <p className="text-[14px] font-black text-text mt-0.5">
                  {mostValuable.price.toFixed(2)} PLN
                </p>
              </div>
            </div>
          )}

          {/* TOP GAINER */}
          {topGainer && (
            <div className="bg-bg border border-border-muted rounded-sm p-4 flex items-center gap-4 shadow-xl border-l-4 border-l-green-500 transition-all hover:bg-bg-light/10">
              <div className="w-16 h-16 flex-shrink-0 bg-bg-dark/50 rounded-sm p-1">
                {topGainer.image_url ? (
                  <img
                    src={topGainer.image_url}
                    alt=""
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] opacity-30">
                    NO IMG
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  Top Gainer (24H)
                </p>
                <p className="text-[11px] font-black text-text uppercase truncate">
                  {topGainer.weapon} | {topGainer.skin}
                </p>
                <p className="text-[14px] font-black text-green-500 mt-0.5">
                  +{topGainer.change_24h.toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {/* TOP LOSER */}
          {topLoser && (
            <div className="bg-bg border border-border-muted rounded-sm p-4 flex items-center gap-4 shadow-xl border-l-4 border-l-red-500 transition-all hover:bg-bg-light/10">
              <div className="w-16 h-16 flex-shrink-0 bg-bg-dark/50 rounded-sm p-1">
                {topLoser.image_url ? (
                  <img
                    src={topLoser.image_url}
                    alt=""
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] opacity-30">
                    NO IMG
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                  Top Loser (24H)
                </p>
                <p className="text-[11px] font-black text-text uppercase truncate">
                  {topLoser.weapon} | {topLoser.skin}
                </p>
                <p className="text-[14px] font-black text-red-500 mt-0.5">
                  {topLoser.change_24h.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* SEKCJA 2: WYKRES (Jeśli są dane) */}
      {snapshots.length > 0 && (
        <div className="bg-bg border border-border-muted rounded-sm p-8 shadow-2xl">
          <h3 className="text-[12px] font-black uppercase tracking-widest mb-6">
            Value History
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="oklch(0.3 0.02 271)"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  orientation="right"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickFormatter={(v) => `${v} PLN`}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `${Number(value).toFixed(2)} PLN`,
                    "Portfolio Value",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--bg-dark)",
                    border: "1px solid var(--border-muted)",
                    borderRadius: "2px",
                    fontFamily: "Outfit",
                  }}
                  itemStyle={{
                    color: "var(--primary)",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                  labelStyle={{
                    color: "var(--text-muted)",
                    fontSize: "10px",
                    marginBottom: "4px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SEKCJA 3: AKTUALNY EKWIPUNEK (Siatka itemów z JSONA) */}
      {latestSnapshot ? (
        <div className="bg-bg border border-border-muted rounded-sm shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-border-muted bg-bg-light/5">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-text">
              Current Inventory
            </h3>
          </div>
          <div className="p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {latestSnapshot.items_data.map((item, idx) => (
              <div
                key={idx}
                className="bg-bg-light/10 border p-4 rounded-sm hover:scale-[1.02] transition-all flex flex-col relative group overflow-hidden shadow-md hover:shadow-xl"
                style={{
                  borderColor: `${item.rarity_color}50`,
                  backgroundImage: `linear-gradient(to top, ${item.rarity_color}30 0%, transparent 60%)`,
                }}
              >
                {/* Wskaźnik ilości sztuk (Quantity) */}
                {item.quantity > 1 && (
                  <div className="absolute top-2 right-2 bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-sm text-[9px] font-black z-10">
                    x{item.quantity}
                  </div>
                )}

                <div className="flex-1 min-h-[80px] flex items-center justify-center relative mb-4">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={`${item.weapon} ${item.skin}`}
                      className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-center text-[8px] font-black text-text-muted/30 uppercase text-center p-2 rounded-sm border border-dashed border-border-muted/30">
                      NO IMAGE
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase text-text truncate leading-tight flex flex-col">
                    <span>{item.weapon}</span>
                    <span className="text-[13px] text-primary truncate mt-0.5">
                      {item.skin}
                    </span>
                  </p>

                  <div className="flex items-center gap-1 mt-1.5">
                    {item.stattrack && (
                      <span className="text-[8px] text-[#CF6A32] border border-[#CF6A32]/40 px-1 rounded-sm font-black tracking-widest">
                        ST™
                      </span>
                    )}
                    {item.souvenir && (
                      <span className="text-[8px] text-[#FFD700] border border-[#FFD700]/40 px-1 rounded-sm font-black tracking-widest">
                        SOV
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider truncate">
                      {item.wear}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-muted/30 flex justify-between items-end">
                  <div className="text-[14px] font-black text-text">
                    {item.price.toFixed(2)} PLN
                  </div>
                  {item.quantity > 1 && (
                    <div className="text-[9px] font-bold text-text-muted">
                      Total: {(item.price * item.quantity).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-bg border border-border-muted rounded-sm p-16 text-center text-text-muted shadow-2xl">
          <svg
            className="w-12 h-12 mx-auto mb-4 opacity-20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-[14px] font-black uppercase tracking-widest mb-2">
            No Data Found
          </p>
          <p className="text-[12px] font-bold">
            Sync your Steam inventory to start tracking your portfolio value.
          </p>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
