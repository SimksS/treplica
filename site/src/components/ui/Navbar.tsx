"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "py-4 bg-black/80 backdrop-blur-md border-b border-white/5"
          : "py-6 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <Image
            src="/images/logo_treplica.png"
            alt="Treplica"
            width={36}
            height={36}
            className="object-contain"
          />
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-extrabold tracking-tight text-white transition-colors duration-300">
              Treplica
            </span>
            <span className="text-[10px] font-medium text-white/40 tracking-wide">
              Meeting AI Assistant
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="/#transcricao"
            className="text-sm font-medium text-muted hover:text-white transition-colors duration-300"
          >
            Recursos
          </a>
          <a
            href="/#como-funciona"
            className="text-sm font-medium text-muted hover:text-white transition-colors duration-300"
          >
            Como Funciona
          </a>
          <a
            href="/#overlay"
            className="text-sm font-medium text-muted hover:text-white transition-colors duration-300"
          >
            Overlay
          </a>
          <a
            href="/#compatibilidade"
            className="text-sm font-medium text-muted hover:text-white transition-colors duration-300"
          >
            Compatibilidade
          </a>
          <a
            href="/#open-source"
            className="text-sm font-medium text-muted hover:text-white transition-colors duration-300"
          >
            Open Source
          </a>
          <a
            href="/docs"
            className="text-sm font-medium text-neon-blue hover:text-white transition-colors duration-300"
          >
            Documentação
          </a>
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted hover:text-white transition-colors duration-300"
            aria-label="GitHub Repository"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
          </a>
          <a
            href="/#download"
            className="relative px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-black bg-white hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center gap-2 group"
          >
            Baixar Grátis
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 px-6 py-8 flex flex-col gap-6 animate-fade-in">
          <a
            href="/#transcricao"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-muted hover:text-white transition-colors"
          >
            Recursos
          </a>
          <a
            href="/#como-funciona"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-muted hover:text-white transition-colors"
          >
            Como Funciona
          </a>
          <a
            href="/#overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-muted hover:text-white transition-colors"
          >
            Overlay
          </a>
          <a
            href="/#compatibilidade"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-muted hover:text-white transition-colors"
          >
            Compatibilidade
          </a>
          <a
            href="/#open-source"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-muted hover:text-white transition-colors"
          >
            Open Source
          </a>
          <a
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-neon-blue hover:text-white transition-colors"
          >
            Documentação
          </a>
          <div className="h-px bg-white/10 my-2"></div>
          <div className="flex items-center justify-between">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted hover:text-white text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              Ver Código
            </a>
            <a
              href="#download"
              onClick={() => setMobileMenuOpen(false)}
              className="px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider text-black bg-white hover:bg-white/90 text-center shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              Baixar Grátis
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

