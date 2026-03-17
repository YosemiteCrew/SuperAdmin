"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
        <Image
          src="/assets/yosemiteLoader.gif"
          alt="Loading"
          width={120}
          height={120}
          unoptimized
        />
      </div>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
