import { usePatients, useWards, useNurses } from "@/hooks/useDatabase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PatientManagement() {
  const { patients, loading, refetch } = usePatients();
  const { wards } = useWards();
  const { nurses } = useNurses();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));
  const nurseMap = Object.fromEntries(nurses.map((n) => [n.id, n.nurse_code]));
  const nurseNameMap = Object.fromEntries(nurses.map((n) => [n.id, n.full_name]));

  const filtered = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_code.toLowerCase().includes(search.toLowerCase()) ||
      (wardMap[p.ward_id || ""] || "").toLowerCase().includes(search.toLowerCase())
  );

  const canAssign = user?.role === "admin" || user?.role === "doctor" || user?.role === "nurse";

  const assignNurse = async (patientId: string, nurseId: string) => {
    setAssigning(patientId);
    const { error } = await supabase.from("patients").update({ assigned_nurse_id: nurseId || null }).eq("id", patientId);
    if (error) toast.error("Failed to assign nurse");
    else { toast.success("Nurse assigned"); refetch(); }
    setAssigning(null);
  };

  // Save patient feedback text
  const saveFeedback = async (patientId: string, text: string) => {
    const { error } = await supabase.from("patients").update({ patient_feedback_text: text } as any).eq("id", patientId);
    if (error) toast.error("Failed to save feedback");
    else {
      // Also create a patient_feedback record from this text
      const patient = patients.find(p => p.id === patientId);
      if (patient && text.trim()) {
        await supabase.from("patient_feedback").insert({
          patient_id: patientId,
          patient_name: patient.full_name,
          ward_id: patient.ward_id,
          satisfaction: 3,
          nurse_responsiveness: 3,
          overall_experience: 3,
          comments: text,
        });
      }
      toast.success("Feedback saved and synced");
      refetch();
    }
  };

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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Diagnosis</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Admission</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Assigned Nurse</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No patients found</td></tr>
                ) : filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50 transition">
                    <td className="py-3 px-4 font-mono text-xs">{p.patient_code}</td>
                    <td className="py-3 px-4 font-medium">{p.full_name}</td>
                    <td className="py-3 px-4">{wardMap[p.ward_id || ""] || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.severity === "Critical" ? "status-critical" : p.severity === "Serious" ? "status-warning" : "status-safe"}`}>
                        {p.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{p.diagnosis || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(p.admission_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.discharge_date ? "bg-muted text-muted-foreground" : "status-safe"}`}>
                        {p.discharge_date ? "Discharged" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {canAssign ? (
                        <select
                          value={p.assigned_nurse_id || ""}
                          onChange={(e) => assignNurse(p.id, e.target.value)}
                          disabled={assigning === p.id}
                          className="px-2 py-1 rounded border border-input bg-background text-xs min-w-[120px]"
                        >
                          <option value="">Unassigned</option>
                          {nurses.filter(n => !p.ward_id || n.ward_id === p.ward_id).map(n => (
                            <option key={n.id} value={n.id}>{n.full_name} ({n.nurse_code})</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs">{nurseNameMap[p.assigned_nurse_id || ""] || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        defaultValue={p.patient_feedback_text || ""}
                        placeholder="Enter feedback..."
                        onBlur={(e) => {
                          if (e.target.value !== (p.patient_feedback_text || "")) {
                            saveFeedback(p.id, e.target.value);
                          }
                        }}
                        className="px-2 py-1 rounded border border-input bg-background text-xs w-full min-w-[140px]"
                      />
                    </td>
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
