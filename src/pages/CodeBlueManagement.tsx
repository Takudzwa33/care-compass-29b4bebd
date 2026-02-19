import { mockCodeBlueEvents } from "@/data/mockData";
import { AlertTriangle, Clock, Users, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CodeBlueManagement() {
  const avg = (mockCodeBlueEvents.reduce((s, e) => s + e.responseMinutes, 0) / mockCodeBlueEvents.length).toFixed(1);
  const fastest = Math.min(...mockCodeBlueEvents.map((e) => e.responseMinutes));
  const slowest = Math.max(...mockCodeBlueEvents.map((e) => e.responseMinutes));

  const wardAvg = Object.entries(
    mockCodeBlueEvents.reduce<Record<string, number[]>>((acc, e) => {
      acc[e.ward] = acc[e.ward] || [];
      acc[e.ward].push(e.responseMinutes);
      return acc;
    }, {})
  ).map(([ward, times]) => ({
    ward,
    avg: +(times.reduce((s, t) => s + t, 0) / times.length).toFixed(1),
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Code Blue Management</h1>
        <p className="page-description">Emergency response tracking and performance analysis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-sm text-muted-foreground">Avg Response</span>
          </div>
          <p className="text-3xl font-bold">{avg} min</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">Fastest</span>
          </div>
          <p className="text-3xl font-bold text-success">{fastest} min</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Slowest</span>
          </div>
          <p className="text-3xl font-bold text-destructive">{slowest} min</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Average Response by Ward</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wardAvg}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="ward" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit=" min" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="avg" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Avg Response (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Events</h3>
          <div className="space-y-3">
            {mockCodeBlueEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{e.ward} — {e.patientId}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.responseMinutes <= 3 ? "status-safe" : "status-warning"}`}>
                      {e.responseMinutes} min
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(e.triggerTime).toLocaleString()} · {e.outcome}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{e.team.join(", ")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
