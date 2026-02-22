import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { Enums } from "@/integrations/supabase/types";
import { logLoginEvent } from "@/hooks/useLoginAudit";

export type UserRole = Enums<"app_role">;

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string, fullName: string, role: UserRole) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", supabaseUser.id)
      .maybeSingle();

    // Get role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", supabaseUser.id)
      .maybeSingle();

    setUser({
      id: supabaseUser.id,
      name: profile?.full_name || supabaseUser.email || "",
      email: profile?.email || supabaseUser.email || "",
      role: roleData?.role || "nurse",
    });
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Use setTimeout to avoid deadlock with Supabase client
          setTimeout(() => fetchUserProfile(newSession.user), 0);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logLoginEvent(null, email, "login_failed");
      return error.message;
    }
    // Audit log will be inserted after profile is fetched (we need role)
    if (data.user) {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
      logLoginEvent(data.user.id, email, "login_success", roleData?.role || "nurse");
    }
    return null;
  };

  const signup = async (email: string, password: string, fullName: string, role: UserRole): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    return error ? error.message : null;
  };

  const logout = async () => {
    if (user) {
      logLoginEvent(user.id, user.email, "logout", user.role);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
