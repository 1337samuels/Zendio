import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { HowItWorksModal } from "@/components/how-it-works-modal";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, TrendingUp, Clock, Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { RadarIcon } from "@/components/radar-icon";
import NotFound from "@/pages/not-found";
import RouteFinder from "@/pages/route-finder";
import RateTracker from "@/pages/rate-tracker";
import SmartTiming from "@/pages/smart-timing";
import RateAlerts from "@/pages/rate-alerts";

const mobileNav = [
  { title: "Routes", url: "/", icon: Search },
  { title: "Rates", url: "/rates", icon: TrendingUp },
  { title: "Timing", url: "/timing", icon: Clock },
  { title: "Alerts", url: "/alerts", icon: Bell },
];

function MobileBottomNav() {
  const [location] = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0F1729]/95 backdrop-blur-xl flex">
      {mobileNav.map((item) => {
        const isActive = location === item.url;
        return (
          <Link
            key={item.url}
            href={item.url}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? "text-teal" : "text-muted-foreground"
            }`}
            data-testid={`mobile-nav-${item.title.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Header({ onHowItWorks }: { onHowItWorks: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 px-4 border-b border-white/10 bg-[#0F1729]/80 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:flex" data-testid="button-sidebar-toggle" />
        <div className="md:hidden flex items-center gap-1.5">
          <RadarIcon size={22} />
          <span className="font-heading font-bold text-base text-foreground">RemitRadar</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">BETA</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onHowItWorks}
          className="text-sm text-muted-foreground transition-colors hidden sm:block"
          data-testid="button-how-it-works"
        >
          How it works
        </button>
        <Button
          className="bg-teal text-[#0F1729] font-semibold text-sm"
          size="sm"
          data-testid="button-early-access"
        >
          Get Early Access
        </Button>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RouteFinder} />
      <Route path="/rates" component={RateTracker} />
      <Route path="/timing" component={SmartTiming} />
      <Route path="/alerts" component={RateAlerts} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "220px",
  "--sidebar-width-icon": "60px",
};

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider defaultOpen style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full bg-[#0F1729]">
            <div className="hidden md:flex">
              <AppSidebar />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <Header onHowItWorks={() => setModalOpen(true)} />
              <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                <Router />
              </main>
              <footer className="hidden md:block px-6 py-3 border-t border-white/10 text-xs text-muted-foreground">
                RemitRadar does not provide financial advice. Historical data is for informational purposes only.
                &nbsp;&nbsp;|&nbsp;&nbsp;Built with love for the diaspora.
              </footer>
            </div>
          </div>
          <MobileBottomNav />
        </SidebarProvider>
        <HowItWorksModal open={modalOpen} onOpenChange={setModalOpen} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
