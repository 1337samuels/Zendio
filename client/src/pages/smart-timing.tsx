import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart,
  Bar,
} from "recharts";
import { Info, ArrowRight, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorridorSelect } from "@/components/corridor-select";
import { Link } from "wouter";
import { format } from "date-fns";

interface SmartDataPoint {
  date: string;
  day: number;
  fxRate: number;
  fxDeviation: number;
  trueCost: number;
}

interface Annotation {
  day: number;
  date: string;
  label: string;
  detail: string;
  trueCost: number;
}

interface SmartTimingResponse {
  corridor: string;
  data: SmartDataPoint[];
  annotations: Annotation[];
  from: string;
  to: string;
}

const MONTH_SAVINGS = [
  { month: "Jan", savings: 28 },
  { month: "Feb", savings: 35 },
  { month: "Mar", savings: 22 },
  { month: "Apr", savings: 41 },
  { month: "May", savings: 33 },
  { month: "Jun", savings: 29 },
  { month: "Jul", savings: 38 },
  { month: "Aug", savings: 45 },
  { month: "Sep", savings: 31 },
  { month: "Oct", savings: 27 },
  { month: "Nov", savings: 36 },
  { month: "Dec", savings: 25 },
];

function CustomSmartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0F1729] border border-white/15 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{typeof p.value === "number" ? p.value.toFixed(2) + "%" : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function SmartTiming() {
  const [from, setFrom] = useState("COP");
  const [to, setTo] = useState("GBP");
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);

  const { data, isLoading } = useQuery<SmartTimingResponse>({
    queryKey: ["/api/smart-timing", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/smart-timing?from=${from}&to=${to}`);
      return res.json();
    },
  });

  const routeTimeline = [
    { period: "Feb 1–8", platform: "Dollar App route", avg: "0.9%", color: "border-teal/60 bg-teal/5" },
    { period: "Feb 9–15", platform: "Crypto route", avg: "0.7%", color: "border-[#F5A623]/60 bg-[#F5A623]/5" },
    { period: "Feb 16–today", platform: "Dollar App route", avg: "0.85%", color: "border-teal/60 bg-teal/5" },
  ];

  const chartData = (data?.data || []).map((d) => ({
    date: d.date,
    "FX Rate Only": Math.abs(d.fxDeviation),
    "True Cost via Best Route": d.trueCost,
  }));

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Smart Timing</h1>
        <p className="text-muted-foreground mt-1">
          Raw exchange rates don&apos;t tell the full story. Platform fees and spreads change independently.
          We track the real cost of your optimal route over time.
        </p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10">
        <CorridorSelect fromValue={from} toValue={to} onFromChange={setFrom} onToChange={setTo} />
      </Card>

      {isLoading ? (
        <Card className="p-5 bg-white/5 border-white/10 animate-pulse">
          <div className="h-64 bg-white/5 rounded" />
        </Card>
      ) : data ? (
        <>
          <Card className="p-5 bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-heading font-semibold text-foreground">True Cost vs FX Rate Only</h2>
              <Badge variant="secondary" className="text-xs">90 days</Badge>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#8A9BB5", fontSize: 10 }}
                    tickFormatter={(v) => {
                      try { return format(new Date(v), "MMM d"); } catch { return v; }
                    }}
                    interval={14}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#8A9BB5", fontSize: 10 }}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                    domain={[0, "auto"]}
                  />
                  <Tooltip content={<CustomSmartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                    formatter={(value) => (
                      <span style={{ color: value === "True Cost via Best Route" ? "#00D4AA" : "#8A9BB5" }}>
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="FX Rate Only"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="True Cost via Best Route"
                    stroke="#00D4AA"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#00D4AA" }}
                  />
                  {data.annotations.map((ann, idx) => (
                    <ReferenceDot
                      key={idx}
                      x={ann.date}
                      y={ann.trueCost}
                      r={6}
                      fill="#00D4AA"
                      stroke="#0F1729"
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.annotations.map((ann, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10 flex-1 min-w-[200px]"
                  data-testid={`annotation-${idx}`}
                >
                  <div className="w-3 h-3 rounded-full bg-teal flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{ann.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{ann.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 bg-white/5 border-white/10">
              <h2 className="font-heading font-semibold text-foreground mb-4">Route shifts this month</h2>
              <div className="flex flex-col gap-2">
                {routeTimeline.map((item, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${item.color}`} data-testid={`timeline-item-${idx}`}>
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-2 h-2 rounded-full bg-current" />
                      {idx < routeTimeline.length - 1 && (
                        <div className="w-px h-6 bg-current opacity-30 mt-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-muted-foreground">{item.period}</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">{item.platform}</div>
                      <div className="text-xs text-muted-foreground">{item.avg} avg cost</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-white/5 border-white/10">
              <h2 className="font-heading font-semibold text-foreground mb-1">Your potential savings</h2>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                If you sent 5M COP every month and always used the best route on the best day, you&apos;d save approximately{" "}
                <span className="text-teal font-semibold">£340/year</span> vs always using Wise direct.
              </p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTH_SAVINGS} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: "#8A9BB5", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#8A9BB5", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0F1729", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      labelStyle={{ color: "#8A9BB5", fontSize: 11 }}
                      itemStyle={{ color: "#00D4AA", fontSize: 11 }}
                      formatter={(v: number) => [`£${v}`, "Savings"]}
                    />
                    <Bar dataKey="savings" fill="#00D4AA" radius={[3, 3, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card
            className="p-5 border-teal/20"
            style={{ background: "linear-gradient(135deg, rgba(0, 212, 170, 0.12) 0%, rgba(0, 212, 170, 0.04) 100%)" }}
            data-testid="cta-alerts"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-heading font-semibold text-foreground">Want to know the best moment to send?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Set up a Rate Alert and we&apos;ll notify you when it&apos;s time.</p>
              </div>
              <Link href="/alerts">
                <Button className="bg-teal text-[#0F1729] font-semibold flex-shrink-0" data-testid="button-setup-alert">
                  <Bell className="w-4 h-4 mr-2" />
                  Set Rate Alert
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
