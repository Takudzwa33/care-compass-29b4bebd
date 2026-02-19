import { mockPatients } from "@/data/mockData";
import { Search } from "lucide-react";
import { useState } from "react";

export default function PatientManagement() {
  const [search, setSearch] = useState("");
  const filtered = mockPatients.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.ward.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patient Management</h1>
        <p className="page-description">EMR integration — view and manage patient records</p>
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
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50 transition">
                  <td className="py-3 px-4 font-mono text-xs">{p.id}</td>
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4">{p.ward}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.severity === "Critical" ? "status-critical" : p.severity === "Serious" ? "status-warning" : "status-safe"}`}>
                      {p.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{p.admissionDate}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.dischargeDate ? "bg-muted text-muted-foreground" : "status-safe"}`}>
                      {p.dischargeDate ? "Discharged" : "Active"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{p.assignedNurse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
