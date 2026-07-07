import { useAuth } from "../../context/AuthContext";

interface NavbarProps {
  setView: (view: "market" | "calculator" | "inventory") => void;
  currentView: "market" | "calculator" | "inventory";
}

const Navbar = ({ setView, currentView }: NavbarProps) => {
  const { user, isLoading, login, logout } = useAuth();

  return (
    <nav className="max-w-[1140px] mx-auto py-6 flex justify-between items-center relative z-20 font-['Outfit']">
      {/* LEFT SIDE: Branding + Separator */}
      <div className="flex items-center gap-8">
        <button
          onClick={() => setView("market")}
          className="text-[16px] font-black uppercase tracking-[0.2em] text-text hover:opacity-80 transition-opacity"
        >
          FLOATGRID
        </button>

        {/* Vertical separator */}
        <div className="h-4 w-[1px] bg-border-muted opacity-30 hidden md:block" />

        {/* NAVIGATION LINKS */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setView("market")}
            className={`relative text-[13px] font-bold uppercase tracking-[0.15em] transition-colors group ${
              currentView === "market"
                ? "text-primary"
                : "text-text hover:text-primary"
            }`}
          >
            Skins
            <span
              className={`absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300 ${
                currentView === "market" ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </button>

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

          {/* --- ZAKŁADKA INVENTORY (Tylko dla zalogowanych) --- */}
          {user && (
            <button
              onClick={() => setView("inventory")}
              className={`relative text-[13px] font-bold uppercase tracking-[0.15em] transition-colors group ${
                currentView === "inventory"
                  ? "text-primary"
                  : "text-text hover:text-primary"
              }`}
            >
              Inventory
              <span
                className={`absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300 ${
                  currentView === "inventory"
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Auth Section */}
      <div className="flex items-center">
        {isLoading ? (
          <div className="w-5 h-5 rounded-full border-2 border-border-muted border-t-primary animate-spin" />
        ) : user ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar_url || ""}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-border-muted shadow-sm"
              />
              <span className="text-[13px] font-bold tracking-wider text-text hidden sm:block">
                {user.name}
              </span>
            </div>
            <button
              onClick={logout}
              className="text-[12px] font-bold uppercase tracking-[0.15em] text-text hover:text-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300"
          >
            <img
              src="https://community.cloudflare.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
              alt="Sign in through Steam"
              className="h-[34px] w-auto shadow-sm"
            />
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
