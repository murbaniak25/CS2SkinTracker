import React from "react";

const ContractSlot = ({ index }: { index: number }) => {
  return (
    <div className="aspect-[4/3] bg-bg-light/30 border-2 border-dashed border-border-muted rounded-sm flex flex-col items-center justify-center group hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden">
      {/* Numer slotu w tle */}
      <span className="absolute top-2 left-3 text-[10px] font-black text-text-muted opacity-20 uppercase tracking-widest">
        Slot {index + 1}
      </span>

      {/* Ikona dodawania */}
      <div className="w-10 h-10 rounded-full border border-border-muted flex items-center justify-center text-text-muted group-hover:text-primary group-hover:border-primary transition-colors">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </div>

      <span className="mt-3 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
        Add Skin
      </span>
    </div>
  );
};

export default ContractSlot;
