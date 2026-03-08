import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch analytics data
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();

    const [
      { count: totalPatients },
      { count: totalNurses },
      { data: codeBlueEvents },
      { data: alerts },
      { data: feedback },
      { data: wards },
    ] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("nurses").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("code_blue_events").select("*").gte("trigger_time", weekAgoISO),
      supabase.from("alerts").select("*").gte("created_at", weekAgoISO),
      supabase.from("patient_feedback").select("*").gte("created_at", weekAgoISO),
      supabase.from("wards").select("*"),
    ]);

    const avgResponse = codeBlueEvents?.length
      ? (codeBlueEvents.reduce((s: number, e: any) => s + (e.response_minutes || 0), 0) / codeBlueEvents.length).toFixed(1)
      : "N/A";

    const avgSatisfaction = feedback?.length
      ? (feedback.reduce((s: number, f: any) => s + (f.satisfaction || 0), 0) / feedback.length).toFixed(1)
      : "N/A";

    const criticalAlerts = alerts?.filter((a: any) => a.alert_type === "critical").length || 0;

    // Get admin emails
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles?.length) {
      return new Response(JSON.stringify({ message: "No admin users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminEmails: string[] = [];
    for (const role of adminRoles) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", role.user_id)
        .single();
      if (profile?.email) adminEmails.push(profile.email);
    }

    if (!adminEmails.length) {
      return new Response(JSON.stringify({ message: "No admin emails found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reportDate = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const weekAgoDate = weekAgo.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const htmlEmail = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:32px;color:#fff;margin-bottom:24px;">
      <h1 style="margin:0 0 8px;font-size:24px;">📊 Weekly Hospital Report</h1>
      <p style="margin:0;opacity:0.85;font-size:14px;">${weekAgoDate} — ${reportDate}</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
      <div style="background:#f0f9ff;border-radius:8px;padding:20px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#1e3a5f;">${totalPatients || 0}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Total Patients</div>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:20px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#166534;">${totalNurses || 0}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Active Nurses</div>
      </div>
      <div style="background:#fefce8;border-radius:8px;padding:20px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#854d0e;">${avgResponse} min</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Avg Code Blue Response</div>
      </div>
      <div style="background:#fdf2f8;border-radius:8px;padding:20px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#9d174d;">${criticalAlerts}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Critical Alerts</div>
      </div>
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#1e3a5f;">Weekly Summary</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;">Code Blue Events</td><td style="padding:8px 0;text-align:right;font-weight:600;">${codeBlueEvents?.length || 0}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Total Alerts</td><td style="padding:8px 0;text-align:right;font-weight:600;">${alerts?.length || 0}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Patient Feedback Entries</td><td style="padding:8px 0;text-align:right;font-weight:600;">${feedback?.length || 0}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Avg Satisfaction Score</td><td style="padding:8px 0;text-align:right;font-weight:600;">${avgSatisfaction}/5</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Wards Monitored</td><td style="padding:8px 0;text-align:right;font-weight:600;">${wards?.length || 0}</td></tr>
      </table>
    </div>

    <p style="font-size:12px;color:#94a3b8;text-align:center;">
      This report is generated automatically every Monday at 8:00 AM UTC.
    </p>
  </div>
</body>
</html>`;

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Hospital Reports <onboarding@resend.dev>",
        to: adminEmails,
        subject: `Weekly Hospital Report — ${reportDate}`,
        html: htmlEmail,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, emailId: resendData.id, recipients: adminEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weekly report error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
