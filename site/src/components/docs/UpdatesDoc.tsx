export default function UpdatesDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">Atualizações do Sistema</h2>
      </div>

      <p className="text-lg text-muted">
        O Treplica verifica e aplica atualizações de forma manual, com sua confirmação. Nenhuma atualização é instalada em segundo plano sem que você aprove.
      </p>

      <div className="space-y-8 mt-4">

        {/* Como verificar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Como Verificar e Instalar Atualizações</h3>
          <ol className="list-decimal pl-6 space-y-4 text-muted">
            <li>
              Acesse <strong>Configurações → Atualizações</strong>.
            </li>
            <li>
              Clique em <strong>Verificar atualizações</strong>. O app consulta o servidor de releases e exibe:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Versão atual</strong> instalada no seu dispositivo.</li>
                <li><strong>Última versão</strong> disponível para download (se houver uma versão mais nova).</li>
                <li><strong>Notas de versão</strong> com o que mudou na nova release.</li>
              </ul>
            </li>
            <li>
              Se uma atualização estiver disponível, o botão <strong>Instalar v[versão]</strong> aparece. Clique para iniciar o download e a instalação.
            </li>
            <li>
              O app solicita confirmação antes de aplicar. Após a instalação, reinicie o Treplica para usar a nova versão.
            </li>
          </ol>
          <div className="mt-4 p-4 bg-black/30 border border-white/10 rounded-xl">
            <p className="text-sm text-muted m-0">
              <strong className="text-white">Sem atualização disponível?</strong> O app exibirá a mensagem <em>"Você está na versão mais recente disponível."</em>
            </p>
          </div>
        </div>

        {/* Política de atualizações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3">O que é atualizado</h3>
            <ul className="space-y-2 text-muted text-sm">
              <li className="flex items-start gap-2">
                <span className="text-neon-blue font-bold flex-shrink-0">•</span>
                <span>Binário do aplicativo desktop (Tauri + Rust + interface)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon-blue font-bold flex-shrink-0">•</span>
                <span>Correções de bugs e melhorias de performance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon-blue font-bold flex-shrink-0">•</span>
                <span>Novos recursos e integrações de provedores</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3">O que NÃO é afetado</h3>
            <ul className="space-y-2 text-muted text-sm">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 font-bold flex-shrink-0">•</span>
                <span>Seu histórico de sessões e documentos gerados</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 font-bold flex-shrink-0">•</span>
                <span>Configurações de provedores e chaves de API</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 font-bold flex-shrink-0">•</span>
                <span>Preferências de acessibilidade e privacidade</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Linux */}
        <div className="bg-white/5 border border-white/10 border-l-4 border-l-yellow-500/50 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-2">Atualizações no Linux</h4>
          <p className="text-muted text-sm">
            No Linux, o mecanismo de atualização automática via <strong>Configurações → Atualizações</strong> pode não estar disponível dependendo do método de instalação. Se você instalou via pacote do sistema (<code>.deb</code>, <code>.rpm</code>) ou gerenciador de pacotes, use o gerenciador de pacotes do seu sistema para atualizar. Para builds manuais, consulte o repositório GitHub para baixar a versão mais recente.
          </p>
        </div>

      </div>
    </div>
  );
}
