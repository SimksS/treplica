/**
 * Bloqueia atalhos de inspeção e menu de contexto no WebView.
 * Só tem efeito em builds de produção; em dev permanece aberto para debugging.
 */
export function lockdownWebView(): void {
  if (import.meta.env.DEV) return;

  // Desabilita menu de contexto (botão direito / toque longo)
  document.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true });

  // Bloqueia atalhos de DevTools e view-source
  document.addEventListener(
    "keydown",
    (e) => {
      const ctrl = e.ctrlKey || e.metaKey; // metaKey = Cmd no macOS

      if (
        e.key === "F12" ||
        (ctrl && e.shiftKey && ["I", "J", "C", "K"].includes(e.key.toUpperCase())) ||
        (ctrl && e.key.toUpperCase() === "U")
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
}
