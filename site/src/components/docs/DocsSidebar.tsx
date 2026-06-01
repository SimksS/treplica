"use client";

import { useEffect, useState } from "react";
import { Book, Shield, Cpu, PlayCircle, Menu, X, Keyboard, Mic, Layers, RefreshCw, Eye } from "lucide-react";

export default function DocsSidebar() {
  const [activeSection, setActiveSection] = useState("inicio-rapido");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -80% 0px" }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const navItems = [
    { id: "inicio-rapido", label: "Início Rápido", icon: PlayCircle },
    { id: "guia-de-uso", label: "Guia de Uso", icon: Book },
    { id: "atalhos-de-teclado", label: "Atalhos de teclado", icon: Keyboard },
    { id: "configuracao-ia", label: "Provedores de IA", icon: Cpu },
    { id: "sugestao-de-modelos", label: "Sugestão de Modelos", icon: Layers },
    { id: "teste-de-audio", label: "Teste de Microfone", icon: Mic },
    { id: "acessibilidade", label: "Acessibilidade", icon: Eye },
    { id: "atualizacoes", label: "Atualizações", icon: RefreshCw },
    { id: "privacidade", label: "Privacidade e Stealth", icon: Shield },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)]"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-black border-r border-white/5 pt-28 pb-6 px-6 flex flex-col transition-transform duration-300 z-40 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 block">
          Documentação
        </span>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-white/10 text-white shadow-[inset_2px_0_0_0_#fff]"
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-muted"}`} />
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
