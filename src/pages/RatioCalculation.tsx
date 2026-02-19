import { wardRatios, ratioHistory } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function RatioCalculation() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Nurse-to-Patient Ratio</h1>
        <p className="page-description">Automated ratio calculations per ward and shift with safety thresholds</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {wardRatios.map((w) => (
          <div key={w.ward} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{w.ward} Ward</h3>
              {w.status === "safe" ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive animate-pulse-slow" />
              )}
            </div>
            <p className="text-4xl font-bold mb-2">{w.ratio}</p>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{w.nurses} nurses · {w.patients} patients</span>
              <span>Threshold: {w.threshold}</span>
            </div>
            <div className={`mt-3 px-3 py-1.5 rounded-md text-xs font-medium text-center ${w.status === "safe" ? "status-safe" : "status-critical"}`}>
              {w.status === "safe" ? "Within Safe Range" : "EXCEEDS THRESHOLD"}
            </div>
          </div>
        ))}
      </div>

      <div className="kpi-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Historical Ratio Trends (Patients per Nurse)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={ratioHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Patients per Nurse", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend />
            <Line type="monotone" dataKey="ICU" stroke="hsl(var(--destructive))" strokeWidth={2} />
            <Line type="monotone" dataKey="General" stroke="hsl(var(--accent))" strokeWidth={2} />
            <Line type="monotone" dataKey="Pediatrics" stroke="hsl(var(--info))" strokeWidth={2} />
            <Line type="monotone" dataKey="Surgery" stroke="hsl(var(--warning))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
