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
      {/* Page Header */}
      <div className="mb-16">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Documentação Oficial
        </h1>
        <p className="text-xl text-muted">
          Aprenda como instalar, configurar provedores de IA e extrair o máximo do Treplica como seu assistente local.
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
