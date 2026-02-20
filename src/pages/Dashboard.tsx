import { Activity, Users, Stethoscope, AlertTriangle, Clock } from "lucide-react";
import { usePatients, useNurses, useCodeBlueEvents, useAlerts, useWards } from "@/hooks/useDatabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { patients } = usePatients();
  const { nurses } = useNurses();
  const { events: codeBlueEvents } = useCodeBlueEvents();
  const { alerts } = useAlerts();
  const { wards } = useWards();

  const activePatients = patients.filter((p) => !p.discharge_date).length;
  const onDutyNurses = nurses.filter((n) => n.status === "On-Duty").length;
  const avgResponseTime = codeBlueEvents.length > 0
    ? (codeBlueEvents.reduce((s, e) => s + (e.response_minutes || 0), 0) / codeBlueEvents.filter(e => e.response_minutes).length).toFixed(1)
    : "N/A";
  const criticalAlerts = alerts.filter((a) => !a.acknowledged && a.alert_type === "critical").length;

  const kpis = [
    { label: "Active Patients", value: activePatients, icon: Users, color: "text-info" },
    { label: "On-Duty Nurses", value: onDutyNurses, icon: Stethoscope, color: "text-accent" },
    { label: "Avg Response Time", value: avgResponseTime === "N/A" ? "N/A" : `${avgResponseTime} min`, icon: Clock, color: "text-warning" },
    { label: "Critical Alerts", value: criticalAlerts, icon: AlertTriangle, color: "text-destructive" },
  ];

  // Compute ward data for chart
  const wardData = wards.map((w) => {
    const wardNurses = nurses.filter((n) => n.ward_id === w.id && n.status === "On-Duty").length;
    const wardPatients = patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length;
    return { ward: w.name, nurses: wardNurses, patients: wardPatients };
  });

  // Compute ward ratios
  const wardRatioData = wards.map((w) => {
    const wardNurses = nurses.filter((n) => n.ward_id === w.id && n.status === "On-Duty").length;
    const wardPatients = patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length;
    const ratio = wardNurses > 0 ? `1:${(wardPatients / wardNurses).toFixed(1)}` : "N/A";
    const patientsPerNurse = wardNurses > 0 ? wardPatients / wardNurses : 0;
    const status = patientsPerNurse <= w.safe_ratio_threshold ? "safe" : "critical";
    return { ward: w.name, ratio, nurses: wardNurses, patients: wardPatients, threshold: `1:${w.safe_ratio_threshold}`, status };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of hospital performance and key metrics — real-time</p>
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
          {wardData.length > 0 ? (
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
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No data yet. Add nurses and patients to see charts.</p>
          )}
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Current Ward Ratios</h3>
          <div className="grid grid-cols-1 gap-3">
            {wardRatioData.map((w) => (
              <div key={w.ward} className={`rounded-lg border p-4 ${w.status === "safe" ? "status-safe" : "status-critical"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{w.ward}</p>
                    <p className="text-xs mt-0.5 opacity-80">{w.nurses} nurses · {w.patients} patients</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{w.ratio}</p>
                    <p className="text-xs opacity-80">Threshold: {w.threshold}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Alerts */}
      <motion.div variants={item} initial="hidden" animate="show" className="kpi-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Alerts</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.alert_type === "critical" ? "status-critical" : alert.alert_type === "warning" ? "status-warning" : "bg-info/10 text-info border-info/20"}`}>
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
