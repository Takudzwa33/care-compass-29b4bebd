import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Ward = Tables<"wards">;
type Patient = Tables<"patients">;
type Nurse = Tables<"nurses">;
type CodeBlue = Tables<"code_blue_events">;
type Alert = Tables<"alerts">;
type Feedback = Tables<"patient_feedback">;

export function useWards() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("wards").select("*").then(({ data }) => {
      setWards(data || []);
      setLoading(false);
    });
  }, []);

  return { wards, loading };
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    setPatients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();

    const channel = supabase
      .channel("patients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        fetchPatients();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { patients, loading, refetch: fetchPatients };
}

export function useNurses() {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNurses = async () => {
    const { data } = await supabase.from("nurses").select("*").order("created_at", { ascending: false });
    setNurses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNurses();

    const channel = supabase
      .channel("nurses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "nurses" }, () => {
        fetchNurses();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { nurses, loading, refetch: fetchNurses };
}

export function useCodeBlueEvents() {
  const [events, setEvents] = useState<CodeBlue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const { data } = await supabase.from("code_blue_events").select("*").order("trigger_time", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel("code-blue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "code_blue_events" }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { events, loading, refetch: fetchEvents };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false });
    setAlerts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { alerts, loading, refetch: fetchAlerts };
}

export function useFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    const { data } = await supabase.from("patient_feedback").select("*").order("created_at", { ascending: false });
    setFeedback(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  return { feedback, loading, refetch: fetchFeedback };
}
