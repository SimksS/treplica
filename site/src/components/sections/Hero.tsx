"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Shield, Sparkles, Cpu, ArrowDown, Download } from "lucide-react";
import gsap from "gsap";
import type { DownloadUrls } from "@/lib/github";

interface HeroProps {
  downloadUrls?: DownloadUrls;
  version?: string;
}

export default function Hero({ downloadUrls, version }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const releasesUrl = downloadUrls?.releases ?? "https://github.com/treplica/treplica/releases/latest";
  const repoUrl = downloadUrls?.repo ?? "https://github.com/treplica/treplica";

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        badgeRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1.2, ease: "power4.out", delay: 0.2 }
      );

      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.4, ease: "power4.out", delay: 0.4 }
      );

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
          className="flex items-center gap-3 mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full glass border border-white/10">
            <Sparkles className="w-4 h-4 text-neon-blue animate-pulse" />
            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/90 whitespace-nowrap">
              TREPLICA — ASSISTENTE DE REUNIÕES LOCAL
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400 whitespace-nowrap">
            {version ? version : "BETA"}
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
        <p className="max-w-2xl text-base md:text-xl text-muted leading-relaxed font-light mb-10">
          Sua mente mais brilhante, nas sombras. Transcrição instantânea, orientação de IA e tradução rodando <span className="text-white font-normal">100% privado na sua máquina</span>. Código aberto, gratuito para sempre.
        </p>

        {/* Download CTA */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-14">
          <a
            href={releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-none text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_35px_rgba(255,255,255,0.35)] transition-all duration-300 flex items-center gap-3"
          >
            <Download className="w-4 h-4" />
            Baixar Grátis
            {version && (
              <span className="text-black/50 font-normal normal-case tracking-normal">
                {version}
              </span>
            )}
          </a>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-none text-xs font-bold uppercase tracking-wider text-white border border-white/20 hover:border-white hover:bg-white/5 transition-all duration-300 flex items-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            Ver no GitHub
          </a>
        </div>

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
              quality={100}
              className="object-contain object-top opacity-95 group-hover:scale-[1.01] transition-transform duration-[2s] ease-out"
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
