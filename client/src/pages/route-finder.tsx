import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, GitBranch, ArrowRight, Star, TrendingDown, Zap, ExternalLink, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CorridorSelect, getCurrencySymbol } from "@/components/corridor-select";
import { RadarPulse } from "@/components/radar-icon";

interface Hop {
  from_platform: string;
  from_url: string | null;
  from_currency: string;
  to_platform: string;
  to_url: string | null;
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
  estimated_hours: number;
  hop_count: number;
  is_best: boolean;
}

const MAX_HOURS_OPTIONS = [
  { value: "any", label: "Any duration", icon: null },
  { value: "0", label: "Instant only" },
  { value: "6", label: "Up to 6 hours" },
  { value: "24", label: "Up to 1 day" },
  { value: "72", label: "Up to 3 days" },
];

const DEFAULT_AMOUNTS: Record<string, string> = {
  COP: "5000000",
  MXN: "100000",
  BRL: "10000",
  PHP: "100000",
  INR: "200000",
  NGN: "5000000",
};

const HOP_COLORS = {
  fintech: "bg-teal/10 border-teal/25 text-foreground",
  crypto: "bg-[#F5A623]/10 border-[#F5A623]/25 text-foreground",
  bank: "bg-white/5 border-white/15 text-foreground",
};

const HOP_DOT_COLORS = {
  fintech: "bg-teal",
  crypto: "bg-[#F5A623]",
  bank: "bg-muted-foreground",
};

const HOP_TYPE_LABELS = {
  fintech: { label: "Fintech", color: "text-teal" },
  crypto: { label: "Crypto", color: "text-[#F5A623]" },
  bank: { label: "Bank", color: "text-muted-foreground" },
};

