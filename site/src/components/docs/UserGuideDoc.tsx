export default function UserGuideDoc() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <h2 className="text-3xl font-display font-semibold text-white m-0">Guia de Uso (Dia a Dia)</h2>
      </div>

      <p className="text-lg text-muted">
        Aprenda como iniciar o Treplica para suas reuniões, interagir com a Inteligência Artificial e extrair documentos de acompanhamento.
      </p>

      <div className="space-y-8 mt-4">
        {/* Iniciar Reunião */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Iniciando uma Reunião</h3>
          <ol className="list-decimal pl-6 space-y-4 text-muted">
            <li>
              Na <strong>página inicial</strong>, clique em <strong>Analisar conversa</strong>.
            </li>
            <li>
              Siga as <strong>6 etapas</strong> do modal (barra de progresso no topo): áudio/idioma → microfone → áudio do sistema → captura de tela → assistente → contexto opcional.
            </li>
            <li>
              Use <strong>Continuar</strong> em cada etapa; os testes de áudio e captura são obrigatórios no app desktop antes de <strong>Iniciar sessão</strong>.
            </li>
            <li>
              Clique em <strong>Iniciar sessão</strong>. O Treplica abre o overlay <em>stealth</em> (ou a janela ao vivo, se o overlay não estiver disponível).
            </li>
          </ol>
          <p className="text-muted text-sm mt-4">
            Para mudar idioma ou modo de áudio, encerre a sessão e abra o modal novamente — durante a gravação o app só mostra um resumo das preferências escolhidas.
          </p>
        </div>

        {/* Presets de Assistente */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Presets de Assistente</h3>
          <p className="text-muted mb-4">
            Na etapa <strong>Assistente</strong> do modal, você escolhe um perfil pré-configurado que define o comportamento da IA durante a sessão. Cada preset tem um papel, objetivo e tom otimizados para o contexto.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Anotador de reunião", desc: "Captura decisões, action items e alinhamentos de forma estruturada." },
              { name: "Assistente de vendas", desc: "Foco em superar objeções, identificar necessidades e conduzir fechamentos." },
              { name: "Entrevista técnica", desc: "Avalia competências, formula perguntas investigativas e registra respostas-chave." },
              { name: "Assistente geral", desc: "Uso versátil para reuniões sem um objetivo específico predefinido." },
            ].map(({ name, desc }) => (
              <div key={name} className="p-4 bg-black/30 border border-white/10 rounded-xl">
                <strong className="text-white block mb-1">{name}</strong>
                <p className="text-sm text-muted m-0">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-muted text-sm mt-4">
            Você pode personalizar qualquer preset ou criar contextos totalmente manuais na etapa <strong>Contexto</strong>.
          </p>
        </div>

        {/* Contexto da Sessão */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Contexto da Sessão</h3>
          <p className="text-muted mb-4">
            O contexto ajusta como a IA gera sugestões. Quanto mais informações você fornecer, mais precisas e relevantes serão as orientações. Todos os campos são opcionais.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="px-4 py-3 border-b border-white/10">Campo</th>
                  <th className="px-4 py-3 border-b border-white/10">Exemplo / Uso</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Papel</td>
                  <td className="px-4 py-3">Vendas, Entrevistador, Consultor</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Objetivo</td>
                  <td className="px-4 py-3">Fechar contrato Q2, avaliar candidato, apresentar proposta</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Audiência</td>
                  <td className="px-4 py-3">CTO de startup, RH corporativo, cliente enterprise</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Tom preferido</td>
                  <td className="px-4 py-3">Objetivo e direto, consultivo, técnico, empático</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Notas do produto / empresa</td>
                  <td className="px-4 py-3">Informações de contexto sobre o produto ou empresa do cliente</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium text-white">Tópicos proibidos</td>
                  <td className="px-4 py-3">Assuntos que a IA deve evitar mencionar nas sugestões</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Prompt de sistema</td>
                  <td className="px-4 py-3">Instrução livre em linguagem natural para customização avançada do comportamento da IA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Memória da Sessão */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Memória da Sessão</h3>
          <p className="text-muted mb-4">
            Durante uma reunião, o Treplica mantém uma <strong>conversa contínua</strong> com a IA: o contexto e o material que você forneceu entram logo na primeira orientação e permanecem &ldquo;na memória&rdquo; do modelo até o fim da sessão. As orientações seguintes consideram o que já foi dito antes, em vez de tratar cada pedido isoladamente.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted">
            <li>
              O <strong>contexto da sessão</strong> é fixado no início e continua valendo a cada nova orientação.
            </li>
            <li>
              As respostas são propositalmente <strong>curtas e diretas</strong>, pensadas para leitura de relance enquanto você participa da conversa.
            </li>
            <li>
              Ao <strong>encerrar a sessão</strong>, a conversa com a IA é descartada — a próxima reunião começa do zero, sem misturar contextos.
            </li>
          </ul>
        </div>

        {/* Interface e Atalhos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Durante a Sessão</h3>
            <ul className="space-y-3 text-muted">
              <li className="flex items-start gap-2">
                <span className="text-neon-blue font-bold">•</span>
                <span><strong>Modo discreto</strong> (Configurações): apenas overlay e proteção em capturas — não altera áudio nem idiomas da sessão.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon-blue font-bold">•</span>
                <span><strong>Transcrição:</strong> Aparecerá em tempo real, dividida entre "Você" e "Sistema".</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon-blue font-bold">•</span>
                <span><strong>Tradução:</strong> Ative o painel de tradução para ver falas no seu idioma. Idiomas suportados: português, inglês, espanhol, francês e alemão.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon-blue font-bold">•</span>
                <span><strong>Orientações:</strong> A IA envia cards flutuantes com sugestões. Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-xs">Ctrl+Shift+O</kbd> para solicitar orientação via teclado a qualquer momento.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Atalhos de teclado</h3>
            <p className="text-muted text-sm mb-4">
              Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-xs">Ctrl+Shift+H</kbd>{" "}
              para o overlay e <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-xs">Ctrl+Shift+O</kbd>{" "}
              para pedir orientação à IA (no Mac, substitua Ctrl por ⌘). Ambos funcionam globalmente, mesmo com o Treplica minimizado.
            </p>
            <a
              href="#atalhos-de-teclado"
              className="text-sm font-medium text-white hover:text-neon-blue transition-colors"
            >
              Ver tabela completa de atalhos →
            </a>
          </div>
        </div>

        {/* Categorias de Orientação */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Categorias de Orientação</h3>
          <p className="text-muted mb-4">
            As sugestões geradas pela IA são classificadas em categorias. Você pode filtrar por categoria no painel de orientações durante a sessão.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Objeções", desc: "Como responder a objeções ou resistências levantadas." },
              { label: "Follow-up", desc: "Perguntas investigativas para aprofundar um ponto." },
              { label: "Próximo passo", desc: "Ações concretas a propor para avançar a conversa." },
              { label: "Respostas", desc: "Respostas diretas a perguntas feitas durante a reunião." },
              { label: "Pontos", desc: "Argumentos ou informações relevantes a mencionar." },
            ].map(({ label, desc }) => (
              <div key={label} className="p-4 bg-black/30 border border-white/10 rounded-xl">
                <strong className="text-white block mb-1">{label}</strong>
                <p className="text-sm text-muted m-0">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Executando em segundo plano */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Executando em Segundo Plano</h3>
          <p className="text-muted mb-4">
            Ao clicar no <strong>X</strong> para fechar a janela, o Treplica pergunta o que você deseja fazer:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
              <strong className="text-white block mb-1">Minimizar</strong>
              <p className="text-sm text-muted m-0">
                Mantém o aplicativo ativo em segundo plano. O overlay stealth e os atalhos globais continuam funcionando normalmente.
              </p>
            </div>
            <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
              <strong className="text-white block mb-1">Sair</strong>
              <p className="text-sm text-muted m-0">
                Encerra o processo completamente. Sessões em andamento são salvas antes do fechamento.
              </p>
            </div>
          </div>
          <p className="text-muted mb-3">
            Quando minimizado, o Treplica aparece no <strong>ícone da bandeja</strong> (área de notificações no Windows/Linux, barra de menu no macOS). A partir dele você pode:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted">
            <li>
              <strong>Clique no ícone</strong> ou selecione <strong>Abrir Treplica</strong> para restaurar a janela principal.
            </li>
            <li>
              Selecione <strong>Sair</strong> para encerrar o aplicativo sem precisar restaurar a janela.
            </li>
          </ul>
        </div>

        {/* Após a reunião */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Depois da Reunião</h3>
          <p className="text-muted mb-4">
            Quando a reunião terminar, encerre a sessão. Ela será salva automaticamente no seu <strong>Histórico local</strong>. Você também pode buscar sessões antigas por palavras-chave no histórico.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted mb-4">
            <li>Acesse o Histórico para rever a transcrição completa.</li>
            <li>
              Na aba <strong>Documentos</strong>, solicite à IA que gere um dos seguintes tipos de documento:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Resumo</strong> — síntese executiva dos pontos discutidos</li>
                <li><strong>Follow-up</strong> — e-mail de acompanhamento com próximos passos</li>
                <li><strong>Notas</strong> — anotações estruturadas da reunião</li>
                <li><strong>Transcrição</strong> — exportação completa do texto transcrito</li>
              </ul>
            </li>
            <li>Todos os documentos podem ser exportados como Markdown (<code>.md</code>) ou copiados para a área de transferência.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
