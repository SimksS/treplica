"use client";

import { useEffect, useRef } from "react";
import { Check, ArrowRight, Shield, Sparkles, Globe, FileText, Mic, EyeOff, Zap, Lock } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function OpenSource() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const features = [
    { icon: Mic, label: "Transcrição ao vivo ilimitada", desc: "Captura e transcreve toda conversa em tempo real, sem limites de uso." },
    { icon: Sparkles, label: "Orientação de IA em tempo real", desc: "Sugestões de respostas e alertas estratégicos gerados automaticamente durante a reunião." },
    { icon: EyeOff, label: "Modo Stealth invisível", desc: "Painel flutuante visível apenas para você — ninguém mais vê na câmera." },
    { icon: Globe, label: "Tradução instantânea de áudio", desc: "Entenda reuniões em outros idiomas com tradução exibida diretamente na tela." },
    { icon: Zap, label: "Presets de sessão configuráveis", desc: "Configure o assistente para vendas, entrevistas, apresentações e muito mais." },
    { icon: FileText, label: "Exportação de resumos", desc: "Gere resumos, follow-ups e transcrições completas com um clique." },
    { icon: Shield, label: "Histórico local completo", desc: "Todas as sessões são salvas somente na sua máquina. Sem nuvem, sem vazamentos." },
    { icon: Lock, label: "Zero telemetria e rastreamento", desc: "Nenhuma informação sua sai do seu computador. Nunca." },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gridRef.current?.children;
      if (cards) {
        gsap.fromTo(
          Array.from(cards),
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 75%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="open-source"
      ref={containerRef}
      className="relative w-full flex flex-col justify-center py-24 bg-black overflow-hidden border-t border-white/5"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-blue/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 z-10 w-full flex flex-col items-center">

        {/* Title */}
        <div className="text-center max-w-3xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-blue mb-3 block">
            TUDO INCLUÍDO • GRATUITO PARA SEMPRE
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Sem Planos. Sem Limites. <br />
            <span className="text-gradient-electric italic font-light">100% gratuito.</span>
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed font-light">
            O Treplica é código aberto e gratuito para sempre. Baixe uma vez e use todas as funcionalidades sem pagar nada — hoje, amanhã e sempre.
          </p>
        </div>

        {/* Features Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16"
        >
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="flex flex-col gap-3 p-6 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-neon-blue" />
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{feat.label}</h4>
                <p className="text-xs text-muted leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* License badge + CTA */}
        <div className="flex flex-col items-center gap-6 border-t border-white/5 pt-10 w-full">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80">
              <Check className="w-3.5 h-3.5 text-neon-blue" /> Licença MIT — Código Aberto
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80">
              <Check className="w-3.5 h-3.5 text-neon-blue" /> Sem conta obrigatória
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80">
              <Check className="w-3.5 h-3.5 text-neon-blue" /> Sem mensalidade
            </span>
          </div>
          <a
            href="#download"
            className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-white/90 transition-all duration-300 flex items-center gap-2 group"
          >
            Baixar Grátis (Completo)
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

      </div>
    </section>
  );
}
