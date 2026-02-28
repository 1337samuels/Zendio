import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, TrendingUp, Zap } from "lucide-react";

interface HowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: Search,
    title: "We scan 47 routes",
    description:
      "RemitRadar analyzes every possible combination of fintech apps, crypto bridges, and bank transfers to find the optimal path for your money.",
    color: "text-teal",
    bg: "bg-teal-muted border border-teal/20",
  },
  {
    icon: TrendingUp,
    title: "We compare the true cost",
    description:
      "Unlike other tools, we don't just show you exchange rates. We calculate the total cost including all fees, spreads, and conversion charges at every hop.",
    color: "text-[#F5A623]",
    bg: "bg-amber-dim border border-[#F5A623]/20",
  },
  {
    icon: Zap,
    title: "You save money",
    description:
      "By routing your transfer through the optimal chain of services, you can save 3-5x compared to sending directly. The best route changes daily — we track it for you.",
    color: "text-[#00D4AA]",
    bg: "bg-teal-muted border border-teal/20",
  },
];

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg border border-white/10 bg-[#0F1729] text-foreground"
        data-testid="modal-how-it-works"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold text-foreground">
            How RemitRadar Works
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            The diaspora tax is real. We help you fight back.
          </p>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className={`flex gap-4 p-4 rounded-lg ${step.bg}`}>
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center bg-white/5`}>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Step {idx + 1}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}

          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              RemitRadar does not provide financial advice. All data is for informational purposes only.
              Always verify rates before transferring.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
