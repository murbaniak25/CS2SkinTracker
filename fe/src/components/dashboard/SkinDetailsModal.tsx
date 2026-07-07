import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { SkinDetails } from "../../types/api";

interface Props {
  variantId: string;
  onClose: () => void;
}

const SkinDetailsModal = ({ variantId, onClose }: Props) => {
  const [data, setData] = useState<SkinDetails | null>(null);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/v1/skins/${variantId}`)
      .then((res) => res.json())
      .then(setData);
  }, [variantId]);

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-dark/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg border border-border-muted w-full max-w-2xl shadow-2xl font-['Outfit'] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-text-muted hover:text-text text-2xl transition-colors z-10"
        >
          ×
        </button>

        <div className="p-10">
          <div className="flex items-center gap-8 mb-12">
            <div
              className="w-32 h-32 bg-bg-light border rounded-sm flex items-center justify-center p-4 transition-all"
              style={{
                borderColor: `${data.rarity_color}66`,
                boxShadow: `0 0 40px ${data.rarity_color}10`,
              }}
            >
              <img
                src={data.image_url || ""}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <h2 className="text-[22px] font-bold uppercase tracking-tight leading-tight text-text">
                {data.weapon_name} | {data.skin_name}
              </h2>
              {/* Tagi rzadkości w modalu */}
              <p className="text-text-muted font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <span>{data.wear_name}</span>
                {data.stattrack && (
                  <span className="text-[#CF6A32] border border-[#CF6A32]/40 px-1.5 rounded-sm">
                    STATTRAK™
                  </span>
                )}
                {data.souvenir && (
                  <span className="text-[#FFD700] border border-[#FFD700]/40 px-1.5 rounded-sm">
                    SOUVENIR
                  </span>
                )}
              </p>
              {/* Główna cena w PLN */}
              <p className="text-[32px] font-black text-primary mt-3 uppercase tracking-tighter">
                {data.last_price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                PLN
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full border-t border-border-muted pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.price_history}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="oklch(0.3 0.02 271)"
                  opacity={0.3}
                />
                <XAxis dataKey="updated_at" hide />
                <YAxis
                  orientation="right"
                  stroke="oklch(0.5 0.02 271)"
                  fontSize={10}
                  tickFormatter={(v) => `${v} PLN`}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  formatter={(value: any) => [`${value} PLN`, "Price"]}
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
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="point"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkinDetailsModal;
