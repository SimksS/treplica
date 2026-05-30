"use client";

import { Video, Sparkles, MessageCircle, Laptop, Cpu, ShieldCheck } from "lucide-react";

export default function Marquee() {
  const platforms = [
    { name: "Google Meet", icon: Video },
    { name: "Zoom Meetings", icon: Video },
    { name: "Microsoft Teams", icon: Laptop },
    { name: "Discord Calls", icon: MessageCircle },
    { name: "Slack Huddles", icon: MessageCircle },
    { name: "Webex Suite", icon: Laptop },
    { name: "Skype Business", icon: Video },
  ];

  const technologies = [
    { name: "Ollama Local", icon: Cpu },
    { name: "Whisper Speech", icon: Cpu },
    { name: "DeepSeek R1", icon: Sparkles },
    { name: "Llama 3.3", icon: Sparkles },
    { name: "OpenAI GPT-4o", icon: Sparkles },
    { name: "Gemini 2.0 Flash", icon: Sparkles },
    { name: "SQLite Database", icon: ShieldCheck },
  ];

  // Triplicating lists to ensure seamless looping transition
  const firstRow = [...platforms, ...platforms, ...platforms];
  const secondRow = [...technologies, ...technologies, ...technologies];

  return (
    <section className="bg-black py-20 w-full overflow-hidden flex flex-col gap-8 border-t border-white/5">
      {/* Row 1: Platforms (Scrolls Left) */}
      <div className="relative w-full flex items-center">
        {/* Left and Right vignettes to mask edges smoothly */}
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

        <div className="flex gap-6 whitespace-nowrap animate-marquee-left">
          {firstRow.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-full glass border border-white/5 hover:border-white/20 transition-all duration-300 select-none cursor-default group"
              >
                <Icon className="w-4 h-4 text-neon-blue group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold uppercase tracking-wider text-white">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2: Models & Engines (Scrolls Right) */}
      <div className="relative w-full flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

        <div className="flex gap-6 whitespace-nowrap animate-marquee-right">
          {secondRow.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-full glass border border-white/5 hover:border-white/20 transition-all duration-300 select-none cursor-default group"
              >
                <Icon className="w-4 h-4 text-neon-purple group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold uppercase tracking-wider text-white">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
