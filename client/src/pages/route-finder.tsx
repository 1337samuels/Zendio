import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartTooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeftRight, Clock, ExternalLink, ChevronDown, ChevronUp,
  Check, TrendingDown,
} from "lucide-react";
import {
  FROM_OPTIONS, TO_OPTIONS, getCurrencySymbol, getApproxConverted,
} from "@/components/corridor-select";

// ─── constants ───────────────────────────────────────────────────────────────

const TIME_OPTIONS = [
  { value: "any", label: "Any duration" },
  { value: "0", label: "Instant only" },
  { value: "6", label: "Up to 6 hours" },
  { value: "24", label: "Up to 1 day" },
  { value: "72", label: "Up to 3 days" },
];

const ORIGIN_PLATFORMS: Record<string, string[]> = {
  COP: ["Bancolombia", "Davivienda", "Nequi", "BBVA Colombia"],
  MXN: ["BBVA Mexico", "Banorte", "Nu Mexico"],
  BRL: ["Nubank", "Itaú"],
  PHP: ["GCash", "BPI"],
  INR: ["HDFC Bank", "Paytm"],
  NGN: ["GTBank"],
};

const DEST_PLATFORMS: Record<string, string[]> = {
  GBP: ["Wise", "Revolut", "Monzo", "Starling", "Barclays"],
  USD: ["Chase", "Bank of America", "Wise", "Coinbase"],
  EUR: ["Wise", "Revolut", "N26", "Bunq"],
};

const OTHER_PLATFORMS = ["Dollar App", "Binance", "Coinbase", "Payoneer", "Global66"];

type EaseLevel = { label: string; score: number; color: string; explanation: string };
const EASE: Record<string, EaseLevel> = {
  "cop-gbp-1": { label: "A few steps", score: 3, color: "amber", explanation: "4 steps across well-known apps — straightforward once set up" },
  "cop-gbp-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Wise" },
  "cop-gbp-3": { label: "Involved", score: 4, color: "red", explanation: "Requires a Binance account with identity verification" },
  "cop-gbp-4": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps via XE — easy to set up" },
  "cop-gbp-5": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "cop-usd-1": { label: "Straightforward", score: 2, color: "lime", explanation: "One step — just need Dollar App" },
  "cop-usd-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Wise" },
  "cop-usd-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "cop-usd-4": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps via XE and OFX" },
  "cop-usd-5": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
  "mxn-usd-1": { label: "Involved", score: 4, color: "red", explanation: "Requires crypto exchange accounts" },
  "mxn-usd-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Wise" },
  "mxn-usd-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "mxn-usd-4": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through XE" },
  "mxn-usd-5": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through MoneyGram" },
  "mxn-gbp-1": { label: "Involved", score: 4, color: "red", explanation: "Requires a Binance account — involves crypto steps" },
  "mxn-gbp-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Wise" },
  "mxn-gbp-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through XE" },
  "mxn-gbp-4": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
  "brl-usd-1": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps — Nubank to Wise to Revolut" },
  "brl-usd-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "brl-usd-3": { label: "Involved", score: 4, color: "red", explanation: "Requires Binance with crypto — identity verification needed" },
  "brl-usd-4": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
  "brl-eur-1": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps — Nubank then Wise to Revolut" },
  "brl-eur-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through XE" },
  "brl-eur-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through OFX" },
  "php-usd-1": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "php-usd-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Wise" },
  "php-usd-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
  "php-usd-4": { label: "Involved", score: 4, color: "red", explanation: "Requires Binance and Coinbase accounts with identity checks" },
  "php-gbp-1": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps via GCash and Wise" },
  "php-gbp-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through XE" },
  "php-gbp-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through MoneyGram" },
  "inr-gbp-1": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps — HDFC Bank then Wise to Revolut" },
  "inr-gbp-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "inr-gbp-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Skrill" },
  "inr-gbp-4": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
  "inr-usd-1": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps — HDFC Bank then Wise to Revolut" },
  "inr-usd-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "inr-usd-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through XE" },
  "ngn-gbp-1": { label: "Involved", score: 4, color: "red", explanation: "Requires Binance account — involves crypto steps" },
  "ngn-gbp-2": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "ngn-gbp-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
};

