import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import DocsSidebar from "@/components/docs/DocsSidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentação | Treplica",
  description: "Guia oficial de como instalar, configurar e usar o Treplica como seu assistente local.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Navbar at top */}
      <div className="z-50 relative">
        <Navbar />
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex-grow flex relative">
        {/* Fixed/Sticky Sidebar */}
        <DocsSidebar />

        {/* Documentation Content Area */}
        <main className="flex-1 w-full pt-32 pb-24 px-6 md:px-12 lg:pl-16 lg:pr-24 min-h-screen max-w-5xl mx-auto">
          {children}
        </main>
      </div>

      {/* Footer at bottom */}
      <Footer />
    </div>
  );
}
