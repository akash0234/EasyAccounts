"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
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
            <h1 className="text-2xl font-bold text-slate-800">EasyAccounts</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-rubick-danger bg-rubick-danger/10 rounded-md p-3 text-center">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-sm text-center text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-rubick-primary hover:underline font-medium">
                Register
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
