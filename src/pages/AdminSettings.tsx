import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWards } from "@/hooks/useDatabase";
import { Settings, Users, Bell, Database, Zap } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type UserRoleRow = Tables<"user_roles">;

interface UserWithRole extends Profile {
  role: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { wards } = useWards();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [codeBlueTarget, setCodeBlueTarget] = useState("3");
  const [escalationMinutes, setEscalationMinutes] = useState("5");

  useEffect(() => {
    // Initialize thresholds from wards
    const t: Record<string, number> = {};
    wards.forEach((w) => { t[w.id] = w.safe_ratio_threshold; });
    setThresholds(t);
  }, [wards]);

  useEffect(() => {
    // Fetch users with roles
    const fetchUsers = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("*");

      if (profiles && roles) {
        const roleMap = Object.fromEntries(roles.map((r) => [r.user_id, r.role]));
        setUsers(profiles.map((p) => ({ ...p, role: roleMap[p.user_id] || "nurse" })));
      }
    };
    fetchUsers();

    // Fetch escalation threshold
    const fetchSettings = async () => {
      const { data } = await (supabase.from("system_settings" as any).select("*").eq("key", "code_blue_escalation_minutes").single() as any);
      if (data) setEscalationMinutes(data.value);
    };
    fetchSettings();
  }, []);

  const updateThreshold = async (wardId: string, value: number) => {
    setThresholds((p) => ({ ...p, [wardId]: value }));
    await supabase.from("wards").update({ safe_ratio_threshold: value }).eq("id", wardId);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
  };

  const updateEscalationThreshold = async (value: string) => {
    setEscalationMinutes(value);
    await (supabase.from("system_settings" as any) as any).update({ value }).eq("key", "code_blue_escalation_minutes");
  };

  if (user?.role !== "admin") {
    return (
      <div className="kpi-card text-center py-12">
        <p className="text-destructive font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-2">Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin & System Configuration</h1>
        <p className="page-description">System control, thresholds, and user management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Safe Ratio Thresholds</h3>
          </div>
          <div className="space-y-3">
            {wards.map((ward) => (
              <div key={ward.id} className="flex items-center justify-between">
                <label className="text-sm">{ward.name} Ward</label>
                <input
                  type="number"
                  value={thresholds[ward.id] || ward.safe_ratio_threshold}
                  onChange={(e) => updateThreshold(ward.id, Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Alert Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Code Blue Target Response (minutes)</label>
              <input
                type="number"
                value={codeBlueTarget}
                onChange={(e) => setCodeBlueTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">
                <Zap className="w-3.5 h-3.5 inline mr-1" />
                Auto-Escalation Threshold (minutes without response)
              </label>
              <input
                type="number"
                value={escalationMinutes}
                onChange={(e) => updateEscalationThreshold(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">Code Blue events without a response within this time will be auto-escalated with a critical alert.</p>
            </div>
            <div className="space-y-2">
              {["Nurse shortage alerts", "Code Blue delay alerts", "High patient load alerts"].map((rule) => (
                <label key={rule} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" defaultChecked className="rounded border-input" />
                  {rule}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="kpi-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">User Management</h3>
          </div>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{u.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => updateUserRole(u.user_id, e.target.value)}
                  className="text-xs px-2 py-1 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="admin">Admin</option>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
