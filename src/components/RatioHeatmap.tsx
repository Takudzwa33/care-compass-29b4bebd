import { usePatients, useNurses, useWards } from "@/hooks/useDatabase";
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

function getHeatColor(ratio: number, threshold: number): string {
  if (ratio === 0) return "bg-muted border-border";
  const pct = ratio / threshold;
  if (pct <= 0.7) return "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400";
  if (pct <= 1.0) return "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400";
  return "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400";
}

interface RatioHeatmapProps {
  shiftFilter?: "Day" | "Night";
}

export default function RatioHeatmap({ shiftFilter }: RatioHeatmapProps) {
  const { patients } = usePatients();
  const { nurses } = useNurses();
  const { wards } = useWards();

  const filteredNurses = shiftFilter ? nurses.filter(n => n.shift === shiftFilter) : nurses;

  const wardData = wards.map((w) => {
    const wardNurses = filteredNurses.filter((n) => n.ward_id === w.id && n.status === "On-Duty").length;
    const wardPatients = patients.filter((p) => p.ward_id === w.id && !p.discharge_date).length;
    const patientsPerNurse = wardNurses > 0 ? wardPatients / wardNurses : 0;
    const ratio = wardNurses > 0 ? `1:${patientsPerNurse.toFixed(1)}` : "N/A";
    const status = wardNurses === 0 && wardPatients > 0 ? "critical" : patientsPerNurse <= w.safe_ratio_threshold ? "safe" : "critical";
    return { id: w.id, name: w.name, nurses: wardNurses, patients: wardPatients, patientsPerNurse, ratio, status, threshold: w.safe_ratio_threshold };
  });

  if (wardData.length === 0) {
    return (
      <div className="kpi-card text-center py-8">
        <p className="text-sm text-muted-foreground">No ward data available for heatmap</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {wardData.map((w) => (
        <motion.div key={w.id} variants={item}
          className={`rounded-xl border-2 p-5 transition-all ${getHeatColor(w.patientsPerNurse, w.threshold)}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">{w.name}</h3>
            {w.status === "safe" ? <CheckCircle className="w-5 h-5 opacity-70" /> : <AlertTriangle className="w-5 h-5 animate-pulse" />}
          </div>
          <p className="text-3xl font-bold mb-1">{w.ratio}</p>
          <p className="text-xs opacity-70 mb-3">Threshold: 1:{w.threshold}</p>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {w.nurses} nurses</span>
            <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {w.patients} patients</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-background/50 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${w.status === "safe" ? "bg-emerald-500" : "bg-red-500"}`}
              style={{ width: `${Math.min((w.patientsPerNurse / (w.threshold * 2)) * 100, 100)}%` }} />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
