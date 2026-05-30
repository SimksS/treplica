import type { ReactNode } from "react";
import { IconAccessibility, IconAi, IconAiFunction, IconEye, IconMic, IconProviders,  IconShield, IconUpdates } from "./Icons";

export type SettingsSection =
  | "settings-providers"
  | "settings-models"
  | "settings-privacy"
  | "settings-storage"
  | "settings-stealth"
  | "settings-updates"
  | "settings-microphone"
  | "settings-accessibility";

interface Props {
  active: SettingsSection;
  onNavigate: (section: SettingsSection) => void;
  onClose: () => void;
}

const ITEMS: { id: SettingsSection; label: string; icon: ReactNode }[] = [
  { id: "settings-providers",      label: "Provedores de IA",   icon: <IconAi /> },
  { id: "settings-microphone",     label: "Microfone",          icon: <IconMic /> },
  { id: "settings-accessibility",  label: "Acessibilidade",     icon: <IconAccessibility /> },
  { id: "settings-stealth",        label: "Modo discreto",      icon: <IconEye /> },
  { id: "settings-privacy",        label: "Privacidade",        icon: <IconShield /> },
  { id: "settings-models",         label: "Modelos por função", icon: <IconAiFunction /> },
  { id: "settings-storage",        label: "Arquivos e backup",  icon: <IconProviders /> },
  { id: "settings-updates",        label: "Atualizações",       icon: <IconUpdates /> },
];

export function SettingsSidebar({ active, onNavigate, onClose }: Props) {
  return (
    <aside className="settings-sidebar" data-testid="settings-sidebar">
      <button
        type="button"
        className="settings-back"
        onClick={onClose}
        data-testid="btn-close-settings"
      >
        ← Voltar ao início
      </button>
      <p className="settings-sidebar-title">Configurações</p>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`settings-nav-item ${active === item.id ? "active" : ""}`}
          onClick={() => onNavigate(item.id)}
          data-testid={`nav-settings-${item.id.replace("settings-", "")}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </aside>
  );
}