function PlatformPill({
  name,
  url,
  currency,
  type,
}: {
  name: string;
  url: string | null;
  currency: string;
  type: "fintech" | "crypto" | "bank";
}) {
  const colorClass = HOP_COLORS[type];
  const dotClass = HOP_DOT_COLORS[type];
  const typeLabel = HOP_TYPE_LABELS[type];

  const inner = (
    <div className={`flex flex-col items-center px-2.5 py-2 rounded-lg border text-xs font-medium flex-shrink-0 transition-all ${colorClass} ${url ? "cursor-pointer group" : ""}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
        <span className="font-semibold text-foreground whitespace-nowrap">{name}</span>
        {url && (
          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground flex-shrink-0" />
        )}
      </div>
      <span className={`text-[10px] font-bold ${typeLabel.color}`}>{currency}</span>
    </div>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" data-testid={`link-platform-${name.replace(/\s+/g, "-").toLowerCase()}`}>
        {inner}
      </a>
    );
  }
  return inner;
}

function RoutePipeline({ hops }: { hops: Hop[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {hops.map((hop, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <PlatformPill name={hop.from_platform} url={hop.from_url} currency={hop.from_currency} type={hop.type} />
          <div className="flex flex-col items-center flex-shrink-0 mx-0.5">
            <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap leading-tight mb-0.5">{hop.fee_label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          </div>
        </div>
      ))}
      <PlatformPill
        name={hops[hops.length - 1].to_platform}
        url={hops[hops.length - 1].to_url}
        currency={hops[hops.length - 1].to_currency}
        type={hops[hops.length - 1].type}
      />
    </div>
  );
}

function RouteCard({ route, bestCost, delay }: { route: Route; bestCost: number; delay: number }) {
  const extra = route.total_cost_destination - bestCost;
  const sym = getCurrencySymbol(route.total_cost_currency);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card
        className={`relative p-5 bg-white/5 border transition-all duration-300 hover-elevate ${
          route.is_best ? "border-teal/40" : "border-white/10"
        }`}
        style={route.is_best ? { boxShadow: "0 0 24px rgba(0,212,170,0.10), 0 0 1px rgba(0,212,170,0.35)" } : {}}
        data-testid={`route-card-${route.id}`}
      >
        {route.is_best && (
          <div className="absolute -top-3 left-4">
            <div className="relative rounded-md px-3 py-1 bg-teal text-[#0F1729] text-[10px] font-bold uppercase tracking-widest overflow-hidden">
              <div
                className="absolute inset-0 animate-shimmer pointer-events-none"
                style={{
                  background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%)",
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
                {sym}{route.total_cost_destination.toFixed(2)}
              </motion.div>
              <div className="text-xs text-muted-foreground mt-0.5">total fees &amp; spread</div>
              <div className="text-xs font-semibold text-muted-foreground">{route.total_percent}% of transfer</div>
              {!route.is_best && extra > 0 && (
                <div className="text-xs text-[#FF6B6B] font-medium mt-1">
                  +{sym}{extra.toFixed(2)} more
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
        <p className="text-sm text-muted-foreground mt-1 animate-pulse">Analyzing 47 routes across 12 platforms</p>
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
  const [maxHours, setMaxHours] = useState("any");
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { data, refetch } = useQuery<{ routes: Route[]; from: string; to: string }>({
    queryKey: ["/api/routes", from, to, maxHours],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (maxHours !== "any") params.set("maxHours", maxHours);
      const res = await fetch(`/api/routes?${params}`);
      return res.json();
    },
    enabled: false,
  });

  const handleFromChange = (v: string) => {
    setFrom(v);
    setAmount(DEFAULT_AMOUNTS[v] ?? "10000");
    setShowResults(false);
  };

  const handleToChange = (v: string) => {
    setTo(v);
    setShowResults(false);
  };

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
  const worstRoute = routes.reduce(
    (worst, r) => (r.total_cost_destination > (worst?.total_cost_destination || 0) ? r : worst),
    routes[0]
  );
  const saving = worstRoute ? worstRoute.total_cost_destination - bestCost : 0;
  const currSym = getCurrencySymbol(to);

  const selectedMaxLabel = MAX_HOURS_OPTIONS.find((o) => o.value === maxHours)?.label ?? "Any duration";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Route Finder</h1>
        <p className="text-muted-foreground mt-1">Find the cheapest multi-hop path for your money</p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10">
        <div className="flex flex-col gap-4">
          <CorridorSelect fromValue={from} toValue={to} onFromChange={handleFromChange} onToChange={handleToChange} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Amount ({from})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  {from}
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-14 bg-white/5 border-white/10 text-foreground text-sm"
                  data-testid="input-amount"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                Max transfer time
              </label>
              <Select value={maxHours} onValueChange={(v) => { setMaxHours(v); setShowResults(false); }}>
                <SelectTrigger
                  className="bg-white/5 border-white/10 text-foreground"
                  data-testid="select-max-hours"
                >
                  <SelectValue placeholder="Any duration" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F1729] border-white/10">
                  {MAX_HOURS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-hours-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {maxHours !== "any" && (
            <div className="flex items-center gap-2 text-xs text-[#F5A623] bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-lg px-3 py-2">
              <Timer className="w-3.5 h-3.5 flex-shrink-0" />
              Showing only routes that complete within{" "}
              <span className="font-semibold">{selectedMaxLabel.toLowerCase()}</span> — some cheaper options may be hidden.
            </div>
          )}

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

        {showResults && !isSearching && (
          <motion.div
            key="results"
            className="flex flex-col gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {routes.length === 0 ? (
              <Card className="p-8 bg-white/5 border-white/10 text-center" data-testid="no-routes-message">
                <Timer className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-foreground font-semibold">No routes within this time limit</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try relaxing the max transfer time filter to see more options.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="font-heading font-semibold text-foreground">
                    {routes.length} route{routes.length !== 1 ? "s" : ""} found
                  </h2>
                  <div className="flex items-center gap-2">
                    {maxHours !== "any" && (
                      <Badge variant="outline" className="text-xs border-[#F5A623]/40 text-[#F5A623]">
                        <Timer className="w-3 h-3 mr-1" />
                        {selectedMaxLabel}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">Ranked by cost</Badge>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1.5 -mt-1">
                  <ExternalLink className="w-3 h-3" />
                  Click any platform name to open its website
                </div>

                <div className="flex flex-col gap-4">
                  {routes.map((route, idx) => (
                    <RouteCard key={route.id} route={route} bestCost={bestCost} delay={idx * 0.12} />
                  ))}
                </div>

                {bestRoute && saving > 0.01 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-4 rounded-lg bg-teal/10 border border-teal/20"
                    data-testid="insight-savings"
                  >
                    <div className="flex items-start gap-3">
                      <TrendingDown className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground leading-relaxed">
                        By using the optimal route, you save{" "}
                        <span className="font-bold text-teal">{currSym}{saving.toFixed(2)}</span>{" "}
                        compared to the most expensive option shown. That&apos;s real money back in your pocket.
                      </p>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
