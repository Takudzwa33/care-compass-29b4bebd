import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, Info, AlertCircle, CheckCircle, Volume2, VolumeX } from "lucide-react";
import { useAlerts } from "@/hooks/useDatabase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function NotificationBell() {
  const { alerts } = useAlerts();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("alert-sound-enabled");
    return stored !== "false";
  });
  const ref = useRef<HTMLDivElement>(null);

  const unread = alerts.filter((a) => !a.acknowledged);
  const count = unread.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const acknowledge = async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ acknowledged: true, acknowledged_by: user?.id || null })
      .eq("id", id);
    if (error) toast.error("Failed to acknowledge");
    else toast.success("Alert acknowledged");
  };

  const icon = (type: string) => {
    if (type === "critical") return <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />;
    if (type === "warning") return <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />;
    return <Info className="w-3.5 h-3.5 text-primary shrink-0" />;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            <span className="text-xs text-muted-foreground">{count} unread</span>
          </div>

          {alerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.slice(0, 20).map((a) => (
                <div
                  key={a.id}
                  className={`p-3 flex gap-2.5 text-sm transition-colors ${
                    a.acknowledged ? "opacity-60" : "bg-muted/30"
                  }`}
                >
                  <div className="mt-0.5">{icon(a.alert_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!a.acknowledged && (user?.role === "doctor" || user?.role === "admin") && (
                    <button
                      onClick={() => acknowledge(a.id)}
                      className="shrink-0 self-center p-1 rounded hover:bg-muted transition"
                      title="Acknowledge"
                    >
                      <CheckCircle className="w-4 h-4 text-success" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
