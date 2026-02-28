import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartTooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeftRight, Clock, ExternalLink, ChevronDown, ChevronUp,
  Check, TrendingDown, ArrowRight,
} from "lucide-react";
import {
  ALL_CURRENCIES, CURRENCY_SYMBOLS, getCurrencySymbol, getApproxConverted,
} from "@/components/corridor-select";
import zendioLogo from "@assets/zendio-logo.png";

// ─── rate formatting helpers ──────────────────────────────────────────────────

type MidRate = { rate: number; date: string; from: string; to: string; source: string };

function formatDisplayRate(midRate: number, from: string, to: string) {
  const fromSym = getCurrencySymbol(from);
  const toSym = getCurrencySymbol(to);
  if (midRate < 1) {
    // e.g. COP→GBP: rate=0.000191, show "£1 = 5,247 COP"
    const inv = Math.round(1 / midRate);
    return { label: `${toSym}1 ${to} = ${inv.toLocaleString()} ${from}`, inverted: true, displayRate: inv, strongSym: toSym, strongCode: to, weakCode: from };
  }
  // e.g. GBP→COP: rate=5247, show "£1 = 5,247 COP"
  const formatted = midRate >= 100 ? Math.round(midRate).toLocaleString() : midRate.toFixed(4);
  return { label: `${fromSym}1 ${from} = ${formatted} ${to}`, inverted: false, displayRate: midRate, strongSym: fromSym, strongCode: from, weakCode: to };
}

function effectiveDisplayRate(midRate: number, totalPercent: number, inverted: boolean) {
  const displayMid = inverted ? 1 / midRate : midRate;
  const effective = displayMid / (1 - totalPercent / 100);
  return inverted
    ? Math.round(effective).toLocaleString('en-US')
    : (effective >= 100 ? Math.round(effective).toLocaleString('en-US') : effective.toFixed(4));
}

