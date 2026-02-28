import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HowItWorksModal } from "@/components/how-it-works-modal";
import { useState } from "react";
import RouteFinder from "@/pages/route-finder";

function RemioLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="8" fill="#00D4AA" fillOpacity="0.15" />
        <path d="M8 14C8 10.686 10.686 8 14 8" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 8C17.314 8 20 10.686 20 14C20 17.314 17.314 20 14 20" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
        <path d="M17 14L21 10M21 10H17.5M21 10V13.5" stroke="#00D4AA" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-heading font-bold text-xl text-foreground tracking-tight">Remio</span>
    </div>
  );
}

function Header({ onHowItWorks }: { onHowItWorks: () => void }) {
  return (
    <header className="flex h-14 items-center justify-between px-5 md:px-8 border-b border-white/8">
      <RemioLogo />
      <button
        onClick={onHowItWorks}
        className="text-sm text-muted-foreground transition-colors"
        data-testid="button-how-it-works"
      >
        How it works
      </button>
    </header>
  );
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-[#0F1729]">
          <Header onHowItWorks={() => setModalOpen(true)} />
          <main className="flex-1">
            <RouteFinder />
          </main>
          <footer className="px-6 py-4 text-center text-xs text-muted-foreground border-t border-white/8">
            Remio does not provide financial advice. Information is for comparison purposes only.
          </footer>
        </div>
        <HowItWorksModal open={modalOpen} onOpenChange={setModalOpen} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
