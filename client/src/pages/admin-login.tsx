import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@dubdub22.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Enter email and password"); return; }
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (data.ok) {
        onLogin();
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-8 w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-display font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage orders</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-background"
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full font-display bg-primary hover:bg-primary/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "SIGN IN"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
