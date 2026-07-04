import { useState } from "react";
import type { Skin } from "../../types/api";
import MainList from "./MainList";
import Button from "../../components/common/Button";
import SkinDetailsModal from "./SkinDetailsModal";

interface MarketSectionProps {
  onOpenFilter: () => void;
  limit: number;
  page: number;
  skins: Skin[];
  searchValue: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
}

const MarketSection = ({
  onOpenFilter,
  skins,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  page,
}: MarketSectionProps) => {
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null);

  return (
    <section className="grid grid-cols-12 gap-y-6 items-center">
      {/* ... Sekcja Search i Filter zostaje bez zmian ... */}
      <div className="col-span-12 md:col-span-4 relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="SEARCH (PRESS ENTER)"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
          className="w-full py-2.5 pl-12 pr-6 bg-bg-light border-2 border-border-muted rounded-full text-xs font-bold text-text uppercase tracking-wider outline-none hover:border-border focus:border-border font-['Outfit'] placeholder:text-text/50"
        />
      </div>

      <div className="hidden md:block md:col-span-4"></div>

      <div className="col-span-12 md:col-span-4 flex justify-end">
        <Button
          variant="primary"
          className="w-[140px] gap-3"
          onClick={onOpenFilter}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="17" x2="14" y2="17" />
          </svg>
          Filter
        </Button>
      </div>

      <div className="col-span-12">
        <MainList
          skins={skins}
          page={page}
          onSkinClick={(id) => setSelectedSkinId(id)}
        />
      </div>

      {selectedSkinId && (
        <SkinDetailsModal
          variantId={selectedSkinId}
          onClose={() => setSelectedSkinId(null)}
        />
      )}
    </section>
  );
};

export default MarketSection;
