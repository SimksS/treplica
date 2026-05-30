"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { EyeOff, Radio, Shield, LayoutGrid } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function StealthOverlay() {
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const tabs = [
    {
      label: "Modo Stealth (Invisível)",
      title: "Invisível em Compartilhamentos de Tela",
      desc: "No Windows 10 (2004+) e macOS, o Treplica usa APIs nativas do sistema operacional (SetWindowDisplayAffinity no Windows, APIs equivalentes no macOS) para garantir que o overlay flutuante fique visível apenas para você — totalmente invisível em capturas de tela e transmissões via Zoom, Meet e Teams.",
      icon: EyeOff,
      metric: "0% Visibilidade externa"
    },
    {
      label: "Orientação Rápida",
      title: "Sugestões Flutuantes Discretas",
      desc: "O painel de orientação se compacta em uma pequena barra semitransparente na lateral da sua tela. Ela exibe alertas e tópicos de forma rápida para você ler em segundos sem desviar o olhar da câmera.",
      icon: Radio,
      metric: "12px Largura máxima"
    },
    {
      label: "Painel Principal",
      title: "Histórico e Configurações Completas",
      desc: "Sempre que precisar ajustar os prompts da IA, carregar novos arquivos ou revisar sessões antigas de reunião, abra a interface principal do aplicativo com total controle do banco SQLite local.",
      icon: LayoutGrid,
      metric: "100% Offline"
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="overlay"
      ref={containerRef}
      className="relative min-h-screen w-full flex flex-col justify-center py-24 bg-black overflow-hidden border-t border-white/5"
    >
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-neon-blue/5 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 z-10 w-full flex flex-col">
        {/* Title and Top */}
        <div ref={titleRef} className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-blue mb-3">
            INTERFACE FLUTUANTE
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Stealth Overlay
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed font-light">
            Monitore a transcrição e receba orientações estratégicas de IA de forma totalmente invisível nas suas apresentações.
          </p>
        </div>

        {/* Dynamic LED Button Selector (6 items in prompt, adapted to 3 premium tabs here) */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 border-b border-white/5 pb-6 mb-16">
          {tabs.map((tab, idx) => {
            const TabIcon = tab.icon;
            const isActive = idx === activeTab;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2.5 pb-4 px-3 text-sm font-semibold uppercase tracking-wider transition-all duration-300 border-b-2 cursor-pointer ${
                  isActive
                    ? "text-white border-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                    : "text-muted border-transparent hover:text-white"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Text Side (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
            <h3 className="font-display text-2xl md:text-4xl font-extrabold text-white leading-tight">
              {tabs[activeTab].title}
            </h3>
            <p className="text-muted text-sm md:text-base leading-relaxed">
              {tabs[activeTab].desc}
            </p>

            <div className="flex gap-6 mt-4 border-t border-white/10 pt-6">
              <div className="flex flex-col">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">Métrica de Foco</span>
                <span className="font-display text-2xl font-extrabold text-white mt-1">{tabs[activeTab].metric}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">Segurança</span>
                <span className="font-display text-2xl font-extrabold text-neon-blue mt-1">100% Privado</span>
              </div>
            </div>
          </div>

          {/* Visual Side (lg:col-span-7) */}
          <div className="lg:col-span-7 relative h-[280px] md:h-[420px] rounded-2xl glass-premium p-1.5 overflow-hidden order-1 lg:order-2">
            <div className="relative w-full h-full rounded-[10px] overflow-hidden">
              <Image
                src="/images/stealth-overlay.png"
                alt="Stealth overlay visualization"
                fill
                className={`object-cover object-center transition-all duration-700 ${
                  activeTab === 0 ? "scale-100" : activeTab === 1 ? "scale-105 saturate-150" : "scale-95"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
