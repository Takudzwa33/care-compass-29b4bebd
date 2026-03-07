import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calculator,
  AlertTriangle,
  Bell,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Heart,
  Shield,
  Upload,
  History,
  Menu,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "nurse", "doctor", "emergency"] },
  { to: "/patients", label: "Patients", icon: Users, roles: ["admin", "nurse", "doctor"] },
  { to: "/nurses", label: "Nurse Management", icon: Stethoscope, roles: ["admin", "nurse"] },
  { to: "/ratios", label: "Nurse-Patient Ratio", icon: Calculator, roles: ["admin", "nurse", "doctor"] },
  { to: "/code-blue", label: "Code Blue", icon: AlertTriangle, roles: ["admin", "nurse", "doctor", "emergency"] },
  { to: "/alerts", label: "Alerts", icon: Bell, roles: ["admin", "nurse", "doctor", "emergency"] },
  { to: "/feedback", label: "Patient Feedback", icon: MessageSquare, roles: ["admin", "nurse", "doctor"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "doctor"] },
  { to: "/audit", label: "Access Audit", icon: Shield, roles: ["admin"] },
  { to: "/emr-import", label: "EMR Import", icon: Upload, roles: ["admin"] },
  { to: "/data-audit", label: "Data Audit", icon: History, roles: ["admin"] },
  { to: "/admin", label: "Admin Settings", icon: Settings, roles: ["admin"] },
];

function SidebarContent({ user, filteredNav, location, logout, onNavClick }: {
  user: any;
  filteredNav: typeof navItems;
  location: ReturnType<typeof useLocation>;
  logout: () => void;
  onNavClick?: () => void;
}) {
  return (
    <>
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm">MedWatch</h1>
            <p className="text-xs text-sidebar-muted">Hospital Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium">
            {user?.name.split(" ").map((n: string) => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
          <SidebarContent user={user} filteredNav={filteredNav} location={location} logout={logout} />
        </aside>
      )}

      {/* Mobile sidebar sheet */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex flex-col h-full">
              <SidebarContent
                user={user}
                filteredNav={filteredNav}
                location={location}
                logout={logout}
                onNavClick={() => setMobileOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border px-4 md:px-6 py-2 flex items-center justify-between">
          {isMobile && (
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
