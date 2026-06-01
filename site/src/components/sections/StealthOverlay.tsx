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
      desc: "O Treplica usa recursos nativos do sistema operacional para garantir que o painel flutuante fique visível apenas para você — totalmente invisível em capturas de tela e transmissões via Zoom, Meet e Teams.",
      icon: EyeOff,
      metric: "100% Invisível"
    },
    {
      label: "Orientação Rápida",
      title: "Sugestões Flutuantes Discretas",
      desc: "O painel de orientação se compacta em uma pequena barra semitransparente na lateral da sua tela. Exibe alertas e tópicos de forma rápida para você ler em segundos sem desviar o olhar da câmera.",
      icon: Radio,
      metric: "Interface discreta"
    },
    {
      label: "Painel Principal",
      title: "Histórico e Configurações Completas",
      desc: "Sempre que precisar ajustar as configurações da IA, carregar novos arquivos ou revisar sessões anteriores, abra a interface principal com acesso completo ao seu histórico local.",
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
      className="relative w-full flex flex-col justify-center py-16 md:py-24 bg-black overflow-hidden border-t border-white/5"
    >
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-neon-blue/5 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 z-10 w-full flex flex-col">
        {/* Title and Top */}
        <div ref={titleRef} className="flex flex-col items-center text-center max-w-3xl mx-auto mb-8 md:mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-blue mb-3">
            INTERFACE FLUTUANTE
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Stealth Overlay
          </h2>
          <p className="text-muted text-sm md:text-lg leading-relaxed font-light">
            Monitore a transcrição e receba orientações de IA de forma totalmente invisível nas suas apresentações.
          </p>
        </div>

        {/* Tab selector — horizontal scroll on mobile, centered wrap on desktop */}
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 mb-8 md:mb-16 scrollbar-hide">
          <div className="flex items-center gap-6 md:gap-8 border-b border-white/5 pb-0 min-w-max md:min-w-0 md:flex-wrap md:justify-center">
            {tabs.map((tab, idx) => {
              const TabIcon = tab.icon;
              const isActive = idx === activeTab;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-2 pb-4 px-1 text-xs md:text-sm font-semibold uppercase tracking-wider transition-all duration-300 border-b-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "text-white border-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                      : "text-muted border-transparent hover:text-white"
                  }`}
                >
                  <TabIcon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20 items-center">
          {/* Text Side (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
            <h3 className="font-display text-xl md:text-3xl font-extrabold text-white leading-tight">
              {tabs[activeTab].title}
            </h3>
            <p className="text-muted text-sm md:text-base leading-relaxed">
              {tabs[activeTab].desc}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-4 border-t border-white/10 pt-6">
              <div className="flex flex-col">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">Métrica de Foco</span>
                <span className="font-display text-lg md:text-2xl font-extrabold text-white mt-1">{tabs[activeTab].metric}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">Segurança</span>
                <span className="font-display text-lg md:text-2xl font-extrabold text-neon-blue mt-1">100% Privado</span>
              </div>
            </div>
          </div>

          {/* Visual Side (lg:col-span-7) */}
          <div className="lg:col-span-7 relative rounded-2xl glass-premium p-1.5 overflow-hidden order-1 lg:order-2">
            <div className="relative w-full aspect-[5/2] bg-zinc-950 rounded-[10px] overflow-hidden">
              <Image
                src="/images/stealth-overlay.png"
                alt="Painel stealth overlay do Treplica"
                fill
                quality={100}
                className={`object-contain object-center transition-all duration-700 ${
                  activeTab === 0 ? "scale-100" : activeTab === 1 ? "scale-[1.02]" : "scale-[0.98]"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
