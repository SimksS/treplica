export default function ProviderSetupDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
            <rect x="9" y="9" width="6" height="6"></rect>
            <line x1="9" y1="1" x2="9" y2="4"></line>
            <line x1="15" y1="1" x2="15" y2="4"></line>
            <line x1="9" y1="20" x2="9" y2="23"></line>
            <line x1="15" y1="20" x2="15" y2="23"></line>
            <line x1="20" y1="9" x2="23" y2="9"></line>
            <line x1="20" y1="14" x2="23" y2="14"></line>
            <line x1="1" y1="9" x2="4" y2="9"></line>
            <line x1="1" y1="14" x2="4" y2="14"></line>
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">Provedores de Inteligência Artificial</h2>
      </div>

      <p className="text-lg text-muted">
        O Treplica precisa de um "Cérebro" para transcrever e analisar as reuniões. Você pode rodar esse cérebro localmente na sua máquina (100% privado e gratuito) ou usar serviços de terceiros na nuvem.
      </p>

      <div className="space-y-8 mt-4">

        {/* IA Local */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            IA Local — Máxima Privacidade
          </h3>
          <p className="text-muted mb-6">
            Se você possui um computador com boa placa de vídeo (GPU) ou um Mac M1/M2/M3, recomendamos o Ollama. Tudo roda offline. O LM Studio também é suportado para quem prefere interface gráfica.
          </p>

          <div className="space-y-6">
            <div>
              <h4 className="text-white font-semibold mb-3">🦙 Ollama</h4>
              <ol className="list-decimal pl-6 space-y-3 text-muted">
                <li>Instale o <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">Ollama</a>.</li>
                <li>Abra o terminal e baixe um modelo de linguagem. Exemplo: <code>ollama pull llama3.2</code></li>
                <li>No Treplica, vá em <strong>Configurações → Provedores</strong>, clique em <strong>Buscar servidor Ollama</strong>.</li>
                <li><strong>Base URL:</strong> <code>http://127.0.0.1:11434</code> (preenchido automaticamente)</li>
                <li><strong>Modelo:</strong> <code>llama3.2</code> (ou o nome do modelo que você baixou).</li>
                <li>Clique em <strong>Testar</strong>. Se funcionar, salve e ative o provedor.</li>
              </ol>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">〰️ LM Studio</h4>
              <ol className="list-decimal pl-6 space-y-2 text-muted">
                <li>Instale o <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">LM Studio</a> e ative o servidor local.</li>
                <li>No Treplica, vá em <strong>Configurações → Provedores</strong> e selecione <strong>LM Studio</strong>.</li>
                <li><strong>Base URL:</strong> <code>http://127.0.0.1:1234/v1</code> (preenchido automaticamente).</li>
                <li>Clique em <strong>Testar</strong> e salve.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* IA na Nuvem */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">IA na Nuvem</h3>
          <p className="text-muted mb-4">
            Serviços na nuvem são ideais se você não tem hardware potente ou precisa das respostas mais inteligentes possíveis. Eles requerem chaves de API pagas pelo uso.
          </p>

          <div className="overflow-x-auto rounded-lg border border-white/10 mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Provedor</th>
                  <th className="px-4 py-3 border-b border-white/10">Base URL</th>
                  <th className="px-4 py-3 border-b border-white/10">Especialidade</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Groq</td>
                  <td className="px-4 py-3"><code>https://api.groq.com/openai/v1</code></td>
                  <td className="px-4 py-3">Inferência ultrarrápida (Llama + Whisper). Melhor custo-benefício para transcrição.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenAI</td>
                  <td className="px-4 py-3"><code>https://api.openai.com/v1</code></td>
                  <td className="px-4 py-3">Modelos robustos (GPT-4o) para lógica complexa e análise profunda.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Google Gemini</td>
                  <td className="px-4 py-3"><code>generativelanguage.googleapis.com/v1beta/openai/</code></td>
                  <td className="px-4 py-3">Modelos multimodais rápidos (Gemini 2.0 Flash e Pro).</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenRouter</td>
                  <td className="px-4 py-3"><code>https://openrouter.ai/api/v1</code></td>
                  <td className="px-4 py-3">Acesso unificado a centenas de modelos com uma única chave de API.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">API personalizada</td>
                  <td className="px-4 py-3"><em>Qualquer endpoint</em></td>
                  <td className="px-4 py-3">Endpoints compatíveis com OpenAI: Anthropic (via proxy), vLLM, LocalAI, etc.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-muted mb-2"><strong>Como configurar:</strong></p>
          <ul className="list-disc pl-6 space-y-2 text-muted">
            <li>Vá em <strong>Configurações → Provedores</strong> e selecione o provedor desejado.</li>
            <li>Insira sua <strong>API Key</strong>. Ela é armazenada cifrada no Cofre nativo do Sistema Operacional (Keyring/Keychain) e nunca exposta em texto plano.</li>
            <li>Para provedores na nuvem, certifique-se de que o modo de privacidade permite conexões externas (veja <a href="#privacidade-e-stealth" className="text-neon-blue hover:underline">Privacidade e Stealth</a>).</li>
          </ul>
        </div>

        {/* Roteamento de Modelos */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-2">Roteamento de Modelos por Tarefa</h3>
          <p className="text-muted mb-4">
            Em <strong>Configurações → Roteamento de modelos</strong>, você pode designar provedores diferentes para cada tipo de tarefa. Isso permite combinar, por exemplo, o Groq (rápido e barato) para transcrição com o GPT-4o (mais inteligente) para orientações em tempo real.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Tarefa</th>
                  <th className="px-4 py-3 border-b border-white/10">Descrição</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Transcrição (STT)</td>
                  <td className="px-4 py-3">Converte áudio em texto durante a sessão.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Orientação em tempo real</td>
                  <td className="px-4 py-3">Gera sugestões de resposta, follow-ups e próximos passos.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Tradução</td>
                  <td className="px-4 py-3">Traduz transcrições para o idioma-alvo selecionado.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Visão (análise de imagem)</td>
                  <td className="px-4 py-3">Processa capturas de tela enviadas durante a sessão.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Documentos</td>
                  <td className="px-4 py-3">Gera resumos, notas, e-mails de follow-up e transcrições exportadas após a reunião.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted text-sm mt-3">
            Se nenhum provedor for especificado para uma tarefa, o Treplica usa o primeiro provedor ativo disponível.
          </p>
        </div>

        {/* Troubleshoot */}
        <div className="bg-white/5 border border-white/10 border-l-4 border-l-yellow-500/50 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-2">Solução de Problemas</h4>
          <ul className="space-y-2 text-muted text-sm">
            <li><strong>Teste falha "API key not configured":</strong> Recrie o provedor com a chave correta.</li>
            <li><strong>Ollama offline:</strong> Verifique se o app do Ollama está rodando na bandeja do sistema.</li>
            <li><strong>Provedor na nuvem bloqueado:</strong> Vá em Privacidade e garanta que não está no modo "Somente local".</li>
            <li><strong>Anthropic / Claude:</strong> Não há preset nativo para Anthropic. Use <strong>API personalizada</strong> com um proxy compatível com OpenAI (ex: LiteLLM).</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
