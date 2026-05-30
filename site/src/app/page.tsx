import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import Hero from "@/components/sections/Hero";
import LiveTranscription from "@/components/sections/LiveTranscription";
import AIGuidance from "@/components/sections/AIGuidance";
import TranslationSection from "@/components/sections/TranslationSection";
import StatsCounter from "@/components/sections/StatsCounter";
import HowItWorks from "@/components/sections/HowItWorks";
import StealthOverlay from "@/components/sections/StealthOverlay";
import UseCases from "@/components/sections/UseCases";
import Marquee from "@/components/sections/Marquee";
import Compatibility from "@/components/sections/Compatibility";
import OpenSource from "@/components/sections/OpenSource";
import Partners from "@/components/sections/Partners";
import FinalCTA from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      {/* Global Transparent Header */}
      <Navbar />

      {/* Main Container */}
      <main className="flex flex-col w-full bg-black">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Feature Highlight: Live Transcription */}
        <LiveTranscription />

        {/* 3. Product Image Feature: AI Guidance */}
        <AIGuidance />

        {/* 4. Audio Section: Real-time Translation */}
        <TranslationSection />

        {/* 5. Scroll-triggered Privacy Counter */}
        <StatsCounter />

        {/* 6. Flexibility Features: Scroll Tabs */}
        <HowItWorks />

        {/* 7. Light Effects: Stealth Overlay Demo */}
        <StealthOverlay />

        {/* 8. Software / Use Cases */}
        <UseCases />

        {/* 9. Platform & Tech Marquees */}
        <Marquee />

        {/* 10. Compatibility Grid */}
        <Compatibility />

        {/* 11. Open Source Selector (3 variants) */}
        <OpenSource />

        {/* 12. Tech Partners Logos */}
        <Partners />

        {/* 13. Final CTA */}
        <FinalCTA />
      </main>

      {/* Global Minimal Footer */}
      <Footer />
    </>
  );
}
