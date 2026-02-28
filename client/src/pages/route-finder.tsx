import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, Clock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import {
  FROM_OPTIONS,
  TO_OPTIONS,
  getCurrencySymbol,
  getApproxConverted,
} from "@/components/corridor-select";

const TIME_OPTIONS = [
  { value: "any", label: "Any duration" },
  { value: "0", label: "Instant only" },
  { value: "6", label: "Up to 6 hours" },
  { value: "24", label: "Up to 1 day" },
  { value: "72", label: "Up to 3 days" },
];

function formatTime(hours: number): string {
  if (hours === 0) return "Instant";
  if (hours < 1) return "Under 1 hour";
  if (hours < 24) return `About ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `About ${days} day${days === 1 ? "" : "s"}`;
}

type Hop = {
  from_platform: string;
  to_platform: string;
  from_url: string | null;
  to_url: string | null;
};

type Route = {
  id: string;
  total_cost_destination: number;
  estimated_hours: number;
  hops: Hop[];
};

function getRouteFlow(hops: Hop[]): Array<{ name: string; url: string | null }> {
  const result: Array<{ name: string; url: string | null }> = [];
  if (hops.length > 0) result.push({ name: hops[0].from_platform, url: hops[0].from_url });
  for (const hop of hops) result.push({ name: hop.to_platform, url: hop.to_url });
  return result;
}

function PlatformChip({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1 text-sm text-foreground/85 transition-colors"
        data-testid={`link-platform-${name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {name}
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      </a>
    );
  }
  return <span className="text-sm text-foreground/85">{name}</span>;
}

