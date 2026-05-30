export default function ModelSuggestionsDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">Sugestão de Modelos por Tarefa</h2>
      </div>

      <p className="text-lg text-muted">
        O Treplica executa <strong>6 tarefas distintas de IA</strong>, cada uma com requisitos diferentes de velocidade, custo e capacidade. Esta página lista os modelos recomendados para cada tarefa, organizados por provedor.
      </p>

      <div className="bg-white/5 border border-white/10 border-l-4 border-l-neon-blue rounded-2xl p-5 mt-2">
        <p className="text-sm text-muted m-0">
          Configure o provedor e modelo de cada tarefa em <strong>Configurações → Roteamento de modelos</strong>. Os modelos abaixo são sugestões — você pode digitar qualquer model ID compatível com o provedor escolhido.
        </p>
      </div>

      <div className="space-y-8 mt-2">

        {/* STT / Transcrição */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎙️</span>
            <div>
              <h3 className="text-xl font-semibold text-white m-0">Transcrição (STT)</h3>
              <p className="text-sm text-muted m-0">Converte áudio em texto durante a sessão em tempo real.</p>
            </div>
          </div>
          <p className="text-muted mb-4 text-sm">
            <strong className="text-white">Prioridade:</strong> latência baixa e precisão em português. Modelos Whisper são os mais indicados. O Groq oferece o melhor custo-benefício para STT em nuvem.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Provedor</th>
                  <th className="px-4 py-3 border-b border-white/10">Modelo recomendado</th>
                  <th className="px-4 py-3 border-b border-white/10">Observação</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Groq</td>
                  <td className="px-4 py-3"><code>whisper-large-v3</code></td>
                  <td className="px-4 py-3">Melhor opção: rápido, preciso e barato. Recomendado para a maioria dos usuários.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenAI</td>
                  <td className="px-4 py-3"><code>whisper-1</code></td>
                  <td className="px-4 py-3">Boa precisão, custo moderado.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenRouter</td>
                  <td className="px-4 py-3"><code>openai/whisper-1</code></td>
                  <td className="px-4 py-3">Acesso ao Whisper via OpenRouter.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Ollama (local)</td>
                  <td className="px-4 py-3"><em>Não suportado diretamente</em></td>
                  <td className="px-4 py-3">Modelos Whisper via Ollama não são compatíveis com a API de STT. Use Groq ou OpenAI para transcrição em nuvem.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Orientação em tempo real */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="text-xl font-semibold text-white m-0">Orientação em Tempo Real</h3>
              <p className="text-sm text-muted m-0">Gera sugestões de resposta, follow-ups e próximos passos durante a sessão.</p>
            </div>
          </div>
          <p className="text-muted mb-4 text-sm">
            <strong className="text-white">Prioridade:</strong> velocidade de resposta — quanto mais rápido, menos você interrompe o fluxo da conversa. Modelos menores (7B–8B) com inferência rápida são preferíveis a modelos grandes lentos.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Provedor</th>
                  <th className="px-4 py-3 border-b border-white/10">Modelos recomendados</th>
                  <th className="px-4 py-3 border-b border-white/10">Perfil</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Groq</td>
                  <td className="px-4 py-3"><code>llama-3.1-8b-instant</code><br /><code>llama-3.3-70b-versatile</code></td>
                  <td className="px-4 py-3">8b: ultra-rápido para uso ao vivo. 70b: mais contexto e qualidade, mas ligeiramente mais lento.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenAI</td>
                  <td className="px-4 py-3"><code>gpt-4o-mini</code><br /><code>gpt-4o</code></td>
                  <td className="px-4 py-3">mini: melhor custo-benefício. 4o: qualidade máxima para reuniões críticas.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Google Gemini</td>
                  <td className="px-4 py-3"><code>gemini-2.0-flash</code></td>
                  <td className="px-4 py-3">Via OpenRouter: <code>google/gemini-2.0-flash</code>. Rápido e barato.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenRouter</td>
                  <td className="px-4 py-3"><code>openai/gpt-4o-mini</code><br /><code>anthropic/claude-3.5-haiku</code></td>
                  <td className="px-4 py-3">Acesso a múltiplos modelos com uma chave. Haiku é excelente para orientações rápidas.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Ollama (local)</td>
                  <td className="px-4 py-3"><code>llama3.2</code><br /><code>qwen2.5:7b</code></td>
                  <td className="px-4 py-3">100% privado e offline. Requer GPU dedicada para velocidade adequada ao vivo.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tradução */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌐</span>
            <div>
              <h3 className="text-xl font-semibold text-white m-0">Tradução</h3>
              <p className="text-sm text-muted m-0">Traduz transcrições para o idioma-alvo selecionado em tempo real.</p>
            </div>
          </div>
          <p className="text-muted mb-4 text-sm">
            <strong className="text-white">Prioridade:</strong> velocidade e custo. A tradução acontece em paralelo à transcrição, então modelos leves são preferíveis. Pares de idiomas que incluem português funcionam bem com modelos menores.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Provedor</th>
                  <th className="px-4 py-3 border-b border-white/10">Modelos recomendados</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Groq</td>
                  <td className="px-4 py-3"><code>llama-3.1-8b-instant</code></td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenAI</td>
                  <td className="px-4 py-3"><code>gpt-4o-mini</code></td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenRouter</td>
                  <td className="px-4 py-3"><code>google/gemini-2.0-flash-lite</code> · <code>openai/gpt-4o-mini</code></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Ollama (local)</td>
                  <td className="px-4 py-3"><code>qwen2.5:3b</code> · <code>llama3.2</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Visão / Análise de imagem */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">👁️</span>
            <div>
              <h3 className="text-xl font-semibold text-white m-0">Visão — Análise de Imagem</h3>
              <p className="text-sm text-muted m-0">Processa capturas de tela enviadas durante a sessão para análise contextual pela IA.</p>
            </div>
          </div>
          <p className="text-muted mb-4 text-sm">
            <strong className="text-white">Prioridade:</strong> suporte a visão (multimodal) é obrigatório. Nem todos os modelos aceitam imagens — use modelos explicitamente multimodais. Requer um provedor diferente do STT, configurado separadamente em Roteamento de modelos.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Provedor</th>
                  <th className="px-4 py-3 border-b border-white/10">Modelos recomendados</th>
                  <th className="px-4 py-3 border-b border-white/10">Observação</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenAI</td>
                  <td className="px-4 py-3"><code>gpt-4o-mini</code></td>
                  <td className="px-4 py-3">Suporte nativo a visão. Rápido e barato para análise de tela.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenRouter</td>
                  <td className="px-4 py-3"><code>google/gemini-2.0-flash</code><br /><code>openai/gpt-4o-mini</code></td>
                  <td className="px-4 py-3">Gemini Flash é excelente para análise de imagens com baixo custo.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Ollama (local)</td>
                  <td className="px-4 py-3"><code>llava:7b</code></td>
                  <td className="px-4 py-3">Modelo multimodal local. Precisa de GPU com VRAM suficiente (~6GB+). Mais lento que nuvem.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <p className="text-sm text-muted m-0">
              <strong className="text-white">Importante:</strong> ao usar o atalho de snapshot durante a sessão, o Treplica usa o provedor configurado para <strong>Visão</strong>, não o de Orientação. Configure-os separadamente se quiser usar modelos diferentes para cada função.
            </p>
          </div>
        </div>

        {/* Documentos / Sumarização */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📄</span>
            <div>
              <h3 className="text-xl font-semibold text-white m-0">Documentos e Sumarização</h3>
              <p className="text-sm text-muted m-0">Gera resumos, notas, e-mails de follow-up e transcrições após a reunião.</p>
            </div>
          </div>
          <p className="text-muted mb-4 text-sm">
            <strong className="text-white">Prioridade:</strong> qualidade e raciocínio. Esta tarefa não é em tempo real — acontece após a sessão. Modelos maiores e mais capazes produzem documentos mais ricos. Latência alta é aceitável.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Provedor</th>
                  <th className="px-4 py-3 border-b border-white/10">Modelos recomendados</th>
                  <th className="px-4 py-3 border-b border-white/10">Perfil</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Groq</td>
                  <td className="px-4 py-3"><code>llama-3.3-70b-versatile</code></td>
                  <td className="px-4 py-3">Boa qualidade, rápido e barato para sumarização.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenAI</td>
                  <td className="px-4 py-3"><code>gpt-4o-mini</code></td>
                  <td className="px-4 py-3">Excelente para follow-up emails e notas estruturadas.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">OpenRouter</td>
                  <td className="px-4 py-3"><code>google/gemini-2.0-flash</code><br /><code>openai/gpt-4o-mini</code></td>
                  <td className="px-4 py-3">Gemini Flash tem janela de contexto longa, ideal para transcrições extensas.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Ollama (local)</td>
                  <td className="px-4 py-3"><code>qwen2.5:14b</code><br /><code>llama3.2</code></td>
                  <td className="px-4 py-3">qwen2.5:14b oferece melhor qualidade local. Mais lento, sem custo de API.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo de combinações recomendadas */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Combinações Recomendadas</h3>
          <p className="text-muted mb-4">
            Para quem quer começar rápido, estas três combinações cobrem os casos de uso mais comuns:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-black/30 border border-neon-blue/20 rounded-xl">
              <strong className="text-neon-blue block mb-2">Máxima privacidade (local)</strong>
              <ul className="text-sm text-muted space-y-1">
                <li>STT: Groq Whisper</li>
                <li>Orientação: Ollama llama3.2</li>
                <li>Tradução: Ollama qwen2.5:3b</li>
                <li>Visão: Ollama llava:7b</li>
                <li>Docs: Ollama qwen2.5:14b</li>
              </ul>
              <p className="text-xs text-muted/60 mt-2">Requer GPU com ≥8GB VRAM. STT usa Groq (gratuito generoso).</p>
            </div>
            <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
              <strong className="text-white block mb-2">Custo-benefício (nuvem)</strong>
              <ul className="text-sm text-muted space-y-1">
                <li>STT: Groq whisper-large-v3</li>
                <li>Orientação: Groq llama-3.1-8b-instant</li>
                <li>Tradução: Groq llama-3.1-8b-instant</li>
                <li>Visão: OpenAI gpt-4o-mini</li>
                <li>Docs: Groq llama-3.3-70b-versatile</li>
              </ul>
              <p className="text-xs text-muted/60 mt-2">Usa principalmente Groq (mais barato) e OpenAI só para visão.</p>
            </div>
            <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
              <strong className="text-white block mb-2">Qualidade máxima</strong>
              <ul className="text-sm text-muted space-y-1">
                <li>STT: Groq whisper-large-v3</li>
                <li>Orientação: OpenAI gpt-4o</li>
                <li>Tradução: OpenAI gpt-4o-mini</li>
                <li>Visão: OpenAI gpt-4o-mini</li>
                <li>Docs: OpenAI gpt-4o</li>
              </ul>
              <p className="text-xs text-muted/60 mt-2">Melhor qualidade de resposta. Custo mais alto por sessão.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
