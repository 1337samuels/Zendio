import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CorridorSelect, getCurrencySymbol } from "@/components/corridor-select";
import { format } from "date-fns";

interface RateData {
  date: string;
  rate: number;
  day: number;
}

interface RatesResponse {
  corridor: string;
  current: number;
  average: number;
  min: number;
  max: number;
  minDate: string;
  maxDate: string;
  sentiment: "good" | "average" | "high";
  sentimentText: string;
  percentile: number;
  history: RateData[];
  from: string;
  to: string;
}

const SENTIMENT_CONFIG = {
  good: {
    label: "Good time to send",
    color: "text-teal",
    bg: "bg-teal/15 border-teal/30",
    icon: TrendingDown,
    dotClass: "bg-teal",
  },
  average: {
    label: "Average rates",
    color: "text-[#F5A623]",
    bg: "bg-[#F5A623]/15 border-[#F5A623]/30",
    icon: Minus,
    dotClass: "bg-[#F5A623]",
  },
  high: {
    label: "Rates are high",
    color: "text-[#FF6B6B]",
    bg: "bg-[#FF6B6B]/15 border-[#FF6B6B]/30",
    icon: TrendingUp,
    dotClass: "bg-[#FF6B6B]",
  },
};

function CustomTooltip({ active, payload, average }: { active?: boolean; payload?: { payload: RateData }[]; average: number }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const diff = ((d.rate - average) / average) * 100;

  return (
    <div className="bg-[#0F1729] border border-white/15 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{format(new Date(d.date), "MMM d, yyyy")}</p>
      <p className="text-sm font-bold text-foreground">{d.rate.toLocaleString()}</p>
      <p className={`text-xs mt-0.5 font-medium ${diff < 0 ? "text-teal" : "text-[#FF6B6B]"}`}>
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}% vs avg
      </p>
    </div>
  );
}

function CustomDot(props: { cx?: number; cy?: number; index?: number; dataLength?: number }) {
  const { cx, cy, index, dataLength } = props;
  if (index !== (dataLength || 90) - 1) return <circle r={0} cx={cx} cy={cy} fill="none" />;
  return <circle cx={cx} cy={cy} r={6} fill="#00D4AA" stroke="#0F1729" strokeWidth={2} />;
}

export default function RateTracker() {
  const [from, setFrom] = useState("COP");
  const [to, setTo] = useState("GBP");

  const { data, isLoading } = useQuery<RatesResponse>({
    queryKey: ["/api/rates", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/rates?from=${from}&to=${to}`);
      return res.json();
    },
  });

  const sentiment = data ? SENTIMENT_CONFIG[data.sentiment] : null;
  const SentimentIcon = sentiment?.icon || Minus;
  const dataLength = data?.history?.length || 90;

  const formatRate = (rate: number) => {
    if (rate > 100) return rate.toLocaleString();
    return rate.toFixed(2);
  };

  const fromCurrLabel = from;
  const toCurrLabel = to;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Rate Tracker</h1>
        <p className="text-muted-foreground mt-1">Track exchange rates over time and spot the best window</p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10">
        <CorridorSelect fromValue={from} toValue={to} onFromChange={setFrom} onToChange={setTo} />
      </Card>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 bg-white/5 border-white/10 animate-pulse">
              <div className="h-16 bg-white/5 rounded" />
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          <Card className="p-6 bg-white/5 border-white/10 text-center" data-testid="card-current-rate">
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Current Rate
              </p>
              <div className="font-heading text-4xl md:text-5xl font-bold text-foreground" data-testid="text-current-rate">
                1 {toCurrLabel} = {formatRate(data.current)} {fromCurrLabel}
              </div>
              {sentiment && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${sentiment.bg} ${sentiment.color}`}>
                  <span className={`w-2 h-2 rounded-full ${sentiment.dotClass} animate-pulse-dot`} />
                  <SentimentIcon className="w-4 h-4" />
                  {sentiment.label}
                </div>
              )}
              <p className="text-sm text-muted-foreground" data-testid="text-rate-sentiment">
                {data.sentimentText}
              </p>
            </div>
          </Card>

          <Card className="p-5 bg-white/5 border-white/10">
            <h2 className="font-heading font-semibold text-foreground mb-4">90-Day Rate History</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradGood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradBad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#8A9BB5", fontSize: 10 }}
                    tickFormatter={(v) => format(new Date(v), "MMM d")}
                    interval={14}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#8A9BB5", fontSize: 10 }}
                    tickFormatter={formatRate}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip average={data.average} />} />
                  <ReferenceLine
                    y={data.average}
                    stroke="rgba(255,255,255,0.25)"
                    strokeDasharray="5 4"
                    label={{ value: "90d avg", position: "right", fill: "#8A9BB5", fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#00D4AA"
                    strokeWidth={1.5}
                    fill="url(#gradGood)"
                    dot={(props) => <CustomDot {...props} dataLength={dataLength} />}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "90-day Low",
                value: formatRate(data.min),
                date: format(new Date(data.minDate), "MMM d"),
                color: "text-teal",
                icon: TrendingDown,
              },
              {
                label: "90-day Average",
                value: formatRate(data.average),
                date: null,
                color: "text-foreground",
                icon: Minus,
              },
              {
                label: "90-day High",
                value: formatRate(data.max),
                date: format(new Date(data.maxDate), "MMM d"),
                color: "text-[#FF6B6B]",
                icon: TrendingUp,
              },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 bg-white/5 border-white/10 text-center" data-testid={`card-stat-${stat.label.replace(/\s+/g, "-").toLowerCase()}`}>
                <stat.icon className={`w-4 h-4 mx-auto mb-2 ${stat.color}`} />
                <div className={`font-heading text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                {stat.date && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {stat.date}
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4 bg-white/5 border-white/10" data-testid="card-best-day">
              <div className="flex items-start gap-3">
                <TrendingDown className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-teal uppercase tracking-wider mb-1">Best day this month</div>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{format(new Date(data.minDate), "MMM d")}</span> — rate was{" "}
                    <span className="font-semibold text-teal">{formatRate(data.min)}</span>.
                    You would have received{" "}
                    <span className="font-semibold">
                      {getCurrencySymbol(to)}23 more
                    </span>{" "}
                    on a standard {fromCurrLabel} transfer.
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10" data-testid="card-worst-day">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-[#FF6B6B] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[#FF6B6B] uppercase tracking-wider mb-1">Worst day this month</div>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{format(new Date(data.maxDate), "MMM d")}</span> — rate was{" "}
                    <span className="font-semibold text-[#FF6B6B]">{formatRate(data.max)}</span>.
                    Avoid sending when rates are this high.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
