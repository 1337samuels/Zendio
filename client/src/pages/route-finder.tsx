import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeftRight, 
  Clock, 
  ExternalLink, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  TrendingDown, 
  TrendingUp,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── constants ───────────────────────────────────────────────────────────────

const ALL_CURRENCIES = [
  { value: "COP", label: "Colombian Peso", currency: "COP", symbol: "$", country: "Colombia" },
  { value: "GBP", label: "British Pound", currency: "GBP", symbol: "£", country: "United Kingdom" },
  { value: "USD", label: "US Dollar", currency: "USD", symbol: "$", country: "United States" },
  { value: "EUR", label: "Euro", currency: "EUR", symbol: "€", country: "Europe" },
  { value: "BRL", label: "Brazilian Real", currency: "BRL", symbol: "R$", country: "Brazil" },
  { value: "MXN", label: "Mexican Peso", currency: "MXN", symbol: "$", country: "Mexico" },
  { value: "PHP", label: "Philippine Peso", currency: "PHP", symbol: "₱", country: "Philippines" },
  { value: "INR", label: "Indian Rupee", currency: "INR", symbol: "₹", country: "India" },
  { value: "NGN", label: "Nigerian Naira", currency: "NGN", symbol: "₦", country: "Nigeria" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  COP: "$", GBP: "£", USD: "$", EUR: "€", BRL: "R$", MXN: "$", PHP: "₱", INR: "₹", NGN: "₦"
};

const TIME_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "1", label: "Within 1 hour" },
  { value: "24", label: "Within 24 hours" },
  { value: "72", label: "Within 3 days" },
];

const ORIGIN_PLATFORMS: Record<string, string[]> = {
  COP: ["Bancolombia", "Daviplata", "Nequi"],
  GBP: ["HSBC UK", "Barclays", "Monzo", "Revolut", "Lloyds"],
  USD: ["Chase", "Bank of America", "Wells Fargo", "Revolut"],
  BRL: ["Nubank", "Itaú", "Bradesco"],
  MXN: ["BBVA México", "Banamex", "Santander México"],
  PHP: ["GCash", "BDO", "BPI", "Maya"],
  INR: ["HDFC Bank", "ICICI Bank", "SBI"],
  NGN: ["Access Bank", "Zenith Bank", "GTBank"],
};

const DEST_PLATFORMS: Record<string, string[]> = {
  GBP: ["UK Bank Account", "Revolut", "Monzo", "Wise"],
  USD: ["US Bank Account", "Revolut", "Wise", "Coinbase"],
  EUR: ["EU Bank Account", "Revolut", "Wise"],
};

const OTHER_PLATFORMS = ["Wise", "Revolut", "Binance", "Binance P2P", "Western Union", "MoneyGram", "Remitly"];

const EASE: Record<string, { label: string; score: number; color: string; explanation: string }> = {
  "cop-gbp-1": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "cop-gbp-2": { label: "Involved", score: 4, color: "red", explanation: "Requires Binance account — involves crypto steps" },
  "cop-gbp-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through WorldRemit" },
  "cop-gbp-4": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
  "cop-gbp-5": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through MoneyGram" },
  "cop-usd-1": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Remitly" },
  "cop-usd-2": { label: "Involved", score: 4, color: "red", explanation: "Requires Binance P2P — involves crypto steps" },
  "cop-usd-3": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through WorldRemit" },
  "cop-usd-4": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through Western Union" },
  "cop-usd-5": { label: "Simple", score: 1, color: "green", explanation: "One step — just send through MoneyGram" },
  "mxn-usd-1": { label: "Straightforward", score: 2, color: "lime", explanation: "Two steps — BBVA to Wise to Revolut" },
  "mxn-usd-2": { label: "Involved", score: 4, color: "red", explanation: "Requires Binance P2P — identity verification needed" },
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
  total_percent: number;
  estimated_hours: number;
  hops: Hop[];
};

type PricePoint = {
  date: string;
  cost: number;
  avg: number;
};

type MidRate = {
  rate: number;
  date: string;
  from: string;
  to: string;
  source: string;
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
  if (color === "green") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (color === "yellow") return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-rose-50 border-rose-200 text-rose-700";
}

function getCurrencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] || code;
}

function formatDisplayRate(rate: number, from: string, to: string) {
  if (rate < 1) {
    const inv = 1 / rate;
    return {
      label: `${getCurrencySymbol(to)}1 = ${getCurrencySymbol(from)}${inv.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      inverted: true,
      displayRate: inv,
      strongSym: getCurrencySymbol(to),
      strongCode: to,
      weakCode: from,
    };
  }
  return {
    label: `${getCurrencySymbol(from)}1 = ${getCurrencySymbol(to)}${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
    inverted: false,
    displayRate: rate,
    strongSym: getCurrencySymbol(from),
    strongCode: from,
    weakCode: to,
  };
}

function getApproxConverted(amount: string, from: string, to: string) {
  const num = parseFloat(amount);
  if (isNaN(num)) return null;
  const rate = 1; // placeholder for direct logic
  const sym = getCurrencySymbol(to);
  return `${sym}${(num * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function EaseBadge({ routeId }: { routeId: string }) {
  const ease = EASE[routeId];
  if (!ease) return null;
  const classes: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lime: "bg-lime-50 text-lime-700 border-lime-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
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
  const deduped: string[] = [];
  hops.forEach((h) => {
    if (deduped[deduped.length - 1] !== h.from_platform) deduped.push(h.from_platform);
    if (deduped[deduped.length - 1] !== h.to_platform) deduped.push(h.to_platform);
  });

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {deduped.map((p, i) => (
        <span key={i} className="flex items-center gap-2">
          <PlatformLink name={p} url={hops.find((h) => h.from_platform === p || h.to_platform === p)?.from_url ?? null} />
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
      <div className="bg-white border border-[#D5E8DA] rounded-lg p-3 text-xs shadow-lg">
        <div className="font-semibold text-foreground mb-1">{label}</div>
        <div className="text-foreground font-mono">{sym}{cost.toFixed(2)} total</div>
        <div className="text-muted-foreground mt-1">FX: {sym}{fxPart.toFixed(2)} · Fees: {sym}{feePart.toFixed(2)}</div>
      </div>
    );
  };

  const CustomDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (index === 89) return <circle cx={cx} cy={cy} r={5} fill="#0D7A49" stroke="#ffffff" strokeWidth={2} />;
    if (index === bestIdx) return <circle cx={cx} cy={cy} r={4} fill="#34d399" stroke="#ffffff" strokeWidth={1.5} />;
    return <circle r={0} cx={cx} cy={cy} fill="none" />;
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#D5E8DA]">
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
                <stop offset="5%" stopColor="#0D7A49" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0D7A49" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              ticks={tickDates}
              tick={{ fill: "#5A7A65", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#5A7A65", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${sym}${v}`}
            />
            <RechartTooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avg}
              stroke="#9BB5A2"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: `avg ${sym}${avg.toFixed(2)}`, fill: "#5A7A65", fontSize: 9, position: "insideTopRight" }}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#0D7A49"
              strokeWidth={2}
              fill={`url(#grad-${routeId})`}
              dot={(props) => <CustomDot {...props} />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
        <span>Low: <span className="text-emerald-600 font-mono font-bold">{sym}{low.toFixed(2)}</span> on {bestDate}</span>
        <span>Avg: <span className="font-mono text-foreground/70">{sym}{avg.toFixed(2)}</span></span>
        <span>High: <span className="text-rose-600 font-mono">{sym}{high.toFixed(2)}</span></span>
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
  fromCurrency,
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
  const ease = EASE[route.id];

  const [isCostExpanded, setIsCostExpanded] = useState(false);

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
      className={`rounded-xl border transition-all duration-200 ${
        isBest
          ? "border-[#7DCCA5] bg-[#F0FAF5] shadow-[0_4px_20px_rgba(13,122,73,0.12)]"
          : "border-[#D5E8DA] bg-white shadow-sm hover:border-[#7DCCA5]/50"
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
                  Costs due to currency rates: <span className="font-mono text-foreground/80">{sym}{fxCost.toFixed(2)}</span>
                  {rateDisplay && (
                    <span className="ml-1" data-testid={`text-rate-${route.id}`}>
                      (<span className={`font-bold ${route.total_percent <= 1 ? "text-emerald-600" : route.total_percent <= 2.5 ? "text-amber-600" : "text-rose-600"}`}>+{route.total_percent.toFixed(2)}% above mid-market</span>)
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Costs due to platform fees: <span className="font-mono text-foreground/80">{sym}{feeCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {isBest ? (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#D8F0E5] text-[#0A6A3C] border border-[#7DCCA5]"
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
              className="flex items-center gap-1 text-xs text-[#0D7A49] font-bold"
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
          className="flex items-center gap-1.5 text-xs font-bold text-[#0D7A49] w-full pt-3 border-t border-[#D5E8DA] hover:text-[#0A6A3C] transition-colors"
          data-testid={`button-price-tracker-${route.id}`}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Is this a good price?
          <TrendingDown className="w-3.5 h-3.5 ml-auto opacity-70" />
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
          ? "bg-[#D8F0E5] border-[#7DCCA5] text-[#0A6A3C]"
          : "border-[#D5E8DA] bg-white text-muted-foreground hover:border-[#7DCCA5]"
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
  const [customAccount, setCustomAccount] = useState("");

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
  });

  const { data: midRateData } = useQuery<MidRate>({
    queryKey: ["/api/midmarket-rate", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/midmarket-rate?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to fetch mid-market rate");
      return res.json();
    },
  });

  const toggleAccount = (name: string) => {
    const next = new Set(selectedAccounts);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedAccounts(next);
  };

  const togglePerk = (p: keyof Perks) => {
    setPerks((prev) => ({ ...prev, [p]: !prev[p] }));
  };

  const handleSearch = () => {
    if (!amount) return;
    setSearchParams({ from, to, amount, maxHours });
    setExpandedCard(null);
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
    setSearchParams(null);
  };

  const handleFromChange = (val: string) => {
    setFrom(val);
    setSearchParams(null);
    setSelectedAccounts(new Set());
  };

  const processedRoutes = useMemo(() => {
    if (!data) return [];
    return data.map((r) => {
      const platforms = getRoutePlatforms(r);
      const cost = applyPerks(r.total_cost_destination, platforms, perks);
      return { ...r, adjustedCost: cost };
    });
  }, [data, perks]);

  const sortedRoutes = useMemo(() => {
    const arr = [...processedRoutes];
    if (sortMode === "cheapest") return arr.sort((a, b) => a.adjustedCost - b.adjustedCost);
    return arr.sort((a, b) => {
      const easeA = EASE[a.id]?.score ?? 3;
      const easeB = EASE[b.id]?.score ?? 3;
      if (easeA !== easeB) return easeA - easeB;
      return a.adjustedCost - b.adjustedCost;
    });
  }, [processedRoutes, sortMode]);

  const bestAdjustedCost = sortedRoutes[0]?.adjustedCost ?? 0;
  const hasResults = !!searchParams && !isLoading;

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
        className={`rounded-xl border border-[#D5E8DA] bg-[#F0FAF5] p-4 shadow-md max-w-5xl mx-auto ${
          hasResults ? "mb-8" : "mb-4"
        }`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">From</label>
            <Select value={from} onValueChange={handleFromChange}>
              <SelectTrigger className="w-full bg-white border-[#D5E8DA] text-foreground h-10 px-3 shadow-sm" data-testid="select-from-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D5E8DA]">
                {ALL_CURRENCIES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-from-${opt.value}`}>
                    {opt.symbol} {opt.country} ({opt.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pb-1 flex-shrink-0 flex items-center justify-center">
            <button 
              onClick={handleSwap} 
              className="w-8 h-8 rounded-full border border-[#D5E8DA] bg-white flex items-center justify-center text-muted-foreground hover:text-[#0D7A49] transition-all shadow-sm" 
              data-testid="button-swap"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">To</label>
            <Select value={to} onValueChange={(val) => { setTo(val); setSearchParams(null); setSelectedAccounts(new Set()); }}>
              <SelectTrigger className="w-full bg-white border-[#D5E8DA] text-foreground h-10 px-3 shadow-sm" data-testid="select-to-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D5E8DA]">
                {ALL_CURRENCIES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-to-${opt.value}`}>
                    {opt.symbol} {opt.country} ({opt.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-[0.7] min-w-[100px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">Amount</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground select-none">{CURRENCY_SYMBOLS[from] ?? from}</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => { setAmount(e.target.value.replace(/[^0-9]/g, "")); setSearchParams(null); }}
                className="w-full h-10 pl-7 pr-3 rounded-md border border-[#D5E8DA] bg-white text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0D7A49]/20 shadow-sm"
                data-testid="input-amount"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button
              onClick={handleSearch}
              disabled={isLoading || !amount}
              className="h-10 px-6 bg-[#0D7A49] hover:bg-[#0A6A3C] text-white font-bold text-sm rounded-md flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
              data-testid="button-find-routes"
            >
              {isLoading ? "..." : (
                <>
                  Find best route <span className="text-base">🔍</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-2 px-1 md:hidden">
        <Button
          onClick={handleSearch}
          disabled={isLoading || !amount}
          className="w-full h-12 bg-[#0D7A49] hover:bg-[#0A6A3C] text-white font-bold text-base rounded-lg flex items-center justify-center gap-2 shadow-md"
          data-testid="button-find-routes-mobile"
        >
          {isLoading ? "..." : (
            <>
              Find best route <span className="text-xl">🔍</span>
            </>
          )}
        </Button>
      </div>

      {/* More options toggle */}
      <div className="max-w-5xl mx-auto flex justify-end mb-8 mt-2 md:mt-0">
        <button onClick={() => setShowOptions((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-[#0D7A49] hover:underline transition-all" data-testid="button-toggle-options">
          {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showOptions ? "Fewer options" : "More options"}
        </button>
      </div>

      {showOptions && (
        <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white rounded-xl border border-[#D5E8DA] p-6 shadow-sm space-y-4">
            {/* Time filter */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Maximum transfer time
              </label>
              <Select value={maxHours} onValueChange={(val) => { setMaxHours(val); setSearchParams(null); }}>
                <SelectTrigger className="w-full bg-background border-[#D5E8DA] h-10 text-sm" data-testid="select-max-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D5E8DA]">
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-time-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account selection */}
            <div className="pt-4 border-t border-[#D5E8DA]">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Your existing accounts <span className="font-normal lowercase opacity-60">(optional)</span>
              </p>

                {originChips.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Your accounts in {ALL_CURRENCIES.find((o) => o.value === from)?.country}
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
                      Your accounts in {ALL_CURRENCIES.find((o) => o.value === to)?.country}
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

                {/* Custom platform input */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-shrink-0">Other:</span>
                  <input
                    type="text"
                    value={customAccount}
                    onChange={(e) => setCustomAccount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customAccount.trim()) {
                        toggleAccount(customAccount.trim());
                        setCustomAccount("");
                      }
                    }}
                    placeholder="Type a platform name and press Enter"
                    className="flex-1 text-xs bg-transparent border-b border-[#D5E8DA] focus:outline-none focus:border-[#0D7A49] text-foreground placeholder:text-muted-foreground/50 py-1"
                    data-testid="input-custom-account"
                  />
                </div>

                {/* Selected custom accounts (not in the predefined lists) */}
                {(() => {
                  const predefined = new Set([...originChips, ...destChips, ...OTHER_PLATFORMS]);
                  const customs = Array.from(selectedAccounts).filter((a) => !predefined.has(a));
                  return customs.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customs.map((name) => (
                        <AccountChip key={name} name={name} selected={true} onToggle={() => toggleAccount(name)} />
                      ))}
                    </div>
                  ) : null;
                })()}

                {(showRevolut || showWise || showBinance) && (
                  <div className="mt-3 pt-3 border-t border-[#D5E8DA] space-y-2">
                    {showRevolut && (
                      <label className="flex items-center gap-2.5 cursor-pointer" data-testid="perk-revolut">
                        <div onClick={() => togglePerk("revolut")} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.revolut ? "bg-[#0D7A49] border-[#0D7A49]" : "border-[#D5E8DA] bg-white"}`}>
                          {perks.revolut && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-muted-foreground">Revolut Premium <span className="text-foreground/60">(fee-free FX up to £1,000/mo)</span></span>
                      </label>
                    )}
                    {showWise && (
                      <label className="flex items-center gap-2.5 cursor-pointer" data-testid="perk-wise">
                        <div onClick={() => togglePerk("wise")} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.wise ? "bg-[#0D7A49] border-[#0D7A49]" : "border-[#D5E8DA] bg-white"}`}>
                          {perks.wise && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-muted-foreground">Wise Business <span className="text-foreground/60">(lower fees)</span></span>
                      </label>
                    )}
                    {showBinance && (
                      <label className="flex items-center gap-2.5 cursor-pointer" data-testid="perk-binance">
                        <div onClick={() => togglePerk("binance")} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${perks.binance ? "bg-[#0D7A49] border-[#0D7A49]" : "border-[#D5E8DA] bg-white"}`}>
                          {perks.binance && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-muted-foreground">Binance VIP <span className="text-foreground/60">(reduced spreads)</span></span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Results */}
      {hasResults && (
        <div className="max-w-5xl mx-auto">
          {approxConverted && (
            <div className="mb-2 px-1 text-center md:text-left">
              <p className="text-xs text-[#0D7A49] font-medium" data-testid="text-approx-converted">
                ≈ {approxConverted} received
              </p>
            </div>
          )}

          {midRateData && (() => {
            const d = formatDisplayRate(midRateData.rate, midRateData.from, midRateData.to);
            const dateLabel = new Date(midRateData.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            return (
              <div className="mb-6 px-4 py-3 rounded-xl border border-[#D5E8DA] bg-white flex items-center justify-between gap-3 flex-wrap shadow-sm" data-testid="banner-midmarket-rate">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F0FAF5] flex items-center justify-center text-[#0D7A49]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Mid-market rate</p>
                    <p className="text-sm font-mono font-bold text-foreground">{d.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-medium">Updated {dateLabel}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic text-[9px]">Official benchmark rate</p>
                </div>
              </div>
            );
          })()}

          {sortedRoutes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border border-[#D5E8DA]">
              <p className="text-base mb-1">No routes found for this corridor</p>
              <p className="text-sm">Try relaxing the time limit or selecting a different corridor</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-sm font-medium text-muted-foreground" data-testid="text-route-count">
                  {sortedRoutes.length} route{sortedRoutes.length !== 1 ? "s" : ""} found
                </p>
                <div className="flex gap-0.5 bg-white border border-[#D5E8DA] rounded-lg p-0.5 shadow-sm">
                  <button
                    onClick={() => setSortMode("cheapest")}
                    className={`text-[11px] px-3 py-1.5 rounded-md font-bold transition-colors ${
                      sortMode === "cheapest" ? "bg-[#F0FAF5] text-[#0D7A49]" : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="button-sort-cheapest"
                  >
                    Cheapest
                  </button>
                  <button
                    onClick={() => setSortMode("simplest")}
                    className={`text-[11px] px-3 py-1.5 rounded-md font-bold transition-colors ${
                      sortMode === "simplest" ? "bg-[#F0FAF5] text-[#0D7A49]" : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="button-sort-simplest"
                  >
                    Simplest
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {sortedRoutes.map((route, idx) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    adjustedCost={route.adjustedCost}
                    isBest={idx === 0}
                    bestAdjustedCost={bestAdjustedCost}
                    toCurrency={searchParams?.to ?? "GBP"}
                    fromCurrency={searchParams?.from ?? "COP"}
                    midRateData={midRateData ?? null}
                    selectedAccounts={selectedAccounts}
                    isExpanded={expandedCard === route.id}
                    onToggleExpand={() => setExpandedCard(expandedCard === route.id ? null : route.id)}
                  />
                ))}
              </div>

              {selectedAccounts.size === 0 && (
                <p className="text-[11px] text-muted-foreground text-center mt-8 font-medium italic">
                  Tip: Open "More options" to select your accounts for personalized results
                </p>
              )}
              <p className="text-[11px] text-muted-foreground text-center mt-2 opacity-60">
                Click any platform name to open its website
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
