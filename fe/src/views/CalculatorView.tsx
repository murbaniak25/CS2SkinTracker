import { useState, useEffect } from "react";
import axios from "axios";
import type {
  SkinTradeUpRead,
  TradeUpSimulationResult,
  TradeUpRequest,
  FilterOptions,
} from "../types/api";
import Button from "../components/common/Button";

interface SlotData {
  skin: SkinTradeUpRead | null;
  floatValue: string;
}

const CalculatorView = () => {
  // --- STANY ---
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [isLoadingSkins, setIsLoadingSkins] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null,
  );
  const [simulationResult, setSimulationResult] =
    useState<TradeUpSimulationResult | null>(null);

  const [slots, setSlots] = useState<SlotData[]>(
    Array(10)
      .fill(null)
      .map(() => ({ skin: null, floatValue: "" })),
  );

  const [rarity, setRarity] = useState(""); // Puste na start, ustawimy po pobraniu meta
  const [isStatTrak, setIsStatTrak] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [availableSkins, setAvailableSkins] = useState<SkinTradeUpRead[]>([]);

  // 1. Pobieranie Metadanych (Realne Rarity z bazy)
  useEffect(() => {
    axios
      .get<FilterOptions>("http://127.0.0.1:8000/api/v1/meta/filters")
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

        const bannedRarities = ["Contraband", "Covert", "Stock", "★"];
        const validRarities = res.data.rarities.filter(
          (r) => !bannedRarities.includes(r.name),
        );

        validRarities.sort((a, b) => {
          const indexA = rarityOrder.indexOf(a.name);
          const indexB = rarityOrder.indexOf(b.name);

          const weightA = indexA === -1 ? 99 : indexA;
          const weightB = indexB === -1 ? 99 : indexB;

          return weightA - weightB;
        });

        // --- 4. ZAPISUJEMY DO STANU ---
        setFilterOptions({ ...res.data, rarities: validRarities });

        if (validRarities.length > 0) {
          setRarity(validRarities[0].name);
        }
      })
      .catch((err) => console.error("Filter Metadata Error:", err));
  }, []);

  // 2. Pobieranie skinów do modala
  useEffect(() => {
    if (!isItemPickerOpen || !rarity) return;

    const controller = new AbortController();
    const fetchSkins = async () => {
      setIsLoadingSkins(true);
      try {
        const res = await axios.get<SkinTradeUpRead[]>(
          "http://127.0.0.1:8000/api/v1/tradeup/available-skins",
          {
            params: {
              rarity,
              stattrack: isStatTrak,
              search: modalSearch || undefined,
            },
            signal: controller.signal,
          },
        );
        setAvailableSkins(res.data);
      } catch (err) {
        if (!axios.isCancel(err)) setAvailableSkins([]);
      } finally {
        setIsLoadingSkins(false);
      }
    };

    const delay = setTimeout(fetchSkins, 300);
    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [isItemPickerOpen, rarity, isStatTrak, modalSearch]);

  const getExactFloatRange = (skin: SkinTradeUpRead) => {
    let wearMin = 0.0;
    let wearMax = 1.0;
    const name = skin.wear_name.toUpperCase();

    if (name.includes("FACTORY NEW")) {
      wearMin = 0.0;
      wearMax = 0.07;
    } else if (name.includes("MINIMAL WEAR")) {
      wearMin = 0.07;
      wearMax = 0.15;
    } else if (name.includes("FIELD-TESTED")) {
      wearMin = 0.15;
      wearMax = 0.38;
    } else if (name.includes("WELL-WORN")) {
      wearMin = 0.38;
      wearMax = 0.45;
    } else if (name.includes("BATTLE-SCARRED")) {
      wearMin = 0.45;
      wearMax = 1.0;
    }

    const actualMin = Math.max(wearMin, skin.float_min);
    const actualMax = Math.min(wearMax, skin.float_max);

    return { actualMin, actualMax };
  };

  const getWearAbbrev = (wearName: string) => {
    if (!wearName) return "";
    const name = wearName.toUpperCase();
    if (name.includes("FACTORY NEW")) return "FN";
    if (name.includes("MINIMAL WEAR")) return "MW";
    if (name.includes("FIELD-TESTED")) return "FT";
    if (name.includes("WELL-WORN")) return "WW";
    if (name.includes("BATTLE-SCARRED")) return "BS";
    return "";
  };

  const handleSelectItem = (skin: SkinTradeUpRead) => {
    if (activeSlot === null) return;

    const { actualMin } = getExactFloatRange(skin);
    const defaultFloat = (actualMin + 0.00001).toFixed(5);

    const newSlots = [...slots];
    newSlots[activeSlot] = {
      ...newSlots[activeSlot],
      skin,
      floatValue: defaultFloat,
    };
    setSlots(newSlots);
    setIsItemPickerOpen(false);
  };

  const handleSimulate = async () => {
    if (slots.some((s) => s.skin === null)) return alert("Add 10 skins!");
    setIsSimulating(true);
    try {
      const payload: TradeUpRequest = {
        items: slots.map((s) => ({
          skin_id: s.skin!.skin_id,
          float_value: parseFloat(s.floatValue) || 0,
        })),
        stattrack: isStatTrak,
      };
      const res = await axios.post<TradeUpSimulationResult>(
        "http://127.0.0.1:8000/api/v1/tradeup/simulate",
        payload,
      );
      setSimulationResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRemoveSkin = (index: number) => {
    const newSlots = [...slots];
    newSlots[index] = { skin: null, floatValue: "" };
    setSlots(newSlots);
  };

  const handleDuplicateSkin = (sourceIndex: number) => {
    const sourceSlot = slots[sourceIndex];
    if (!sourceSlot.skin) return;

    const firstEmptyIndex = slots.findIndex((s) => s.skin === null);

    if (firstEmptyIndex === -1) return;

    const newSlots = [...slots];
    newSlots[firstEmptyIndex] = {
      skin: sourceSlot.skin,
      floatValue: sourceSlot.floatValue,
    };
    setSlots(newSlots);
  };

  const avgFloat =
    slots.reduce((acc, curr) => acc + (parseFloat(curr.floatValue) || 0), 0) /
    10;

  const currentRarityColor =
    filterOptions?.rarities.find((r) => r.name === rarity)?.color_hex ||
    "#9ca3af";

  const rarityOrder = [
    "Consumer Grade",
    "Industrial Grade",
    "Mil-Spec Grade",
    "Restricted",
    "Classified",
    "Covert",
  ];
  const currentIdx = rarityOrder.indexOf(rarity);
  const nextRarityName = rarityOrder[currentIdx + 1];

  let nextRarityColor = filterOptions?.rarities.find(
    (r) => r.name === nextRarityName,
  )?.color_hex;

  if (!nextRarityColor) {
    if (nextRarityName === "Covert") {
      nextRarityColor = "#eb4b4b";
    } else {
      nextRarityColor = currentRarityColor; // Ostateczny fallback
    }
  }
  return (
    <div className="max-w-[1140px] mx-auto py-12 space-y-8 font-['Outfit'] animate-in fade-in">
      {/* NAGŁÓWEK: FILTRY WYRÓWNANE W JEDNEJ LINII */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-bg-light/10 p-6 rounded-sm border border-border-muted/30">
        <div className="flex items-center gap-10">
          {/* REALNE RARITY SELECT */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] whitespace-nowrap">
              Rarity
            </span>
            <select
              value={rarity}
              onChange={(e) => {
                setRarity(e.target.value);
                setSlots(
                  Array(10)
                    .fill(null)
                    .map(() => ({ skin: null, floatValue: "" })),
                );
                setSimulationResult(null);
              }}
              className="bg-bg border-2 rounded-full py-2 px-6 text-[12px] font-bold uppercase outline-none focus:border-primary cursor-pointer h-[42px] min-w-[200px] transition-colors"
              style={{
                color: currentRarityColor,
                borderColor: `${currentRarityColor}80`, // Lekko przezroczysta ramka w kolorze rzadkości
              }}
            >
              {filterOptions?.rarities.map((r) => (
                <option
                  key={r.rarity_id}
                  value={r.name}
                  // KOLORY DLA KAŻDEJ OPCJI Z ROZWIJANEJ LISTY:
                  style={{ color: r.color_hex }}
                >
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* STATTRAK TOGGLE */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] whitespace-nowrap">
              StatTrak™
            </span>
            <button
              onClick={() => {
                setIsStatTrak(!isStatTrak);
                setSlots(
                  Array(10)
                    .fill(null)
                    .map(() => ({ skin: null, floatValue: "" })),
                );
              }}
              className={`w-12 h-6 rounded-full relative border transition-all ${isStatTrak ? "bg-primary border-primary" : "bg-bg-light border-border-muted"}`}
            >
              <div
                className={`absolute top-[4px] w-3 h-3 rounded-full transition-all ${isStatTrak ? "left-[28px] bg-bg-dark" : "left-[6px] bg-text-muted"}`}
              />
            </button>
          </div>
        </div>

        <Button
          variant="primary"
          className="px-12 py-3 bg-[oklch(0.76_0.1_271)] h-[48px] uppercase tracking-widest font-black"
          onClick={handleSimulate}
          disabled={isSimulating}
        >
          {isSimulating ? "WORKING..." : "Simulate Tradeup"}
        </Button>
      </div>

      {/* KONTRAKT: 10 SLOTÓW */}
      <div className="bg-bg border border-border-muted rounded-sm overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-border-muted flex justify-between items-center bg-bg-light/5">
          <h2 className="text-[14px] font-black uppercase tracking-widest">
            Trade Up Contract
          </h2>
          <div className="text-right">
            <span className="text-[10px] font-bold text-text-muted uppercase">
              Avg Float
            </span>
            <p className="text-primary text-[18px] font-black font-mono">
              {avgFloat.toFixed(10)}
            </p>
          </div>
        </div>
        <div className="p-8 grid grid-cols-2 md:grid-cols-5 gap-6">
          {slots.map((slot, i) => (
            <div key={i} className="space-y-3">
              <button
                onClick={() => {
                  setActiveSlot(i);
                  setIsItemPickerOpen(true);
                }}
                className={`w-full aspect-square border-2 rounded-sm transition-all flex flex-col items-center justify-center p-4 relative overflow-hidden group ${
                  slot.skin
                    ? "bg-bg shadow-inner"
                    : "bg-bg-light border-dashed border-border-muted hover:border-primary/50"
                }`}
                // MAGIA GRADIENTU:
                style={
                  slot.skin
                    ? {
                        // Gradient od dołu (kolor z przezroczystością '30') do w pełni przezroczystego na wysokości 60%
                        backgroundImage: `linear-gradient(to top, ${currentRarityColor}30 0%, transparent 60%)`,
                        borderColor: `${currentRarityColor}50`, // Ramka dopasowana do rzadkości
                      }
                    : {}
                }
              >
                {slot.skin ? (
                  <>
                    {/* --- IKONKI AKCJI --- */}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                      <div
                        className="p-1.5 bg-blue-500/80 text-white rounded-sm hover:bg-blue-600 transition-colors cursor-pointer"
                        title="Duplicate Skin"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSkin(i);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 17.25v3.375a1.125 1.125 0 0 1-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875a1.125 1.125 0 0 1 1.125-1.125H6.75m9-3h-9a1.125 1.125 0 0 0-1.125 1.125v9.75a1.125 1.125 0 0 0 1.125 1.125h9a1.125 1.125 0 0 0 1.125-1.125v-9.75a1.125 1.125 0 0 0-1.125-1.125Z"
                          />
                        </svg>
                      </div>

                      <div
                        className="p-1.5 bg-red-500/80 text-white rounded-sm hover:bg-red-600 transition-colors cursor-pointer"
                        title="Remove Skin"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSkin(i);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </div>
                    </div>

                    <img
                      src={slot.skin.image_url || ""}
                      className="w-full h-full object-contain z-10 drop-shadow-lg"
                      alt=""
                    />

                    <div
                      className="absolute bottom-0 inset-x-0 p-2 bg-bg-dark/95 text-[10px] font-black text-center uppercase truncate border-t"
                      style={{ borderTopColor: `${currentRarityColor}40` }}
                      title={`${slot.skin.weapon_name} | ${slot.skin.skin_name} (${slot.skin.wear_name})`}
                    >
                      <span style={{ color: currentRarityColor }}>
                        {slot.skin.weapon_name}
                      </span>{" "}
                      <span className="text-text-muted opacity-50 px-0.5">
                        |
                      </span>{" "}
                      <span style={{ color: currentRarityColor }}>
                        {slot.skin.skin_name}
                      </span>{" "}
                      <span className="text-text-muted opacity-80">
                        ({getWearAbbrev(slot.skin.wear_name)})
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-[8px] font-black uppercase opacity-20">
                    Add Skin
                  </span>
                )}
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={slot.floatValue}
                  // 1. W trakcie pisania pozwalamy wpisywać (tylko cyfry i kropki)
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[i].floatValue = e.target.value
                      .replace(",", ".")
                      .replace(/[^\d.]/g, "")
                      .substring(0, 18);
                    setSlots(newSlots);
                  }}
                  onBlur={() => {
                    if (!slot.skin) return;

                    const { actualMin, actualMax } = getExactFloatRange(
                      slot.skin,
                    );
                    let parsed = parseFloat(slot.floatValue);
                    const newSlots = [...slots];

                    // Jeśli wpisał głupoty (np. samo "0.") albo pole jest puste
                    if (isNaN(parsed)) {
                      newSlots[i].floatValue = (actualMin + 0.00001).toFixed(5);
                    } else {
                      // Jeśli wpisał za mało - podbijamy do minimum
                      if (parsed <= actualMin) parsed = actualMin + 0.00001;
                      // Jeśli wpisał za dużo - ucinamy do maksimum
                      if (parsed >= actualMax) parsed = actualMax - 0.00001;

                      newSlots[i].floatValue = parsed.toString();
                    }
                    setSlots(newSlots);
                  }}
                  className="w-full bg-bg-dark/50 border border-border-muted py-2 text-[11px] font-mono text-center text-primary outline-none focus:border-primary/60"
                  // 3. Dynamiczny placeholder pokazujący dopuszczalny zakres
                  placeholder={
                    slot.skin
                      ? `${getExactFloatRange(slot.skin).actualMin.toFixed(2)} - ${getExactFloatRange(slot.skin).actualMax.toFixed(2)}`
                      : "0.00"
                  }
                />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 bg-bg text-[7px] font-black text-text-muted uppercase">
                  Float
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WYNIKI SYMULACJI ZE ZDJĘCIAMI */}
      {simulationResult && (
        <section className="bg-bg border border-border-muted p-8 rounded-sm animate-in slide-in-from-bottom-4 shadow-2xl">
          <h3 className="text-primary font-black uppercase mb-8 tracking-widest border-b border-border-muted pb-4">
            Outcomes (Total Cost: {simulationResult.total_cost.toFixed(2)} PLN)
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {simulationResult.outcomes.map((o, idx) => (
              <div
                key={idx}
                className="bg-bg-light/20 border border-border-muted p-4 flex items-center gap-6 hover:bg-white/[0.05] transition-all group"
              >
                <div
                  className="w-20 h-20 bg-bg-dark/50 rounded-sm p-2 flex-shrink-0 border relative overflow-hidden"
                  style={{ borderColor: `${nextRarityColor}40` }} // Ramka w kolorze wygranej
                >
                  {/* --- BOCZNY PASEK WYNIKU --- */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 z-0 shadow-[1px_0_4px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: nextRarityColor }}
                  />

                  <img
                    src={o.image_url || ""}
                    alt=""
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform z-10 relative drop-shadow-md"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-black uppercase truncate drop-shadow-md"
                    style={{ color: nextRarityColor }}
                  >
                    {o.weapon_name} | {o.skin_name}
                  </p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">
                    {o.estimated_wear} ({o.estimated_float.toFixed(8)})
                  </p>
                </div>

                <div className="text-right flex-shrink-0 flex flex-col items-end">
                  {/* Główna cena skina z rynku */}
                  <p className="text-[14px] font-black text-text">
                    {o.market_price.toFixed(2)} PLN
                  </p>

                  {/* Różnica cenowa (Zysk/Strata) */}
                  <p
                    className={`text-[11px] font-bold mt-0.5 ${
                      o.market_price >= simulationResult.total_cost
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {o.market_price >= simulationResult.total_cost ? "+" : ""}
                    {(o.market_price - simulationResult.total_cost).toFixed(
                      2,
                    )}{" "}
                    PLN
                  </p>

                  {/* Szansa procentowa (na żółto) */}
                  <p className="text-[10px] font-black uppercase mt-1.5 text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-sm border border-yellow-400/20">
                    {o.chance.toFixed(1)}% Chance
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL PICKER */}
      {isItemPickerOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-bg-dark/80 backdrop-blur-md"
            onClick={() => setIsItemPickerOpen(false)}
          />
          <div className="relative bg-bg-light border border-border-muted w-full max-w-[700px] h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-border-muted flex justify-between bg-bg shadow-sm">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-text">
                Select {rarity} Item
              </h3>
              <button
                onClick={() => setIsItemPickerOpen(false)}
                className="text-text-muted hover:text-primary transition-colors text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-bg-light/30 border-b border-border-muted">
              <input
                type="text"
                placeholder="SEARCH SKIN..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full py-3 px-6 bg-bg border-2 border-border-muted rounded-full text-[10px] font-bold uppercase outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {isLoadingSkins ? (
                <div className="text-center py-20 text-[10px] font-bold uppercase opacity-30 tracking-[0.3em] animate-pulse">
                  Scanning Armory...
                </div>
              ) : (
                availableSkins.map((skin) => (
                  <div
                    key={skin.variant_id}
                    className="relative overflow-hidden flex items-center gap-4 p-3 pl-4 bg-bg border border-border-muted/30 hover:border-primary/50 cursor-pointer transition-all group"
                    onClick={() => handleSelectItem(skin)}
                  >
                    {/* --- BOCZNY PASEK RZADKOŚCI (w liście modala) --- */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 z-10 shadow-[2px_0_8px_rgba(0,0,0,0.5)]"
                      style={{ backgroundColor: currentRarityColor }}
                    />

                    <img
                      src={skin.image_url || ""}
                      className="w-12 h-12 object-contain group-hover:scale-110 transition-transform"
                      alt=""
                    />
                    <div className="flex-1">
                      <p
                        className="text-[12px] font-bold uppercase leading-none drop-shadow-md"
                        style={{ color: currentRarityColor }}
                      >
                        {skin.weapon_name} | {skin.skin_name}
                      </p>
                      <p className="text-[10px] font-bold text-text-muted uppercase mt-1 tracking-tighter">
                        {skin.collection_name} • {skin.wear_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-black text-text">
                        {skin.last_price.toFixed(2)} PLN
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorView;
