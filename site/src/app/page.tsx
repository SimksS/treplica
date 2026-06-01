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
import FinalCTA from "@/components/sections/FinalCTA";
import { getLatestRelease, getDownloadUrls } from "@/lib/github";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://treplica.app";
const REPO_URL = "https://github.com/treplica/treplica";

export default async function Home() {
  const release = await getLatestRelease();
  const downloadUrls = getDownloadUrls(release);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Treplica",
    url: SITE_URL,
    downloadUrl: downloadUrls.releases,
    operatingSystem: "Windows 10+, macOS 12+",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Meeting Assistant",
    softwareVersion: release?.tag_name ?? "0.1.0-beta",
    description:
      "Assistente desktop local-first para transcrição em tempo real, orientação de IA e tradução de reuniões. 100% privado, gratuito e código aberto.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
    author: {
      "@type": "Organization",
      name: "Treplica",
      url: REPO_URL,
    },
    license: REPO_URL,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Global Transparent Header */}
      <Navbar repoUrl={REPO_URL} />

      {/* Main Container */}
      <main className="flex flex-col w-full bg-black">
        {/* 1. Hero Section */}
        <Hero downloadUrls={downloadUrls} version={release?.tag_name} />

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

        {/* 11. Open Source / Free features */}
        <OpenSource />

        {/* 12. Final CTA */}
        <FinalCTA downloadUrls={downloadUrls} version={release?.tag_name} />
      </main>

      {/* Global Minimal Footer */}
      <Footer />
    </>
  );
}
