"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/stores/authStore";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, checkSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "idle" || status === "checking") {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-body-3 text-text-tertiary">Loading...</span>
      </div>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
