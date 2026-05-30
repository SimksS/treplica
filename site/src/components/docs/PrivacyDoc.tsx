export default function PrivacyDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">Privacidade e Stealth</h2>
      </div>

      <p className="text-lg text-muted">
        O Treplica foi construído sob o paradigma <strong>Local-First</strong>. Seus dados pertencem a você e não passam por servidores intermediários da nossa empresa.
      </p>

      <div className="space-y-8 mt-4">
        {/* O que fica na máquina */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">O Que Fica na Sua Máquina</h3>
          <ul className="space-y-3 text-muted">
            <li className="flex items-start gap-2">
              <span className="text-neon-blue font-bold">✓</span>
              <span><strong>Áudio e Transcrições:</strong> Gravados temporariamente e processados no seu computador ou enviados diretamente para a API (ex: OpenAI) que VOCÊ configurou.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-blue font-bold">✓</span>
              <span><strong>Histórico e Documentos:</strong> Salvos no banco de dados local SQLite (<code>treplica.db</code>).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-blue font-bold">✓</span>
              <span><strong>Chaves de API:</strong> Guardadas no Cofre do Sistema Operacional (Keyring/Keychain), nunca em texto plano.</span>
            </li>
          </ul>
        </div>

        {/* Modos de Privacidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Modos de Privacidade</h3>
            <p className="text-muted text-sm mb-4">Configure em <strong>Configurações → Privacidade</strong>. O nome exato de cada modo aparece como mostrado abaixo.</p>
            <div className="space-y-4 text-muted">
              <div>
                <strong className="text-white block mb-1">Somente local</strong>
                <p className="text-sm">Nenhum dado sai do dispositivo. O Treplica só funcionará com provedores locais (Ollama, LM Studio). Garantia de 0% de vazamento.</p>
              </div>
              <div>
                <strong className="text-white block mb-1">Hosted por sessão</strong>
                <p className="text-sm">Se você usa IA na nuvem, o aplicativo pedirá confirmação no início de cada reunião antes de enviar dados para o provedor.</p>
              </div>
              <div>
                <strong className="text-white block mb-1">Hosted padrão</strong>
                <p className="text-sm">Permite o uso de provedores na nuvem sem confirmação a cada sessão, desde que estejam configurados.</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Modo Stealth</h3>
            <p className="text-muted text-sm mb-4">
              O "Overlay Stealth" é uma janela flutuante que se mantém sempre no topo, visível apenas para você.
            </p>
            <div className="p-4 bg-black/40 rounded-lg border border-white/5 mb-4">
              <p className="text-sm text-muted">
                No <strong>Windows 10 (2004+)</strong> e <strong>macOS</strong>, utilizamos APIs nativas do sistema operacional (como <code>SetWindowDisplayAffinity</code>) para garantir que o overlay do Treplica seja <strong>invisível em capturas de tela</strong> e transmissões via Google Meet, Zoom e Teams.
              </p>
            </div>
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/30 rounded-lg">
              <p className="text-sm font-semibold text-yellow-400 mb-1">⚠️ Linux — Modo Stealth não suportado</p>
              <p className="text-sm text-muted m-0">
                No Linux não existe um mecanismo padronizado equivalente ao <code>SetWindowDisplayAffinity</code> do Windows ou às APIs de exclusão de tela do macOS. O overlay flutuante funciona normalmente na tela, mas <strong>ficará visível em capturas de tela e transmissões de compartilhamento</strong> (OBS, Meet, Zoom, Teams). Use o Treplica no Linux com ciência dessa limitação.
              </p>
            </div>
          </div>
        </div>

        {/* Retenção de Dados */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Arquivos e Retenção</h3>
          <p className="text-muted mb-4">
            Em <strong>Configurações → Arquivos e backup</strong>, você define para onde seus documentos exportados (Markdown) devem ir. Você pode sincronizá-los diretamente com seu OneDrive, Google Drive ou pasta segura.
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-sm text-muted mb-2"><strong>Caminhos Padrão de Dados:</strong></p>
            <ul className="text-sm text-muted/80 font-mono space-y-1">
              <li>Windows: <code className="text-white bg-black px-1 rounded">%APPDATA%\com.treplica.desktop\</code></li>
              <li>macOS: <code className="text-white bg-black px-1 rounded">~/Library/Application Support/com.treplica.desktop/</code></li>
            </ul>
          </div>
          <p className="text-sm text-muted mt-4">
            Se você excluir uma sessão pelo aplicativo, todos os registros relacionados no banco de dados e arquivos gerados (resumos, e-mails) serão apagados permanentemente do disco.
          </p>
        </div>
      </div>
    </div>
  );
}