function RouteFlow({ hops }: { hops: Hop[] }) {
  const flow = getRouteFlow(hops);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {flow.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <PlatformChip name={item.name} url={item.url} />
          {i < flow.length - 1 && (
            <span className="text-muted-foreground text-sm select-none">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

function RouteCard({
  route,
  isBest,
  bestCost,
  toCurrency,
}: {
  route: Route;
  isBest: boolean;
  bestCost: number;
  toCurrency: string;
}) {
  const sym = getCurrencySymbol(toCurrency);
  const total = route.total_cost_destination;
  const fxCost = Math.round(total * 0.62 * 100) / 100;
  const feeCost = Math.round((total - fxCost) * 100) / 100;
  const diff = Math.round((total - bestCost) * 100) / 100;

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isBest
          ? "border-teal/40 bg-teal/5 shadow-[0_0_24px_rgba(0,212,170,0.07)]"
          : "border-white/8 bg-white/[0.03]"
      }`}
      data-testid={`card-route-${route.id}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="font-heading text-2xl font-bold text-foreground"
              data-testid={`text-total-cost-${route.id}`}
            >
              {sym}{total.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">total cost</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            FX rate: {sym}{fxCost.toFixed(2)} &middot; Fees: {sym}{feeCost.toFixed(2)}
          </div>
        </div>
        {isBest ? (
          <span
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal/20 text-teal border border-teal/30"
            data-testid="badge-best-route"
          >
            Best route
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs text-muted-foreground mt-1">
            +{sym}{diff.toFixed(2)} more
          </span>
        )}
      </div>

      <div className="mb-3">
        <RouteFlow hops={route.hops} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{formatTime(route.estimated_hours)}</span>
      </div>
    </div>
  );
}

export default function RouteFinder() {
  const [from, setFrom] = useState("COP");
  const [to, setTo] = useState("GBP");
  const [amount, setAmount] = useState("5000000");
  const [maxHours, setMaxHours] = useState("any");
  const [showOptions, setShowOptions] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    from: string;
    to: string;
    amount: string;
    maxHours: string;
  } | null>(null);

  const approxConverted = getApproxConverted(amount, from, to);

  const { data, isLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes", searchParams?.from, searchParams?.to, searchParams?.maxHours],
    queryFn: async () => {
      if (!searchParams) return [];
      const params = new URLSearchParams({ from: searchParams.from, to: searchParams.to });
      if (searchParams.maxHours !== "any") params.set("maxHours", searchParams.maxHours);
      const res = await fetch(`/api/routes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch routes");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.routes ?? []);
    },
    enabled: !!searchParams,
  });

  function handleSwap() {
    const toIsValidFrom = FROM_OPTIONS.some((o) => o.value === to);
    const fromIsValidTo = TO_OPTIONS.some((o) => o.value === from);
    if (toIsValidFrom && fromIsValidTo) {
      const newFrom = to;
      const newTo = from;
      setFrom(newFrom);
      setTo(newTo);
      const newFromOpt = FROM_OPTIONS.find((o) => o.value === newFrom);
      if (newFromOpt) setAmount(newFromOpt.defaultAmount);
      setSearchParams(null);
    }
  }

  function handleFromChange(val: string) {
    setFrom(val);
    const opt = FROM_OPTIONS.find((o) => o.value === val);
    if (opt) setAmount(opt.defaultAmount);
    setSearchParams(null);
  }

  function handleSearch() {
    setSearchParams({ from, to, amount, maxHours });
  }

  const hasResults = !!searchParams && data !== undefined;
  const routes = data ?? [];
  const bestCost = routes.length > 0 ? routes[0].total_cost_destination : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
      {!hasResults && (
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-3 leading-tight">
            Find the cheapest way to
            <br className="hidden sm:block" /> send money abroad
          </h1>
          <p className="text-muted-foreground text-base">
            We compare routes across multiple platforms so you don&apos;t have to
          </p>
        </div>
      )}

      {hasResults && (
        <div className="mb-5">
          <h2 className="font-heading font-semibold text-lg text-foreground">
            {routes.length} route{routes.length !== 1 ? "s" : ""} found
            <span className="font-normal text-muted-foreground text-sm ml-2">
              &middot; Ranked by total cost
            </span>
          </h2>
        </div>
      )}

      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 md:p-6 space-y-4 ${
          hasResults ? "mb-6" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              From
            </label>
            <Select value={from} onValueChange={handleFromChange}>
              <SelectTrigger
                className="w-full bg-white/5 border-white/10 text-foreground h-11"
                data-testid="select-from-currency"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0F1729] border-white/10">
                {FROM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-from-${opt.value}`}>
                    {opt.flag} {opt.country} ({opt.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-5">
            <button
              onClick={handleSwap}
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground transition-colors"
              data-testid="button-swap"
              title="Swap currencies"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              To
            </label>
            <Select
              value={to}
              onValueChange={(val) => {
                setTo(val);
                setSearchParams(null);
              }}
            >
              <SelectTrigger
                className="w-full bg-white/5 border-white/10 text-foreground h-11"
                data-testid="select-to-currency"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0F1729] border-white/10">
                {TO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-to-${opt.value}`}>
                    {opt.flag} {opt.country} ({opt.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono select-none">
              {from}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9]/g, ""));
                setSearchParams(null);
              }}
              className="w-full h-11 pl-14 pr-4 rounded-md border border-white/10 bg-white/5 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal/50 focus:border-teal/40"
              data-testid="input-amount"
              placeholder="0"
            />
          </div>
          {approxConverted && (
            <p
              className="text-xs text-muted-foreground mt-1.5 ml-0.5"
              data-testid="text-approx-converted"
            >
              Approximately {approxConverted} received
            </p>
          )}
        </div>

        <div>
          <button
            onClick={() => setShowOptions((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors"
            data-testid="button-toggle-options"
          >
            {showOptions ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {showOptions ? "Hide options" : "More options"}
          </button>

          {showOptions && (
            <div className="mt-3">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                I need money there within
              </label>
              <Select
                value={maxHours}
                onValueChange={(val) => {
                  setMaxHours(val);
                  setSearchParams(null);
                }}
              >
                <SelectTrigger
                  className="w-full bg-white/5 border-white/10 text-foreground h-10 text-sm"
                  data-testid="select-max-hours"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F1729] border-white/10">
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      data-testid={`option-time-${opt.value}`}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={isLoading || !amount}
          className="w-full h-11 bg-teal text-[#0F1729] font-semibold text-sm rounded-lg"
          data-testid="button-find-routes"
        >
          {isLoading ? "Finding routes..." : "Find best route"}
        </Button>
      </div>

      {hasResults && (
        <div>
          {routes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-base mb-1">No routes found for this corridor</p>
              <p className="text-sm">Try relaxing the time limit or selecting a different corridor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routes.map((route, idx) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isBest={idx === 0}
                  bestCost={bestCost}
                  toCurrency={searchParams?.to ?? "GBP"}
                />
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Click any platform name to open its website
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
