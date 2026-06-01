"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Languages } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function TranslationSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parallax heading animation using ScrollTrigger
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        textRef.current,
        { y: 50, opacity: 0.8 },
        {
          y: -50,
          opacity: 1,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Abstract Wave Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Wave parameters
    const waveCount = 3;
    const colors = [
      "rgba(0, 229, 255, 0.08)",   // neon blue
      "rgba(157, 78, 221, 0.06)",  // neon purple
      "rgba(255, 255, 255, 0.03)"   // pure white
    ];
    let offset = 0;

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal reference lines/dots for cybernetic grid feel
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.strokeStyle = colors[w];
        ctx.lineWidth = w === 0 ? 2 : 1;

        const waveHeight = 60 + w * 20;
        const speed = 0.005 + w * 0.002;
        const frequency = 0.002 - w * 0.0003;

        for (let x = 0; x < width; x += 5) {
          const y =
            height / 2 +
            Math.sin(x * frequency + offset * (w + 1)) *
              waveHeight *
              Math.sin(offset * speed + x * 0.0002);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      offset += 0.02;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section
      id="traducao"
      ref={containerRef}
      className="relative w-full py-20 md:py-0 md:min-h-screen flex items-center justify-center bg-black overflow-hidden border-t border-white/5"
    >
      {/* Wave canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Cybernetic mask/glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 z-10 w-full text-center flex flex-col items-center gap-8">
        {/* Floating icon */}
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
          <Languages className="w-6 h-6 text-neon-blue animate-pulse-slow" />
        </div>

        {/* Text Area */}
        <div ref={textRef} className="flex flex-col items-center gap-6 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-blue">
            REUNIÕES GLOBAIS SEM LIMITES
          </span>
          <h2 className="font-display text-5xl md:text-8xl font-black tracking-tight text-white leading-none">
            Sem Barreiras <br />
            <span className="text-gradient-electric italic font-light">De idioma.</span>
          </h2>
          <p className="text-muted text-base md:text-xl leading-relaxed font-light max-w-2xl mt-4">
            O Treplica ouve chamadas em português, inglês, espanhol, francês, alemão, italiano, japonês, chinês e outros idiomas — exibindo a tradução em tempo real diretamente na sua tela. Fale na sua língua e entenda qualquer reunião global.
          </p>
        </div>
      </div>
    </section>
  );
}
