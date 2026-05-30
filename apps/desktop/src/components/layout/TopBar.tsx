import logoUrl from "../../assets/logo_treplica.png";
import { IconSettings } from "./Icons";

export type MainNav = "home" | "live" | "history" | "settings";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  onHome: () => void;
  onHistory: () => void;
  onSettings: () => void;
  activeNav: MainNav;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onHome,
  onHistory,
  onSettings,
  activeNav,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <button type="button" className="top-bar-brand" onClick={onHome} data-testid="nav-home">
        <img src={logoUrl} alt="Treplica" className="brand-mark" />
        <div className="brand-text">
          <span className="brand-name">Treplica</span>
          <span className="brand-tagline">Meeting AI Assistant</span>
        </div>
      </button>

      <nav className="top-bar-nav" aria-label="Navegação principal">
        <button
          type="button"
          className={`top-nav-link ${activeNav === "home" || activeNav === "live" ? "active" : ""}`}
          onClick={onHome}
          data-testid="nav-inicio"
        >
          Início
        </button>
        <button
          type="button"
          className={`top-nav-link ${activeNav === "history" ? "active" : ""}`}
          onClick={onHistory}
          data-testid="nav-history"
        >
          Histórico
        </button>
      </nav>

      <div className="top-bar-search">
        <input
          type="search"
          placeholder="Buscar sessões..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchSubmit();
          }}
          data-testid="global-search"
        />
      </div>

      <div className="top-bar-actions">
        <button
          type="button"
          className={`icon-btn ${activeNav === "settings" ? "active" : ""}`}
          onClick={onSettings}
          title={activeNav === "settings" ? "Fechar configurações" : "Configurações"}
          data-testid="nav-settings"
        >
          <IconSettings />
        </button>
      </div>
    </header>
  );
}
