import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "nurse" | "doctor" | "emergency";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: Record<string, User> = {
  "admin@hospital.com": { id: "1", name: "Dr. Admin", role: "admin", email: "admin@hospital.com" },
  "nurse@hospital.com": { id: "2", name: "Sarah Johnson", role: "nurse", email: "nurse@hospital.com" },
  "doctor@hospital.com": { id: "3", name: "Dr. Michael Chen", role: "doctor", email: "doctor@hospital.com" },
  "emergency@hospital.com": { id: "4", name: "Team Lead James", role: "emergency", email: "emergency@hospital.com" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, _password: string): boolean => {
    const found = MOCK_USERS[email.toLowerCase()];
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
