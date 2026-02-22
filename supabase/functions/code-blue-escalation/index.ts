import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get escalation threshold from system_settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "code_blue_escalation_minutes")
      .single();

    const thresholdMinutes = setting ? parseInt(setting.value) : 5;

    // Find unresponded Code Blue events that exceed threshold
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

    const { data: overdueEvents } = await supabase
      .from("code_blue_events")
      .select("id, trigger_time, ward_id, patient_id")
      .is("response_time", null)
      .lte("trigger_time", cutoff);

    if (!overdueEvents || overdueEvents.length === 0) {
      return new Response(
        JSON.stringify({ escalated: 0, message: "No overdue Code Blue events" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create escalation alerts for each overdue event
    const alerts = overdueEvents.map((event) => ({
      alert_type: "critical",
      message: `AUTO-ESCALATION: Code Blue triggered at ${new Date(event.trigger_time).toLocaleString()} has not received a response in ${thresholdMinutes}+ minutes. Immediate action required!`,
      ward_id: event.ward_id,
    }));

    const { error } = await supabase.from("alerts").insert(alerts);

    if (error) {
      console.error("Failed to create escalation alerts:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update the events to mark them as escalated by setting outcome
    for (const event of overdueEvents) {
      await supabase
        .from("code_blue_events")
        .update({ outcome: "Escalated - No Response" })
        .eq("id", event.id)
        .is("response_time", null);
    }

    return new Response(
      JSON.stringify({ escalated: overdueEvents.length, message: `Escalated ${overdueEvents.length} Code Blue event(s)` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Escalation error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
