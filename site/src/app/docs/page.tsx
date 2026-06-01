import QuickstartDoc from "@/components/docs/QuickstartDoc";
import UserGuideDoc from "@/components/docs/UserGuideDoc";
import ProviderSetupDoc from "@/components/docs/ProviderSetupDoc";
import PrivacyDoc from "@/components/docs/PrivacyDoc";
import KeyboardShortcutsDoc from "@/components/docs/KeyboardShortcutsDoc";
import ModelSuggestionsDoc from "@/components/docs/ModelSuggestionsDoc";
import MicrophoneTestDoc from "@/components/docs/MicrophoneTestDoc";
import AccessibilityDoc from "@/components/docs/AccessibilityDoc";
import UpdatesDoc from "@/components/docs/UpdatesDoc";

export default function DocsPage() {
  return (
    <article className="prose prose-invert prose-p:text-muted prose-headings:text-white max-w-none">
      {/* Beta Disclaimer */}
      <div className="not-prose mb-10 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-amber-400 shrink-0 pt-0.5"
          aria-hidden="true"
        >
          <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"></path>
          <path d="M6.453 15h11.094"></path>
          <path d="M8.5 2h7"></path>
        </svg>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-amber-400">
            Versão Beta
          </span>
          <p className="text-sm text-amber-300/80 leading-relaxed m-0">
            O Treplica está em versão beta ativa. Esta documentação pode não
            refletir o estado mais recente do produto — recursos, interfaces e
            configurações estão sujeitos a mudanças. Encontrou um problema?
            Reporte via GitHub.
          </p>
        </div>
      </div>

      {/* Page Header */}
      <div className="mb-16">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Documentação Oficial
        </h1>
        <p className="text-xl text-muted">
          Aprenda como instalar, configurar provedores de IA e extrair o máximo
          do Treplica como seu assistente local.
        </p>
      </div>

      <div className="flex flex-col gap-24">
        <section id="inicio-rapido" className="scroll-mt-32">
          <QuickstartDoc />
        </section>

        <section id="guia-de-uso" className="scroll-mt-32">
          <UserGuideDoc />
        </section>

        <section id="atalhos-de-teclado" className="scroll-mt-32">
          <KeyboardShortcutsDoc />
        </section>

        <section id="configuracao-ia" className="scroll-mt-32">
          <ProviderSetupDoc />
        </section>

        <section id="sugestao-de-modelos" className="scroll-mt-32">
          <ModelSuggestionsDoc />
        </section>

        <section id="teste-de-audio" className="scroll-mt-32">
          <MicrophoneTestDoc />
        </section>

        <section id="acessibilidade" className="scroll-mt-32">
          <AccessibilityDoc />
        </section>

        <section id="atualizacoes" className="scroll-mt-32">
          <UpdatesDoc />
        </section>

        <section id="privacidade" className="scroll-mt-32">
          <PrivacyDoc />
        </section>
      </div>
    </article>
  );
}
