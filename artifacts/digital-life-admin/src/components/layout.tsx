import { Link, useLocation } from "wouter";
import { LayoutDashboard, CheckSquare, BrainCircuit, Calendar, MessageSquare, BarChart3 } from "lucide-react";
import { UserPanel } from "@/components/user-panel";
import { OutOfCreditsModal } from "@/components/out-of-credits-modal";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Smart Input", href: "/input", icon: BrainCircuit },
    { name: "Planner", href: "/planner", icon: Calendar },
    { name: "AI Chat", href: "/chat", icon: MessageSquare },
    { name: "Insights", href: "/insights", icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-primary" />
            <span className="font-bold tracking-tight text-lg">Life Admin</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
      <UserPanel />
      <OutOfCreditsModal />
    </div>
  );
}
