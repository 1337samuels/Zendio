import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HowItWorksModal } from "@/components/how-it-works-modal";
import { useState } from "react";
import RouteFinder from "@/pages/route-finder";
import zendioLogo from "@assets/zendio-logo.png";

function ZendioLogo({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="focus:outline-none"
      data-testid="button-logo-home"
      aria-label="Go to home"
    >
      <img src={zendioLogo} alt="Zendio" className="h-10 w-auto" />
    </button>
  );
}

function Header({ onHowItWorks, onLogoClick }: { onHowItWorks: () => void; onLogoClick: () => void }) {
  return (
    <header className="flex h-14 items-center justify-between px-5 md:px-8 border-b border-[#E5E7EB] bg-white">
      <ZendioLogo onClick={onLogoClick} />
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
  const [resetKey, setResetKey] = useState(0);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <Header onHowItWorks={() => setModalOpen(true)} onLogoClick={() => setResetKey((k) => k + 1)} />
          <main className="flex-1">
            <RouteFinder key={resetKey} />
          </main>
          <footer className="px-6 py-4 text-center text-xs text-muted-foreground border-t border-[#E5E7EB] bg-white">
            Zendio does not provide financial advice. Information is for comparison purposes only.
          </footer>
        </div>
        <HowItWorksModal open={modalOpen} onOpenChange={setModalOpen} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
