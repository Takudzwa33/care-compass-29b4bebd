import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Heart, LogIn, UserPlus, Shield, Stethoscope, Siren, Activity } from "lucide-react";
import { motion } from "framer-motion";

const ROLES: { value: UserRole; label: string; icon: typeof Shield; description: string }[] = [
  { value: "admin", label: "Administrator", icon: Shield, description: "Full system access & configuration" },
  { value: "nurse", label: "Nurse", icon: Stethoscope, description: "Patient care & ward management" },
  { value: "doctor", label: "Doctor", icon: Activity, description: "Patient records & Code Blue" },
  { value: "emergency", label: "Emergency Team", icon: Siren, description: "Code Blue response & alerts" },
];

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("nurse");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignup) {
      const err = await signup(email, password, fullName, selectedRole);
      if (err) setError(err);
    } else {
      const err = await login(email, password);
      if (err) setError(err);
    }
    setLoading(false);
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

      {/* Right panel */}
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
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isSignup ? "Sign up to access the hospital management system" : "Sign in to access the hospital management system"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  required
                />
              </div>
            )}
            {isSignup && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Select Your Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedRole(r.value)}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border-2 text-left transition ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-input hover:border-muted-foreground/30"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{r.label}</p>
                          <p className="text-xs text-muted-foreground leading-tight">{r.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
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
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : isSignup ? (
                <><UserPlus className="w-4 h-4" /> Sign Up</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsSignup(!isSignup); setError(""); }}
              className="text-primary font-medium hover:underline"
            >
              {isSignup ? "Sign In" : "Sign Up"}
            </button>
          </p>

          <div className="mt-6 p-4 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">
              {isSignup 
                ? "Select your role during signup. Your access level will be set based on the role you choose."
                : "Sign in with your registered email and password. Your role determines which features you can access."}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
