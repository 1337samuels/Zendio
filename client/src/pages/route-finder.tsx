import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, GitBranch, ArrowRight, Star, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CorridorSelect } from "@/components/corridor-select";
import { RadarPulse } from "@/components/radar-icon";

interface Hop {
  from_platform: string;
  from_currency: string;
  to_platform: string;
  to_currency: string;
  type: "fintech" | "crypto" | "bank";
  fee_label: string;
}

interface Route {
  id: string;
  hops: Hop[];
  total_cost_destination: number;
  total_cost_currency: string;
  total_percent: number;
  estimated_time: string;
  hop_count: number;
  is_best: boolean;
}

const HOP_COLORS = {
  fintech: "bg-teal/20 border-teal/30 text-teal",
  crypto: "bg-[#F5A623]/20 border-[#F5A623]/30 text-[#F5A623]",
  bank: "bg-white/10 border-white/20 text-muted-foreground",
};

const HOP_DOT_COLORS = {
  fintech: "bg-teal",
  crypto: "bg-[#F5A623]",
  bank: "bg-muted-foreground",
};

function HopNode({ hop, isLast }: { hop: Hop; isLast: boolean }) {
  const colorClass = HOP_COLORS[hop.type];
  const dotClass = HOP_DOT_COLORS[hop.type];

  return (
    <div className="flex items-center gap-0 min-w-0">
      <div className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium flex-shrink-0 ${colorClass}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
          <span className="font-semibold text-foreground whitespace-nowrap">{hop.from_platform}</span>
        </div>
        <span className="text-[10px] font-bold opacity-70">{hop.from_currency}</span>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center mx-1 flex-shrink-0">
          <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap mb-0.5">{hop.fee_label}</span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function RoutePipeline({ hops }: { hops: Hop[] }) {
  const allNodes = [
    ...hops.map((h) => ({ platform: h.from_platform, currency: h.from_currency, type: h.type })),
    { platform: hops[hops.length - 1].to_platform, currency: hops[hops.length - 1].to_currency, type: hops[hops.length - 1].type },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {hops.map((hop, idx) => (
        <HopNode key={idx} hop={hop} isLast={false} />
      ))}
      <div className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium flex-shrink-0 ${HOP_COLORS[hops[hops.length - 1].type]}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${HOP_DOT_COLORS[hops[hops.length - 1].type]}`} />
          <span className="font-semibold text-foreground whitespace-nowrap">{hops[hops.length - 1].to_platform}</span>
        </div>
        <span className="text-[10px] font-bold opacity-70">{hops[hops.length - 1].to_currency}</span>
      </div>
    </div>
  );
}

function RouteCard({
  route,
  bestCost,
  delay,
}: {
  route: Route;
  bestCost: number;
  delay: number;
}) {
  const extra = route.total_cost_destination - bestCost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card
        className={`relative p-5 bg-white/5 border transition-all duration-300 hover-elevate ${
          route.is_best
            ? "border-teal/40"
            : "border-white/10"
        }`}
        style={
          route.is_best
            ? { boxShadow: "0 0 24px rgba(0, 212, 170, 0.12), 0 0 1px rgba(0, 212, 170, 0.4)" }
            : {}
        }
        data-testid={`route-card-${route.id}`}
      >
        {route.is_best && (
          <div className="absolute -top-3 left-4">
            <div className="relative overflow-hidden rounded-md px-3 py-1 bg-teal text-[#0F1729] text-[10px] font-bold uppercase tracking-widest">
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
              />
              <Star className="inline w-3 h-3 mr-1 -mt-0.5" />
              Best Route
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <div className="overflow-x-auto pb-1">
              <RoutePipeline hops={route.hops} />
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 lg:gap-1 flex-shrink-0 lg:w-44 lg:text-right">
            <div>
              <motion.div
                className={`font-heading text-3xl font-bold ${route.is_best ? "text-teal" : "text-foreground"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
                data-testid={`text-total-cost-${route.id}`}
              >
                {route.total_cost_currency === "GBP" ? "£" : "$"}{route.total_cost_destination.toFixed(2)}
              </motion.div>
              <div className="text-xs text-muted-foreground mt-0.5">total fees &amp; spread</div>
              <div className="text-xs font-semibold text-muted-foreground">{route.total_percent}% of transfer</div>
              {!route.is_best && extra > 0 && (
                <div className="text-xs text-[#FF6B6B] font-medium mt-1">
                  +{route.total_cost_currency === "GBP" ? "£" : "$"}{extra.toFixed(2)} more
                </div>
              )}
            </div>

            <div className="flex flex-row lg:flex-col gap-2 lg:gap-1.5 lg:items-end">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span data-testid={`text-time-${route.id}`}>{route.estimated_time}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{route.hop_count} hop{route.hop_count !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function RadarLoading() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <RadarPulse size={96} />
      <div className="text-center">
        <p className="text-lg font-heading font-semibold text-foreground">Scanning routes...</p>
        <p className="text-sm text-muted-foreground mt-1 animate-pulse">Analyzing 47 routes across 6 platforms</p>
      </div>
      <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-teal rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

export default function RouteFinder() {
  const [from, setFrom] = useState("COP");
  const [to, setTo] = useState("GBP");
  const [amount, setAmount] = useState("5000000");
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { data, refetch } = useQuery<{ routes: Route[]; from: string; to: string }>({
    queryKey: ["/api/routes", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/routes?from=${from}&to=${to}`);
      return res.json();
    },
    enabled: false,
  });

  const handleSearch = async () => {
    setShowResults(false);
    setIsSearching(true);
    await refetch();
    setTimeout(() => {
      setIsSearching(false);
      setShowResults(true);
    }, 1500);
  };

  const routes = data?.routes || [];
  const bestRoute = routes.find((r) => r.is_best);
  const bestCost = bestRoute?.total_cost_destination || 0;
  const worstRoute = routes.reduce((worst, r) => (r.total_cost_destination > (worst?.total_cost_destination || 0) ? r : worst), routes[0]);
  const saving = worstRoute ? worstRoute.total_cost_destination - bestCost : 0;

  const currencySymbol = from === "MXN" ? (to === "GBP" ? "£" : "$") : to === "GBP" ? "£" : "$";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Route Finder</h1>
        <p className="text-muted-foreground mt-1">Find the cheapest multi-hop path for your money</p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10">
        <div className="flex flex-col gap-4">
          <CorridorSelect fromValue={from} toValue={to} onFromChange={setFrom} onToChange={setTo} />
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Amount ({from})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                {from === "COP" ? "COP" : "MXN"}
              </span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-14 bg-white/5 border-white/10 text-foreground text-sm"
                placeholder="5000000"
                data-testid="input-amount"
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            className="bg-teal text-[#0F1729] font-semibold w-full sm:w-auto"
            disabled={isSearching}
            data-testid="button-find-routes"
          >
            <Zap className="w-4 h-4 mr-2" />
            Find Best Route
          </Button>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {isSearching && <RadarLoading key="loading" />}

        {showResults && !isSearching && routes.length > 0 && (
          <motion.div
            key="results"
            className="flex flex-col gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-heading font-semibold text-foreground">
                {routes.length} routes found
              </h2>
              <Badge variant="secondary" className="text-xs">
                Ranked by total cost
              </Badge>
            </div>

            <div className="flex flex-col gap-4">
              {routes.map((route, idx) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  bestCost={bestCost}
                  delay={idx * 0.12}
                />
              ))}
            </div>

            {bestRoute && saving > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-4 rounded-lg bg-teal/10 border border-teal/20"
                data-testid="insight-savings"
              >
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground leading-relaxed">
                      By using the optimal route, you save{" "}
                      <span className="font-bold text-teal">
                        {currencySymbol}{saving.toFixed(2)}
                      </span>{" "}
                      compared to sending directly through Wise. That&apos;s enough for a week of groceries.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
