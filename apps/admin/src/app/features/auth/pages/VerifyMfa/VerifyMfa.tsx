"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/app/stores/authStore";
import OtpInput from "@/app/ui/inputs/OtpInput";
import { Primary } from "@/app/ui/primitives/Button";

export default function VerifyMfa() {
  const [code, setCode] = useState("");
  const { verifyMfa, status, loading, error } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    if (status !== "mfa-required" && status !== "authenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyMfa(code);
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-[15vh] bg-neutral-0 px-4">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center gap-6 mb-8">
          <Image src="/assets/yosemite-logo.png" alt="Super Admin" width={48} height={48} />
          <div className="text-center">
            <h1 className="text-heading-1 text-text-primary">Verify Your Identity</h1>
            <p className="text-body-4 text-text-tertiary mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
          <OtpInput length={6} value={code} onChange={setCode} error={!!error} />
          {error && <p className="text-caption-1 text-danger-600">{error}</p>}
          <Primary type="submit" fullWidth disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify"}
          </Primary>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-body-4 text-text-tertiary hover:text-text-primary transition-colors"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
