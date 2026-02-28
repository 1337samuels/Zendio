import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCircle, Info, TrendingDown, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CorridorSelect } from "@/components/corridor-select";
import { useToast } from "@/hooks/use-toast";

const alertSchema = z.object({
  costThreshold: z.coerce.number().min(0.1).max(10),
  rateThreshold: z.coerce.number().optional(),
  watchRoute: z.boolean().default(false),
});

type AlertFormValues = z.infer<typeof alertSchema>;

interface Alert {
  id: string;
  from: string;
  to: string;
  type: "cost" | "rate";
  title: string;
  current: number;
  target: number;
  currentLabel: string;
  targetLabel: string;
  progress: number;
  status: "not_triggered" | "almost" | "triggered";
  bestRoute: string;
  created: string;
}

const INITIAL_ALERTS: Alert[] = [
  {
    id: "alert-1",
    from: "COP",
    to: "GBP",
    type: "cost",
    title: "COP → GBP: Total cost < 0.9%",
    current: 1.1,
    target: 0.9,
    currentLabel: "1.1%",
    targetLabel: "0.9%",
    progress: 70,
    status: "not_triggered",
    bestRoute: "Bancolombia → Dollar App → Wise → Revolut",
    created: "Feb 10, 2026",
  },
  {
    id: "alert-2",
    from: "COP",
    to: "USD",
    type: "rate",
    title: "COP → USD: Rate better than 4,350",
    current: 4289,
    target: 4350,
    currentLabel: "4,289",
    targetLabel: "4,350",
    progress: 85,
    status: "almost",
    bestRoute: "Bancolombia → Dollar App",
    created: "Feb 18, 2026",
  },
];

const HISTORY_ALERTS = [
  {
    id: "hist-1",
    date: "Feb 15",
    description: "COP → GBP total cost hit 0.85%. Best route: Binance P2P path. Sending 5M COP would save ~£37 vs Wise direct.",
  },
  {
    id: "hist-2",
    date: "Feb 8",
    description: "COP → USD rate crossed 4,400. Dollar App route cost only 0.2%.",
  },
  {
    id: "hist-3",
    date: "Jan 28",
    description: "Route change alert: Crypto route became cheapest for COP → GBP (was Dollar App route). Savings: 0.3% improvement.",
  },
];

const STATUS_CONFIG = {
  not_triggered: {
    label: "Not triggered",
    dotClass: "bg-[#F5A623]",
    textClass: "text-[#F5A623]",
    barClass: "bg-[#F5A623]",
  },
  almost: {
    label: "Almost there! Within 1.4% of target",
    dotClass: "bg-[#F5A623] animate-pulse",
    textClass: "text-[#F5A623]",
    barClass: "bg-[#F5A623]",
  },
  triggered: {
    label: "Triggered",
    dotClass: "bg-teal",
    textClass: "text-teal",
    barClass: "bg-teal",
  },
};

export default function RateAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [from, setFrom] = useState("COP");
  const [to, setTo] = useState("GBP");
  const [watchRoute, setWatchRoute] = useState(false);
  const { toast } = useToast();

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      costThreshold: 1.0,
      rateThreshold: undefined,
      watchRoute: false,
    },
  });

  const onSubmit = (values: AlertFormValues) => {
    const newAlert: Alert = {
      id: `alert-${Date.now()}`,
      from,
      to,
      type: "cost",
      title: `${from} → ${to}: Total cost < ${values.costThreshold}%`,
      current: 1.18,
      target: values.costThreshold,
      currentLabel: "1.18%",
      targetLabel: `${values.costThreshold}%`,
      progress: Math.min(95, Math.round((values.costThreshold / 1.18) * 100)),
      status: "not_triggered",
      bestRoute: from === "COP" && to === "GBP" ? "Bancolombia → Dollar App → Wise → Revolut" : "Bancolombia → Dollar App",
      created: "Feb 28, 2026",
    };
    setAlerts((prev) => [newAlert, ...prev]);
    form.reset();
    toast({
      title: "Alert created",
      description: `You'll be notified when ${from} → ${to} total cost drops below ${values.costThreshold}%.`,
    });
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Rate Alerts</h1>
        <p className="text-muted-foreground mt-1">Never miss a good rate. Set your target and we&apos;ll tell you when it&apos;s time to send.</p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10">
        <h2 className="font-heading font-semibold text-foreground mb-4">Create Alert</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <CorridorSelect fromValue={from} toValue={to} onFromChange={setFrom} onToChange={setTo} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Alert me when total cost drops below
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          className="pr-8 bg-white/5 border-white/10 text-foreground"
                          data-testid="input-cost-threshold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rateThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Or alert when FX rate is better than
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder={from === "COP" && to === "GBP" ? "e.g. 5103" : "e.g. 4350"}
                        className="bg-white/5 border-white/10 text-foreground"
                        data-testid="input-rate-threshold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div>
                <div className="text-sm font-medium text-foreground">Alert on best route change</div>
                <div className="text-xs text-muted-foreground mt-0.5">Notify when a different route becomes cheapest</div>
              </div>
              <Switch
                checked={watchRoute}
                onCheckedChange={setWatchRoute}
                data-testid="switch-watch-route"
              />
            </div>

            <Button
              type="submit"
              className="bg-teal text-[#0F1729] font-semibold w-full sm:w-auto"
              data-testid="button-create-alert"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </form>
        </Form>
      </Card>

      <div>
        <h2 className="font-heading font-semibold text-foreground mb-3">Active Alerts</h2>
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {alerts.map((alert) => {
              const statusCfg = STATUS_CONFIG[alert.status];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="p-4 bg-white/5 border-white/10 relative" data-testid={`alert-card-${alert.id}`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-3 right-3"
                      onClick={() => deleteAlert(alert.id)}
                      data-testid={`button-delete-${alert.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <div className="pr-10">
                      <div className="font-semibold text-foreground text-sm mb-2" data-testid={`text-alert-title-${alert.id}`}>
                        {alert.title}
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                          <span>Current: <span className="text-foreground font-medium">{alert.currentLabel}</span></span>
                          <span>Target: <span className={`font-medium ${statusCfg.textClass}`}>{alert.targetLabel}</span></span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${statusCfg.barClass}`}
                            style={{ width: `${alert.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dotClass}`} />
                          <span className={statusCfg.textClass}>{statusCfg.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          <span>{alert.bestRoute}</span>
                        </div>
                        <div className="text-muted-foreground">Created {alert.created}</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {alerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No active alerts. Create one above.
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-heading font-semibold text-foreground mb-3">Alert History</h2>
        <div className="flex flex-col gap-3">
          {HISTORY_ALERTS.map((hist) => (
            <Card key={hist.id} className="p-4 bg-white/5 border-white/10" data-testid={`history-card-${hist.id}`}>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-teal uppercase tracking-wider mb-1">{hist.date} — Triggered</div>
                  <p className="text-sm text-foreground leading-relaxed">{hist.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-white/5 border-white/10" data-testid="card-pro-tip">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#F5A623] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-[#F5A623] uppercase tracking-wider mb-1">Pro tip</div>
            <p className="text-sm text-foreground leading-relaxed">
              Most remittance corridors have weekly patterns. COP/GBP tends to be cheapest early in the month
              when Colombian export revenues flow in.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
