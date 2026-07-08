import { useState, useEffect } from "react";
import axios from "axios";
import type {
  Skin,
  FilterOptions,
  PaginatedSkinResponse,
  MarketOverviewResponse,
} from "../types/api";
import StatCard from "../components/dashboard/StatCard";
import MarketSection from "../components/dashboard/MarketSection";
import Button from "../components/common/Button";

const MarketView = () => {
  // --- STANY SYSTEMOWE ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [skins, setSkins] = useState<Skin[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null,
  );
  const [marketOverview, setMarketOverview] =
    useState<MarketOverviewResponse | null>(null);

  // --- STANY AKTYWNE (Wysyłane do API) ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [activeSearch, setActiveSearch] = useState("");
  const [activeCondition, setActiveCondition] = useState("");
  const [activeRarity, setActiveRarity] = useState("");
  const [activeCollection, setActiveCollection] = useState("");
  const [activeStatTrak, setActiveStatTrak] = useState<boolean | null>(null);
  const [activeSouvenir, setActiveSouvenir] = useState<boolean | null>(null);

  // --- STANY TYMCZASOWE (UI Modala) ---
  const [tempSearch, setTempSearch] = useState("");
  const [tempCondition, setTempCondition] = useState("");
  const [tempRarity, setTempRarity] = useState("");
  const [tempCollection, setTempCollection] = useState("");
  const [tempStatTrak, setTempStatTrak] = useState<boolean | null>(null);
  const [tempSouvenir, setTempSouvenir] = useState<boolean | null>(null);

  const itemsPerPage = 40;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // --- LOGIKA POBIERANIA ---

  // 1. Statystyki rynkowe (Market Index, Sentiment, Volume)
  useEffect(() => {
    const fetchStats = () => {
      axios
        .get("http://127.0.0.1:8000/api/v1/market-stats/overview")
        .then((res) => setMarketOverview(res.data))
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Metadane filtrów
  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/v1/meta/filters")
      .then((res) => {
        const rarityOrder = [
          "Consumer Grade",
          "Industrial Grade",
          "Mil-Spec Grade",
          "Restricted",
          "Classified",
          "Covert",
          "Contraband",
        ];

        const filteredRarities = res.data.rarities.filter(
          (r: any) => r.name !== "Stock",
        );

        filteredRarities.sort((a: any, b: any) => {
          const indexA = rarityOrder.indexOf(a.name);
          const indexB = rarityOrder.indexOf(b.name);

          const weightA = indexA === -1 ? 99 : indexA;
          const weightB = indexB === -1 ? 99 : indexB;

          return weightA - weightB;
        });

        setFilterOptions({ ...res.data, rarities: filteredRarities });
      })
      .catch(() => {});
  }, []);

  // 3. Główna lista skinów
  useEffect(() => {
    const controller = new AbortController();
    const fetchSkins = async () => {
      setIsLoading(true);
      try {
        const params = {
          skip: (currentPage - 1) * itemsPerPage,
          limit: itemsPerPage,
          search: activeSearch || undefined,
          wear: activeCondition || undefined,
          rarity: activeRarity || undefined,
          collection: activeCollection || undefined,
          stattrack: activeStatTrak !== null ? activeStatTrak : undefined,
          souvenir: activeSouvenir !== null ? activeSouvenir : undefined,
        };

        const response = await axios.get<PaginatedSkinResponse>(
          "http://127.0.0.1:8000/api/v1/skins/",
          { params, signal: controller.signal },
        );

        setSkins(response.data.items);
        setTotalItems(response.data.total);
      } catch (error) {
        if (axios.isCancel(error)) return;
        setSkins([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSkins();
    return () => controller.abort();
  }, [
    currentPage,
    activeSearch,
    activeCondition,
    activeRarity,
    activeCollection,
    activeStatTrak,
    activeSouvenir,
  ]);

  // --- HANDLERY ---
  const handleSearchSubmit = () => {
    setActiveSearch(tempSearch);
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    setActiveCondition(tempCondition);
    setActiveRarity(tempRarity);
    setActiveCollection(tempCollection);
    setActiveStatTrak(tempStatTrak);
    setActiveSouvenir(tempSouvenir);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setTempCondition("");
    setTempRarity("");
    setTempCollection("");
    setTempStatTrak(null);
    setTempSouvenir(null);
    setActiveCondition("");
    setActiveRarity("");
    setActiveCollection("");
    setActiveStatTrak(null);
    setActiveSouvenir(null);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const currentRarityColor =
    filterOptions?.rarities.find((r: any) => r.name === tempRarity)
      ?.color_hex || "#9ca3af";

  return (
    <main className="max-w-[1140px] mx-auto py-12 px-0 space-y-12 font-['Outfit']">
      {/* SEKCJA STATYSTYK */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-4">
          <StatCard
            title="Market Index"
            value={
              marketOverview
                ? `${marketOverview.index.current_value.toFixed(2)} pln`
                : "Loading..."
            }
            change={marketOverview?.index.change_24h ?? 0}
            sparklineData={marketOverview?.index.chart_data}
            showChart={true}
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <StatCard
            title="Market Sentiment"
            value={marketOverview?.sentiment.label ?? "---"}
            change={marketOverview?.sentiment.sentiment_value ?? 0}
            showChart={false}
            colorOverride={
              marketOverview?.sentiment.label === "Bullish"
                ? "success"
                : "danger"
            }
            forceArrow={
              marketOverview?.sentiment.label === "Bullish" ? "up" : "down"
            }
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <StatCard
            title="Market Volume"
            value={
              marketOverview
                ? marketOverview.volume.market_volume.toLocaleString()
                : "0"
            }
            showChart={false}
          />
        </div>
      </section>

      {/* SEKCJA RYNKU */}
      <MarketSection
        onOpenFilter={() => {
          setTempCondition(activeCondition);
          setTempRarity(activeRarity);
          setTempCollection(activeCollection);
          setTempStatTrak(activeStatTrak);
          setTempSouvenir(activeSouvenir);
          setIsFilterOpen(true);
        }}
        limit={itemsPerPage}
        page={currentPage}
        skins={skins}
        searchValue={tempSearch}
        onSearchChange={setTempSearch}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* PAGINACJA */}
      <div className="flex justify-center items-center gap-4 pt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className="p-2 text-text-muted hover:text-primary disabled:opacity-20 transition-colors"
          disabled={currentPage === 1 || isLoading}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          className="p-2 text-text-muted hover:text-primary disabled:opacity-20 transition-colors"
          disabled={currentPage >= totalPages || isLoading}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* MODAL FILTRÓW */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-bg-dark/60 backdrop-blur-md"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="relative bg-bg-light border border-border-muted w-full max-w-[440px] rounded-sm shadow-2xl">
            <div className="px-8 py-6 border-b border-border-muted flex justify-between items-center">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-text">
                Filters
              </h3>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="text-text-muted hover:text-primary"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                  Condition
                </label>
                <select
                  value={tempCondition}
                  onChange={(e) => setTempCondition(e.target.value)}
                  className="w-full bg-bg border border-border-muted rounded-sm p-3 text-xs text-text outline-none focus:border-primary appearance-none font-bold uppercase tracking-wider"
                >
                  <option value="">All Conditions</option>
                  {filterOptions?.wears.map((w) => (
                    <option key={w.wear_id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                  Rarity
                </label>
                <select
                  value={tempRarity}
                  onChange={(e) => setTempRarity(e.target.value)}
                  // Usunięto 'text-text', aby inline style nadawał kolor
                  className="w-full bg-bg border border-border-muted rounded-sm p-3 text-xs outline-none focus:border-primary appearance-none font-bold uppercase tracking-wider transition-colors"
                  // MAGIA KOLORÓW:
                  style={
                    tempRarity
                      ? {
                          color: currentRarityColor,
                          borderColor: `${currentRarityColor}80`,
                        }
                      : { color: "#e2e8f0" } // Domyślny jasny tekst, gdy nic nie wybrano
                  }
                >
                  <option value="" style={{ color: "#9ca3af" }}>
                    All Rarities
                  </option>

                  {filterOptions?.rarities.map((r: any) => (
                    <option
                      key={r.rarity_id}
                      value={r.name}
                      // KOLORUJEMY KAŻDĄ OPCJĘ NA LIŚCIE:
                      style={{ color: r.color_hex }}
                    >
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                  Collection
                </label>
                <select
                  value={tempCollection}
                  onChange={(e) => setTempCollection(e.target.value)}
                  className="w-full bg-bg border border-border-muted rounded-sm p-3 text-xs text-text outline-none focus:border-primary appearance-none font-bold uppercase tracking-wider"
                >
                  <option value="">All Collections</option>
                  {filterOptions?.collections.map((c) => (
                    <option key={c.collection_id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* --- TOGGLE BUTTONS --- */}
              <div className="space-y-2 border-t border-border-muted/30 pt-6">
                <div className="flex items-center justify-between py-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                    StatTrak™ Only
                  </label>
                  <button
                    onClick={() =>
                      setTempStatTrak(tempStatTrak === true ? null : true)
                    }
                    style={{
                      backgroundColor:
                        tempStatTrak === true ? "oklch(0.76 0.1 271)" : "",
                    }}
                    className={`w-10 h-5 rounded-full relative transition-all border ${tempStatTrak === true ? "border-primary" : "bg-bg border-border-muted"}`}
                  >
                    <div
                      className={`absolute top-[3px] w-3 h-3 rounded-full transition-all ${tempStatTrak === true ? "left-[22px] bg-bg-dark" : "left-[4px] bg-text-muted"}`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                    Souvenir Only
                  </label>
                  <button
                    onClick={() =>
                      setTempSouvenir(tempSouvenir === true ? null : true)
                    }
                    style={{
                      backgroundColor: tempSouvenir === true ? "#FFD700" : "",
                    }}
                    className={`w-10 h-5 rounded-full relative transition-all border ${tempSouvenir === true ? "border-[#FFD700]" : "bg-bg border-border-muted"}`}
                  >
                    <div
                      className={`absolute top-[3px] w-3 h-3 rounded-full transition-all ${tempSouvenir === true ? "left-[22px] bg-bg-dark" : "left-[4px] bg-text-muted"}`}
                    />
                  </button>
                </div>
              </div>
              {/* --- END TOGGLE BUTTONS --- */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="secondary"
                  className="w-full py-4 text-[12px]"
                  onClick={handleClearFilters}
                >
                  Clear All
                </Button>
                <Button
                  variant="primary"
                  className="w-full py-4 text-[12px] bg-[oklch(0.76_0.1_271)]"
                  onClick={handleApplyFilters}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default MarketView;
