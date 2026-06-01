"use client";

import { useEffect, useRef } from "react";
import { Download, Shield, HelpCircle, Monitor, Apple } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DownloadUrls } from "@/lib/github";

gsap.registerPlugin(ScrollTrigger);

interface FinalCTAProps {
  downloadUrls?: DownloadUrls;
  version?: string;
}

export default function FinalCTA({ downloadUrls, version }: FinalCTAProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<HTMLDivElement>(null);

  const windowsUrl = downloadUrls?.windows ?? "https://github.com/SimksS/treplica/releases/latest";
  const macosUrl = downloadUrls?.macos ?? "https://github.com/SimksS/treplica/releases/latest";
  const linuxUrl = downloadUrls?.linux ?? "https://github.com/SimksS/treplica/releases/latest";
  const repoUrl = downloadUrls?.repo ?? "https://github.com/SimksS/treplica";

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
            duration: 1.2,
            stagger: 0.2,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 75%",
              toggleActions: "play none none reverse",
            }
          }
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="download"
      ref={containerRef}
      className="relative w-full flex flex-col items-center justify-center py-20 md:py-32 bg-black overflow-hidden border-t border-white/5"
    >
      {/* Background Neon Spheres */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-neon-purple/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-1/3 left-1/3 w-[450px] h-[450px] bg-neon-blue/5 rounded-full blur-[140px] pointer-events-none animate-pulse-slow"></div>

      <div className="absolute inset-0 noise-bg opacity-20 pointer-events-none"></div>

      <div
        ref={elementsRef}
        className="relative max-w-4xl mx-auto px-6 z-10 text-center flex flex-col items-center gap-10"
      >
        {/* Floating badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80">
          <Shield className="w-3.5 h-3.5 text-neon-blue" />
          100% Local e Privado
        </div>

        {/* Headings */}
        <h2 className="font-display text-5xl md:text-8xl font-black tracking-tight text-white leading-none">
          Sua Próxima Reunião <br />
          <span className="text-gradient-electric italic font-light">Merece um copiloto.</span>
        </h2>

        {/* Short Text */}
        <p className="max-w-2xl text-muted text-base md:text-xl font-light leading-relaxed">
          Chega de perder insights estratégicos ou se enrolar em objeções complexas. Baixe o Treplica hoje mesmo, configure em 5 minutos e assuma as rédeas das suas negociações.
        </p>

        {/* Platform Download Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-2xl">
          <a
            href={windowsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex-1 px-7 py-4 rounded-none text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_35px_rgba(255,255,255,0.35)] transition-all duration-300 flex items-center justify-center gap-3 group"
          >
            <Monitor className="w-4 h-4" />
            Windows
            <Download className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>

          <a
            href={macosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex-1 px-7 py-4 rounded-none text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_35px_rgba(255,255,255,0.35)] transition-all duration-300 flex items-center justify-center gap-3 group"
          >
            <Apple className="w-4 h-4" />
            macOS
            <Download className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>

          <a
            href={linuxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex-1 px-7 py-4 rounded-none text-xs font-bold uppercase tracking-wider text-white border border-white/30 hover:border-white hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-3 group"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.567 1.563 1.182 2.114.623.553 1.293.877 2.007.87.32-.004.637-.07.953-.168 1.229-.38 1.872-1.357 2.273-1.884.418-.547.66-.734 1.042-.898.347-.15.822-.217 1.36-.217.506 0 .932.064 1.258.187.356.133.604.334 1.008.873.397.526 1.048 1.508 2.277 1.888.314.097.629.162.947.166.71.007 1.385-.316 2.01-.871.619-.552 1.072-1.337 1.19-2.118.125-.805-.007-1.658-.284-2.49-.592-1.77-1.836-3.47-2.717-4.521-.749-1.068-.972-1.928-1.049-3.021-.065-1.491 1.056-5.964-3.171-6.298-.165-.013-.325-.021-.48-.021z"/>
            </svg>
            Linux
            <Download className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* GitHub link */}
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white border border-white/20 hover:border-white hover:bg-white/5 transition-all duration-300"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
          Ver código no GitHub
          {version && <span className="text-white/40 font-normal normal-case tracking-normal">{version}</span>}
        </a>

        {/* Requirements / Disclaimers */}
        <div className="flex flex-col gap-2 items-center border-t border-white/5 pt-8 w-full max-w-xl text-[10px] md:text-xs text-muted/60">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Compatibilidade: Windows 10/11 (x64), macOS 12+ (Apple Silicon ou Intel) ou Linux x64 (AppImage).
          </span>
          <span>
            Recomendado: 8GB+ de memória RAM para melhor desempenho com IA local.
          </span>
        </div>
      </div>
    </section>
  );
}
