"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Shield, Sparkles, Cpu, ArrowDown } from "lucide-react";
import gsap from "gsap";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Fade in the badge
      gsap.fromTo(
        badgeRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1.2, ease: "power4.out", delay: 0.2 }
      );

      // Slide up and split effect for Title
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.4, ease: "power4.out", delay: 0.4 }
      );

      // Scale and fade in product mockup
      gsap.fromTo(
        mockupRef.current,
        { opacity: 0, scale: 0.95, y: 60 },
        { opacity: 1, scale: 1, y: 0, duration: 1.6, ease: "power4.out", delay: 0.6 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen w-full flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden bg-black"
    >
      {/* Premium Glow Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-neon-purple/10 rounded-full blur-[150px] pointer-events-none animate-pulse-slow" style={{ animationDelay: "2s" }}></div>

      {/* Grid overlay for technical texture */}
      <div className="absolute inset-0 noise-bg opacity-30 pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center z-10">
        {/* Glass Badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full glass border border-white/10 mb-8"
        >
          <Sparkles className="w-4 h-4 text-neon-blue animate-pulse" />
          <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
            TREPLICA — ASSISTENTE DE REUNIÕES LOCAL
          </span>
        </div>

        {/* Heading */}
        <h1
          ref={titleRef}
          className="font-display text-5xl md:text-8xl font-black tracking-tight leading-[0.95] max-w-4xl text-white mb-8"
        >
          Domine Cada <br />
          <span className="italic font-light text-gradient-electric">Conversa.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-base md:text-xl text-muted leading-relaxed font-light mb-16">
          Sua mente mais brilhante, nas sombras. Transcrição instantânea, orientação de IA e tradução rodando <span className="text-white font-normal">100% privado na sua máquina</span>. Código aberto, gratuito para sempre.
        </p>

        {/* Technical features tags */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-xs font-semibold uppercase tracking-widest text-muted/80 mb-20">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-neon-blue" /> 100% Privado
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
          <span className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-neon-purple" /> Processamento Local
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" /> Zero Mensalidades
          </span>
        </div>

        {/* Product Mockup Container */}
        <div
          ref={mockupRef}
          className="relative w-full max-w-5xl mx-auto rounded-xl p-[1px] bg-gradient-to-b from-white/20 to-transparent shadow-[0_25px_60px_-15px_rgba(0,229,255,0.15)] group"
        >
          <div className="relative bg-black/90 rounded-[11px] overflow-hidden aspect-[16/9]">
            <Image
              src="/images/hero-mockup.png"
              alt="Treplica Meeting Assistant Interface Mockup"
              fill
              priority
              className="object-cover object-top opacity-90 group-hover:scale-[1.01] transition-transform duration-[2s] ease-out"
            />
            {/* Top bar window overlay */}
            <div className="absolute top-0 left-0 right-0 h-9 bg-black/40 border-b border-white/5 flex items-center px-4 gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/10"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/10"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/10"></span>
              <span className="text-[10px] text-muted/60 font-semibold tracking-wider uppercase mx-auto">
                Treplica Local Dashboard
              </span>
            </div>
            {/* Overlay glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted hover:text-white transition-colors duration-300">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Explore</span>
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
