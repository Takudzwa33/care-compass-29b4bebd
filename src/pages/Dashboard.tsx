import { Activity, Users, Stethoscope, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { wardRatios, mockCodeBlueEvents, mockAlerts, mockPatients, mockNurses } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { ratioHistory } from "@/data/mockData";
import { motion } from "framer-motion";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const activePatients = mockPatients.filter((p) => !p.dischargeDate).length;
  const onDutyNurses = mockNurses.filter((n) => n.status === "On-Duty").length;
  const avgResponseTime = (mockCodeBlueEvents.reduce((s, e) => s + e.responseMinutes, 0) / mockCodeBlueEvents.length).toFixed(1);
  const criticalAlerts = mockAlerts.filter((a) => !a.acknowledged && a.type === "critical").length;

  const kpis = [
    { label: "Active Patients", value: activePatients, icon: Users, color: "text-info" },
    { label: "On-Duty Nurses", value: onDutyNurses, icon: Stethoscope, color: "text-accent" },
    { label: "Avg Response Time", value: `${avgResponseTime} min`, icon: Clock, color: "text-warning" },
    { label: "Critical Alerts", value: criticalAlerts, icon: AlertTriangle, color: "text-destructive" },
  ];

  const wardData = wardRatios.map((w) => ({
    ward: w.ward,
    nurses: w.nurses,
    patients: w.patients,
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of hospital performance and key metrics</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} variants={item} className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div variants={item} initial="hidden" animate="show" className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Staff vs Patients by Ward</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={wardData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="ward" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="nurses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Nurses" />
              <Bar dataKey="patients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Patients" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Nurse-Patient Ratio Trend (Patients per Nurse)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ratioHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="ICU" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="General" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Pediatrics" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Surgery" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Ward Ratio Status */}
      <motion.div variants={item} initial="hidden" animate="show" className="kpi-card mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Current Ward Ratios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {wardRatios.map((w) => (
            <div key={w.ward} className={`rounded-lg border p-4 ${w.status === "safe" ? "status-safe" : w.status === "warning" ? "status-warning" : "status-critical"}`}>
              <p className="font-medium text-sm">{w.ward}</p>
              <p className="text-2xl font-bold mt-1">{w.ratio}</p>
              <p className="text-xs mt-1 opacity-80">Threshold: {w.threshold}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Alerts */}
      <motion.div variants={item} initial="hidden" animate="show" className="kpi-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Alerts</h3>
        <div className="space-y-3">
          {mockAlerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.type === "critical" ? "status-critical" : alert.type === "warning" ? "status-warning" : "bg-info/10 text-info border-info/20"}`}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs opacity-70 mt-1">{alert.ward} · {new Date(alert.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
