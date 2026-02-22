import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, LogIn, LogOut, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface AuditEntry {
  id: string;
  user_id: string | null;
  email: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  role: string | null;
  created_at: string;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await (supabase
        .from("login_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100) as any);
      setLogs((data as AuditEntry[]) || []);
      setLoading(false);
    };
    fetchLogs();

    const channel = supabase
      .channel("audit-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "login_audit_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="kpi-card text-center py-12">
        <p className="text-destructive font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-2">Only administrators can view audit logs.</p>
      </div>
    );
  }

  const eventIcon = (type: string) => {
    if (type === "login_success") return <LogIn className="w-4 h-4 text-emerald-500" />;
    if (type === "login_failed") return <XCircle className="w-4 h-4 text-destructive" />;
    if (type === "logout") return <LogOut className="w-4 h-4 text-muted-foreground" />;
    return <Shield className="w-4 h-4 text-muted-foreground" />;
  };

  const eventLabel = (type: string) => {
    if (type === "login_success") return "Login Success";
    if (type === "login_failed") return "Login Failed";
    if (type === "logout") return "Logout";
    return type;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Login Access Audit</h1>
        <p className="page-description">Track all authentication events — {logs.length} recent entries</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
        </div>
      ) : logs.length === 0 ? (
        <div className="kpi-card text-center py-12">
          <p className="text-muted-foreground">No audit logs yet</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
          {logs.map((log) => (
            <motion.div key={log.id} variants={item} className="kpi-card flex items-center gap-4">
              {eventIcon(log.event_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{log.email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    log.event_type === "login_success" ? "bg-emerald-500/10 text-emerald-600" :
                    log.event_type === "login_failed" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {eventLabel(log.event_type)}
                  </span>
                  {log.role && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                      {log.role}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {log.user_agent ? log.user_agent.substring(0, 80) + "..." : "Unknown device"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
