"use client";

import { useEffect, useRef } from "react";
import { Laptop, Video, Cpu, Cloud, Database, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Compatibility() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const blocks = [
    {
      title: "Windows & macOS",
      desc: "Suporte completo para sistemas desktop. Aceleração por hardware nativa CUDA (NVIDIA) e Metal (Apple Silicon).",
      icon: Laptop,
      link: "#download"
    },
    {
      title: "Zoom & Google Meet",
      desc: "Escuta e transcreve qualquer chamada realizada por navegadores ou aplicações desktop dedicadas com roteamento virtual.",
      icon: Video,
      link: "#transcricao"
    },
    {
      title: "Ollama & LLMs Locais",
      desc: "Integre de forma direta com o Ollama para rodar modelos Llama, Mistral ou DeepSeek 100% offline na sua própria GPU.",
      icon: Cpu,
      link: "#ia"
    },
    {
      title: "APIs de Alta Velocidade",
      desc: "Se preferir, conecte APIs como Groq, OpenAI, Gemini ou OpenRouter para obter respostas em milissegundos a baixo custo.",
      icon: Cloud,
      link: "#como-funciona"
    },
    {
      title: "SQLite Engine",
      desc: "Histórico persistente e relatórios estruturados salvos inteiramente em um banco de dados leve local.",
      icon: Database,
      link: "#overlay"
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gridRef.current?.children;
      if (cards) {
        gsap.fromTo(
          Array.from(cards),
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.15,
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 85%",
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
      id="compatibilidade"
      ref={containerRef}
      className="bg-black py-24 w-full overflow-hidden border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
        {/* Heading */}
        <div className="max-w-3xl mb-20">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-blue mb-3 block">
            INTEGRAÇÃO TOTAL
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Arquitetura Aberta <br />
            <span className="text-gradient-electric italic font-light">E compatível.</span>
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed font-light">
            O Treplica conecta-se perfeitamente às ferramentas que você já usa no dia a dia, tanto de comunicação quanto de inteligência artificial.
          </p>
        </div>

        {/* 5-Column Horizontal Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 w-full"
        >
          {blocks.map((block, idx) => {
            const Icon = block.icon;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between p-6 rounded-none glass border border-white/5 hover:border-white transition-all duration-500 min-h-[280px] group"
              >
                {/* Top */}
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-neon-blue transition-colors duration-300">
                    <Icon className="w-5 h-5 text-white group-hover:text-neon-blue transition-colors" />
                  </div>
                  <h4 className="text-lg font-bold text-white leading-tight">
                    {block.title}
                  </h4>
                  <p className="text-xs text-muted leading-relaxed">
                    {block.desc}
                  </p>
                </div>

                {/* Bottom link */}
                <a
                  href={block.link}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-white mt-6 transition-colors group/link"
                >
                  Saber mais
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
