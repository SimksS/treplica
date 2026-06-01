"use client";

import { useEffect, useState, useRef } from "react";
import { Mic, Volume2, Globe, AudioLines } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function LiveTranscription() {
  const [typedText, setTypedText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const sentences = [
    "Olá, bom dia! Sejam todos muito bem-vindos à nossa demonstração técnica.",
    "O Treplica está capturando meu áudio local e o áudio da chamada do Zoom em tempo real.",
    "A latência é inferior a um segundo, garantindo que nenhuma informação importante seja perdida.",
    "Todo o processamento acontece localmente na sua máquina, sem enviar nada para a nuvem."
  ];

  // Live text typing simulation
  useEffect(() => {
    let activeSentenceIdx = 0;
    let charIdx = 0;
    let interval: NodeJS.Timeout;

    const type = () => {
      const sentence = sentences[activeSentenceIdx];
      if (charIdx <= sentence.length) {
        setTypedText(sentence.slice(0, charIdx));
        charIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          // Pause and clear for the next sentence
          charIdx = 0;
          activeSentenceIdx = (activeSentenceIdx + 1) % sentences.length;
          interval = setInterval(type, 35);
        }, 3000);
      }
    };

    interval = setInterval(type, 35);
    return () => clearInterval(interval);
  }, []);

  // GSAP scroll trigger reveals
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Split heading reveal or general heading slide-in
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

      // Left Column stats reveal
      gsap.fromTo(
        leftColRef.current,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 1.2,
          scrollTrigger: {
            trigger: leftColRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // Feature items stagger
      const items = featuresRef.current?.children;
      if (items) {
        gsap.fromTo(
          Array.from(items),
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.2,
            scrollTrigger: {
              trigger: featuresRef.current,
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
      id="transcricao"
      ref={containerRef}
      className="relative w-full flex flex-col justify-center py-16 md:py-24 bg-black border-t border-white/5 overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-blue/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 z-10 w-full">
        {/* Section Heading */}
        <h2
          ref={headingRef}
          className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-20 text-center md:text-left max-w-4xl"
        >
          Transcrição Ultra-Veloz <br />
          <span className="text-gradient-electric italic font-light">Que não perde uma sílaba.</span>
        </h2>

        {/* Grid Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left Column: Stat Counter & Subfeatures */}
          <div className="flex flex-col gap-12">
            <div ref={leftColRef} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="font-display text-6xl md:text-9xl font-black text-white tracking-tight leading-none drop-shadow-[0_0_30px_rgba(0,229,255,0.2)]">
                0
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-widest text-neon-blue">
                  Bytes enviados para a nuvem
                </span>
                <span className="text-muted text-sm mt-1">
                  Seu áudio nunca sai da sua máquina.
                </span>
              </div>
            </div>

            {/* Sub-features list */}
            <div ref={featuresRef} className="flex flex-col gap-8 border-t border-white/10 pt-10">
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-blue transition-colors duration-300">
                  <Mic className="w-5 h-5 text-neon-blue" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-white">Captura Estéreo Inteligente</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Escuta simultaneamente o seu microfone e o alto-falante do computador, roteando o áudio interno de aplicativos como Zoom, Google Meet e Teams.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-purple transition-colors duration-300">
                  <Volume2 className="w-5 h-5 text-neon-purple" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-white">Alta Precisão de Palavras</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Motor de transcrição de alto desempenho com pontuação inteligente e reconhecimento preciso de voz, mesmo em ambientes ruidosos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white transition-colors duration-300">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-white">Autodetecção Linguística</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Identificação e adaptação instantânea do idioma falado na chamada, transcrevendo múltiplos speakers de maneira fluida.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Transcription Simulated UI */}
          <div className="relative rounded-2xl glass-premium p-6 md:p-8 glow-blue min-h-[380px] flex flex-col justify-between">
            {/* Top Bar inside simulation */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <AudioLines className="w-5 h-5 text-neon-blue animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap">
                  Transcrição ao Vivo
                </span>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap flex-shrink-0">
                Gravando Local
              </span>
            </div>

            {/* Scrollable text box */}
            <div className="flex-grow flex flex-col gap-4 text-sm md:text-base leading-relaxed">
              <div className="text-muted/40">
                [00:01] <span className="text-white/60 font-semibold">Palestrante:</span>
              </div>
              <p className="text-white font-medium min-h-[140px] transition-all">
                {typedText}
                <span className="inline-block w-1.5 h-4 bg-neon-blue ml-1 animate-pulse"></span>
              </p>
            </div>

            {/* Controls Bar inside simulation */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6 text-xs text-muted">
              <span>Palavras transcritas: {typedText.split(" ").filter(Boolean).length}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                <span className="hidden sm:inline">Processamento local ativo</span>
                <span className="sm:hidden">Local ativo</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
