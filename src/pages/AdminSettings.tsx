import { useState } from "react";
import { Settings, Users, Bell, Shield, Database } from "lucide-react";

export default function AdminSettings() {
  const [thresholds, setThresholds] = useState({
    ICU: "1:2",
    General: "1:6",
    Pediatrics: "1:4",
    Surgery: "1:4",
    Emergency: "1:3",
  });

  const [codeBlueTarget, setCodeBlueTarget] = useState("3");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin & System Configuration</h1>
        <p className="page-description">System control, thresholds, and user management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ratio Thresholds */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Safe Ratio Thresholds</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(thresholds).map(([ward, value]) => (
              <div key={ward} className="flex items-center justify-between">
                <label className="text-sm">{ward} Ward</label>
                <input
                  value={value}
                  onChange={(e) => setThresholds((p) => ({ ...p, [ward]: e.target.value }))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Alert Rules */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Alert Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Code Blue Target Response (minutes)</label>
              <input
                type="number"
                value={codeBlueTarget}
                onChange={(e) => setCodeBlueTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              {["Nurse shortage alerts", "Code Blue delay alerts", "High patient load alerts"].map((rule) => (
                <label key={rule} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" defaultChecked className="rounded border-input" />
                  {rule}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">User Management</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Dr. Admin", role: "Administrator", email: "admin@hospital.com" },
              { name: "Sarah Johnson", role: "Nurse", email: "nurse@hospital.com" },
              { name: "Dr. Michael Chen", role: "Doctor", email: "doctor@hospital.com" },
              { name: "Team Lead James", role: "Emergency", email: "emergency@hospital.com" },
            ].map((u) => (
              <div key={u.email} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Logs */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">System Logs</h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {[
              { time: "09:01:23", msg: "User admin@hospital.com logged in", level: "info" },
              { time: "09:00:15", msg: "Alert triggered: ICU ratio exceeded", level: "warn" },
              { time: "08:45:02", msg: "Code Blue event CB003 recorded", level: "info" },
              { time: "08:17:30", msg: "Code Blue response logged: 2.5 min", level: "info" },
              { time: "07:30:00", msg: "High patient load alert: General Ward", level: "warn" },
            ].map((log, i) => (
              <div key={i} className={`p-2 rounded ${log.level === "warn" ? "bg-warning/10 text-warning" : "bg-muted/50 text-muted-foreground"}`}>
                <span className="opacity-60">[{log.time}]</span> {log.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
