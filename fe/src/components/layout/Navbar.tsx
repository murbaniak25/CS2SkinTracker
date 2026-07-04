import React from "react";

// Definicja typów dla propsów
interface NavbarProps {
  setView: (view: "market" | "calculator") => void;
  currentView: "market" | "calculator";
}

const Navbar = ({ setView, currentView }: NavbarProps) => {
  return (
    <nav className="max-w-[1140px] mx-auto py-6 flex justify-between items-center relative z-20 font-['Outfit']">
      {/* LEWA STRONA: Branding + Separator */}
      <div className="flex items-center gap-8">
        <button
          onClick={() => setView("market")}
          className="text-[16px] font-black uppercase tracking-[0.2em] text-text hover:opacity-80 transition-opacity"
        >
          FLOATGRID
        </button>

        {/* Pionowa kreska oddzielająca logo od nawigacji */}
        <div className="h-4 w-[1px] bg-border-muted opacity-30 hidden md:block" />

        {/* LINKI NAWIGACYJNE */}
        <div className="flex items-center gap-8">
          {/* Link do Marketu (Skins) */}
          <button
            onClick={() => setView("market")}
            className={`relative text-[13px] font-bold uppercase tracking-[0.15em] transition-colors group ${
              currentView === "market"
                ? "text-primary"
                : "text-text hover:text-primary"
            }`}
          >
            Skins
            {/* Linia pod spodem: widoczna na stałe gdy active, lub na hover gdy nieactive */}
            <span
              className={`absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300 ${
                currentView === "market" ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </button>

          {/* Link do Kalkulatora */}
          <button
            onClick={() => setView("calculator")}
            className={`relative text-[13px] font-bold uppercase tracking-[0.15em] transition-colors group ${
              currentView === "calculator"
                ? "text-primary"
                : "text-text hover:text-primary"
            }`}
          >
            Calculator
            <span
              className={`absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300 ${
                currentView === "calculator"
                  ? "w-full"
                  : "w-0 group-hover:w-full"
              }`}
            />
          </button>
        </div>
      </div>

      {/* PRAWA STRONA: Oficjalny Przycisk Steam */}
      <div className="flex items-center">
        <a
          href="/auth/steam"
          className="hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300"
        >
          <img
            src="https://community.cloudflare.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
            alt="Sign in through Steam"
            className="h-[34px] w-auto shadow-sm"
          />
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
