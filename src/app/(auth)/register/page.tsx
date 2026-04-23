"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      organizationName: formData.get("organizationName"),
      companyName: formData.get("companyName"),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="rubick-auth">
      {/* Card sits above the decorative pseudo-elements */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="box p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-rubick-primary/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-rubick-primary font-bold text-lg">EA</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">Create your organization</h1>
            <p className="text-sm text-slate-500 mt-1">Set up the owner account and your first company workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-rubick-danger bg-rubick-danger/10 rounded-md p-3 text-center">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" name="name" required autoFocus placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                required
                placeholder="Acme Group"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyName">First Company Name</Label>
              <Input id="companyName" name="companyName" required placeholder="Acme Distributors Pvt Ltd" />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
            <p className="text-sm text-center text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-rubick-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
