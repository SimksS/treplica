import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Treplica — Assistente Local de Reuniões em Tempo Real",
  description: "Transcrição instantânea, orientação de IA inteligente e tradução de áudio executados 100% local na sua máquina. Otimize suas reuniões corporativas e processos seletivos de forma ultra-segura e privada.",
  keywords: ["Treplica", "Assistente de Reunião", "Transcrição Local", "Copiloto IA", "Privacidade de Dados", "Tauri", "Ollama", "Rust"],
  authors: [{ name: "Treplica Open Source Community" }],
  icons: {
    icon: "/favicon.ico",
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


