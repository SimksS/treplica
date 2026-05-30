export default function QuickstartDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">Início Rápido</h2>
      </div>

      <p className="text-lg text-muted">
        O Treplica é um aplicativo desktop local-first projetado para capturar e analisar suas reuniões de forma segura. Siga estes passos para sua primeira execução.
      </p>

      <div className="space-y-8 mt-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <h3 className="text-xl font-semibold text-white mb-4">1. Instalação</h3>
          <p className="text-muted mb-4">
            Faça o download da versão mais recente do Treplica para o seu sistema operacional.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted">
            <li><strong>Windows 10/11:</strong> Baixe o instalador <code>.msi</code> ou <code>.exe</code>.</li>
            <li><strong>macOS (12+):</strong> Baixe o arquivo <code>.dmg</code> ou <code>.app</code> e mova para a pasta Aplicativos.</li>
            <li><strong>Linux:</strong> Consulte as instruções de build no repositório GitHub.</li>
          </ul>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">2. Primeira Execução e Permissões</h3>
          <p className="text-muted mb-4">
            Ao abrir o Treplica pela primeira vez, o assistente de configuração será exibido para preparar o ambiente:
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-muted">
            <li>
              <strong className="text-white">Permissões de Áudio:</strong> O aplicativo solicitará acesso ao Microfone. No Windows e macOS (14.6+), o áudio do sistema é capturado nativamente para transcrever a reunião sem vazar sua voz pelo alto-falante.
            </li>
            <li>
              <strong className="text-white">Idioma de Transcrição:</strong> Selecione o idioma principal que você costuma utilizar em suas reuniões.
            </li>
            <li>
              <strong className="text-white">Provedor de Inteligência Artificial:</strong> Configure pelo menos um provedor de IA (local como Ollama ou LM Studio, ou nuvem como OpenAI, Groq, Google Gemini ou OpenRouter). Veja a seção de <a href="#configuracao-ia" className="text-neon-blue hover:underline">Configuração de IA</a> para detalhes.
            </li>
            <li>
              <strong className="text-white">Preset de Assistente:</strong> Ao iniciar sua primeira sessão, escolha um perfil pré-configurado (Anotador de reunião, Assistente de vendas, Entrevista técnica ou Assistente geral) para que a IA saiba como se comportar durante a conversa.
            </li>
          </ol>
        </div>

        <div className="bg-white/5 border border-white/10 border-l-4 border-l-neon-blue rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Dica Importante (macOS)
          </h4>
          <p className="text-muted">
            Na primeira captura de áudio do sistema, o macOS pode pedir autorização em <strong>Ajustes do Sistema → Privacidade e Segurança → Gravação de áudio do sistema</strong>. Sem essa permissão, o Treplica só conseguirá ouvir o seu microfone e não captará o áudio dos outros participantes da reunião.
          </p>
        </div>
      </div>
    </div>
  );
}
