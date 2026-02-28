import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, DollarSign, Zap } from "lucide-react";

interface HowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: Search,
    step: "1",
    title: "We scan dozens of routes",
    description:
      "Zendio analyzes every possible combination of fintech apps, crypto bridges, and bank transfers to find the optimal path for your money — across 12+ platforms.",
    color: "text-teal",
    accent: "border-teal/20 bg-teal/5",
  },
  {
    icon: DollarSign,
    step: "2",
    title: "We calculate the true cost",
    description:
      "We don't just look at exchange rates. We add up every fee and spread at every step of the route to give you a single honest number: what you actually pay.",
    color: "text-[#F5A623]",
    accent: "border-[#F5A623]/20 bg-[#F5A623]/5",
  },
  {
    icon: Zap,
    step: "3",
    title: "You send for less",
    description:
      "By routing through the optimal chain of services, you can save 3–5x compared to sending directly. We show you exactly which services to use and in which order.",
    color: "text-teal",
    accent: "border-teal/20 bg-teal/5",
  },
];

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border border-[#E5E7EB] bg-white text-[#374151] shadow-lg"
        aria-describedby="how-it-works-desc"
        data-testid="modal-how-it-works"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-foreground">
            How Zendio works
          </DialogTitle>
          <p id="how-it-works-desc" className="text-sm text-muted-foreground mt-0.5">
            Three steps. One goal: more money in your recipient's hands.
          </p>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className={`flex gap-4 p-4 rounded-lg border ${step.accent}`}>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-gray-100">
                  <step.icon className={`w-4 h-4 ${step.color}`} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Step {step.step}
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground text-center pt-1 leading-relaxed">
            Zendio does not provide financial advice. Information is for comparison purposes only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
