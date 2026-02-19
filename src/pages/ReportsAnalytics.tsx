import { wardRatios, mockCodeBlueEvents, mockFeedback, ratioHistory } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { FileText, Download } from "lucide-react";

const COLORS = ["hsl(213,56%,24%)", "hsl(174,62%,38%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)", "hsl(205,80%,56%)"];

export default function ReportsAnalytics() {
  const satisfactionByWard = Object.entries(
    mockFeedback.reduce<Record<string, number[]>>((acc, f) => {
      acc[f.ward] = acc[f.ward] || [];
      acc[f.ward].push(f.satisfaction);
      return acc;
    }, {})
  ).map(([ward, scores]) => ({
    ward,
    satisfaction: +(scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1),
  }));

  const wardPatientData = wardRatios.map((w) => ({ name: w.ward, value: w.patients }));

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-description">Decision-making insights and performance evaluation</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Ratio Trends Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={ratioHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="ICU" stroke={COLORS[0]} strokeWidth={2} />
              <Line type="monotone" dataKey="General" stroke={COLORS[1]} strokeWidth={2} />
              <Line type="monotone" dataKey="Pediatrics" stroke={COLORS[4]} strokeWidth={2} />
              <Line type="monotone" dataKey="Surgery" stroke={COLORS[2]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Patient Satisfaction by Ward</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={satisfactionByWard}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="ward" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="satisfaction" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Patient Distribution by Ward</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={wardPatientData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {wardPatientData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Code Blue Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Total Events</span>
              <span className="font-bold">{mockCodeBlueEvents.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Average Response</span>
              <span className="font-bold">{(mockCodeBlueEvents.reduce((s, e) => s + e.responseMinutes, 0) / mockCodeBlueEvents.length).toFixed(1)} min</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Under 3 min</span>
              <span className="font-bold text-success">{mockCodeBlueEvents.filter((e) => e.responseMinutes <= 3).length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Over 3 min</span>
              <span className="font-bold text-destructive">{mockCodeBlueEvents.filter((e) => e.responseMinutes > 3).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
