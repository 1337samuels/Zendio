import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import routesData from "./data/routes.json";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateRateData(start: number, end: number, stdDev: number, seed: number) {
  const rand = seededRandom(seed);
  const days = 90;
  const data = [];
  let current = start;
  const drift = (end - start) / days;

  for (let i = 0; i < days; i++) {
    const gaussian = () => {
      let u = 0, v = 0;
      while (u === 0) u = rand();
      while (v === 0) v = rand();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };
    current = current + drift + gaussian() * stdDev;
    const date = new Date("2025-12-01");
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString().split("T")[0],
      rate: Math.round(current * 10) / 10,
      day: i,
    });
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
    return {
      date: d.date,
      day: d.day,
      fxRate: d.rate,
      fxDeviation: Math.round(fxDeviation * 100) / 100,
      trueCost: Math.round(trueCost * 100) / 100,
    };
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/routes", (req, res) => {
    const { from = "COP", to = "GBP" } = req.query as Record<string, string>;
    const key = `${from}-${to}`;
    const routes = (routesData as Record<string, unknown[]>)[key] || [];
    res.json({ routes, from, to });
  });

  app.get("/api/rates", (req, res) => {
    const { from = "COP", to = "GBP" } = req.query as Record<string, string>;
    const key = `${from}-${to}`;

    let start: number, end: number, stdDev: number, seed: number;
    if (key === "COP-GBP") {
      start = 5400; end = 5247; stdDev = 40; seed = 42;
    } else if (key === "COP-USD") {
      start = 4350; end = 4289; stdDev = 30; seed = 77;
    } else if (key === "MXN-USD") {
      start = 18.5; end = 17.8; stdDev = 0.2; seed = 99;
    } else if (key === "MXN-GBP") {
      start = 22.1; end = 21.4; stdDev = 0.25; seed = 55;
    } else {
      start = 5400; end = 5247; stdDev = 40; seed = 42;
    }

    const data = generateRateData(start, end, stdDev, seed);
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
      corridor: key,
      current,
      average: Math.round(avg * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      minDate: data[minIdx].date,
      maxDate: data[maxIdx].date,
      sentiment,
      sentimentText,
      percentile: Math.round((1 - percentile) * 100),
      history: data,
      from,
      to,
    });
  });

  app.get("/api/smart-timing", (req, res) => {
    const { from = "COP", to = "GBP" } = req.query as Record<string, string>;
    const key = `${from}-${to}`;

    let start: number, end: number, stdDev: number, seed: number;
    if (key === "COP-GBP") {
      start = 5400; end = 5247; stdDev = 40; seed = 42;
    } else if (key === "COP-USD") {
      start = 4350; end = 4289; stdDev = 30; seed = 77;
    } else if (key === "MXN-USD") {
      start = 18.5; end = 17.8; stdDev = 0.2; seed = 99;
    } else if (key === "MXN-GBP") {
      start = 22.1; end = 21.4; stdDev = 0.25; seed = 55;
    } else {
      start = 5400; end = 5247; stdDev = 40; seed = 42;
    }

    const rateData = generateRateData(start, end, stdDev, seed);
    const smartData = generateSmartTimingData(rateData, seed);

    const annotations = [
      {
        day: 30,
        date: smartData[30]?.date,
        label: "Binance P2P spread dropped",
        detail: "Crypto route was cheapest this week",
        trueCost: smartData[30]?.trueCost,
      },
      {
        day: 60,
        date: smartData[60]?.date,
        label: "Wise increased fees",
        detail: "Offset the good FX rate",
        trueCost: smartData[60]?.trueCost,
      },
      {
        day: 75,
        date: smartData[75]?.date,
        label: "Best day to send",
        detail: "0.6% total cost — optimal route + rate",
        trueCost: smartData[75]?.trueCost,
      },
    ];

    res.json({
      corridor: key,
      data: smartData,
      annotations,
      from,
      to,
    });
  });

  return httpServer;
}
