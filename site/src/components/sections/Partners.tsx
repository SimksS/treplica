"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Cpu, Terminal, Sparkles, Database, Layers } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function Partners() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const partners = [
    { name: "Ollama", desc: "Local LLM Host", icon: Cpu },
    { name: "Tauri v2", desc: "Rust Desktop Core", icon: Terminal },
    { name: "NVIDIA CUDA", desc: "GPU Acceleration", icon: Cpu },
    { name: "Rust Lang", desc: "High-Perf Runtime", icon: Terminal },
    { name: "Whisper AI", desc: "Audio Processing", icon: Sparkles },
    { name: "SQLite", desc: "Embedded Storage", icon: Database },
    { name: "Groq Cloud", desc: "LPU Inference", icon: Layers },
    { name: "React 19", desc: "Interface Design", icon: Layers }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title slide up
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          }
        }
      );

      // Grid items stagger
      const items = gridRef.current?.children;
      if (items) {
        gsap.fromTo(
          Array.from(items),
          { opacity: 0, scale: 0.95 },
          {
            opacity: 0.7,
            scale: 1,
            duration: 0.8,
            stagger: 0.1,
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 80%",
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
      ref={containerRef}
      className="bg-black py-24 w-full overflow-hidden border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col items-center text-center">
        {/* Title */}
        <div ref={titleRef} className="max-w-2xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted mb-3 block">
            ECOSSISTEMA DE TECNOLOGIA
          </span>
          <h3 className="font-display text-2xl md:text-3xl font-extrabold text-white">
            Alimentado Pelas Melhores Tecnologias e Runtimes
          </h3>
        </div>

        {/* Partners Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 w-full max-w-5xl items-center"
        >
          {partners.map((partner, idx) => {
            const PartnerIcon = partner.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center gap-2 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white transition-colors duration-300">
                  <PartnerIcon className="w-5 h-5 text-white/80" />
                </div>
                <span className="text-sm font-bold uppercase tracking-wider text-white">
                  {partner.name}
                </span>
                <span className="text-[10px] tracking-wide text-muted font-medium">
                  {partner.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
