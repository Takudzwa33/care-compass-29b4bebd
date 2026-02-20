import { usePatients, useWards, useNurses } from "@/hooks/useDatabase";
import { Search } from "lucide-react";
import { useState } from "react";

export default function PatientManagement() {
  const { patients, loading } = usePatients();
  const { wards } = useWards();
  const { nurses } = useNurses();
  const [search, setSearch] = useState("");

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));
  const nurseMap = Object.fromEntries(nurses.map((n) => [n.id, n.nurse_code]));

  const filtered = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_code.toLowerCase().includes(search.toLowerCase()) ||
      (wardMap[p.ward_id || ""] || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patient Management</h1>
        <p className="page-description">EMR integration — view and manage patient records (real-time sync)</p>
      </div>

      <div className="kpi-card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} patients</span>
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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ward</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Admission</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nurse</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No patients found</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50 transition">
                    <td className="py-3 px-4 font-mono text-xs">{p.patient_code}</td>
                    <td className="py-3 px-4 font-medium">{p.full_name}</td>
                    <td className="py-3 px-4">{wardMap[p.ward_id || ""] || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.severity === "Critical" ? "status-critical" : p.severity === "Serious" ? "status-warning" : "status-safe"}`}>
                        {p.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(p.admission_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.discharge_date ? "bg-muted text-muted-foreground" : "status-safe"}`}>
                        {p.discharge_date ? "Discharged" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{nurseMap[p.assigned_nurse_id || ""] || "—"}</td>
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
