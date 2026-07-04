import React from "react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  sparklineData?: number[];
  showChart?: boolean;
  colorOverride?: "success" | "danger";
  forceArrow?: "up" | "down"; // Nowy prop do sterowania strzałką
}

const StatCard = ({
  title,
  value,
  change,
  sparklineData = [],
  showChart = true,
  colorOverride,
  forceArrow,
}: StatCardProps) => {
  // Logika koloru
  const isPositive = change !== undefined ? change >= 0 : true;
  const finalColor = colorOverride
    ? `var(--${colorOverride})`
    : isPositive
      ? "var(--success)"
      : "var(--danger)";

  // Logika strzałki: priorytet ma forceArrow, potem znak liczby change
  const renderArrow = () => {
    if (forceArrow === "up") return "↑";
    if (forceArrow === "down") return "↓";
    return isPositive ? "↑" : "↓";
  };

  const generatePath = (data: number[]) => {
    if (!data || data.length < 2) return "M0,20 L100,20";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    return data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 35 - ((val - min) / range) * 30;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  return (
    <div className="bg-bg border border-border-muted rounded-sm transition-all hover:border-border group flex flex-col h-[160px] overflow-hidden shadow-2xl font-['Outfit']">
      <div className="p-5 flex flex-col h-full">
        <div className="text-left">
          <h3 className="text-text-muted text-[11px] font-bold uppercase tracking-[0.2em]">
            {title}
          </h3>
        </div>

        <div
          className={`flex-1 flex ${!showChart ? "justify-center items-center" : "justify-center flex-col"}`}
        >
          <div className="flex items-baseline gap-3">
            <span
              className={`font-black text-text tracking-tighter uppercase transition-all ${
                showChart ? "text-[24px]" : "text-[36px]"
              }`}
            >
              {value}
            </span>

            {change !== undefined && (
              <div
                className={`flex items-center gap-0.5 font-bold ${
                  showChart ? "text-[12px]" : "text-[16px]"
                }`}
                style={{ color: finalColor }}
              >
                <span>{renderArrow()}</span>
                <span>{Math.abs(change).toFixed(4)}%</span>
              </div>
            )}
          </div>
        </div>

        {showChart && (
          <div className="h-12 w-full mt-auto">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              <path
                d={generatePath(sparklineData)}
                fill="none"
                stroke={finalColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 8px ${finalColor}44)` }}
                className="opacity-70 group-hover:opacity-100 transition-opacity"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
