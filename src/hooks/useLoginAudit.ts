import { supabase } from "@/integrations/supabase/client";

export async function logLoginEvent(
  userId: string | null,
  email: string,
  eventType: "login_success" | "login_failed" | "logout",
  role?: string,
) {
  try {
    await (supabase.from("login_audit_logs" as any) as any).insert({
      user_id: userId,
      email,
      event_type: eventType,
      user_agent: navigator.userAgent,
      role: role || null,
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
