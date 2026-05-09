import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Map, LayoutDashboard, Image as ImageIcon, Activity, Globe, ActivitySquare, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Mission Control", icon: Map },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scenes", label: "Scenes Browser", icon: ImageIcon },
    { href: "/analysis", label: "Analysis Tool", icon: Activity },
    { href: "/regions", label: "Regions (AOIs)", icon: Globe },
    { href: "/informality", label: "Informality Map", icon: Building2 },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col z-20 shadow-xl">
        <div className="h-16 flex items-center px-6 border-b border-border space-x-3">
          <ActivitySquare className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-lg tracking-tight uppercase">UrbanWatch</h1>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors hover-elevate",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          System: Online<br/>
          Network: Secure
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {children}
      </main>
    </div>
  );
}