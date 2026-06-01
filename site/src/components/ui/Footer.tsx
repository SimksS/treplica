import Image from "next/image";
import { Shield, Terminal, BookOpen } from "lucide-react";
import { getLatestRelease } from "@/lib/github";

const REPO_URL = "https://github.com/SimksS/treplica";

export default async function Footer() {
  const release = await getLatestRelease();
  return (
    <footer className="bg-black border-t border-white/5 py-12 md:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-16 mb-16">
          {/* Logo & Slogan */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo_treplica.png"
                alt="Treplica"
                width={40}
                height={40}
                className="object-contain"
              />
              <div className="flex flex-col leading-none">
                <span className="font-display text-xl font-extrabold tracking-tight text-white">
                  Treplica
                </span>
                <span className="text-[10px] font-medium text-white/40 tracking-wide">
                  Meeting AI Assistant
                </span>
              </div>
            </div>
            <p className="text-muted text-sm max-w-sm leading-relaxed">
              O assistente de reuniões local que transcreve, traduz e te orienta com IA. Rodando 100% privado na sua própria máquina.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {release?.tag_name ?? "v0.1-beta"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-white/80 border border-white/10">
                Licença MIT
              </span>
            </div>
          </div>

          {/* Docs & Specs */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Recursos
            </span>
            <ul className="flex flex-col gap-2.5 text-sm text-muted">
              <li>
                <a href="/#transcricao" className="hover:text-white transition-colors">
                  Transcrição ao Vivo
                </a>
              </li>
              <li>
                <a href="/#ia" className="hover:text-white transition-colors">
                  Orientação Inteligente
                </a>
              </li>
              <li>
                <a href="/#traducao" className="hover:text-white transition-colors">
                  Tradução Imediata
                </a>
              </li>
              <li>
                <a href="/#overlay" className="hover:text-white transition-colors">
                  Stealth Overlay
                </a>
              </li>
            </ul>
          </div>

          {/* Developers & Github */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Desenvolvimento
            </span>
            <ul className="flex flex-col gap-2.5 text-sm text-muted">
              <li>
                <a href="/docs" className="flex items-center gap-2 hover:text-white text-neon-blue transition-colors">
                  <BookOpen className="w-4 h-4" /> Documentação Oficial
                </a>
              </li>
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                  GitHub
                </a>
              </li>

              <li>
                <a href="#open-source" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Terminal className="w-4 h-4" /> Licenciamento MIT
                </a>
              </li>
              <li>
                <a href="#compatibilidade" className="flex items-center gap-2 hover:text-white transition-colors">
                  <BookOpen className="w-4 h-4" /> Compatibilidade
                </a>
              </li>
              <li>
                <a href="#download" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Shield className="w-4 h-4" /> Segurança Local
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-white/5 mb-8"></div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-muted/60 text-center md:text-left">
            &copy; {new Date().getFullYear()} Treplica. Desenvolvido para total privacidade. Código aberto sob licença MIT.
          </p>
          <div className="flex gap-6 text-xs text-muted/60">
            <a href="/docs" className="hover:text-white transition-colors">
              Políticas de Privacidade
            </a>
            <a href="/docs" className="hover:text-white transition-colors">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
