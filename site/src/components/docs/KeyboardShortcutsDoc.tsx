import {
  KEYBOARD_SHORTCUTS,
  SCOPE_LABELS,
  formatShortcutForMac,
  formatShortcutForWindows,
} from "@/lib/keyboardShortcuts";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-block px-2 py-1 bg-white/10 text-white rounded text-xs font-mono whitespace-nowrap">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsDoc() {
  const globalShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.scope === "global");
  const appShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.scope === "app");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h8M8 16h5" />
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">
          Atalhos de teclado
        </h2>
      </div>

      <p className="text-lg text-muted">
        Referência oficial dos atalhos do Treplica. No <strong className="text-white">macOS</strong>,
        use <Kbd>⌘</Kbd> (Command) no lugar de <Kbd>Ctrl</Kbd>. No{" "}
        <strong className="text-white">Linux</strong>, siga a coluna Windows (Ctrl).
      </p>

      <ShortcutTable title="Atalhos globais" rows={globalShortcuts} />
      <ShortcutTable title="Atalhos na interface" rows={appShortcuts} />

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-semibold text-white m-0">Notas</h3>
        <ul className="list-disc pl-6 space-y-2 text-muted text-sm">
          <li>
            Atalhos <strong className="text-white">globais</strong> funcionam com o app minimizado,
            desde que o Treplica esteja em execução.
          </li>
          <li>
            O atalho de orientação (<Kbd>Ctrl+Shift+O</Kbd> / <Kbd>⌘⇧O</Kbd>) também é reconhecido
            dentro da janela principal quando ela está em foco.
          </li>
          <li>
            Atalhos exibidos na tela inicial para captura de tela (<Kbd>Ctrl+E</Kbd>) e pergunta
            rápida (<Kbd>Ctrl+Enter</Kbd>) são referências de interface ainda não vinculadas a
            ações globais — use <strong className="text-white">Analisar conversa</strong> para
            iniciar uma sessão.
          </li>
        </ul>
      </div>
    </div>
  );
}

function ShortcutTable({
  title,
  rows,
}: {
  title: string;
  rows: typeof KEYBOARD_SHORTCUTS;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white m-0">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-muted">
              <th className="px-6 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Windows / Linux</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">macOS</th>
              <th className="px-6 py-3 font-medium hidden lg:table-cell">Escopo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-0">
                <td className="px-6 py-4 align-top">
                  <p className="text-white font-medium m-0">{row.action}</p>
                  <p className="text-muted text-xs mt-1 mb-0 max-w-md">{row.description}</p>
                  {row.configurable && row.configNote && (
                    <p className="text-muted/70 text-xs mt-2 mb-0">
                      Configurável · {row.configNote}
                    </p>
                  )}
                  <p className="text-muted/60 text-xs mt-1 mb-0 lg:hidden">
                    {SCOPE_LABELS[row.scope]}
                  </p>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap">
                  <Kbd>{formatShortcutForWindows(row.canonical)}</Kbd>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap">
                  <Kbd>{formatShortcutForMac(row.canonical)}</Kbd>
                </td>
                <td className="px-6 py-4 align-top text-muted hidden lg:table-cell">
                  {SCOPE_LABELS[row.scope]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
