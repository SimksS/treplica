export default function MicrophoneTestDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V19H9v2h6v-2h-2v-1.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">
          Teste de Microfone e Áudio
        </h2>
      </div>

      <p className="text-lg text-muted">
        Antes de iniciar cada sessão, o Treplica passa por três verificações de áudio e captura de tela. Essa etapa garante que o assistente tem acesso a tudo que precisa para transcrever e analisar sua reunião.
      </p>

      <div className="space-y-8 mt-4">

        {/* Onde fica o teste */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Onde Fica o Teste</h3>
          <p className="text-muted mb-4">
            As verificações aparecem nas etapas 2, 3 e 4 do modal <strong>Analisar conversa</strong> (barra de progresso no topo). Cada etapa tem um botão de gravação individual e um indicador de nível de áudio em tempo real.
          </p>
          <div className="flex items-center gap-3 p-4 bg-neon-blue/5 border border-neon-blue/20 rounded-xl">
            <svg className="w-5 h-5 text-neon-blue flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <p className="text-sm text-muted m-0">
              O microfone é <strong className="text-white">opcional</strong> — pule se você for transcrever apenas o áudio do sistema (vídeo call, vídeo do PC) sem precisar de sua própria voz na transcrição.
            </p>
          </div>
        </div>

        {/* Microfone */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
            <span className="text-lg">🎤</span> Etapa 2 — Microfone (opcional)
          </h3>
          <p className="text-muted mb-4">
            Grava 4 segundos de áudio do microfone selecionado pelo sistema operacional e exibe uma prévia para ouvir antes de continuar.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-muted">
            <li>Clique em <strong>Gravar teste (4s)</strong>. O app solicita permissão de microfone, se necessário.</li>
            <li>O indicador de barra mostra o nível em tempo real durante os 4 segundos.</li>
            <li>Ouça a <strong>prévia de áudio</strong> para confirmar que sua voz foi captada com clareza.</li>
            <li>Se o nível estiver muito baixo, aproxime-se do microfone e clique <strong>Gravar de novo</strong>.</li>
          </ol>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-white">Problemas comuns:</p>
            <ul className="text-sm text-muted space-y-1 pl-4">
              <li><strong>Gravação muito baixa ou vazia:</strong> Fale mais perto do microfone. Verifique se o microfone correto está selecionado nas configurações de som do sistema operacional.</li>
              <li><strong>Permissão negada (Windows):</strong> Acesse <em>Configurações → Privacidade → Microfone</em> e ative o acesso para o Treplica.</li>
              <li><strong>Permissão negada (macOS):</strong> Acesse <em>Ajustes do Sistema → Privacidade e Segurança → Microfone</em> e ative para o Treplica.</li>
            </ul>
          </div>
        </div>

        {/* Áudio do sistema */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
            <span className="text-lg">🔊</span> Etapa 3 — Áudio do Sistema
          </h3>
          <p className="text-muted mb-4">
            Captura o som que sai pelos alto-falantes ou fones — ou seja, o que os outros participantes falam na chamada. O método de captura varia conforme o sistema operacional:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
              <strong className="text-white block mb-1">Windows 10+ e macOS 14.6+</strong>
              <p className="text-sm text-muted m-0">
                Captura <strong>nativa</strong> disponível via APIs do SO. O app confirma automaticamente — nenhum diálogo de compartilhamento de tela é exibido.
              </p>
            </div>
            <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
              <strong className="text-white block mb-1">macOS &lt; 14.6 / outros</strong>
              <p className="text-sm text-muted m-0">
                Usa compartilhamento de tela com áudio via <code>getDisplayMedia</code>. Um diálogo do sistema pergunta qual janela ou tela compartilhar — marque sempre <strong>"Compartilhar áudio do sistema"</strong>.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-white">Problemas comuns:</p>
            <ul className="text-sm text-muted space-y-1 pl-4">
              <li><strong>Nenhuma faixa de áudio:</strong> No diálogo de compartilhamento, marque explicitamente a opção de compartilhar áudio do sistema (checkbox).</li>
              <li><strong>Sem áudio na gravação (Windows):</strong> Reproduza algum som no PC durante os 4 segundos do teste.</li>
              <li><strong>Sem áudio na gravação (macOS):</strong> Reproduza som durante os 4 segundos. Se persistir, reinicie o Treplica com permissão de "Gravação de áudio do sistema" ativa em Privacidade e Segurança.</li>
            </ul>
          </div>
        </div>

        {/* Captura de tela */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
            <span className="text-lg">🖥️</span> Etapa 4 — Captura de Tela
          </h3>
          <p className="text-muted mb-4">
            Verifica que o Treplica consegue tirar snapshots da tela para análise visual pela IA (envio de imagem ao modelo de visão via atalho durante a sessão).
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-muted">
            <li>Selecione o <strong>monitor</strong> desejado (ou deixe em "Automático" para o monitor principal).</li>
            <li>Clique em <strong>Testar captura</strong>. Uma miniatura da tela aparece como prévia.</li>
            <li>Se a prévia aparecer corretamente, a captura está OK.</li>
          </ol>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-white">Problemas comuns:</p>
            <ul className="text-sm text-muted space-y-1 pl-4">
              <li><strong>Prévia vazia (macOS):</strong> Acesse <em>Ajustes do Sistema → Privacidade e Segurança → Gravação de Tela</em> e adicione o Treplica à lista de apps autorizados.</li>
              <li><strong>Prévia vazia (Windows):</strong> Execute o Treplica como administrador uma vez para conceder a permissão, ou verifique se há bloqueio de segurança corporativo.</li>
            </ul>
          </div>
        </div>

        {/* Teste de transcrição (setup) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Teste de Transcrição no Onboarding</h3>
          <p className="text-muted mb-4">
            Na tela de configuração inicial, há um painel de teste de transcrição independente dos preflight checks acima. Ele confirma que o provedor de STT está funcionando corretamente.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-muted">
            <li>Selecione o idioma (Auto-detect, Português BR, English US, Español, ou descreva um idioma personalizado).</li>
            <li>Pressione <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-xs">Ctrl+D</kbd> ou clique no botão de microfone para iniciar a gravação.</li>
            <li>Fale algumas frases. A transcrição aparece em tempo real na área de texto.</li>
            <li>Pressione o atalho novamente para enviar ao provedor de IA e ver a resposta.</li>
          </ol>
          <p className="text-muted text-sm mt-3">
            O atalho de envio varia conforme a plataforma e é exibido no rodapé do painel de teste.
          </p>

          <div className="flex items-start gap-3 p-4 mt-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
            <p className="text-sm text-muted m-0">
              <strong className="text-white">macOS:</strong> o reconhecimento de voz do navegador (Web Speech) não funciona dentro do app — o WebView do sistema (WKWebView) bloqueia o serviço. Por isso, no macOS, a transcrição do microfone e do áudio do sistema depende de um provedor de <strong className="text-white">Cloud STT</strong> (Whisper via Groq ou OpenAI). <strong className="text-white">Sem um provedor configurado, a transcrição fica indisponível no macOS</strong> — o assistente de configuração inicial avisa nesse caso na etapa de teste. No Windows, o Web Speech funciona como alternativa para o microfone mesmo sem provedor.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
