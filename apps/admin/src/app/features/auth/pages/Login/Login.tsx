"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/app/stores/authStore";
import Input from "@/app/ui/primitives/Input";
import { Primary } from "@/app/ui/primitives/Button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, status, loading, error, checkSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    if (status === "mfa-required") router.push("/verify-mfa");
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-[15vh] bg-neutral-0 px-4">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center gap-6 mb-8">
          <Image src="/assets/yosemite-logo.png" alt="Yosemite Crew" width={60} height={56} priority />
          <div className="text-center">
            <h1 className="text-heading-1 text-text-primary">Super Admin</h1>
            <p className="text-body-4 text-text-tertiary mt-1">Sign in to your account</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@yosemitecrew.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          {error && <p className="text-caption-1 text-danger-600">{error}</p>}
          <Primary type="submit" fullWidth disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign In"}
          </Primary>
        </form>
      </div>
    </div>
  );
}
