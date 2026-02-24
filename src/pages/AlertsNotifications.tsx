import { useState, useEffect, useRef } from "react";
import { useAlerts } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Bell, Info, CheckCircle, Volume2, VolumeX, Filter } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["all", "critical", "warning", "info"] as const;

export default function AlertsNotifications() {
  const { alerts, refetch } = useAlerts();
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<typeof PRIORITIES[number]>("all");
  const prevCountRef = useRef(alerts.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==");
    audioRef.current.volume = 0.5;
  }, []);

  // Real-time toast + sound for new alerts
  useEffect(() => {
    if (alerts.length > prevCountRef.current) {
      const newAlerts = alerts.slice(0, alerts.length - prevCountRef.current);
      newAlerts.forEach((alert) => {
        const isCritical = alert.alert_type === "critical";
        toast[isCritical ? "error" : alert.alert_type === "warning" ? "warning" : "info"](alert.message, {
          duration: isCritical ? 10000 : 5000,
          description: `${alert.alert_type.toUpperCase()} alert`,
        });
        if (isCritical && soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      });
    }
    prevCountRef.current = alerts.length;
  }, [alerts, soundEnabled]);

  const acknowledge = async (id: string) => {
    await supabase.from("alerts").update({ acknowledged: true, acknowledged_by: user?.id }).eq("id", id);
    refetch();
  };

  const icon = (type: string) => {
    if (type === "critical") return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (type === "warning") return <Bell className="w-4 h-4 text-warning" />;
    return <Info className="w-4 h-4 text-info" />;
  };

  const priorityColor = (type: string) => {
    if (type === "critical") return "status-critical";
    if (type === "warning") return "status-warning";
    return "bg-info/10 text-info border border-info/20";
  };

  const filteredAlerts = priorityFilter === "all" ? alerts : alerts.filter(a => a.alert_type === priorityFilter);
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.alert_type === "critical" && !a.acknowledged).length;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Alerts & Notifications</h1>
          <p className="page-description">Real-time warnings and system notifications — {unacknowledged} unacknowledged{criticalCount > 0 && `, ${criticalCount} critical`}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Priority filter */}
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${priorityFilter === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {p}
              </button>
            ))}
          </div>
          {/* Sound toggle */}
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${soundEnabled ? "text-success border-success/30 bg-success/5" : "text-muted-foreground border-input"}`}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>
        </div>
      </div>

      {/* Priority summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { type: "critical", label: "Critical", count: alerts.filter(a => a.alert_type === "critical" && !a.acknowledged).length, cls: "status-critical" },
          { type: "warning", label: "Warning", count: alerts.filter(a => a.alert_type === "warning" && !a.acknowledged).length, cls: "status-warning" },
          { type: "info", label: "Info", count: alerts.filter(a => a.alert_type === "info" && !a.acknowledged).length, cls: "bg-info/10 text-info border border-info/20" },
        ].map(s => (
          <div key={s.type} className={`kpi-card flex items-center gap-3 ${s.cls} border`}>
            {icon(s.type)}
            <div>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs opacity-80">{s.label} unacknowledged</p>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="kpi-card text-center py-12">
          <p className="text-muted-foreground">No {priorityFilter !== "all" ? priorityFilter : ""} alerts at this time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div key={alert.id}
              className={`kpi-card flex items-start gap-4 ${alert.acknowledged ? "opacity-60" : ""} ${!alert.acknowledged && alert.alert_type === "critical" ? "border-destructive/30 shadow-destructive/10 shadow-md" : ""}`}>
              <div className="mt-0.5">{icon(alert.alert_type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${priorityColor(alert.alert_type)}`}>
                    {alert.alert_type}
                  </span>
                </div>
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              {!alert.acknowledged && (user?.role === "admin" || user?.role === "emergency") && (
                <button onClick={() => acknowledge(alert.id)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-muted transition text-muted-foreground hover:text-foreground">
                  Acknowledge
                </button>
              )}
              {alert.acknowledged && <CheckCircle className="w-4 h-4 text-success shrink-0 mt-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