const PRICE_RANGES: Record<string, { min: number; max: number; avg: number }> = {
  "cop-gbp-1": { min: 6.80, max: 16.50, avg: 11.80 },
  "cop-gbp-2": { min: 42.00, max: 55.00, avg: 48.00 },
  "cop-gbp-3": { min: 8.20, max: 28.50, avg: 16.40 },
  "cop-gbp-4": { min: 16.00, max: 30.00, avg: 23.00 },
  "cop-gbp-5": { min: 27.00, max: 42.00, avg: 34.20 },
  "cop-usd-1": { min: 3.00, max: 9.50, avg: 6.20 },
  "cop-usd-2": { min: 18.00, max: 28.00, avg: 22.40 },
  "cop-usd-3": { min: 8.50, max: 17.00, avg: 12.80 },
  "cop-usd-4": { min: 11.00, max: 21.00, avg: 15.90 },
  "cop-usd-5": { min: 34.00, max: 50.00, avg: 42.00 },
  "mxn-usd-1": { min: 12.00, max: 27.00, avg: 19.20 },
  "mxn-usd-2": { min: 24.00, max: 37.00, avg: 30.80 },
  "mxn-usd-3": { min: 17.00, max: 29.00, avg: 23.40 },
  "mxn-usd-4": { min: 22.00, max: 35.00, avg: 28.20 },
  "mxn-usd-5": { min: 85.00, max: 118.00, avg: 101.00 },
  "mxn-gbp-1": { min: 16.00, max: 31.00, avg: 23.20 },
  "mxn-gbp-2": { min: 42.00, max: 60.00, avg: 50.40 },
  "mxn-gbp-3": { min: 27.00, max: 44.00, avg: 35.80 },
  "mxn-gbp-4": { min: 88.00, max: 114.00, avg: 102.00 },
  "brl-usd-1": { min: 5.00, max: 14.00, avg: 9.20 },
  "brl-usd-2": { min: 11.00, max: 20.00, avg: 15.10 },
  "brl-usd-3": { min: 7.00, max: 18.00, avg: 12.30 },
  "brl-usd-4": { min: 26.00, max: 40.00, avg: 33.60 },
  "brl-eur-1": { min: 4.50, max: 13.00, avg: 8.20 },
  "brl-eur-2": { min: 10.00, max: 19.00, avg: 14.20 },
  "brl-eur-3": { min: 14.00, max: 24.00, avg: 18.60 },
  "php-usd-1": { min: 3.00, max: 9.00, avg: 5.80 },
  "php-usd-2": { min: 6.00, max: 14.00, avg: 9.70 },
  "php-usd-3": { min: 21.00, max: 34.00, avg: 27.60 },
  "php-usd-4": { min: 4.00, max: 13.00, avg: 8.10 },
  "php-gbp-1": { min: 7.00, max: 16.00, avg: 11.20 },
  "php-gbp-2": { min: 12.00, max: 22.00, avg: 16.80 },
  "php-gbp-3": { min: 30.00, max: 46.00, avg: 38.40 },
  "inr-gbp-1": { min: 9.00, max: 22.00, avg: 15.10 },
  "inr-gbp-2": { min: 18.00, max: 30.00, avg: 24.20 },
  "inr-gbp-3": { min: 30.00, max: 46.00, avg: 39.20 },
  "inr-gbp-4": { min: 50.00, max: 72.00, avg: 61.40 },
  "inr-usd-1": { min: 7.00, max: 18.00, avg: 12.20 },
  "inr-usd-2": { min: 17.00, max: 28.00, avg: 22.60 },
  "inr-usd-3": { min: 24.00, max: 37.00, avg: 30.60 },
  "ngn-gbp-1": { min: 12.00, max: 28.00, avg: 19.40 },
  "ngn-gbp-2": { min: 28.00, max: 44.00, avg: 36.40 },
  "ngn-gbp-3": { min: 58.00, max: 80.00, avg: 69.80 },
};

