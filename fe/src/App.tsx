import { useState } from "react";
import Navbar from "./components/layout/Navbar";
import MarketView from "./views/MarketView";
import CalculatorView from "./views/CalculatorView";

function App() {
  // Nawigacja między widokami
  const [view, setView] = useState<"market" | "calculator">("market");

  return (
    <div className="min-h-screen text-text selection:bg-primary/30 antialiased relative font-['Outfit']">
      {/* Tło gradientowe pobierane jest automatycznie z body w index.css */}

      <div className="relative z-10">
        <Navbar setView={setView} currentView={view} />

        <main className="max-w-[1140px] mx-auto py-12 px-0">
          {view === "market" ? <MarketView /> : <CalculatorView />}

          <footer className="pt-20 pb-12 text-center opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em]">
              © 2026 FLOATGRID. PROPRIETARY DATA FEED.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
