export default function AccessibilityDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">Acessibilidade</h2>
      </div>

      <p className="text-lg text-muted">
        O Treplica oferece ajustes de acessibilidade para tornar a interface e o overlay mais confortáveis em diferentes condições de uso e necessidades visuais. Todas as configurações ficam em <strong>Configurações → Acessibilidade</strong>.
      </p>

      <div className="space-y-8 mt-4">

        {/* Tamanho do texto */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Tamanho do Texto</h3>
          <p className="text-muted mb-6">
            Existem dois controles de escala de fonte <strong>independentes</strong>: um para o aplicativo principal e outro para o overlay (janela discreta). Isso permite, por exemplo, usar texto grande no overlay sem alterar o restante da interface.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold mb-3">Aplicativo principal</h4>
              <p className="text-muted text-sm mb-3">Ajusta o tamanho de todo o texto nas telas do Treplica (configurações, histórico, sessão ao vivo).</p>
              <div className="space-y-2">
                {[
                  { label: "Pequeno", value: "87,5%" },
                  { label: "Normal (padrão)", value: "100%" },
                  { label: "Grande", value: "112,5%" },
                  { label: "Muito grande", value: "125%" },
                ].map(({ label, value }) => (
                  <div key={value} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-white/10 rounded-lg">
                    <span className="text-muted text-sm">{label}</span>
                    <code className="text-white text-xs">{value}</code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Overlay discreto</h4>
              <p className="text-muted text-sm mb-3">Controla apenas o texto exibido no overlay flutuante durante a sessão. Independente da escala global do app.</p>
              <div className="space-y-2">
                {[
                  { label: "Pequeno", value: "87,5%" },
                  { label: "Normal (padrão)", value: "100%" },
                  { label: "Grande", value: "112,5%" },
                  { label: "Muito grande", value: "125%" },
                ].map(({ label, value }) => (
                  <div key={value} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-white/10 rounded-lg">
                    <span className="text-muted text-sm">{label}</span>
                    <code className="text-white text-xs">{value}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-muted text-sm mt-4">
            As alterações de escala têm efeito imediato — não é necessário reiniciar o aplicativo.
          </p>
        </div>

        {/* Opções de exibição */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Opções de Exibição</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-black/30 border border-white/10 rounded-xl">
              <div className="p-2 bg-white/5 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </div>
              <div>
                <strong className="text-white block mb-1">Alto contraste</strong>
                <p className="text-sm text-muted m-0">
                  Aumenta o contraste de cores em toda a interface. Recomendado para ambientes muito iluminados ou usuários com baixa visão. Aplica uma classe CSS <code>high-contrast</code> no documento raiz, permitindo que temas de contraste alto sobrescrevam as cores padrão.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-black/30 border border-white/10 rounded-xl">
              <div className="p-2 bg-white/5 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 3l14 9-14 9V3z" />
                </svg>
              </div>
              <div>
                <strong className="text-white block mb-1">Reduzir animações</strong>
                <p className="text-sm text-muted m-0">
                  Desativa transições e efeitos de movimento na interface — cards deslizando, fades, pulsos do indicador de IA. Recomendado para usuários sensíveis a movimento ou que utilizam o Treplica por longos períodos. A classe CSS <code>reduce-motion</code> é aplicada globalmente, respeitando as preferências de acessibilidade do sistema.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dica de sistema */}
        <div className="bg-white/5 border border-white/10 border-l-4 border-l-neon-blue rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            Preferências do Sistema Operacional
          </h4>
          <p className="text-muted text-sm">
            O Treplica lê as preferências de <strong>Reduzir movimento</strong> do sistema operacional automaticamente. Se você já tem essa opção ativada no Windows (<em>Configurações → Acessibilidade → Efeitos visuais</em>) ou macOS (<em>Ajustes → Acessibilidade → Exibição → Reduzir movimento</em>), o app herda essa preferência por padrão. Você pode sobrescrever independentemente nas configurações do Treplica.
          </p>
        </div>

      </div>
    </div>
  );
}
