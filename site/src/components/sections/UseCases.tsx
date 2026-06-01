"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { CheckCircle2, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function UseCases() {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = elementsRef.current?.children;
      if (items) {
        gsap.fromTo(
          Array.from(items),
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.3,
            scrollTrigger: {
              trigger: elementsRef.current,
              start: "top 80%",
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
      id="cenarios"
      ref={containerRef}
      className="relative w-full flex flex-col justify-center py-16 md:py-24 bg-black overflow-hidden border-t border-white/5"
    >
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-neon-purple/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 z-10 w-full">
        {/* Main Grid */}
        <div ref={elementsRef} className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Visual Mockup (lg:col-span-6) */}
          <div className="lg:col-span-6 relative h-[300px] md:h-[480px] rounded-2xl glass-premium p-2 overflow-hidden">
            <div className="relative w-full h-full rounded-[10px] overflow-hidden">
              <Image
                src="/images/use-cases.png"
                alt="Cenários de uso do Treplica"
                fill
                quality={100}
                className="object-contain object-center opacity-90 hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>

          {/* Right Column: Content (lg:col-span-6) */}
          <div className="lg:col-span-6 flex flex-col gap-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-blue mb-3 block">
                CENÁRIOS DE USO
              </span>
              <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
                Construído para <br />
                <span className="text-gradient-electric italic font-light">Profissionais.</span>
              </h2>
              <p className="text-muted text-base md:text-lg leading-relaxed font-light">
                Não importa o nível do seu desafio corporativo. O Treplica fornece as informações cruciais para você guiar a reunião com autoridade e fechar contratos complexos.
              </p>
            </div>

            {/* List */}
            <div className="flex flex-col gap-6 border-t border-white/10 pt-8">
              <div className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-neon-blue flex-shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <h4 className="text-base font-bold text-white leading-snug">Vendas & Negociações</h4>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    Responda objeções de clientes na hora. Tenha dados técnicos sobre escopo, SLA e garantias imediatamente na tela ao menor sinal de hesitação.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-neon-purple flex-shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <h4 className="text-base font-bold text-white leading-snug">Processos Seletivos</h4>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    Mantenha a calma diante de desafios de arquitetura, algoritmos complexos ou perguntas comportamentais difíceis. Use presets para calibrar sua IA.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <h4 className="text-base font-bold text-white leading-snug">Apresentações & Demo Days</h4>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    Nunca mais esqueça detalhes cruciais de especificações de produtos. Lembre de cada funcionalidade e lidere a demonstração com confiança.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="border-t border-white/10 pt-6 flex items-center justify-between">
              <span className="text-xs text-muted font-medium">Presets inteligentes customizáveis</span>
              <a
                href="#como-funciona"
                className="text-xs font-semibold uppercase tracking-wider text-white hover:text-neon-blue flex items-center gap-2 transition-colors group"
              >
                Conhecer presets
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
