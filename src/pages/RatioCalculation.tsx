import { usePatients, useNurses, useWards } from "@/hooks/useDatabase";
import { AlertTriangle, CheckCircle } from "lucide-react";
import RatioHeatmap from "@/components/RatioHeatmap";

export default function RatioCalculation() {
  const { patients } = usePatients();
  const { nurses } = useNurses();
  const { wards } = useWards();

  const wardRatios = wards.map((w) => {
    const wardNurses = nurses.filter((n) => n.ward_id === w.id && n.status === "On-Duty").length;
    const wardPatients = patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length;
    const patientsPerNurse = wardNurses > 0 ? wardPatients / wardNurses : 0;
    const ratio = wardNurses > 0 ? `1:${patientsPerNurse.toFixed(1)}` : "N/A";
    const status = wardNurses === 0 && wardPatients > 0 ? "critical" : patientsPerNurse <= w.safe_ratio_threshold ? "safe" : "critical";
    return { ward: w.name, nurses: wardNurses, patients: wardPatients, ratio, status, threshold: `1:${w.safe_ratio_threshold}` };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Nurse-to-Patient Ratio</h1>
        <p className="page-description">Real-time automated ratio calculations per ward with safety thresholds</p>
      </div>

      {/* Real-time Ratio Heatmap */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Real-Time Ratio Heatmap</h2>
        <RatioHeatmap />
      </div>

      {/* Detailed Ward Cards */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Detailed Ward Breakdown</h2>
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

      {wardRatios.length === 0 && (
        <div className="kpi-card text-center py-12">
          <p className="text-muted-foreground">No ward data available. Add wards, nurses, and patients to see ratios.</p>
        </div>
      )}
    </div>
  );
}
