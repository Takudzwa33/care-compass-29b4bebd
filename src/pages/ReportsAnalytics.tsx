import { useState, useMemo } from "react";
import { useWards, useCodeBlueEvents, useFeedback, usePatients, useNurses, useAlerts } from "@/hooks/useDatabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Download, Clock, AlertTriangle, TrendingUp, CheckCircle, FileText, Users, Stethoscope, TableIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "Custom", value: "custom" },
] as const;

const COLORS = ["hsl(213,56%,24%)", "hsl(174,62%,38%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)", "hsl(205,80%,56%)"];

function exportPDF(data: {
  avgResponse: string; fastest: number | null; slowest: number | null;
  underThreshold: number; overThreshold: number; acknowledgementRate: string;
  totalAlerts: number; criticalAlerts: number; codeBlueCount: number;
  avgSatisfaction: string; avgResponsiveness: string; avgWaitTime: string;
  wardCodeBlue: { ward: string; events: number; avgResponse: number; alerts: number }[];
  wardRatios: { ward: string; nurses: number; patients: number; ratio: string; threshold: string; status: string }[];
  feedbackCount: number;
}) {
  import("jspdf").then(({ jsPDF }) => {
    import("jspdf-autotable").then(() => {
      const doc = new jsPDF();
      const now = new Date().toLocaleString();

      doc.setFontSize(18);
      doc.text("Hospital Reports & Analytics", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${now}`, 14, 28);

      // KPIs
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Key Performance Indicators", 14, 40);

      const kpiData = [
        ["Avg Response Time", `${data.avgResponse} min`],
        ["Fastest Response", data.fastest !== null ? `${data.fastest} min` : "N/A"],
        ["Slowest Response", data.slowest !== null ? `${data.slowest} min` : "N/A"],
        ["Under 3 min", String(data.underThreshold)],
        ["Over 3 min", String(data.overThreshold)],
        ["Acknowledgement Rate", `${data.acknowledgementRate}%`],
        ["Total Alerts", String(data.totalAlerts)],
        ["Critical Alerts", String(data.criticalAlerts)],
        ["Total Code Blues", String(data.codeBlueCount)],
        ["Avg Satisfaction", data.avgSatisfaction],
        ["Avg Nurse Responsiveness", data.avgResponsiveness],
        ["Total Feedback Entries", String(data.feedbackCount)],
      ];

      (doc as any).autoTable({
        startY: 45,
        head: [["Metric", "Value"]],
        body: kpiData,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 95] },
      });

      // Nurse-Patient Ratios
      let y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text("Nurse-to-Patient Ratios by Ward", 14, y);

      (doc as any).autoTable({
        startY: y + 5,
        head: [["Ward", "Nurses", "Patients", "Ratio", "Threshold", "Status"]],
        body: data.wardRatios.map(w => [w.ward, w.nurses, w.patients, w.ratio, w.threshold, w.status === "safe" ? "Safe" : w.status === "empty" ? "Empty" : "CRITICAL"]),
        theme: "grid",
        headStyles: { fillColor: [30, 58, 95] },
        bodyStyles: { fontSize: 9 },
      });

      // Ward Performance
      y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.text("Ward Performance (Code Blue & Alerts)", 14, y);

      if (data.wardCodeBlue.length > 0) {
        (doc as any).autoTable({
          startY: y + 5,
          head: [["Ward", "Code Blues", "Avg Response (min)", "Alerts"]],
          body: data.wardCodeBlue.map(w => [w.ward, w.events, w.avgResponse, w.alerts]),
          theme: "grid",
          headStyles: { fillColor: [30, 58, 95] },
        });
      }

      doc.save(`hospital-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF report downloaded");
    });
  });
}

function exportExcel(data: {
  wardRatios: { ward: string; nurses: number; patients: number; ratio: string; threshold: string; status: string }[];
  wardCodeBlue: { ward: string; events: number; avgResponse: number; alerts: number }[];
  kpis: [string, string | number][];
}) {
  import("xlsx").then((XLSX) => {
    const wb = XLSX.utils.book_new();

    // KPIs sheet
    const kpiWs = XLSX.utils.aoa_to_sheet([["Metric", "Value"], ...data.kpis]);
    kpiWs["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, kpiWs, "KPIs");

    // Ward Ratios sheet
    const ratioWs = XLSX.utils.json_to_sheet(data.wardRatios.map(w => ({
      Ward: w.ward, Nurses: w.nurses, Patients: w.patients, Ratio: w.ratio, Threshold: w.threshold, Status: w.status === "safe" ? "Safe" : w.status === "empty" ? "Empty" : "Critical"
    })));
    ratioWs["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ratioWs, "Ward Ratios");

    // Ward Performance sheet
    if (data.wardCodeBlue.length > 0) {
      const perfWs = XLSX.utils.json_to_sheet(data.wardCodeBlue.map(w => ({
        Ward: w.ward, "Code Blues": w.events, "Avg Response (min)": w.avgResponse, Alerts: w.alerts
      })));
      XLSX.utils.book_append_sheet(wb, perfWs, "Ward Performance");
    }

    XLSX.writeFile(wb, `hospital-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel report downloaded");
  });
}

export default function ReportsAnalytics() {
  const { patients } = usePatients();
  const { nurses } = useNurses();
  const { events: codeBlueEvents } = useCodeBlueEvents();
  const { feedback } = useFeedback();
  const { wards } = useWards();
  const { alerts } = useAlerts();

  const [preset, setPreset] = useState<typeof DATE_PRESETS[number]["value"]>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "today": return { from: startOfDay(now), to: endOfDay(now) };
      case "7d": return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case "30d": return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case "90d": return { from: startOfDay(subDays(now, 90)), to: endOfDay(now) };
      case "custom": return customFrom && customTo ? { from: startOfDay(customFrom), to: endOfDay(customTo) } : null;
      default: return null;
    }
  }, [preset, customFrom, customTo]);

  const inRange = (dateStr: string) => {
    if (!dateRange) return true;
    const d = new Date(dateStr);
    return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
  };

  // Filter time-based data by date range
  const filteredAlerts = useMemo(() => alerts.filter(a => inRange(a.created_at)), [alerts, dateRange]);
  const filteredCodeBlue = useMemo(() => codeBlueEvents.filter(e => inRange(e.trigger_time)), [codeBlueEvents, dateRange]);
  const filteredFeedback = useMemo(() => feedback.filter(f => inRange(f.created_at)), [feedback, dateRange]);

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));

  const wardPatientData = wards.map((w) => ({
    name: w.name,
    value: patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length,
  }));

  // Nurse-patient ratio data
  const wardRatioData = wards.map((w) => {
    const wardNurses = nurses.filter((n) => n.ward_id === w.id && n.status === "On-Duty").length;
    const wardPatients = patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length;
    const patientsPerNurse = wardNurses > 0 ? wardPatients / wardNurses : 0;
    const ratio = wardNurses > 0 ? `1:${patientsPerNurse.toFixed(1)}` : "N/A";
    const status = wardNurses === 0 ? (wardPatients > 0 ? "critical" : "empty") : patientsPerNurse <= w.safe_ratio_threshold ? "safe" : "critical";
    return { ward: w.name, nurses: wardNurses, patients: wardPatients, ratio, patientsPerNurse, threshold: `1:${w.safe_ratio_threshold}`, status };
  });

  const wardRatioChartData = wardRatioData.map(w => ({
    ward: w.ward,
    ratio: w.patientsPerNurse,
    threshold: Number(w.threshold.replace("1:", "")),
  }));

  const withResponse = filteredCodeBlue.filter((e) => e.response_minutes);
  const avgResponse = withResponse.length > 0
    ? (withResponse.reduce((s, e) => s + (e.response_minutes || 0), 0) / withResponse.length).toFixed(1)
    : "N/A";
  const fastest = withResponse.length > 0 ? Math.min(...withResponse.map(e => e.response_minutes!)) : null;
  const slowest = withResponse.length > 0 ? Math.max(...withResponse.map(e => e.response_minutes!)) : null;
  const underThreshold = withResponse.filter(e => (e.response_minutes || 0) <= 3).length;
  const overThreshold = withResponse.filter(e => (e.response_minutes || 0) > 3).length;
  const avgWaitTime = avgResponse;

  const totalAlerts = filteredAlerts.length;
  const criticalAlerts = filteredAlerts.filter(a => a.alert_type === "critical").length;
  const acknowledgedAlerts = filteredAlerts.filter(a => a.acknowledged).length;
  const acknowledgementRate = totalAlerts > 0 ? ((acknowledgedAlerts / totalAlerts) * 100).toFixed(0) : "0";

  const responseTrend = withResponse.slice(0, 20).reverse().map((e, i) => ({
    event: `#${i + 1}`, time: e.response_minutes, threshold: 3,
  }));

  const alertDistribution = [
    { name: "Critical", value: filteredAlerts.filter(a => a.alert_type === "critical").length },
    { name: "Warning", value: filteredAlerts.filter(a => a.alert_type === "warning").length },
    { name: "Info", value: filteredAlerts.filter(a => a.alert_type === "info").length },
  ].filter(d => d.value > 0);

  const alertColors = ["hsl(0,72%,51%)", "hsl(38,92%,50%)", "hsl(205,80%,56%)"];

  const wardCodeBlue = wards.map(w => {
    const wardEvents = filteredCodeBlue.filter(e => e.ward_id === w.id && e.response_minutes);
    const wardAlerts = filteredAlerts.filter(a => a.ward_id === w.id);
    return {
      ward: w.name,
      events: filteredCodeBlue.filter(e => e.ward_id === w.id).length,
      avgResponse: wardEvents.length > 0
        ? +(wardEvents.reduce((s, e) => s + (e.response_minutes || 0), 0) / wardEvents.length).toFixed(1)
        : 0,
      alerts: wardAlerts.length,
    };
  }).filter(w => w.events > 0 || w.alerts > 0);

  const avgSatisfaction = filteredFeedback.length > 0 ? `${(filteredFeedback.reduce((s, f) => s + f.satisfaction, 0) / filteredFeedback.length).toFixed(1)}/5` : "N/A";
  const avgResponsiveness = filteredFeedback.length > 0 ? `${(filteredFeedback.reduce((s, f) => s + f.nurse_responsiveness, 0) / filteredFeedback.length).toFixed(1)}/5` : "N/A";

  const activePatients = patients.filter(p => !p.discharge_date).length;
  const onDutyNurses = nurses.filter(n => n.status === "On-Duty").length;
  const overallRatio = onDutyNurses > 0 ? (activePatients / onDutyNurses).toFixed(1) : "N/A";

  const exportData = {
    avgResponse, fastest, slowest, underThreshold, overThreshold,
    acknowledgementRate, totalAlerts, criticalAlerts,
    codeBlueCount: filteredCodeBlue.length, avgSatisfaction, avgResponsiveness,
    avgWaitTime, wardCodeBlue, feedbackCount: filteredFeedback.length,
    wardRatios: wardRatioData.map(w => ({ ward: w.ward, nurses: w.nurses, patients: w.patients, ratio: w.ratio, threshold: w.threshold, status: w.status })),
  };

  const handleExportPDF = () => exportPDF(exportData);

  const handleExportExcel = () => {
    exportExcel({
      wardRatios: exportData.wardRatios,
      wardCodeBlue: exportData.wardCodeBlue,
      kpis: [
        ["Active Patients", activePatients],
        ["On-Duty Nurses", onDutyNurses],
        ["Overall Ratio", `1:${overallRatio}`],
        ["Avg Response Time", `${avgResponse} min`],
        ["Fastest Response", fastest !== null ? `${fastest} min` : "N/A"],
        ["Slowest Response", slowest !== null ? `${slowest} min` : "N/A"],
        ["Under 3 min", underThreshold],
        ["Over 3 min", overThreshold],
        ["Acknowledgement Rate", `${acknowledgementRate}%`],
        ["Total Alerts", totalAlerts],
        ["Critical Alerts", criticalAlerts],
        ["Total Code Blues", filteredCodeBlue.length],
        ["Avg Satisfaction", avgSatisfaction],
        ["Avg Nurse Responsiveness", avgResponsiveness],
        ["Feedback Entries", filteredFeedback.length],
        ["Date Range", dateRange ? `${format(dateRange.from, "PP")} – ${format(dateRange.to, "PP")}` : "All Time"],
      ],
    });
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-description">Decision-making insights linking ratios, alerts, code blues, and feedback</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition border border-border">
            <TableIcon className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
        {DATE_PRESETS.map(p => (
          <button key={p.value} onClick={() => setPreset(p.value)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              preset === p.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted")}>
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs", !customFrom && "text-muted-foreground")}>
                  {customFrom ? format(customFrom, "PP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs", !customTo && "text-muted-foreground")}>
                  {customTo ? format(customTo, "PP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
        {dateRange && (
          <span className="text-xs text-muted-foreground ml-2">
            Showing: {format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")}
          </span>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-info" /><span className="text-xs text-muted-foreground">Patients</span></div><p className="text-2xl font-bold">{activePatients}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><Stethoscope className="w-4 h-4 text-accent" /><span className="text-xs text-muted-foreground">On-Duty</span></div><p className="text-2xl font-bold">{onDutyNurses}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Overall Ratio</span></div><p className="text-2xl font-bold">1:{overallRatio}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground">Avg Response</span></div><p className="text-2xl font-bold">{avgWaitTime} min</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground">Under 3 min</span></div><p className="text-2xl font-bold text-success">{underThreshold}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Over 3 min</span></div><p className="text-2xl font-bold text-destructive">{overThreshold}</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-info" /><span className="text-xs text-muted-foreground">Ack Rate</span></div><p className="text-2xl font-bold">{acknowledgementRate}%</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground">Satisfaction</span></div><p className="text-2xl font-bold">{avgSatisfaction}</p></div>
      </div>

      {/* Nurse-Patient Ratio Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Nurse-to-Patient Ratio by Ward</h3>
          {wardRatioChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={wardRatioChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ward" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Patients/Nurse", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="ratio" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Actual Ratio" />
                <Bar dataKey="threshold" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Threshold" opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No ratio data</p>
          )}
        </div>

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Alert Distribution</h3>
          {alertDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={alertDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {alertDistribution.map((_, i) => <Cell key={i} fill={alertColors[i % alertColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No alerts data</p>
          )}
        </div>

        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Patient Distribution by Ward</h3>
          {wardPatientData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={wardPatientData.filter((d) => d.value > 0)} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {wardPatientData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No patient data</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

        {/* Ward Ratio Table */}
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Ward Ratio Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Ward</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Nurses</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Patients</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Ratio</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {wardRatioData.map(w => (
                  <tr key={w.ward} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{w.ward}</td>
                    <td className="py-2 px-3 text-center">{w.nurses}</td>
                    <td className="py-2 px-3 text-center">{w.patients}</td>
                    <td className="py-2 px-3 text-center font-bold">{w.ratio}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.status === "safe" ? "status-safe" : w.status === "empty" ? "bg-muted text-muted-foreground" : "status-critical"}`}>
                        {w.status === "safe" ? "Safe" : w.status === "empty" ? "Empty" : "Critical"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground">Total Code Blues</span><p className="text-xl font-bold mt-1">{filteredCodeBlue.length}</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground">Total Alerts</span><p className="text-xl font-bold mt-1">{totalAlerts}</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground">Critical Alerts</span><p className="text-xl font-bold mt-1 text-destructive">{criticalAlerts}</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground">Avg Satisfaction</span><p className="text-xl font-bold mt-1">{avgSatisfaction}</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground">Nurse Responsiveness</span><p className="text-xl font-bold mt-1">{avgResponsiveness}</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><span className="text-xs text-muted-foreground">Feedback Entries</span><p className="text-xl font-bold mt-1">{filteredFeedback.length}</p></div>
        </div>
      </div>
    </div>
  );
}