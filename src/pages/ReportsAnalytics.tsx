import { useWards, useCodeBlueEvents, useFeedback, usePatients, useNurses, useAlerts } from "@/hooks/useDatabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, Clock, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";

const COLORS = ["hsl(213,56%,24%)", "hsl(174,62%,38%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)", "hsl(205,80%,56%)"];

export default function ReportsAnalytics() {
  const { patients } = usePatients();
  const { nurses } = useNurses();
  const { events: codeBlueEvents } = useCodeBlueEvents();
  const { feedback } = useFeedback();
  const { wards } = useWards();
  const { alerts } = useAlerts();

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));

  // Patient distribution
  const wardPatientData = wards.map((w) => ({
    name: w.name,
    value: patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length,
  }));

  // Code blue response stats
  const withResponse = codeBlueEvents.filter((e) => e.response_minutes);
  const avgResponse = withResponse.length > 0
    ? (withResponse.reduce((s, e) => s + (e.response_minutes || 0), 0) / withResponse.length).toFixed(1)
    : "N/A";
  const fastest = withResponse.length > 0 ? Math.min(...withResponse.map(e => e.response_minutes!)) : null;
  const slowest = withResponse.length > 0 ? Math.max(...withResponse.map(e => e.response_minutes!)) : null;
  const underThreshold = withResponse.filter(e => (e.response_minutes || 0) <= 3).length;
  const overThreshold = withResponse.filter(e => (e.response_minutes || 0) > 3).length;

  // Average waiting time (from alert creation to acknowledgment using code blue response data)
  const avgWaitTime = avgResponse;

  // Alert statistics
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(a => a.alert_type === "critical").length;
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged).length;
  const acknowledgementRate = totalAlerts > 0 ? ((acknowledgedAlerts / totalAlerts) * 100).toFixed(0) : "0";

  // Response time trend (last 20 code blues)
  const responseTrend = withResponse
    .slice(0, 20)
    .reverse()
    .map((e, i) => ({
      event: `#${i + 1}`,
      time: e.response_minutes,
      threshold: 3,
    }));

  // Alert distribution by type
  const alertDistribution = [
    { name: "Critical", value: alerts.filter(a => a.alert_type === "critical").length },
    { name: "Warning", value: alerts.filter(a => a.alert_type === "warning").length },
    { name: "Info", value: alerts.filter(a => a.alert_type === "info").length },
  ].filter(d => d.value > 0);

  const alertColors = ["hsl(0,72%,51%)", "hsl(38,92%,50%)", "hsl(205,80%,56%)"];

  // Ward-level code blue data
  const wardCodeBlue = wards.map(w => {
    const wardEvents = codeBlueEvents.filter(e => e.ward_id === w.id && e.response_minutes);
    const wardAlerts = alerts.filter(a => a.ward_id === w.id);
    return {
      ward: w.name,
      events: codeBlueEvents.filter(e => e.ward_id === w.id).length,
      avgResponse: wardEvents.length > 0
        ? +(wardEvents.reduce((s, e) => s + (e.response_minutes || 0), 0) / wardEvents.length).toFixed(1)
        : 0,
      alerts: wardAlerts.length,
    };
  }).filter(w => w.events > 0 || w.alerts > 0);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-description">Decision-making insights linking alerts, code blues, and performance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted-foreground">Avg Wait Time</span>
          </div>
          <p className="text-2xl font-bold">{avgWaitTime} min</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Fastest</span>
          </div>
          <p className="text-2xl font-bold text-success">{fastest !== null ? `${fastest} min` : "N/A"}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Slowest</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{slowest !== null ? `${slowest} min` : "N/A"}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Under 3 min</span>
          </div>
          <p className="text-2xl font-bold text-success">{underThreshold}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Over 3 min</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{overThreshold}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-info" />
            <span className="text-xs text-muted-foreground">Ack Rate</span>
          </div>
          <p className="text-2xl font-bold">{acknowledgementRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Response time trend */}
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Response Time Trend</h3>
          {responseTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={responseTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="event" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit=" min" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="time" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Response (min)" />
                <Line type="monotone" dataKey="threshold" stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={1} dot={false} name="3 min Threshold" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No response data yet</p>
          )}
        </div>

        {/* Alert distribution */}
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Alert Distribution</h3>
          {alertDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={alertDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {alertDistribution.map((_, i) => (
                    <Cell key={i} fill={alertColors[i % alertColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No alerts data</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ward-level performance */}
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Ward Performance (Code Blue + Alerts)</h3>
          {wardCodeBlue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={wardCodeBlue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ward" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="events" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Code Blues" />
                <Bar dataKey="alerts" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Alerts" />
                <Bar dataKey="avgResponse" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avg Response (min)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No ward data available</p>
          )}
        </div>

        {/* Patient distribution */}
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Patient Distribution by Ward</h3>
          {wardPatientData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={wardPatientData.filter((d) => d.value > 0)} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {wardPatientData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No patient data</p>
          )}
        </div>
      </div>

      {/* Detailed summary table */}
      <div className="kpi-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Code Blue & Alert Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Total Code Blues</span>
            <p className="text-xl font-bold mt-1">{codeBlueEvents.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Total Alerts</span>
            <p className="text-xl font-bold mt-1">{totalAlerts}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Critical Alerts</span>
            <p className="text-xl font-bold mt-1 text-destructive">{criticalAlerts}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Avg Satisfaction</span>
            <p className="text-xl font-bold mt-1">{feedback.length > 0 ? `${(feedback.reduce((s, f) => s + f.satisfaction, 0) / feedback.length).toFixed(1)}/5` : "N/A"}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Avg Wait Time</span>
            <p className="text-xl font-bold mt-1">{avgWaitTime} min</p>
          </div>
        </div>
      </div>
    </div>
  );
}
