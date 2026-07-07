import type { Skin } from "../../types/api";

interface MainListProps {
  skins: Skin[];
  page: number;
  onSkinClick: (id: string) => void;
}

const MainList = ({ skins, onSkinClick }: MainListProps) => {
  return (
    <section className="col-span-12 mt-8">
      <div className="bg-bg border border-border-muted rounded-sm overflow-hidden shadow-2xl font-['Outfit']">
        <div className="px-8 py-6 border-b border-border-muted">
          <h2 className="text-[14px] font-medium text-text uppercase tracking-tight">
            Market Live Feed
          </h2>
        </div>

        <div className="px-8 pb-4">
          <div className="grid grid-cols-12 py-4 border-b-2 border-border-muted text-[10px] font-bold text-text-muted uppercase tracking-widest items-center">
            <div className="col-span-1"></div>
            <div className="col-span-6">Name</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-right">1h%</div>
            <div className="col-span-1 text-right">24h%</div>
            <div className="col-span-1 text-right">7d%</div>
          </div>

          {skins.length === 0 ? (
            <div className="py-12 text-center text-text-muted uppercase text-xs font-bold tracking-widest">
              No items found
            </div>
          ) : (
            skins.map((skin) => (
              <div
                key={skin.skin_id}
                onClick={() => onSkinClick(skin.skin_id)}
                className="grid grid-cols-12 py-4 border-b border-border-muted/40 items-center hover:bg-white/[0.02] transition-colors group last:border-b-0 cursor-pointer"
              >
                {/* Ikona skina z akcentem kolorystycznym rzadkości */}
                <div className="col-span-1 flex justify-center">
                  <div
                    className="w-10 h-10 bg-bg-light border border-border-muted/30 rounded-sm flex items-center justify-center overflow-hidden"
                    style={{
                      borderLeft: `3px solid ${skin.rarity_color || "#4b4b4b"}`,
                    }}
                  >
                    {skin.image_url ? (
                      <img
                        src={skin.image_url}
                        alt=""
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-transparent rotate-45" />
                    )}
                  </div>
                </div>

                {/* Nazwa broni i skina z Tagami */}
                <div className="col-span-6 text-[14px] font-medium pr-4 text-text">
                  <div className="truncate uppercase tracking-tight flex items-center gap-2">
                    <span>
                      {skin.weapon_name} | {skin.skin_name}
                    </span>
                    {skin.stattrack && (
                      <span className="text-[9px] text-[#CF6A32] border border-[#CF6A32]/40 px-1 rounded-sm font-black tracking-widest">
                        STATTRAK™
                      </span>
                    )}
                    {skin.souvenir && (
                      <span className="text-[9px] text-[#FFD700] border border-[#FFD700]/40 px-1 rounded-sm font-black tracking-widest">
                        SOUVENIR
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                    {skin.wear_name}
                  </div>
                </div>

                {/* Cena w PLN zamiast USD */}
                <div className="col-span-2 text-right text-[16px] font-bold text-text uppercase">
                  {skin.last_price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{" "}
                  PLN
                </div>

                <div
                  className={`col-span-1 text-right text-[12px] font-bold ${(skin.change_1h ?? 0) >= 0 ? "text-success" : "text-danger"}`}
                >
                  {skin.change_1h !== null
                    ? `${skin.change_1h > 0 ? "↑" : "↓"}${Math.abs(skin.change_1h).toFixed(2)}%`
                    : "-"}
                </div>
                <div
                  className={`col-span-1 text-right text-[12px] font-bold ${(skin.change_24h ?? 0) >= 0 ? "text-success" : "text-danger"}`}
                >
                  {skin.change_24h !== null
                    ? `${skin.change_24h > 0 ? "↑" : "↓"}${Math.abs(skin.change_24h).toFixed(2)}%`
                    : "-"}
                </div>
                <div
                  className={`col-span-1 text-right text-[12px] font-bold ${(skin.change_7d ?? 0) >= 0 ? "text-success" : "text-danger"}`}
                >
                  {skin.change_7d !== null
                    ? `${skin.change_7d > 0 ? "↑" : "↓"}${Math.abs(skin.change_7d).toFixed(2)}%`
                    : "-"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default MainList;
