import { useCodeBlueEvents, useWards } from "@/hooks/useDatabase";
import { AlertTriangle, Clock, Users, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CodeBlueManagement() {
  const { events, loading } = useCodeBlueEvents();
  const { wards } = useWards();

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));
  const withResponse = events.filter((e) => e.response_minutes);
  const avg = withResponse.length > 0 ? (withResponse.reduce((s, e) => s + (e.response_minutes || 0), 0) / withResponse.length).toFixed(1) : "N/A";
  const fastest = withResponse.length > 0 ? Math.min(...withResponse.map((e) => e.response_minutes!)) : null;
  const slowest = withResponse.length > 0 ? Math.max(...withResponse.map((e) => e.response_minutes!)) : null;

  // Ward averages
  const wardAvg = Object.entries(
    events.reduce<Record<string, number[]>>((acc, e) => {
      if (e.response_minutes && e.ward_id) {
        const name = wardMap[e.ward_id] || e.ward_id;
        acc[name] = acc[name] || [];
        acc[name].push(e.response_minutes);
      }
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
        <p className="page-description">Emergency response timeline and performance — real-time</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-sm text-muted-foreground">Avg Response</span>
          </div>
          <p className="text-3xl font-bold">{avg === "N/A" ? "N/A" : `${avg} min`}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">Fastest</span>
          </div>
          <p className="text-3xl font-bold text-success">{fastest !== null ? `${fastest} min` : "N/A"}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Slowest</span>
          </div>
          <p className="text-3xl font-bold text-destructive">{slowest !== null ? `${slowest} min` : "N/A"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Average Response by Ward</h3>
          {wardAvg.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={wardAvg}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ward" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit=" min" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="avg" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Avg (min)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No Code Blue events with response data yet</p>
          )}
        </div>

        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Code Blue Timeline</h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No Code Blue events recorded</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{wardMap[e.ward_id || ""] || "Unknown"}</span>
                      {e.response_minutes ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.response_minutes <= 3 ? "status-safe" : "status-warning"}`}>
                          {e.response_minutes} min
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full status-critical">Pending</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(e.trigger_time).toLocaleString()} · {e.outcome || "In Progress"}
                    </p>
                    {e.team_members && e.team_members.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{e.team_members.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
