import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email, password);
    if (!success) setError("Invalid credentials. Try admin@hospital.com, nurse@hospital.com, doctor@hospital.com, or emergency@hospital.com");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/30" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-primary-foreground max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Heart className="w-7 h-7 text-accent-foreground" />
            </div>
            <h1 className="text-3xl font-bold">MedWatch</h1>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Hospital Effectiveness Monitoring System
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Assessing overall hospital effectiveness through nurse-to-patient ratios, 
            Code Blue response times, and patient care quality metrics.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: "Nurse-Patient Ratio", value: "Real-time" },
              { label: "Code Blue Response", value: "Tracked" },
              { label: "Patient Feedback", value: "Collected" },
              { label: "Ward Analytics", value: "Automated" },
            ].map((stat) => (
              <div key={stat.label} className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-primary-foreground/70">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">MedWatch</h1>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to access the hospital management system</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hospital.com"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter any password"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </form>

          <div className="mt-8 p-4 rounded-lg bg-muted">
            <p className="text-xs font-medium text-muted-foreground mb-2">Demo Accounts (any password):</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>admin@hospital.com</span>
              <span>nurse@hospital.com</span>
              <span>doctor@hospital.com</span>
              <span>emergency@hospital.com</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
