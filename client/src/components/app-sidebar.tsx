import { Search, TrendingUp, Clock, Bell } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { RadarIcon } from "./radar-icon";

const navItems = [
  { title: "Route Finder", url: "/", icon: Search, label: "Find the cheapest route" },
  { title: "Rate Tracker", url: "/rates", icon: TrendingUp, label: "Track exchange rates" },
  { title: "Smart Timing", url: "/timing", icon: Clock, label: "When to send" },
  { title: "Rate Alerts", url: "/alerts", icon: Bell, label: "Get notified" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex-shrink-0">
            <RadarIcon size={28} />
          </div>
          <div className="flex items-center gap-1.5 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-heading font-bold text-lg text-foreground whitespace-nowrap">RemitRadar</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-dim text-teal border border-teal/30 whitespace-nowrap">BETA</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className={isActive ? "text-teal" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden px-4 pb-4">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          RemitRadar does not provide financial advice. Historical data is for informational purposes only.
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Built with love for the diaspora</p>
      </SidebarFooter>
    </Sidebar>
  );
}
