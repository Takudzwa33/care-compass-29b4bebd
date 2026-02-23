import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { History, Filter } from "lucide-react";

type AuditEntry = {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  changed_by: string | null;
  old_data: any;
  new_data: any;
  changed_fields: string[] | null;
  created_at: string;
};

export default function DataAuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [opFilter, setOpFilter] = useState<string>("all");

  useEffect(() => {
    const fetch = async () => {
      let query = (supabase.from("data_audit_log" as any).select("*") as any).order("created_at", { ascending: false }).limit(200);
      if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
      if (opFilter !== "all") query = query.eq("operation", opFilter);
      const { data } = await query;
      setLogs((data as AuditEntry[]) || []);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel("data_audit_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "data_audit_log" }, (payload) => {
        setLogs((prev) => [payload.new as AuditEntry, ...prev].slice(0, 200));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tableFilter, opFilter]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const opColor = (op: string) => {
    switch (op) {
      case "INSERT": return "bg-emerald-500/15 text-emerald-600";
      case "UPDATE": return "bg-amber-500/15 text-amber-600";
      case "DELETE": return "bg-destructive/15 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Data Modification Audit</h1>
        <p className="page-description">Track all changes to patient and nurse records in real-time</p>
      </div>

      <div className="kpi-card">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="all">All Tables</option>
              <option value="patients">Patients</option>
              <option value="nurses">Nurses</option>
            </select>
          </div>
          <select
            value={opFilter}
            onChange={(e) => setOpFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="all">All Operations</option>
            <option value="INSERT">Inserts</option>
            <option value="UPDATE">Updates</option>
            <option value="DELETE">Deletes</option>
          </select>
          <span className="text-sm text-muted-foreground ml-auto">{logs.length} entries</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <History className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No audit entries yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${opColor(log.operation)}`}>
                    {log.operation}
                  </span>
                  <span className="text-sm font-medium capitalize">{log.table_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{log.record_id.slice(0, 8)}...</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                {log.changed_fields && log.changed_fields.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {log.changed_fields.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded-full bg-accent text-xs">{f}</span>
                    ))}
                  </div>
                )}
                {log.operation === "UPDATE" && log.old_data && log.new_data && log.changed_fields && (
                  <div className="text-xs space-y-1 bg-muted/50 rounded p-2">
                    {log.changed_fields.slice(0, 5).map((field) => (
                      <div key={field} className="flex gap-2">
                        <span className="text-muted-foreground w-32 shrink-0">{field}:</span>
                        <span className="text-destructive line-through">{String(log.old_data[field] ?? "null")}</span>
                        <span>→</span>
                        <span className="text-emerald-600">{String(log.new_data[field] ?? "null")}</span>
                      </div>
                    ))}
                  </div>
                )}
                {log.operation === "INSERT" && log.new_data && (
                  <p className="text-xs text-muted-foreground">
                    New: {log.new_data.full_name || log.new_data.patient_code || log.new_data.nurse_code || "—"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
