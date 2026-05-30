"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MessageSquareText, ShieldCheck, FileSpreadsheet, Eye } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function AIGuidance() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading Reveal
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Image Mockup Zoom Reveal
      gsap.fromTo(
        imageWrapperRef.current,
        { opacity: 0, scale: 0.95, y: 40 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: {
            trigger: imageWrapperRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Specs Row Stagger
      const cards = specsRef.current?.children;
      if (cards) {
        gsap.fromTo(
          Array.from(cards),
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.2,
            scrollTrigger: {
              trigger: specsRef.current,
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
      id="ia"
      ref={containerRef}
      className="relative min-h-screen w-full flex flex-col justify-center py-24 bg-black overflow-hidden border-t border-white/5"
    >
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 z-10 w-full flex flex-col items-center">
        {/* Title */}
        <h2
          ref={headingRef}
          className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-16 text-center max-w-4xl"
        >
          Sua IA Estratégica <br />
          <span className="text-gradient-purple italic font-light">Durante a conversa.</span>
        </h2>

        {/* Full Width Graphic Mockup */}
        <div
          ref={imageWrapperRef}
          className="relative w-full max-w-5xl rounded-2xl p-[1px] bg-gradient-to-b from-white/10 to-transparent shadow-[0_30px_60px_rgba(157,78,221,0.1)] mb-20 group overflow-hidden"
        >
          <div className="relative aspect-[21/9] bg-zinc-950 rounded-[15px] overflow-hidden">
            <Image
              src="/images/ai-guidance.png"
              alt="AI Copilot suggestion dashboard"
              fill
              className="object-cover object-center opacity-90 group-hover:scale-[1.01] transition-transform duration-[2s] ease-out"
            />
            {/* Dark vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>
          </div>
        </div>

        {/* Specs Row */}
        <div
          ref={specsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full border-t border-white/10 pt-16"
        >
          {/* Card 1 */}
          <div className="flex flex-col gap-3 group">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-neon-blue transition-colors">
              <MessageSquareText className="w-5 h-5 text-neon-blue" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-neon-blue">
              Respostas Imediatas
            </span>
            <h4 className="text-lg font-bold text-white leading-tight">Objeções & Argumentações</h4>
            <p className="text-sm text-muted leading-relaxed">
              O Treplica ouve as perguntas difíceis de clientes ou entrevistadores e gera de forma autônoma tópicos de resposta na sua tela.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col gap-3 group">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-neon-purple transition-colors">
              <ShieldCheck className="w-5 h-5 text-neon-purple" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-neon-purple">
              Contexto Completo
            </span>
            <h4 className="text-lg font-bold text-white leading-tight">Presets de Reunião</h4>
            <p className="text-sm text-muted leading-relaxed">
              Carregue documentos antes do início. O assistente usará esse contexto local (currículo, propostas, escopos) para orientar suas respostas.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col gap-3 group">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white transition-colors">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-white">
              Histórico SQLite
            </span>
            <h4 className="text-lg font-bold text-white leading-tight">Logs & Exportações</h4>
            <p className="text-sm text-muted leading-relaxed">
              Todas as discussões são salvas em um banco de dados SQLite local e privado. Exporte resumos, follow-ups e transcrições completas em Markdown com um clique.
            </p>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col gap-3 group">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-neon-blue transition-colors">
              <Eye className="w-5 h-5 text-neon-blue" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-neon-blue">
              Análise de Tela
            </span>
            <h4 className="text-lg font-bold text-white leading-tight">Visão Computacional</h4>
            <p className="text-sm text-muted leading-relaxed">
              Adicione contexto visual à sua IA analisando capturas de tela ou compartilhamentos para entender slides e diagramas exibidos na reunião.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
