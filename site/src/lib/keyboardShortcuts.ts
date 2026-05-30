export type ShortcutScope = "global" | "app";

export interface KeyboardShortcut {
  id: string;
  action: string;
  description: string;
  scope: ShortcutScope;
  /** Canonical form stored in app settings (Ctrl-based). */
  canonical: string;
  configurable?: boolean;
  configNote?: string;
}

/** Mirrors defaults in `apps/desktop/src-tauri/src/storage/app_settings.rs`. */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: "stealth-overlay",
    action: "Mostrar ou ocultar overlay (modo discreto)",
    description:
      "Alterna a janela flutuante stealth. Funciona mesmo com o Treplica em segundo plano.",
    scope: "global",
    canonical: "Ctrl+Shift+H",
    configurable: true,
    configNote: "Configurações → Modo discreto (stealth)",
  },
  {
    id: "guidance",
    action: "Pedir orientação da IA",
    description:
      "Envia os trechos recentes da transcrição para a IA gerar sugestões durante a sessão ou no overlay.",
    scope: "global",
    canonical: "Ctrl+Shift+O",
    configurable: true,
    configNote: "Definido no onboarding; padrão do app",
  },
  {
    id: "setup-record",
    action: "Gravar / parar no teste de configuração",
    description:
      "No modal de teste do onboarding, inicia ou encerra a captura de voz antes de enviar à IA.",
    scope: "app",
    canonical: "Ctrl+D",
  },
];

export function formatShortcutForMac(canonical: string): string {
  return canonical
    .replace(/Ctrl\+/gi, "⌘")
    .replace(/Control\+/gi, "⌘")
    .replace(/Command\+/gi, "⌘")
    .replace(/Meta\+/gi, "⌘")
    .replace(/Shift\+/gi, "⇧")
    .replace(/Alt\+/gi, "⌥")
    .replace(/\+/g, "")
    .trim();
}

export function formatShortcutForWindows(canonical: string): string {
  return canonical
    .replace(/Command\+/gi, "Ctrl+")
    .replace(/Meta\+/gi, "Ctrl+")
    .replace(/⌘/g, "Ctrl+");
}

export const SCOPE_LABELS: Record<ShortcutScope, string> = {
  global: "Global (sistema)",
  app: "Dentro do app",
};