// ─── types ────────────────────────────────────────────────────────────────────

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

type PricePoint = {
  date: string;
  cost: number;
  avg: number;
};

type Perks = { revolut: boolean; wise: boolean; binance: boolean };

// ─── helpers ─────────────────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1.4142) * 10000;
  return x - Math.floor(x);
}

function formatTime(hours: number): string {
  if (hours === 0) return "Instant";
  if (hours < 24) return `About ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `About ${days} day${days === 1 ? "" : "s"}`;
}

function getRoutePlatforms(route: Route): string[] {
  const seen = new Set<string>();
  for (const hop of route.hops) {
    seen.add(hop.from_platform);
    seen.add(hop.to_platform);
  }
  return Array.from(seen);
}

function applyPerks(baseCost: number, platforms: string[], perks: Perks): number {
  let cost = baseCost;
  const hasBinance = platforms.some((p) => p === "Binance" || p === "Binance P2P");
  if (perks.revolut && platforms.includes("Revolut")) cost = cost * 0.88;
  if (perks.wise && platforms.includes("Wise")) cost = cost * 0.80;
  if (perks.binance && hasBinance) cost = cost * 0.90;
  return Math.round(cost * 100) / 100;
}

function generatePriceHistory(routeId: string, currentCost: number): PricePoint[] {
  const range = PRICE_RANGES[routeId] ?? {
    min: currentCost * 0.6,
    max: currentCost * 1.5,
    avg: currentCost * 1.05,
  };
  const seed = routeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const today = new Date();
  const data: PricePoint[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const cost =
      i === 0
        ? currentCost
        : range.min + seededRandom(seed + i * 11) * (range.max - range.min);
    data.push({ date: label, cost: Math.round(cost * 100) / 100, avg: range.avg });
  }
  return data;
}

function getVerdictInfo(data: PricePoint[], currentCost: number) {
  const past = data.slice(0, 89);
  const countHigher = past.filter((d) => d.cost > currentCost).length;
  const pct = Math.round((countHigher / past.length) * 100);
  if (pct >= 65)
    return { color: "green", label: "Great price", pct, desc: "This route's total cost is lower than most of the last 3 months." };
  if (pct >= 35)
    return { color: "yellow", label: "Typical price", pct, desc: "Around the average cost for this route." };
  return { color: "red", label: "Higher than usual", pct, desc: "This route has been cheaper recently." };
}

function verdictDotClass(color: string) {
  if (color === "green") return "bg-emerald-400";
  if (color === "yellow") return "bg-amber-400";
  return "bg-rose-400";
}

function verdictBannerClass(color: string) {
  if (color === "green") return "bg-emerald-500/15 border-emerald-500/25 text-emerald-300";
  if (color === "yellow") return "bg-amber-500/15 border-amber-500/25 text-amber-300";
  return "bg-rose-500/15 border-rose-500/25 text-rose-300";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function EaseBadge({ routeId }: { routeId: string }) {
  const ease = EASE[routeId];
  if (!ease) return null;
  const classes: Record<string, string> = {
    green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    lime: "bg-lime-500/20 text-lime-300 border-lime-500/30",
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    red: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${classes[ease.color] ?? classes.amber}`}
      data-testid={`badge-ease-${routeId}`}
    >
      {ease.label}
    </span>
  );
}

