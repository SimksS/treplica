"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldAlert } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function StatsCounter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: 100,
        duration: 2.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 65%",
          toggleActions: "play none none reverse",
        },
        onUpdate: () => {
          setCount(Math.floor(obj.val));
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full py-20 md:min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden border-t border-white/5"
    >
      {/* Absolute dark neon spot light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative flex flex-col items-center text-center px-6 max-w-4xl z-10">
        {/* Shield icon indicator */}
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Large count */}
        <span
          ref={numberRef}
          className="font-display text-[6rem] md:text-[18rem] font-black tracking-tighter text-white leading-none selection:bg-white selection:text-black"
        >
          {count}%
        </span>

        {/* Labels and Copy */}
        <h3 className="font-display text-base md:text-2xl font-bold uppercase tracking-wide md:tracking-[0.2em] text-white/95 mt-4">
          Segurança Local e Privada
        </h3>
        <p className="text-muted text-sm md:text-base leading-relaxed max-w-lg mt-3 px-2">
          Zero dados salvos na nuvem. Suas transcrições, relatórios e documentos gerados ficam armazenados exclusivamente na sua própria máquina — nenhuma informação trafega pelos nossos servidores.
        </p>
      </div>
    </section>
  );
}
