import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function DealerRegisterPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    businessName: "", contactName: "", phone: "",
    fflNumber: "", ein: "", einType: "",
    address: "", city: "", state: "", zip: ""
  });
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.businessName || !form.contactName || !form.fflNumber) {
      toast({ title: "Missing fields", description: "Email, password, business name, contact name, and FFL number are required", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please re-enter your password", variant: "destructive" });
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid 10-digit phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/dealer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (data.ok) {
        toast({ title: "Account created!", description: "Welcome to DubDub22. You are now logged in." });
        window.location.href = "/dealer/dashboard";
      } else {
        toast({ title: "Registration failed", description: data.message || data.error || "Please try again", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", description: "Could not reach server. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "bg-background border-border";
  const labelClass = "text-sm font-medium mb-1 block";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card border border-border rounded-lg p-8"
          >
            <div className="text-center mb-6">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-display font-semibold">Dealer Registration</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your DubDub22 dealer account</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="dealer@example.com" className={inputClass} autoComplete="email" />
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <Input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="555-123-4567" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Password *</label>
                  <Input type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder="Min 8 characters" className={inputClass} autoComplete="new-password" />
                </div>
                <div>
                  <label className={labelClass}>Confirm Password *</label>
                  <Input type="password" value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} placeholder="Re-enter password" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Business Name *</label>
                <Input value={form.businessName} onChange={e => update("businessName", e.target.value)} placeholder="Your FFL business name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact Name *</label>
                <Input value={form.contactName} onChange={e => update("contactName", e.target.value)} placeholder="Your full name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>FFL Number *</label>
                <Input value={form.fflNumber} onChange={e => update("fflNumber", e.target.value)} placeholder="X-XX-XXX-XX-XX-XXXXX" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>EIN</label>
                  <Input value={form.ein} onChange={e => update("ein", e.target.value)} placeholder="XX-XXXXXXX" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>EIN Type</label>
                  <select
                    value={form.einType}
                    onChange={e => update("einType", e.target.value)}
                    className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select type...</option>
                    <option value="2">Manufacturer</option>
                    <option value="3">Dealer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Street Address</label>
                <Input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Premise address" className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <Input value={form.city} onChange={e => update("city", e.target.value)} placeholder="City" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <Input value={form.state} onChange={e => update("state", e.target.value)} placeholder="TX" maxLength={2} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>ZIP</label>
                  <Input value={form.zip} onChange={e => update("zip", e.target.value)} placeholder="12345" maxLength={10} className={inputClass} />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full font-display bg-primary hover:bg-primary/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "CREATE ACCOUNT"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <a href="/dealer/login" className="text-primary hover:underline font-medium">Sign in</a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
