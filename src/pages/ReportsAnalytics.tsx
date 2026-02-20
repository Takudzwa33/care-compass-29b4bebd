import { useWards, useCodeBlueEvents, useFeedback, usePatients, useNurses } from "@/hooks/useDatabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download } from "lucide-react";

const COLORS = ["hsl(213,56%,24%)", "hsl(174,62%,38%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)", "hsl(205,80%,56%)"];

export default function ReportsAnalytics() {
  const { patients } = usePatients();
  const { nurses } = useNurses();
  const { events: codeBlueEvents } = useCodeBlueEvents();
  const { feedback } = useFeedback();
  const { wards } = useWards();

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));

  const wardPatientData = wards.map((w) => ({
    name: w.name,
    value: patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length,
  }));

  const withResponse = codeBlueEvents.filter((e) => e.response_minutes);

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

        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Code Blue Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Total Events</span>
              <span className="font-bold">{codeBlueEvents.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Average Response</span>
              <span className="font-bold">{withResponse.length > 0 ? `${(withResponse.reduce((s, e) => s + (e.response_minutes || 0), 0) / withResponse.length).toFixed(1)} min` : "N/A"}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Under 3 min</span>
              <span className="font-bold text-success">{withResponse.filter((e) => (e.response_minutes || 0) <= 3).length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Over 3 min</span>
              <span className="font-bold text-destructive">{withResponse.filter((e) => (e.response_minutes || 0) > 3).length}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Avg Satisfaction</span>
              <span className="font-bold">{feedback.length > 0 ? `${(feedback.reduce((s, f) => s + f.satisfaction, 0) / feedback.length).toFixed(1)}/5` : "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
