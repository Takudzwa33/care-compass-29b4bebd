import { useState, useEffect, useRef } from "react";
import { useAlerts, useWards, useCodeBlueEvents } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Bell, Info, CheckCircle, Volume2, VolumeX, Filter, Plus } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["all", "critical", "warning", "info"] as const;

export default function AlertsNotifications() {
  const { alerts, refetch } = useAlerts();
  const { wards } = useWards();
  const { events: codeBlueEvents } = useCodeBlueEvents();
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<typeof PRIORITIES[number]>("all");
  const prevCountRef = useRef(alerts.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Raise alert form state (nurses only)
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"critical" | "warning" | "info">("critical");
  const [alertWard, setAlertWard] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isNurse = user?.role === "nurse" || user?.role === "admin";
  const isDoctor = user?.role === "doctor" || user?.role === "admin";

  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==");
    audioRef.current.volume = 0.5;
  }, []);

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

  // Nurse raises an alert
  const raiseAlert = async () => {
    if (!alertMessage.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("alerts").insert({
      message: alertMessage,
      alert_type: alertType,
      ward_id: alertWard || null,
    });
    if (error) {
      toast.error("Failed to raise alert");
    } else {
      toast.success("Alert raised successfully");
      setAlertMessage("");
      setShowRaiseForm(false);
      refetch();
    }
    setSubmitting(false);
  };

  // Doctor acknowledges/responds to alert
  const acknowledge = async (id: string) => {
    await supabase.from("alerts").update({ acknowledged: true, acknowledged_by: user?.id }).eq("id", id);
    toast.success("Alert acknowledged");
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

  // Calculate average waiting time (time from alert creation to acknowledgment)
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged && a.acknowledged_by);
  // We approximate wait time as time from created_at to now for unacknowledged, but for stats we use code blue response data
  const avgWaitFromCodeBlue = codeBlueEvents.filter(e => e.response_minutes);
  const avgWaitTime = avgWaitFromCodeBlue.length > 0
    ? (avgWaitFromCodeBlue.reduce((s, e) => s + (e.response_minutes || 0), 0) / avgWaitFromCodeBlue.length).toFixed(1)
    : "N/A";

  const filteredAlerts = priorityFilter === "all" ? alerts : alerts.filter(a => a.alert_type === priorityFilter);
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.alert_type === "critical" && !a.acknowledged).length;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Alerts & Notifications</h1>
          <p className="page-description">
            {unacknowledged} unacknowledged{criticalCount > 0 && `, ${criticalCount} critical`} · Avg wait: {avgWaitTime} min
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Nurse can raise alert */}
          {isNurse && (
            <button onClick={() => setShowRaiseForm(!showRaiseForm)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition">
              <Plus className="w-4 h-4" /> Raise Alert
            </button>
          )}
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${priorityFilter === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${soundEnabled ? "text-success border-success/30 bg-success/5" : "text-muted-foreground border-input"}`}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>
        </div>
      </div>

      {/* Raise alert form (nurse only) */}
      {showRaiseForm && isNurse && (
        <div className="kpi-card mb-6 border-destructive/20">
          <h3 className="text-sm font-medium mb-3">Raise New Alert</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <select value={alertType} onChange={e => setAlertType(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select value={alertWard} onChange={e => setAlertWard(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">All Wards</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input value={alertMessage} onChange={e => setAlertMessage(e.target.value)} placeholder="Alert message..."
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <button onClick={raiseAlert} disabled={submitting || !alertMessage.trim()}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Alert"}
          </button>
        </div>
      )}

      {/* Priority summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { type: "critical", label: "Critical", count: alerts.filter(a => a.alert_type === "critical" && !a.acknowledged).length, cls: "status-critical" },
          { type: "warning", label: "Warning", count: alerts.filter(a => a.alert_type === "warning" && !a.acknowledged).length, cls: "status-warning" },
          { type: "info", label: "Info", count: alerts.filter(a => a.alert_type === "info" && !a.acknowledged).length, cls: "bg-info/10 text-info border border-info/20" },
          { type: "wait", label: "Avg Wait Time", count: null, cls: "bg-muted" },
        ].map(s => (
          <div key={s.type} className={`kpi-card flex items-center gap-3 ${s.cls} border`}>
            {s.type !== "wait" ? icon(s.type) : <Bell className="w-4 h-4 text-muted-foreground" />}
            <div>
              <p className="text-2xl font-bold">{s.count !== null ? s.count : `${avgWaitTime} min`}</p>
              <p className="text-xs opacity-80">{s.label}</p>
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
              {!alert.acknowledged && isDoctor && (
                <button onClick={() => acknowledge(alert.id)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition font-medium">
                  Respond
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
