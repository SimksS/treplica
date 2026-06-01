import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/ui/SmoothScroll";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://treplica.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Treplica — Assistente Local de Reuniões em Tempo Real",
    template: "%s | Treplica",
  },
  description:
    "Transcrição instantânea, orientação de IA inteligente e tradução de áudio rodando 100% local na sua máquina. Gratuito, código aberto e 100% privado. Disponível para Windows e macOS.",
  keywords: [
    "Treplica",
    "assistente de reunião",
    "transcrição local",
    "copiloto IA",
    "privacidade",
    "transcrição em tempo real",
    "IA local",
    "meeting assistant",
    "speech to text",
    "open source",
    "Windows",
    "macOS",
  ],
  authors: [{ name: "Treplica", url: SITE_URL }],
  creator: "Treplica",
  publisher: "Treplica",
  category: "technology",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    alternateLocale: "en_US",
    url: SITE_URL,
    siteName: "Treplica",
    title: "Treplica — Assistente Local de Reuniões em Tempo Real",
    description:
      "Transcrição instantânea, orientação de IA e tradução de áudio rodando 100% local. Gratuito e código aberto.",
    images: [
      {
        url: "/images/hero-mockup.png",
        width: 1200,
        height: 630,
        alt: "Treplica — Assistente de Reuniões com IA Local",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Treplica — Assistente Local de Reuniões em Tempo Real",
    description:
      "Transcrição, orientação de IA e tradução rodando 100% local. Gratuito e código aberto.",
    images: ["/images/hero-mockup.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${syne.variable} ${inter.variable} h-full scroll-smooth antialiased bg-black text-white`}
    >
      <body className="min-h-full flex flex-col font-sans bg-black text-white overflow-x-hidden selection:bg-white selection:text-black">
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
