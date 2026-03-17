"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/stores/authStore";

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode;
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
      <div className="flex items-center justify-center h-screen bg-white">
        <img
          src="/assets/yosemiteLoader.gif"
          alt="Loading"
          width={120}
          height={120}
        />
      </div>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
