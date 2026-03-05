import { useCodeBlueEvents, useWards, useAlerts, usePatients } from "@/hooks/useDatabase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, Users, CheckCircle, Zap, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { useState } from "react";

function TriggerCodeBlueForm({ wards, onTriggered }: { wards: any[]; onTriggered: () => void }) {
  const [wardId, setWardId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trigger = async () => {
    if (!wardId) { toast.error("Select a ward"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("code_blue_events").insert({
      ward_id: wardId,
      trigger_time: new Date().toISOString(),
    });
    if (error) toast.error("Failed to trigger Code Blue");
    else { toast.success("Code Blue triggered!"); setWardId(""); onTriggered(); }
    setSubmitting(false);
  };

  return (
    <div className="kpi-card mb-6 border-destructive/30">
      <h3 className="text-sm font-medium text-destructive mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4" /> Trigger Code Blue
      </h3>
      <div className="flex items-center gap-3">
        <select value={wardId} onChange={e => setWardId(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="">Select Ward</option>
          {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={trigger} disabled={submitting}
          className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
          {submitting ? "Triggering..." : "Trigger Code Blue"}
        </button>
      </div>
    </div>
  );
}

export default function CodeBlueManagement() {
  const { events, loading, refetch } = useCodeBlueEvents();
  const { wards } = useWards();
  const { alerts } = useAlerts();
  const { patients } = usePatients();
  const { user } = useAuth();
  const [responding, setResponding] = useState<string | null>(null);

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));
  const withResponse = events.filter((e) => e.response_minutes);
  const avg = withResponse.length > 0 ? (withResponse.reduce((s, e) => s + (e.response_minutes || 0), 0) / withResponse.length).toFixed(1) : "N/A";
  const fastest = withResponse.length > 0 ? Math.min(...withResponse.map((e) => e.response_minutes!)) : null;
  const slowest = withResponse.length > 0 ? Math.max(...withResponse.map((e) => e.response_minutes!)) : null;
  const underThreshold = withResponse.filter((e) => (e.response_minutes || 0) <= 3).length;
  const overThreshold = withResponse.filter((e) => (e.response_minutes || 0) > 3).length;

  const codeBlueAlerts = alerts.filter(a => a.alert_type === "critical" && a.message.toLowerCase().includes("code blue"));

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

  // Doctor responds and auto-alerts if > 3min
  const respondToEvent = async (eventId: string) => {
    setResponding(eventId);
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const triggerTime = new Date(event.trigger_time).getTime();
    const now = Date.now();
    const responseMinutes = +((now - triggerTime) / 60000).toFixed(1);
    const isFast = responseMinutes <= 3;

    const { error } = await supabase.from("code_blue_events").update({
      response_time: new Date().toISOString(),
      response_minutes: responseMinutes,
      outcome: isFast ? "Resolved - Fast Response" : "Resolved - Delayed Response",
      team_members: [...(event.team_members || []), user?.name || "Doctor"],
    }).eq("id", eventId);

    if (error) {
      toast.error("Failed to record response");
    } else {
      toast.success(`Response recorded: ${responseMinutes} min`);

      // Auto-alert if response exceeded 3 min threshold
      if (!isFast) {
        await supabase.from("alerts").insert({
          alert_type: "critical",
          message: `DELAYED RESPONSE: Code Blue in ${wardMap[event.ward_id || ""] || "Unknown Ward"} took ${responseMinutes} min (exceeds 3 min limit). Requires admin review.`,
          ward_id: event.ward_id,
        });
        toast.warning("Auto-alert sent: response exceeded 3 min threshold");
      }

      refetch();
    }
    setResponding(null);
  };

  const isNurse = user?.role === "nurse";
  const isDoctor = user?.role === "doctor" || user?.role === "admin";
  const pendingEvents = events.filter(e => !e.response_minutes);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Code Blue Management</h1>
        <p className="page-description">Emergency response timeline and performance — real-time</p>
      </div>

      {/* Nurse trigger form */}
      {isNurse && <TriggerCodeBlueForm wards={wards} onTriggered={refetch} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground">Avg Response</span></div>
          <p className="text-2xl font-bold">{avg === "N/A" ? "N/A" : `${avg} min`}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground">Fastest</span></div>
          <p className="text-2xl font-bold text-success">{fastest !== null ? `${fastest} min` : "N/A"}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Slowest</span></div>
          <p className="text-2xl font-bold text-destructive">{slowest !== null ? `${slowest} min` : "N/A"}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground">Under 3 min</span></div>
          <p className="text-2xl font-bold text-success">{underThreshold}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Over 3 min</span></div>
          <p className="text-2xl font-bold text-destructive">{overThreshold}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground">Pending</span></div>
          <p className="text-2xl font-bold text-warning">{pendingEvents.length}</p>
        </div>
      </div>

      {/* Pending events for doctor response */}
      {isDoctor && pendingEvents.length > 0 && (
        <div className="kpi-card mb-6 border-warning/30">
          <h3 className="text-sm font-medium text-warning mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Awaiting Doctor Response
          </h3>
          <div className="space-y-2">
            {pendingEvents.map((e) => {
              const waitMin = +((Date.now() - new Date(e.trigger_time).getTime()) / 60000).toFixed(1);
              return (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <span className="text-sm font-medium">{wardMap[e.ward_id || ""] || "Unknown Ward"}</span>
                    <span className="text-xs text-muted-foreground ml-3">Triggered {new Date(e.trigger_time).toLocaleString()}</span>
                    <span className={`ml-3 text-xs font-medium ${waitMin > 3 ? "text-destructive" : "text-warning"}`}>
                      Waiting: {waitMin} min
                    </span>
                  </div>
                  <button disabled={responding === e.id} onClick={() => respondToEvent(e.id)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition disabled:opacity-50">
                    {responding === e.id ? "Recording..." : "Respond Now"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.response_minutes <= 3 ? "status-safe" : "status-critical"}`}>
                          {e.response_minutes} min
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full status-critical">Pending</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(e.trigger_time).toLocaleString()} · {e.outcome || "Awaiting Response"}
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

      {codeBlueAlerts.length > 0 && (
        <div className="kpi-card mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Linked Code Blue Alerts</h3>
          <div className="space-y-2">
            {codeBlueAlerts.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-sm">
                <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                <span className="flex-1">{a.message}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                {a.acknowledged && <CheckCircle className="w-3 h-3 text-success" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