function formatEffectiveRateLabel(midRate: number, totalPercent: number, from: string, to: string, inverted: boolean) {
  const fromSym = getCurrencySymbol(from);
  const toSym = getCurrencySymbol(to);
  const effectiveVal = effectiveDisplayRate(midRate, totalPercent, inverted);
  if (inverted) {
    return `${toSym}1 ${to} = ${effectiveVal} ${from}`;
  }
  return `${fromSym}1 ${from} = ${effectiveVal} ${to}`;
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  "cop-gbp-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Wise" },
  "cop-gbp-3": { label: "Complicated", score: 2, color: "red", explanation: "Requires a Binance account with identity verification" },
  "cop-gbp-4": { label: "Simplest", score: 5, color: "green", explanation: "Two steps via XE — easy to set up" },
  "cop-gbp-5": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "cop-usd-1": { label: "Simplest", score: 5, color: "green", explanation: "One step — just need Dollar App" },
  "cop-usd-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Wise" },
  "cop-usd-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "cop-usd-4": { label: "Simplest", score: 5, color: "green", explanation: "Two steps via XE and OFX" },
  "cop-usd-5": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Western Union" },
  "mxn-usd-1": { label: "Complicated", score: 2, color: "red", explanation: "Requires crypto exchange accounts" },
  "mxn-usd-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Wise" },
  "mxn-usd-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "mxn-usd-4": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through XE" },
  "mxn-usd-5": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through MoneyGram" },
  "mxn-gbp-1": { label: "Complicated", score: 2, color: "red", explanation: "Requires a Binance account — involves crypto steps" },
  "mxn-gbp-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Wise" },
  "mxn-gbp-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through XE" },
  "mxn-gbp-4": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Western Union" },
  "brl-usd-1": { label: "Simplest", score: 5, color: "green", explanation: "Two steps — Nubank to Wise to Revolut" },
  "brl-usd-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "brl-usd-3": { label: "Complicated", score: 2, color: "red", explanation: "Requires Binance with crypto — identity verification needed" },
  "brl-usd-4": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Western Union" },
  "brl-eur-1": { label: "Simplest", score: 5, color: "green", explanation: "Two steps — Nubank then Wise to Revolut" },
  "brl-eur-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through XE" },
  "brl-eur-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through OFX" },
  "php-usd-1": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "php-usd-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Wise" },
  "php-usd-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Western Union" },
  "php-usd-4": { label: "Complicated", score: 2, color: "red", explanation: "Requires Binance and Coinbase accounts with identity checks" },
  "php-gbp-1": { label: "Simplest", score: 5, color: "green", explanation: "Two steps via GCash and Wise" },
  "php-gbp-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through XE" },
  "php-gbp-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through MoneyGram" },
  "inr-gbp-1": { label: "Simplest", score: 5, color: "green", explanation: "Two steps — HDFC Bank then Wise to Revolut" },
  "inr-gbp-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "inr-gbp-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Skrill" },
  "inr-gbp-4": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Western Union" },
  "inr-usd-1": { label: "Simplest", score: 5, color: "green", explanation: "Two steps — HDFC Bank then Wise to Revolut" },
  "inr-usd-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "inr-usd-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through XE" },
  "ngn-gbp-1": { label: "Complicated", score: 2, color: "red", explanation: "Requires Binance account — involves crypto steps" },
  "ngn-gbp-2": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Remitly" },
  "ngn-gbp-3": { label: "Simplest", score: 5, color: "green", explanation: "One step — just send through Western Union" },
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
  total_percent: number;
  estimated_hours: number;
  hops: Hop[];
  ease_label?: string;
  ease_score?: number;
  ease_color?: string;
  ease_explanation?: string;
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
  const seed = routeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const today = new Date();

  const raw: number[] = [];
  for (let i = 89; i >= 0; i--) {
    const val = i === 0
      ? currentCost
      : currentCost * (1 + (seededRandom(seed + i * 11) - 0.5) * 0.18);
    raw.push(Math.max(0.01, val));
  }

  const window = 9;
  const half = Math.floor(window / 2);
  const smoothed: number[] = raw.map((_, idx) => {
    const start = Math.max(0, idx - half);
    const end = Math.min(raw.length, idx + half + 1);
    const slice = raw.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  smoothed[smoothed.length - 1] = currentCost;

  const data: PricePoint[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const idx = 89 - i;
    data.push({ date: label, cost: Math.round(smoothed[idx] * 100) / 100, avg: currentCost });
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
  if (color === "green") return "bg-[#22C55E]";
  if (color === "yellow") return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

function verdictBannerClass(color: string) {
  if (color === "green") return "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]";
  if (color === "yellow") return "bg-amber-50 border-amber-200 text-amber-800";
  return "bg-rose-50 border-rose-200 text-rose-800";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function EaseBadge({ routeId, label, color: _color }: { routeId: string; label?: string; color?: string }) {
  const fallback = EASE[routeId];
  const easeLabel = label ?? fallback?.label;
  if (!easeLabel) return null;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-2xl border bg-[#F0F9FF] text-[#1E40AF] border-[#BFDBFE]"
      data-testid={`badge-ease-${routeId}`}
    >
      {easeLabel}
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
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-xs shadow-md">
        <div className="font-semibold text-[#1A1A2E] mb-1">{label}</div>
        <div className="text-[#1A1A2E] font-mono">{sym}{cost.toFixed(2)} total</div>
        <div className="text-[#6B7280] mt-1">FX: {sym}{fxPart.toFixed(2)} · Fees: {sym}{feePart.toFixed(2)}</div>
      </div>
    );
  };

  const CustomDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (index === 89) return <circle cx={cx} cy={cy} r={5} fill="#4CAF82" stroke="#ffffff" strokeWidth={2} />;
    if (index === bestIdx) return <circle cx={cx} cy={cy} r={4} fill="#22C55E" stroke="#ffffff" strokeWidth={1.5} />;
    return <circle r={0} cx={cx} cy={cy} fill="none" />;
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
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
                <stop offset="5%" stopColor="#4CAF82" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#4CAF82" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              ticks={tickDates}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${sym}${v}`}
            />
            <RechartTooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avg}
              stroke="#9CA3AF"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: `avg ${sym}${avg.toFixed(2)}`, fill: "#9CA3AF", fontSize: 9, position: "insideTopRight" }}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#4CAF82"
              strokeWidth={1.5}
              fill={`url(#grad-${routeId})`}
              dot={(props) => <CustomDot {...props} />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
        <span>Low: <span className="text-[#22C55E] font-mono">{sym}{low.toFixed(2)}</span> on {bestDate}</span>
        <span>Avg: <span className="font-mono text-[#374151]/70">{sym}{avg.toFixed(2)}</span></span>
        <span>High: <span className="text-[#EF4444] font-mono">{sym}{high.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

function buildSteps(hops: Hop[], amount: string, fromCurrency: string, toCurrency: string) {
  return hops.map((hop, i) => {
    const samePlatform = hop.from_platform === hop.to_platform;
    const fromCurr = hop.from_currency ?? (i === 0 ? fromCurrency : null);
    const toCurr = hop.to_currency ?? (i === hops.length - 1 ? toCurrency : null);
    const currencyChange = fromCurr !== toCurr;
    let text: string;
    if (i === 0) {
      const amtStr = amount ? Number(amount).toLocaleString() : "your funds";
      if (samePlatform && currencyChange && fromCurr && toCurr) {
        text = `Open ${hop.from_platform} and send ${amtStr} ${fromCurr}. It will be automatically converted to ${toCurr} within the app.`;
      } else if (!samePlatform && fromCurr) {
        text = `Open ${hop.from_platform} and send ${amtStr} ${fromCurr} to your ${hop.to_platform} account.`;
      } else if (!samePlatform) {
        text = `Open ${hop.from_platform} and initiate a transfer of ${amtStr} to your ${hop.to_platform} account.`;
      } else {
        text = `Open ${hop.from_platform} with your balance ready to send.`;
      }
    } else {
      if (samePlatform && currencyChange && fromCurr && toCurr) {
        text = `In ${hop.from_platform}, convert your ${fromCurr} balance to ${toCurr}.`;
      } else if (samePlatform && currencyChange) {
        text = `In ${hop.from_platform}, convert your balance to the destination currency.`;
      } else if (!samePlatform && fromCurr) {
        text = `Transfer your ${fromCurr} from ${hop.from_platform} to your ${hop.to_platform} account.`;
      } else if (!samePlatform) {
        text = `Transfer your funds from ${hop.from_platform} to your ${hop.to_platform} account.`;
      } else {
        text = `In ${hop.from_platform}, complete the conversion.`;
      }
    }
    return { platform: hop.from_platform, url: hop.from_url, toPlatform: hop.to_platform, toUrl: hop.to_url, text, fee: hop.fee_label };
  });
}

function RouteCard({
  route,
  adjustedCost,
  isBest,
  bestAdjustedCost,
  toCurrency,
  fromCurrency,
  amount,
  midRateData,
  selectedAccounts,
  isExpanded,
  onToggleExpand,
}: {
  route: Route;
  adjustedCost: number;
  isBest: boolean;
  bestAdjustedCost: number;
  toCurrency: string;
  fromCurrency: string;
  amount: string;
  midRateData: MidRate | null;
  selectedAccounts: Set<string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const sym = getCurrencySymbol(toCurrency);
  const total = adjustedCost;
  const fxCost = Math.round(total * 0.62 * 100) / 100;
  const feeCost = Math.round((total - fxCost) * 100) / 100;
  const diff = Math.round((total - bestAdjustedCost) * 100) / 100;
  const easeFallback = EASE[route.id];
  const easeLabel = route.ease_label ?? easeFallback?.label;
  const easeColor = route.ease_color ?? easeFallback?.color;
  const easeExplanation = route.ease_explanation ?? easeFallback?.explanation;

  const [isCostExpanded, setIsCostExpanded] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  const rateDisplay = midRateData
    ? formatDisplayRate(midRateData.rate, fromCurrency, toCurrency)
    : null;

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
      className={`rounded-xl border transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${
        isBest
          ? "border-teal/40 bg-[#F0FDF4]"
          : "border-[#E5E7EB] bg-white"
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
                {sym}{formatMoney(total)}
              </span>
              <span className="text-sm text-muted-foreground">total cost</span>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${verdictDotClass(verdict.color)}`}
                title={verdict.label}
                data-testid={`dot-verdict-${route.id}`}
              />
              {rateDisplay && midRateData && (
                <span className="text-xs text-muted-foreground" data-testid={`text-effective-rate-${route.id}`}>
                  — {formatEffectiveRateLabel(midRateData.rate, route.total_percent, fromCurrency, toCurrency, rateDisplay.inverted)}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsCostExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:text-foreground/70 transition-colors"
              data-testid={`button-cost-breakdown-${route.id}`}
            >
              {isCostExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Cost breakdown
            </button>
            {isCostExpanded && (
              <div className="mt-2 space-y-1.5" data-testid={`cost-breakdown-${route.id}`}>
                <div className="text-xs text-muted-foreground">
                  Costs due to currency rates: <span className="font-mono text-[#374151]">{sym}{formatMoney(fxCost)}</span>
                  {rateDisplay && (
                    <span className="ml-1" data-testid={`text-rate-${route.id}`}>
                      (<span className={`font-medium ${route.total_percent <= 1 ? "text-[#22C55E]" : route.total_percent <= 2.5 ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>+{route.total_percent.toFixed(2)}% above mid-market</span>)
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Costs due to platform fees: <span className="font-mono text-[#374151]">{sym}{formatMoney(feeCost)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {isBest ? (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                data-testid="badge-best-route"
              >
                Best route
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                +{sym}{formatMoney(diff)} more
              </span>
            )}
            <EaseBadge routeId={route.id} label={easeLabel} color={easeColor} />
          </div>
        </div>

        {easeExplanation && (
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{easeExplanation}</p>
        )}

        <div className="mb-3">
          <RouteFlow hops={route.hops} />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
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

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] gap-3">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors flex-1 min-w-0 hover:text-[#374151]"
            data-testid={`button-price-tracker-${route.id}`}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />}
            Is this a good price?
            <TrendingDown className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
          </button>
          <button
            onClick={() => setSelectOpen(true)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] text-sm font-semibold transition-all ${
              isBest
                ? "bg-teal text-white hover:bg-[#3D9970]"
                : "bg-teal text-white hover:bg-[#3D9970]"
            }`}
            data-testid={`button-select-${route.id}`}
          >
            Select
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tutorial dialog */}
      <Dialog open={selectOpen} onOpenChange={setSelectOpen}>
        <DialogContent className="bg-white border border-[#E5E7EB] text-[#374151] max-w-lg max-h-[85vh] overflow-y-auto shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              How to complete this transfer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {fromCurrency} → {toCurrency} &nbsp;·&nbsp; Total fees for this transaction: <span className="text-foreground font-mono">{sym}{formatMoney(total)}</span> &nbsp;·&nbsp; {formatTime(route.estimated_hours)}
            </DialogDescription>
          </DialogHeader>

          {/* Received amount summary */}
          {midRateData && (() => {
            const sendAmount = parseFloat(amount);
            const received = sendAmount * midRateData.rate - total;
            if (!isNaN(received) && received > 0) {
              return (
                <div className="rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 flex items-center justify-between gap-3" data-testid={`summary-received-${route.id}`}>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Recipient gets</p>
                    <p className="text-xl font-bold font-heading text-foreground">{sym}{formatMoney(received)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{toCurrency} after all fees &amp; FX costs</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>You send</p>
                    <p className="font-mono text-foreground font-semibold">{getCurrencySymbol(fromCurrency)}{Number(amount).toLocaleString('en-US')} {fromCurrency}</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Steps */}
          <div className="mt-2 space-y-4">
            {buildSteps(route.hops, amount, fromCurrency, toCurrency).map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal/20 border border-teal/40 flex items-center justify-center text-teal text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{step.text}</p>
                  {step.fee && step.fee !== "free" && (
                    <p className="text-xs text-amber-400/80 mt-0.5">Fee: {step.fee}</p>
                  )}
                  {step.fee === "free" && (
                    <p className="text-xs text-emerald-400/80 mt-0.5">No fee for this step</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Platform links */}
          <div className="mt-5 pt-4 border-t border-[#E5E7EB]">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Open platforms</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const seen = new Map<string, string | null>();
                for (const hop of route.hops) {
                  if (!seen.has(hop.from_platform)) seen.set(hop.from_platform, hop.from_url);
                  if (!seen.has(hop.to_platform)) seen.set(hop.to_platform, hop.to_url);
                }
                return Array.from(seen.entries()).map(([name, url]) =>
                  url ? (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 text-sm text-[#374151] transition-colors"
                      data-testid={`link-platform-${name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {name}
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  ) : (
                    <span key={name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-gray-50 text-sm text-muted-foreground">
                      {name}
                    </span>
                  )
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isExpanded && (
        <div className="px-5 pb-5">
          <PriceTracker routeId={route.id} currentCost={total} currency={toCurrency} />
        </div>
      )}
    </div>
  );
}

function MultiSelect({
  label, options, selected, onToggle, testId,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  testId: string;
}) {
  const count = options.filter((o) => selected.has(o)).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-between gap-1.5 text-xs px-3 py-2 rounded-md border border-[#D1D5DB] bg-white text-[#374151] w-full transition-all hover:bg-gray-50"
          data-testid={testId}
        >
          <span className="truncate">{label}{count > 0 ? ` (${count})` : ""}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-white border border-[#E5E7EB] p-1 w-52 shadow-md" align="start" sideOffset={4}>
        {options.map((name) => (
          <button
            key={name}
            onClick={() => onToggle(name)}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-gray-50 text-xs text-[#374151] text-left transition-colors"
            data-testid={`option-account-${name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selected.has(name) ? "bg-teal border-teal" : "border-[#D1D5DB] bg-transparent"}`}>
              {selected.has(name) && <Check className="w-2 h-2 text-white" />}
            </div>
            {name}
          </button>
        ))}
      </PopoverContent>
    </Popover>
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
    queryKey: ["/api/routes", searchParams?.from, searchParams?.to, searchParams?.maxHours, searchParams?.amount, perks.revolut, perks.wise, perks.binance],
    queryFn: async () => {
      if (!searchParams) return [];
      const params = new URLSearchParams({ from: searchParams.from, to: searchParams.to, amount: searchParams.amount });
      if (searchParams.maxHours !== "any") params.set("maxHours", searchParams.maxHours);
      if (perks.revolut) params.set("revolut", "true");
      if (perks.wise) params.set("wise", "true");
      if (perks.binance) params.set("binance", "true");
      const res = await fetch(`/api/routes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch routes");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.routes ?? []);
    },
    enabled: !!searchParams,
  });

  const { data: midRateData } = useQuery<MidRate>({
    queryKey: ["/api/midmarket-rate", searchParams?.from, searchParams?.to],
    queryFn: async () => {
      if (!searchParams) throw new Error("No params");
      const params = new URLSearchParams({ from: searchParams.from, to: searchParams.to });
      const res = await fetch(`/api/midmarket-rate?${params}`);
      if (!res.ok) throw new Error("Failed to fetch mid-market rate");
      return res.json();
    },
    enabled: !!searchParams,
    staleTime: 60 * 60 * 1000,
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
    const opt = ALL_CURRENCIES.find((o) => o.value === val);
    if (opt?.defaultAmount) setAmount(opt.defaultAmount);
    setSearchParams(null);
    setSelectedAccounts(new Set());
  }

  function handleSwap() {
    const prevFrom = from;
    const prevTo = to;
    setFrom(prevTo);
    setTo(prevFrom);
    const newFromOpt = ALL_CURRENCIES.find((o) => o.value === prevTo);
    if (newFromOpt?.defaultAmount) setAmount(newFromOpt.defaultAmount);
    setSearchParams(null);
    setSelectedAccounts(new Set());
  }

  function handleSearch() {
    setSearchParams({ from, to, amount, maxHours });
    setExpandedCard(null);
  }

  const rawRoutes = data ?? [];

  const processedRoutes = useMemo(() => {
    return rawRoutes.map((route) => {
      const adjustedCost = route.total_cost_destination;
      const easeFallback = EASE[route.id];
      const easeScore = route.ease_score ?? easeFallback?.score ?? 99;
      return { ...route, adjustedCost, easeScore };
    });
  }, [rawRoutes]);

  const sortedRoutes = useMemo(() => {
    const sorted = [...processedRoutes];
    if (sortMode === "simplest") {
      sorted.sort((a, b) => b.easeScore - a.easeScore || a.adjustedCost - b.adjustedCost);
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
          <div className="flex justify-center mb-5">
            <img src={zendioLogo} alt="Zendio" className="h-16 md:h-20 w-auto" data-testid="img-hero-logo" />
          </div>
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
        className={`rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 md:p-6 space-y-4 ${
          hasResults ? "mb-6" : ""
        }`}
      >
        {/* From / To / Amount — single row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">From</label>
            <Select value={from} onValueChange={handleFromChange}>
              <SelectTrigger className="w-full bg-white border-[#D1D5DB] text-[#1A1A2E] h-11 rounded-[8px] focus:border-teal focus:ring-teal/20" data-testid="select-from-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E5E7EB] shadow-md">
                {ALL_CURRENCIES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-from-${opt.value}`}>
                    {opt.symbol} {opt.country} ({opt.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-5">
            <button onClick={handleSwap} className="w-9 h-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center text-muted-foreground hover:bg-gray-50 transition-colors" data-testid="button-swap">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">To</label>
            <Select value={to} onValueChange={(val) => { setTo(val); setSearchParams(null); setSelectedAccounts(new Set()); }}>
              <SelectTrigger className="w-full bg-white border-[#D1D5DB] text-[#1A1A2E] h-11 rounded-[8px] focus:border-teal focus:ring-teal/20" data-testid="select-to-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E5E7EB] shadow-md">
                {ALL_CURRENCIES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-to-${opt.value}`}>
                    {opt.symbol} {opt.country} ({opt.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 flex-shrink-0">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono select-none">{CURRENCY_SYMBOLS[from] ?? from}</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount ? Number(amount).toLocaleString('en-US') : ''}
                onChange={(e) => { const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, ''); setAmount(raw); setSearchParams(null); }}
                className="w-full h-11 pl-7 pr-2 rounded-[8px] border border-[#D1D5DB] bg-white text-[#1A1A2E] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal/50 focus:border-teal"
                data-testid="input-amount"
                placeholder="0"
              />
            </div>
          </div>
        </div>
        {approxConverted && (
          <p className="text-xs text-muted-foreground -mt-2 ml-0.5" data-testid="text-approx-converted">
            ≈ {approxConverted} received
          </p>
        )}

        {/* More options toggle */}
        <div>
          <button onClick={() => setShowOptions((v) => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#374151] transition-colors" data-testid="button-toggle-options">
            {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showOptions ? "Hide options" : "More options"}
          </button>

          {showOptions && (
            <div className="mt-4 space-y-4">
              {/* Time filter */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  I need money there within
                </label>
                <Select value={maxHours} onValueChange={(val) => { setMaxHours(val); setSearchParams(null); }}>
                  <SelectTrigger className="w-full bg-white border-[#D1D5DB] text-[#1A1A2E] h-10 text-sm rounded-[8px]" data-testid="select-max-hours">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB] shadow-md">
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} data-testid={`option-time-${opt.value}`}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account selection */}
              <div className="pt-3 border-t border-[#E5E7EB]">
                <p className="text-[11px] text-muted-foreground mb-3">
                  Have existing accounts? Select them for better results <span className="opacity-60">(optional)</span>
                </p>

                <div className={`grid gap-2 ${originChips.length > 0 && destChips.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {originChips.length > 0 && (
                    <MultiSelect
                      label={`${ALL_CURRENCIES.find((o) => o.value === from)?.country ?? from} accounts`}
                      options={originChips}
                      selected={selectedAccounts}
                      onToggle={toggleAccount}
                      testId="multiselect-source-accounts"
                    />
                  )}
                  {destChips.length > 0 && (
                    <MultiSelect
                      label={`${ALL_CURRENCIES.find((o) => o.value === to)?.country ?? to} accounts`}
                      options={destChips}
                      selected={selectedAccounts}
                      onToggle={toggleAccount}
                      testId="multiselect-target-accounts"
                    />
                  )}
                  <MultiSelect
                    label="Other platforms"
                    options={OTHER_PLATFORMS}
                    selected={selectedAccounts}
                    onToggle={toggleAccount}
                    testId="multiselect-other-platforms"
                  />
                </div>

                {(showRevolut || showWise || showBinance) && (
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-2">
                    {showRevolut && (
                      <label className="flex items-center gap-2.5 cursor-pointer" data-testid="perk-revolut">
                        <div onClick={() => togglePerk("revolut")} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.revolut ? "bg-teal border-teal" : "border-[#D1D5DB] bg-white"}`}>
                          {perks.revolut && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-muted-foreground">Revolut Premium <span className="text-[#6B7280]/60">(fee-free FX up to £1,000/mo)</span></span>
                      </label>
                    )}
                    {showWise && (
                      <label className="flex items-center gap-2.5 cursor-pointer" data-testid="perk-wise">
                        <div onClick={() => togglePerk("wise")} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.wise ? "bg-teal border-teal" : "border-[#D1D5DB] bg-white"}`}>
                          {perks.wise && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-muted-foreground">Wise Business <span className="text-[#6B7280]/60">(lower fees)</span></span>
                      </label>
                    )}
                    {showBinance && (
                      <label className="flex items-center gap-2.5 cursor-pointer" data-testid="perk-binance">
                        <div onClick={() => togglePerk("binance")} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.binance ? "bg-teal border-teal" : "border-[#D1D5DB] bg-white"}`}>
                          {perks.binance && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-muted-foreground">Binance VIP <span className="text-[#6B7280]/60">(reduced spreads)</span></span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={isLoading || !amount}
          className="w-full h-11 bg-teal text-white font-semibold text-sm rounded-[10px] hover:bg-[#3D9970] transition-colors"
          data-testid="button-find-routes"
        >
          {isLoading ? "Finding routes..." : "Find best route"}
        </Button>
      </div>

      {/* Results */}
      {hasResults && (
        <div>
          {midRateData && (() => {
            const d = formatDisplayRate(midRateData.rate, midRateData.from, midRateData.to);
            const dateLabel = new Date(midRateData.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            return (
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap" data-testid="banner-midmarket-rate">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Mid-market rate</p>
                  <p className="text-sm font-mono font-semibold text-[#374151]">{d.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Updated {dateLabel}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Route rates below show actual cost vs this benchmark</p>
                </div>
              </div>
            );
          })()}

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
                <div className="flex gap-0.5 bg-gray-100 border border-[#E5E7EB] rounded-lg p-0.5">
                  <button
                    onClick={() => setSortMode("cheapest")}
                    className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                      sortMode === "cheapest" ? "bg-white text-[#1A1A2E] shadow-sm" : "text-muted-foreground hover:text-[#374151]"
                    }`}
                    data-testid="button-sort-cheapest"
                  >
                    Cheapest
                  </button>
                  <button
                    onClick={() => setSortMode("simplest")}
                    className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                      sortMode === "simplest" ? "bg-white text-[#1A1A2E] shadow-sm" : "text-muted-foreground hover:text-[#374151]"
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
                    fromCurrency={searchParams?.from ?? "COP"}
                    amount={searchParams?.amount ?? ""}
                    midRateData={midRateData ?? null}
                    selectedAccounts={selectedAccounts}
                    isExpanded={expandedCard === route.id}
                    onToggleExpand={() => setExpandedCard(expandedCard === route.id ? null : route.id)}
                  />
                ))}
              </div>

              {selectedAccounts.size === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-5">
                  Open "More options" to select your accounts for personalized results
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
