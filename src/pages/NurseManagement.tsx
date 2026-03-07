import { useNurses, useWards } from "@/hooks/useDatabase";
import { Search } from "lucide-react";
import { useState } from "react";

export default function NurseManagement() {
  const { nurses, loading } = useNurses();
  const { wards } = useWards();
  const [search, setSearch] = useState("");

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));

  const filtered = nurses.filter(
    (n) =>
      n.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (wardMap[n.ward_id || ""] || "").toLowerCase().includes(search.toLowerCase())
  );

  const onDuty = nurses.filter((n) => n.status === "On-Duty").length;
  const offDuty = nurses.length - onDuty;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Nurse Management</h1>
        <p className="page-description">Track nursing staff availability and shift schedules — real-time</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="kpi-card">
          <p className="text-sm text-muted-foreground">Total Nurses</p>
          <p className="text-3xl font-bold mt-1">{nurses.length}</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm text-muted-foreground">On-Duty</p>
          <p className="text-3xl font-bold mt-1 text-success">{onDuty}</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm text-muted-foreground">Off-Duty</p>
          <p className="text-3xl font-bold mt-1 text-muted-foreground">{offDuty}</p>
        </div>
      </div>

      <div className="kpi-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nurses..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                 <tr className="border-b border-border">
                   <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                   <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ward</th>
                   <th className="text-left py-3 px-4 font-medium text-muted-foreground">Shift</th>
                   <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                   <th className="text-left py-3 px-4 font-medium text-muted-foreground">Exp</th>
                 </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                   <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No nurses found</td></tr>
                 ) : filtered.map((n: any) => (
                   <tr key={n.id} className="border-b border-border/50 hover:bg-muted/50 transition">
                     <td className="py-3 px-4 font-mono text-xs">{n.nurse_code}</td>
                     <td className="py-3 px-4 font-medium">{n.full_name}</td>
                     <td className="py-3 px-4">{n.role_title}</td>
                     <td className="py-3 px-4 text-xs">{n.specialization || "—"}</td>
                     <td className="py-3 px-4">{wardMap[n.ward_id || ""] || "—"}</td>
                     <td className="py-3 px-4">{n.shift}</td>
                     <td className="py-3 px-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${n.status === "On-Duty" ? "status-safe" : "bg-muted text-muted-foreground"}`}>
                         {n.status}
                       </span>
                     </td>
                     <td className="py-3 px-4 text-xs text-muted-foreground">{n.years_of_experience || 0}y</td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