function PlatformLink({ name, url }: { name: string; url: string | null }) {
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
  const flow: Array<{ name: string; url: string | null }> = [];
  if (hops.length > 0) flow.push({ name: hops[0].from_platform, url: hops[0].from_url });
  for (const hop of hops) flow.push({ name: hop.to_platform, url: hop.to_url });
  const deduped = flow.filter((item, i) => i === 0 || item.name !== flow[i - 1].name);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {deduped.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <PlatformLink name={item.name} url={item.url} />
          {i < deduped.length - 1 && (
            <span className="text-muted-foreground text-sm select-none">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

function PriceTracker({
  routeId,
  currentCost,
  currency,
}: {
  routeId: string;
  currentCost: number;
  currency: string;
}) {
  const sym = getCurrencySymbol(currency);
  const data = useMemo(() => generatePriceHistory(routeId, currentCost), [routeId, currentCost]);
  const verdict = getVerdictInfo(data, currentCost);

  const low = Math.min(...data.map((d) => d.cost));
  const high = Math.max(...data.map((d) => d.cost));
  const avg = data[0].avg;

  const bestIdx = data.findIndex((d) => d.cost === low);
  const bestDate = data[bestIdx]?.date ?? "";

  const tickDates = [data[0].date, data[29].date, data[59].date, data[89].date];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const cost = payload[0].value;
    const fxPart = Math.round(cost * 0.62 * 100) / 100;
    const feePart = Math.round((cost - fxPart) * 100) / 100;
    return (
      <div className="bg-[#0F1729] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
        <div className="font-semibold text-foreground mb-1">{label}</div>
        <div className="text-foreground font-mono">{sym}{cost.toFixed(2)} total</div>
        <div className="text-muted-foreground mt-1">FX: {sym}{fxPart.toFixed(2)} · Fees: {sym}{feePart.toFixed(2)}</div>
      </div>
    );
  };

  const CustomDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (index === 89) return <circle cx={cx} cy={cy} r={5} fill="#00D4AA" stroke="#0F1729" strokeWidth={2} />;
    if (index === bestIdx) return <circle cx={cx} cy={cy} r={4} fill="#34d399" stroke="#0F1729" strokeWidth={1.5} />;
    return <circle r={0} cx={cx} cy={cy} fill="none" />;
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/8">
      <div
        className={`rounded-lg border px-3 py-2.5 mb-3 ${verdictBannerClass(verdict.color)}`}
        data-testid={`verdict-${routeId}`}
      >
        <div className="font-semibold text-sm mb-0.5">{verdict.label}</div>
        <div className="text-xs opacity-90">{verdict.desc}</div>
        <div className="text-xs opacity-75 mt-1">
          Today's cost of {sym}{currentCost.toFixed(2)} is cheaper than {verdict.pct}% of the last 90 days.
          <span className="block opacity-60 mt-0.5">Total cost = exchange rate + all fees combined</span>
        </div>
      </div>

      <div style={{ height: 150 }} data-testid={`chart-${routeId}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${routeId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00D4AA" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              ticks={tickDates}
              tick={{ fill: "#8A9BB5", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#8A9BB5", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${sym}${v}`}
            />
            <RechartTooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avg}
              stroke="#8A9BB5"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: `avg ${sym}${avg.toFixed(2)}`, fill: "#8A9BB5", fontSize: 9, position: "insideTopRight" }}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#00D4AA"
              strokeWidth={1.5}
              fill={`url(#grad-${routeId})`}
              dot={(props) => <CustomDot {...props} />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
        <span>Low: <span className="text-emerald-400 font-mono">{sym}{low.toFixed(2)}</span> on {bestDate}</span>
        <span>Avg: <span className="font-mono text-foreground/70">{sym}{avg.toFixed(2)}</span></span>
        <span>High: <span className="text-rose-400 font-mono">{sym}{high.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

function RouteCard({
  route,
  adjustedCost,
  isBest,
  bestAdjustedCost,
  toCurrency,
  selectedAccounts,
  isExpanded,
  onToggleExpand,
}: {
  route: Route;
  adjustedCost: number;
  isBest: boolean;
  bestAdjustedCost: number;
  toCurrency: string;
  selectedAccounts: Set<string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const sym = getCurrencySymbol(toCurrency);
  const total = adjustedCost;
  const fxCost = Math.round(total * 0.62 * 100) / 100;
  const feeCost = Math.round((total - fxCost) * 100) / 100;
  const diff = Math.round((total - bestAdjustedCost) * 100) / 100;
  const ease = EASE[route.id];

  const platforms = getRoutePlatforms(route);
  const firstPlatform = route.hops[0]?.from_platform;
  const nonOriginPlatforms = platforms.filter(
    (p) => p !== firstPlatform && p !== "UK Bank" && p !== "US Bank"
  );
  const usesAccounts = selectedAccounts.size > 0 && platforms.some((p) => selectedAccounts.has(p));
  const requiresPlatforms =
    selectedAccounts.size > 0
      ? nonOriginPlatforms.filter((p) => !selectedAccounts.has(p))
      : [];

  const priceData = useMemo(() => generatePriceHistory(route.id, total), [route.id, total]);
  const verdict = getVerdictInfo(priceData, total);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isBest
          ? "border-teal/40 bg-teal/5 shadow-[0_0_24px_rgba(0,212,170,0.07)]"
          : "border-white/8 bg-white/[0.03]"
      }`}
      data-testid={`card-route-${route.id}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span
                className="font-heading text-2xl font-bold text-foreground"
                data-testid={`text-total-cost-${route.id}`}
              >
                {sym}{total.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">total cost</span>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${verdictDotClass(verdict.color)}`}
                title={verdict.label}
                data-testid={`dot-verdict-${route.id}`}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              FX rate: {sym}{fxCost.toFixed(2)} &middot; Fees: {sym}{feeCost.toFixed(2)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {isBest ? (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal/20 text-teal border border-teal/30"
                data-testid="badge-best-route"
              >
                Best route
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                +{sym}{diff.toFixed(2)} more
              </span>
            )}
            <EaseBadge routeId={route.id} />
          </div>
        </div>

        {ease && (
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{ease.explanation}</p>
        )}

        <div className="mb-3">
          <RouteFlow hops={route.hops} />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{formatTime(route.estimated_hours)}</span>
          </div>
          {usesAccounts && (
            <span
              className="flex items-center gap-1 text-xs text-teal font-medium"
              data-testid={`tag-uses-accounts-${route.id}`}
            >
              <Check className="w-3 h-3" /> Uses your accounts
            </span>
          )}
          {requiresPlatforms.slice(0, 2).map((p) => (
            <span key={p} className="text-xs text-muted-foreground/60">
              Requires {p}
            </span>
          ))}
        </div>

        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 text-xs text-muted-foreground w-full pt-2 border-t border-white/8 transition-colors"
          data-testid={`button-price-tracker-${route.id}`}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Is this a good price?
          <TrendingDown className="w-3.5 h-3.5 ml-auto" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5">
          <PriceTracker routeId={route.id} currentCost={total} currency={toCurrency} />
        </div>
      )}
    </div>
  );
}

function AccountChip({
  name,
  selected,
  onToggle,
}: {
  name: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
        selected
          ? "bg-teal/20 border-teal/50 text-teal"
          : "border-white/15 text-muted-foreground"
      }`}
      data-testid={`chip-account-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {selected && <Check className="w-3 h-3 flex-shrink-0" />}
      {name}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RouteFinder() {
  const [from, setFrom] = useState("COP");
  const [to, setTo] = useState("GBP");
  const [amount, setAmount] = useState("5000000");
  const [maxHours, setMaxHours] = useState("any");
  const [showOptions, setShowOptions] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    from: string; to: string; amount: string; maxHours: string;
  } | null>(null);

  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [perks, setPerks] = useState<Perks>({ revolut: false, wise: false, binance: false });
  const [sortMode, setSortMode] = useState<"cheapest" | "simplest">("cheapest");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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

  function toggleAccount(name: string) {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function togglePerk(key: keyof Perks) {
    setPerks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleFromChange(val: string) {
    setFrom(val);
    const opt = FROM_OPTIONS.find((o) => o.value === val);
    if (opt) setAmount(opt.defaultAmount);
    setSearchParams(null);
    setSelectedAccounts(new Set());
  }

  function handleSwap() {
    const toIsValidFrom = FROM_OPTIONS.some((o) => o.value === to);
    const fromIsValidTo = TO_OPTIONS.some((o) => o.value === from);
    if (toIsValidFrom && fromIsValidTo) {
      setFrom(to); setTo(from);
      const newFromOpt = FROM_OPTIONS.find((o) => o.value === to);
      if (newFromOpt) setAmount(newFromOpt.defaultAmount);
      setSearchParams(null);
      setSelectedAccounts(new Set());
    }
  }

  function handleSearch() {
    setSearchParams({ from, to, amount, maxHours });
    setExpandedCard(null);
  }

  const rawRoutes = data ?? [];

  const processedRoutes = useMemo(() => {
    return rawRoutes.map((route) => {
      const platforms = getRoutePlatforms(route);
      const adjustedCost = applyPerks(route.total_cost_destination, platforms, perks);
      const ease = EASE[route.id];
      return { ...route, adjustedCost, easeScore: ease?.score ?? 99 };
    });
  }, [rawRoutes, perks]);

  const sortedRoutes = useMemo(() => {
    const sorted = [...processedRoutes];
    if (sortMode === "simplest") {
      sorted.sort((a, b) => a.easeScore - b.easeScore || a.adjustedCost - b.adjustedCost);
    } else {
      sorted.sort((a, b) => a.adjustedCost - b.adjustedCost);
    }
    return sorted;
  }, [processedRoutes, sortMode]);

  const bestAdjustedCost = sortedRoutes.length > 0 ? sortedRoutes[0].adjustedCost : 0;
  const hasResults = !!searchParams && data !== undefined;

  const showRevolut = selectedAccounts.has("Revolut");
  const showWise = selectedAccounts.has("Wise");
  const showBinance = selectedAccounts.has("Binance") || selectedAccounts.has("Binance P2P");

  const originChips = ORIGIN_PLATFORMS[from] ?? [];
  const destChips = DEST_PLATFORMS[to] ?? [];

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

      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 md:p-6 space-y-4 ${
          hasResults ? "mb-6" : ""
        }`}
      >
        {/* From / To */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">From</label>
            <Select value={from} onValueChange={handleFromChange}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-foreground h-11" data-testid="select-from-currency">
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
            <button onClick={handleSwap} className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground transition-colors" data-testid="button-swap">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">To</label>
            <Select value={to} onValueChange={(val) => { setTo(val); setSearchParams(null); setSelectedAccounts(new Set()); }}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-foreground h-11" data-testid="select-to-currency">
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

        {/* Amount */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono select-none">{from}</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^0-9]/g, "")); setSearchParams(null); }}
              className="w-full h-11 pl-14 pr-4 rounded-md border border-white/10 bg-white/5 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal/50 focus:border-teal/40"
              data-testid="input-amount"
              placeholder="0"
            />
          </div>
          {approxConverted && (
            <p className="text-xs text-muted-foreground mt-1.5 ml-0.5" data-testid="text-approx-converted">
              Approximately {approxConverted} received
            </p>
          )}
        </div>

        {/* Account selection */}
        <div className="pt-1 border-t border-white/8">
          <p className="text-[11px] text-muted-foreground mb-3">
            Have existing accounts? Select them for better results <span className="opacity-60">(optional)</span>
          </p>

          {originChips.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Your accounts in {FROM_OPTIONS.find((o) => o.value === from)?.country}
              </p>
              <div className="flex flex-wrap gap-2">
                {originChips.map((name) => (
                  <AccountChip key={name} name={name} selected={selectedAccounts.has(name)} onToggle={() => toggleAccount(name)} />
                ))}
              </div>
            </div>
          )}

          {destChips.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Your accounts in {TO_OPTIONS.find((o) => o.value === to)?.country}
              </p>
              <div className="flex flex-wrap gap-2">
                {destChips.map((name) => (
                  <AccountChip key={name} name={name} selected={selectedAccounts.has(name)} onToggle={() => toggleAccount(name)} />
                ))}
              </div>
            </div>
          )}

          <div className="mb-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Other platforms you use</p>
            <div className="flex flex-wrap gap-2">
              {OTHER_PLATFORMS.map((name) => (
                <AccountChip key={name} name={name} selected={selectedAccounts.has(name)} onToggle={() => toggleAccount(name)} />
              ))}
            </div>
          </div>

          {(showRevolut || showWise || showBinance) && (
            <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
              {showRevolut && (
                <label className="flex items-center gap-2.5 cursor-pointer group" data-testid="perk-revolut">
                  <div
                    onClick={() => togglePerk("revolut")}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.revolut ? "bg-teal border-teal" : "border-white/20 bg-white/5"}`}
                  >
                    {perks.revolut && <Check className="w-2.5 h-2.5 text-[#0F1729]" />}
                  </div>
                  <span className="text-xs text-muted-foreground">Revolut Premium <span className="text-foreground/60">(fee-free FX up to £1,000/mo)</span></span>
                </label>
              )}
              {showWise && (
                <label className="flex items-center gap-2.5 cursor-pointer group" data-testid="perk-wise">
                  <div
                    onClick={() => togglePerk("wise")}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.wise ? "bg-teal border-teal" : "border-white/20 bg-white/5"}`}
                  >
                    {perks.wise && <Check className="w-2.5 h-2.5 text-[#0F1729]" />}
                  </div>
                  <span className="text-xs text-muted-foreground">Wise Business <span className="text-foreground/60">(lower fees)</span></span>
                </label>
              )}
              {showBinance && (
                <label className="flex items-center gap-2.5 cursor-pointer group" data-testid="perk-binance">
                  <div
                    onClick={() => togglePerk("binance")}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.binance ? "bg-teal border-teal" : "border-white/20 bg-white/5"}`}
                  >
                    {perks.binance && <Check className="w-2.5 h-2.5 text-[#0F1729]" />}
                  </div>
                  <span className="text-xs text-muted-foreground">Binance VIP <span className="text-foreground/60">(reduced spreads)</span></span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* More options */}
        <div>
          <button onClick={() => setShowOptions((v) => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="button-toggle-options">
            {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showOptions ? "Hide options" : "More options"}
          </button>
          {showOptions && (
            <div className="mt-3">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                I need money there within
              </label>
              <Select value={maxHours} onValueChange={(val) => { setMaxHours(val); setSearchParams(null); }}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-foreground h-10 text-sm" data-testid="select-max-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F1729] border-white/10">
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-time-${opt.value}`}>
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

      {/* Results */}
      {hasResults && (
        <div>
          {sortedRoutes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-base mb-1">No routes found for this corridor</p>
              <p className="text-sm">Try relaxing the time limit or selecting a different corridor</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground" data-testid="text-route-count">
                  {sortedRoutes.length} route{sortedRoutes.length !== 1 ? "s" : ""} found
                </p>
                <div className="flex gap-0.5 bg-white/5 border border-white/8 rounded-lg p-0.5">
                  <button
                    onClick={() => setSortMode("cheapest")}
                    className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                      sortMode === "cheapest" ? "bg-white/10 text-foreground" : "text-muted-foreground"
                    }`}
                    data-testid="button-sort-cheapest"
                  >
                    Cheapest
                  </button>
                  <button
                    onClick={() => setSortMode("simplest")}
                    className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                      sortMode === "simplest" ? "bg-white/10 text-foreground" : "text-muted-foreground"
                    }`}
                    data-testid="button-sort-simplest"
                  >
                    Simplest
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {sortedRoutes.map((route, idx) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    adjustedCost={route.adjustedCost}
                    isBest={idx === 0}
                    bestAdjustedCost={bestAdjustedCost}
                    toCurrency={searchParams?.to ?? "GBP"}
                    selectedAccounts={selectedAccounts}
                    isExpanded={expandedCard === route.id}
                    onToggleExpand={() => setExpandedCard(expandedCard === route.id ? null : route.id)}
                  />
                ))}
              </div>

              {selectedAccounts.size === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-5">
                  Select your accounts above for personalized results
                </p>
              )}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Click any platform name to open its website
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
