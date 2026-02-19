import { mockAlerts } from "@/data/mockData";
import { AlertTriangle, Bell, Info, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function AlertsNotifications() {
  const [alerts, setAlerts] = useState(mockAlerts);

  const acknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const icon = (type: string) => {
    if (type === "critical") return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (type === "warning") return <Bell className="w-4 h-4 text-warning" />;
    return <Info className="w-4 h-4 text-info" />;
  };

  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Alerts & Notifications</h1>
        <p className="page-description">Real-time warnings and system notifications — {unacknowledged} unacknowledged</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`kpi-card flex items-start gap-4 ${alert.acknowledged ? "opacity-60" : ""}`}
          >
            <div className="mt-0.5">{icon(alert.type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${alert.type === "critical" ? "status-critical" : alert.type === "warning" ? "status-warning" : "bg-info/10 text-info border border-info/20"}`}>
                  {alert.type}
                </span>
                <span className="text-xs text-muted-foreground">{alert.ward}</span>
              </div>
              <p className="text-sm font-medium">{alert.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
            </div>
            {!alert.acknowledged && (
              <button
                onClick={() => acknowledge(alert.id)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-muted transition text-muted-foreground hover:text-foreground"
              >
                Acknowledge
              </button>
            )}
            {alert.acknowledged && <CheckCircle className="w-4 h-4 text-success shrink-0 mt-1" />}
          </div>
        ))}
      </div>
    </div>
  );
}
