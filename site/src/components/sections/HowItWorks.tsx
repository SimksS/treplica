"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Settings, PhoneCall, Trophy } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      title: "01 / Configuração Inicial",
      subtitle: "Personalize seu assistente",
      desc: "Escolha seu provedor de IA preferido — Ollama local, Groq, OpenAI, Gemini ou qualquer API compatível — configure o idioma da reunião e preencha o contexto de sessão com informações como produto, empresa e objetivos para calibrar o assistente.",
      icon: Settings,
      image: "/images/ai-guidance.png"
    },
    {
      title: "02 / Escuta Ativa e Fluida",
      subtitle: "Transcrição em segundo plano",
      desc: "Inicie a chamada no Zoom, Meet ou Teams. O Treplica capta o áudio do sistema de forma invisível e transcreve cada speaker imediatamente, dividindo os blocos de texto por tempo e organizando a conversa sem criar ruído na sala.",
      icon: PhoneCall,
      image: "/images/stealth-overlay.png"
    },
    {
      title: "03 / Dominação Absoluta",
      subtitle: "Orientação e sugestões na tela",
      desc: "Receba tópicos de respostas, soluções de objeções e alertas com dados chaves baseados no contexto pré-carregado. Ao fim, salve um sumário completo de decisões com o histórico indexado em SQLite.",
      icon: Trophy,
      image: "/images/hero-mockup.png"
    }
  ];

  useEffect(() => {
    const container = containerRef.current;
    const sticky = stickyRef.current;
    if (!container || !sticky) return;

    const ctx = gsap.context(() => {
      // ScrollTrigger to track scroll progress inside the tall parent
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          setProgress(self.progress);
          
          // Determine current step index based on progress
          const index = Math.min(
            steps.length - 1,
            Math.floor(self.progress * steps.length)
          );
          setActiveStep(index);
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [steps.length]);

  return (
    <div ref={containerRef} className="relative h-[300vh] bg-black">
      {/* Sticky section container */}
      <section
        id="como-funciona"
        ref={stickyRef}
        className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden border-t border-white/5 bg-black"
      >
        {/* Progress Bar Top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-20">
          <div
            className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-100 ease-out"
            style={{ width: `${progress * 100}%` }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full z-10">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-16">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-blue mb-2 block">
                FLUXO INTELIGENTE
              </span>
              <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-none">
                Como Funciona
              </h2>
            </div>
            {/* Step Indicators */}
            <div className="flex gap-4">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 w-12 rounded-full transition-colors duration-500 ${
                    idx === activeStep
                      ? "bg-white"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Sticky Tab grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center min-h-[420px]">
            {/* Left Col: Step descriptions (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-6 transition-all duration-500 ease-out">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === activeStep;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-4 transition-all duration-500 ${
                      isActive
                        ? "opacity-100 transform translate-x-0 pointer-events-auto"
                        : "opacity-0 absolute transform -translate-x-4 pointer-events-none"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <StepIcon className="w-5 h-5 text-neon-blue" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">
                        {step.subtitle}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl md:text-4xl font-extrabold text-white">
                      {step.title}
                    </h3>
                    <p className="text-muted text-sm md:text-base leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Right Col: Media View (lg:col-span-7) */}
            <div className="lg:col-span-7 relative h-[250px] md:h-[400px] rounded-2xl glass-premium p-1.5 overflow-hidden">
              {steps.map((step, idx) => {
                const isActive = idx === activeStep;
                return (
                  <div
                    key={idx}
                    className={`absolute inset-1.5 rounded-[10px] overflow-hidden transition-all duration-700 ease-out ${
                      isActive
                        ? "opacity-90 scale-100"
                        : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
