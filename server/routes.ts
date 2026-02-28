import type { Express } from "express";
import { createServer, type Server } from "http";
import routesData from "./data/routes.json";
import remioDb from "./data/remio_database.json";

// ─── mid-market rate cache ────────────────────────────────────────────────────
const rateCache = new Map<string, { rate: number; date: string; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchMidMarketRate(from: string, to: string): Promise<{ rate: number; date: string } | null> {
  const key = `${from}-${to}`;
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { rate: cached.rate, date: cached.date };
  }
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?amount=1&from=${from}&to=${to}`);
    if (!res.ok) return null;
    const json = await res.json() as { rates: Record<string, number>; date: string };
    const rate = json.rates[to];
    if (!rate) return null;
    rateCache.set(key, { rate, date: json.date, fetchedAt: Date.now() });
    return { rate, date: json.date };
  } catch {
    return null;
  }
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gaussian(rand: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateRateData(start: number, end: number, stdDev: number, seed: number) {
  const rand = seededRandom(seed);
  const days = 90;
  const data = [];
  let current = start;
  const drift = (end - start) / days;

  for (let i = 0; i < days; i++) {
    current = current + drift + gaussian(rand) * stdDev;
    const date = new Date("2025-12-01");
    date.setDate(date.getDate() + i);
    data.push({ date: date.toISOString().split("T")[0], rate: Math.round(current * 100) / 100, day: i });
  }
  return data;
}

function generateSmartTimingData(rateData: { rate: number; date: string; day: number }[], seed: number) {
  const rand = seededRandom(seed + 1000);
  const avg = rateData.reduce((s, d) => s + d.rate, 0) / rateData.length;

  return rateData.map((d) => {
    const fxDeviation = ((d.rate - avg) / avg) * 100;
    let trueCost = 1.18 + fxDeviation * 0.3 + (rand() - 0.5) * 0.2;
    if (d.day >= 28 && d.day <= 35) trueCost = Math.min(trueCost, 0.8 + rand() * 0.15);
    if (d.day >= 58 && d.day <= 65) trueCost = Math.max(trueCost, 1.1 + rand() * 0.2);
    if (d.day >= 73 && d.day <= 77) trueCost = Math.min(trueCost, 0.6 + rand() * 0.1);
    trueCost = Math.max(0.5, Math.min(2.5, trueCost));
    return { date: d.date, day: d.day, fxRate: d.rate, fxDeviation: Math.round(fxDeviation * 100) / 100, trueCost: Math.round(trueCost * 100) / 100 };
  });
}

const RATE_CONFIGS: Record<string, { start: number; end: number; stdDev: number; seed: number }> = {
  "COP-GBP": { start: 5400, end: 5247, stdDev: 40, seed: 42 },
  "COP-USD": { start: 4350, end: 4289, stdDev: 30, seed: 77 },
  "MXN-USD": { start: 18.5, end: 17.8, stdDev: 0.2, seed: 99 },
  "MXN-GBP": { start: 22.1, end: 21.4, stdDev: 0.25, seed: 55 },
  "BRL-USD": { start: 5.15, end: 5.02, stdDev: 0.06, seed: 101 },
  "BRL-EUR": { start: 5.68, end: 5.51, stdDev: 0.07, seed: 112 },
  "PHP-USD": { start: 57.8, end: 56.2, stdDev: 0.4, seed: 131 },
  "PHP-GBP": { start: 72.4, end: 70.8, stdDev: 0.5, seed: 144 },
  "INR-GBP": { start: 105.2, end: 103.8, stdDev: 0.6, seed: 155 },
  "INR-USD": { start: 84.1, end: 83.2, stdDev: 0.45, seed: 166 },
  "NGN-GBP": { start: 2050, end: 2010, stdDev: 18, seed: 177 },
};

// ─── remio database cost calculator ──────────────────────────────────────────

type SpreadTier = { min_usd: number; max_usd: number; spread_percent: number };
type VarTier = { min_usd: number; max_usd: number; percent: number };

interface EdgeFeeStructure {
  fixed_fee: number;
  fixed_fee_currency: string;
  variable_fee_percent: number;
  fx_spread_percent: number;
  fx_spread_tiers?: SpreadTier[];
  variable_fee_tiers?: VarTier[];
  premium_override?: {
    revolut_premium?: { fx_spread_tiers?: SpreadTier[] };
    wise_business?: { variable_fee_tiers?: VarTier[] };
  };
}

interface RemioEdge {
  id: string;
  from_platform: string;
  from_currency: string;
  to_platform: string;
  to_currency: string;
  fee_structure: EdgeFeeStructure;
  time_hours: number;
}

interface RemioRoute {
  id: string;
  name: string;
  edges: string[];
  platforms_needed: string[];
  ease_score: number;
  ease_label: string;
  ease_description: string;
}

const remioFxRates = remioDb.metadata.fx_rates as Record<string, number>;

const PLATFORM_URLS: Record<string, string | null> = {
  bancolombia: "https://www.bancolombia.com",
  davivienda: "https://www.davivienda.com",
  nequi: "https://www.nequi.com.co",
  bbva_co: "https://www.bbva.com.co",
  bbva_mx: "https://www.bbva.mx",
  banorte: "https://www.banorte.com",
  nu_mx: "https://nu.com.mx",
  wise: "https://wise.com",
  revolut: "https://www.revolut.com",
  dolarapp: "https://www.dollarapp.mx",
  binance: "https://www.binance.com",
  coinbase: "https://www.coinbase.com",
  monzo: "https://www.monzo.com",
  starling: "https://www.starlingbank.com",
  barclays: "https://www.barclays.co.uk",
  chase_us: "https://www.chase.com",
  global66: "https://global66.com",
  remitly: "https://www.remitly.com",
};

const EASE_COLORS: Record<string, string> = {
  "Simplest": "green",
  "A few steps": "amber",
  "Complicated": "red",
};

function normalizeCurrency(c: string): string {
  return c === "USDT" || c === "USDC" ? "USD" : c;
}

function remioConvert(amount: number, from: string, to: string): number {
  const f = normalizeCurrency(from);
  const t = normalizeCurrency(to);
  if (f === t) return amount;
  const direct = remioFxRates[`${f}_${t}`];
  if (direct !== undefined) return amount * direct;
  const inv = remioFxRates[`${t}_${f}`];
  if (inv !== undefined) return amount / inv;
  // Via USD
  const fToUsd = remioFxRates[`${f}_USD`];
  const usdToT = remioFxRates[`USD_${t}`];
  if (fToUsd !== undefined && usdToT !== undefined) return amount * fToUsd * usdToT;
  return amount;
}

function toUsd(amount: number, currency: string): number {
  return remioConvert(amount, currency, "USD");
}

function getSpreadRate(tiers: SpreadTier[] | undefined, amountUsd: number, defaultRate: number): number {
  if (!tiers || tiers.length === 0) return defaultRate;
  for (const tier of tiers) {
    if (amountUsd >= tier.min_usd && amountUsd < tier.max_usd) return tier.spread_percent;
  }
  return tiers[tiers.length - 1].spread_percent;
}

function getVarRate(tiers: VarTier[] | undefined, amountUsd: number, defaultRate: number): number {
  if (!tiers || tiers.length === 0) return defaultRate;
  for (const tier of tiers) {
    if (amountUsd >= tier.min_usd && amountUsd < tier.max_usd) return tier.percent;
  }
  return tiers[tiers.length - 1].percent;
}

function calculateRouteCost(
  route: RemioRoute,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  perks: { revolut: boolean; wise: boolean; binance: boolean },
  edgeMap: Map<string, RemioEdge>
): { totalCostDest: number; totalPercent: number; estimatedHours: number } {
  let runningAmount = amount;
  let runningCurrency = fromCurrency;
  let totalCostDest = 0;
  let estimatedHours = 0;

  for (const edgeId of route.edges) {
    const edge = edgeMap.get(edgeId);
    if (!edge) continue;

    const amountUsd = toUsd(runningAmount, runningCurrency);

    // Apply premium overrides
    let fs: EdgeFeeStructure = { ...edge.fee_structure };
    const po = fs.premium_override;
    if (po) {
      if (perks.revolut && po.revolut_premium?.fx_spread_tiers) {
        fs = { ...fs, fx_spread_tiers: po.revolut_premium.fx_spread_tiers };
      }
      if (perks.wise && po.wise_business?.variable_fee_tiers) {
        fs = { ...fs, variable_fee_tiers: po.wise_business.variable_fee_tiers };
      }
    }

    const spreadPct = getSpreadRate(fs.fx_spread_tiers, amountUsd, fs.fx_spread_percent ?? 0);
    const varPct = getVarRate(fs.variable_fee_tiers, amountUsd, fs.variable_fee_percent ?? 0);

    // Convert fixed fee to running currency
    const fixedFeeInRunning = remioConvert(fs.fixed_fee ?? 0, fs.fixed_fee_currency, runningCurrency);
    const edgeCostInRunning = fixedFeeInRunning + runningAmount * (varPct + spreadPct) / 100;

    // Accumulate cost in destination currency
    totalCostDest += remioConvert(edgeCostInRunning, runningCurrency, toCurrency);

    // Advance to next hop
    const amountAfterCost = Math.max(0, runningAmount - edgeCostInRunning);
    runningAmount = remioConvert(amountAfterCost, runningCurrency, edge.to_currency);
    runningCurrency = edge.to_currency;

    estimatedHours += edge.time_hours ?? 0;
  }

  const originalInDest = remioConvert(amount, fromCurrency, toCurrency);
  const totalPercent = originalInDest > 0 ? (totalCostDest / originalInDest) * 100 : 0;

  return {
    totalCostDest: Math.round(totalCostDest * 100) / 100,
    totalPercent: Math.round(totalPercent * 100) / 100,
    estimatedHours: Math.round(estimatedHours * 10) / 10,
  };
}

// ─── routes ───────────────────────────────────────────────────────────────────

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  app.get("/api/routes", (req, res) => {
    const {
      from = "COP",
      to = "GBP",
      maxHours,
      amount = "5000000",
      revolut,
      wise,
      binance,
    } = req.query as Record<string, string>;

    const remioKey = `${from}_${to}`;
    const remioCorridorRaw = (remioDb.routes as Record<string, unknown>)[remioKey];

    if (remioCorridorRaw) {
      const perks = {
        revolut: revolut === "true",
        wise: wise === "true",
        binance: binance === "true",
      };
      const sendAmount = parseFloat(amount) || 5000000;
      const remioRoutes = Object.values(remioCorridorRaw) as RemioRoute[];
      const edgeMap = new Map<string, RemioEdge>(
        (remioDb.edges as RemioEdge[]).map((e) => [e.id, e])
      );
      const platformMeta = remioDb.platforms as Record<string, { name: string }>;

      let calculated = remioRoutes.map((route) => {
        const { totalCostDest, totalPercent, estimatedHours } = calculateRouteCost(
          route, sendAmount, from, to, perks, edgeMap
        );

        // Build hops from edge sequence
        const hops = route.edges.map((edgeId) => {
          const edge = edgeMap.get(edgeId);
          if (!edge) return null;
          return {
            from_platform: platformMeta[edge.from_platform]?.name ?? edge.from_platform,
            to_platform: platformMeta[edge.to_platform]?.name ?? edge.to_platform,
            from_url: PLATFORM_URLS[edge.from_platform] ?? null,
            to_url: PLATFORM_URLS[edge.to_platform] ?? null,
          };
        }).filter(Boolean);

        return {
          id: route.id,
          name: route.name,
          total_cost_destination: totalCostDest,
          total_cost_currency: to,
          total_percent: totalPercent,
          estimated_hours: estimatedHours,
          hop_count: route.edges.length,
          is_best: false,
          ease_label: route.ease_label,
          ease_score: route.ease_score,
          ease_color: EASE_COLORS[route.ease_label] ?? "amber",
          ease_explanation: route.ease_description,
          hops,
        };
      });

      // Filter by maxHours
      if (maxHours && maxHours !== "any") {
        const maxH = parseInt(maxHours, 10);
        calculated = calculated.filter((r) => r.estimated_hours <= maxH);
      }

      // Sort by cost and mark best
      calculated.sort((a, b) => a.total_cost_destination - b.total_cost_destination);
      if (calculated.length > 0) calculated[0].is_best = true;

      return res.json({ routes: calculated, from, to });
    }

    // Fall back to static routes.json for non-remio corridors
    const key = `${from}-${to}`;
    let routes = (routesData as Record<string, unknown[]>)[key] || [];

    if (maxHours && maxHours !== "any") {
      const maxH = parseInt(maxHours, 10);
      routes = routes.filter((r: unknown) => {
        const route = r as { estimated_hours: number };
        return route.estimated_hours <= maxH;
      });
      if (routes.length > 0) {
        const sorted = [...routes].sort((a: unknown, b: unknown) => {
          const ra = a as { total_cost_destination: number };
          const rb = b as { total_cost_destination: number };
          return ra.total_cost_destination - rb.total_cost_destination;
        });
        const cheapestId = (sorted[0] as { id: string }).id;
        routes = routes.map((r: unknown) => {
          const route = r as Record<string, unknown>;
          return { ...route, is_best: route.id === cheapestId };
        });
      }
    }

    res.json({ routes, from, to });
  });

  app.get("/api/rates", (req, res) => {
    const { from = "COP", to = "GBP" } = req.query as Record<string, string>;
    const key = `${from}-${to}`;
    const cfg = RATE_CONFIGS[key] || RATE_CONFIGS["COP-GBP"];

    const data = generateRateData(cfg.start, cfg.end, cfg.stdDev, cfg.seed);
    const rates = data.map((d) => d.rate);
    const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const current = rates[rates.length - 1];
    const percentile = rates.filter((r) => r <= current).length / rates.length;

    let sentiment: "good" | "average" | "high";
    let sentimentText: string;
    if (percentile <= 0.3) {
      sentiment = "good";
      sentimentText = `Today's rate is better than ${Math.round((1 - percentile) * 100)}% of the last 90 days`;
    } else if (percentile <= 0.7) {
      sentiment = "average";
      sentimentText = `Today's rate is better than ${Math.round((1 - percentile) * 100)}% of the last 90 days`;
    } else {
      sentiment = "high";
      sentimentText = `Today's rate is worse than ${Math.round(percentile * 100)}% of the last 90 days`;
    }

    const minIdx = rates.indexOf(min);
    const maxIdx = rates.indexOf(max);

    res.json({
      corridor: key, current, average: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100,
      minDate: data[minIdx].date, maxDate: data[maxIdx].date,
      sentiment, sentimentText, percentile: Math.round((1 - percentile) * 100),
      history: data, from, to,
    });
  });

  app.get("/api/midmarket-rate", async (req, res) => {
    const { from = "COP", to = "GBP" } = req.query as Record<string, string>;
    const result = await fetchMidMarketRate(from, to);
    if (!result) {
      const key = `${from}-${to}`;
      const cfg = RATE_CONFIGS[key];
      if (cfg) {
        return res.json({ rate: 1 / cfg.end, date: new Date().toISOString().split("T")[0], from, to, source: "fallback" });
      }
      return res.status(404).json({ error: "Corridor not found" });
    }
    res.json({ rate: result.rate, date: result.date, from, to, source: "live" });
  });

  app.get("/api/smart-timing", (req, res) => {
    const { from = "COP", to = "GBP" } = req.query as Record<string, string>;
    const key = `${from}-${to}`;
    const cfg = RATE_CONFIGS[key] || RATE_CONFIGS["COP-GBP"];

    const rateData = generateRateData(cfg.start, cfg.end, cfg.stdDev, cfg.seed);
    const smartData = generateSmartTimingData(rateData, cfg.seed);

    const annotations = [
      { day: 30, date: smartData[30]?.date, label: "Binance P2P spread dropped", detail: "Crypto route was cheapest this week", trueCost: smartData[30]?.trueCost },
      { day: 60, date: smartData[60]?.date, label: "Wise increased fees", detail: "Offset the good FX rate", trueCost: smartData[60]?.trueCost },
      { day: 75, date: smartData[75]?.date, label: "Best day to send", detail: "0.6% total cost — optimal route + rate", trueCost: smartData[75]?.trueCost },
    ];

    res.json({ corridor: key, data: smartData, annotations, from, to });
  });

  return httpServer;
}
