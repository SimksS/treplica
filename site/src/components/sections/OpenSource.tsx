"use client";

import { useEffect, useRef } from "react";
import { Check, ArrowRight, Star } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function OpenSource() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const tiers = [
    {
      name: "Treplica Community",
      price: "Grátis",
      desc: "Ideal para desenvolvedores e entusiastas de IA local.",
      features: [
        "Transcrição Whisper Local ilimitada",
        "Conexão direta com Ollama",
        "Modo Stealth em qualquer chamada",
        "Histórico local SQLite",
        "Licença de código aberto MIT"
      ],
      cta: "Baixar Grátis",
      popular: false,
      badge: "Código Aberto"
    },
    {
      name: "Treplica Pro Edition",
      price: "Grátis",
      desc: "Perfeito para profissionais liberais, consultores e líderes.",
      features: [
        "Tudo da versão Community",
        "Tradução de áudio em tempo real",
        "Presets avançados (Vendas, Entrevistas, Geral)",
        "Integração com APIs cloud (Groq, OpenAI, Gemini)",
        "Contexto de sessão configurável (8 campos)",
        "Exportação de resumos e follow-ups em Markdown"
      ],
      cta: "Baixar Grátis (Completo)",
      popular: true,
      badge: "Recomendado"
    },
    {
      name: "Treplica Enterprise",
      price: "Grátis",
      desc: "Excelente para equipes independentes que exigem privacidade absoluta.",
      features: [
        "Tudo da versão Pro",
        "Roteamento por tarefa (STT, orientação, tradução, visão)",
        "LM Studio e provedores custom compatíveis com OpenAI",
        "Zero telemetria ou rastreamento de qualquer tipo",
        "Controle total sobre dados, modelos e infraestrutura"
      ],
      cta: "Clonar Repositório",
      popular: false,
      badge: "Sem Limites"
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.children;
      if (cards) {
        gsap.fromTo(
          Array.from(cards),
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.25,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
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
      className="relative min-h-screen w-full flex flex-col justify-center py-24 bg-black overflow-hidden border-t border-white/5"
    >
      {/* Premium backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-blue/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 z-10 w-full flex flex-col items-center">
        
        {/* Title */}
        <div className="text-center max-w-3xl mb-20">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-blue mb-3 block">
            CUSTO ZERO • LICENÇA MIT
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Sem Custos. <br />
            <span className="text-gradient-electric italic font-light">Sem limites. Sem conta.</span>
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed font-light">
            O Treplica é construído sobre a filosofia de software livre. Todo o código é auditável, aberto e você não precisa pagar mensalidades de IA para ter um assistente profissional.
          </p>
        </div>

        {/* 3 Cards */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full items-stretch"
        >
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`flex flex-col justify-between p-8 rounded-none transition-all duration-500 relative ${
                tier.popular
                  ? "bg-zinc-950 border-2 border-white lg:scale-[1.03] z-10 shadow-[0_20px_50px_rgba(255,255,255,0.08)]"
                  : "bg-black border border-white/10 hover:border-white/30"
              }`}
            >
              {/* Badge */}
              <div className="flex justify-between items-start mb-8">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                  tier.popular ? "bg-white text-black" : "bg-white/5 text-white/80 border border-white/10"
                }`}>
                  {tier.badge}
                </span>
                {tier.popular && <Star className="w-4 h-4 text-neon-blue fill-neon-blue" />}
              </div>

              {/* Title & Price */}
              <div className="mb-8">
                <h3 className="font-display text-xl font-bold text-white mb-3">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl font-black text-white">{tier.price}</span>
                  <span className="text-xs text-muted">/ para sempre</span>
                </div>
                <p className="text-xs text-muted mt-3 min-h-[32px]">{tier.desc}</p>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-4 border-t border-white/5 pt-6 mb-8 text-sm grow">
                {tier.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex gap-3">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                      tier.popular ? "text-neon-blue" : "text-white"
                    }`} />
                    <span className="text-muted leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <a
                href="#download"
                className={`w-full py-4 rounded-none text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 group transition-all duration-300 ${
                  tier.popular
                    ? "bg-white text-black hover:bg-white/95"
                    : "bg-transparent text-white border border-white/20 hover:border-white hover:bg-white/5"
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
