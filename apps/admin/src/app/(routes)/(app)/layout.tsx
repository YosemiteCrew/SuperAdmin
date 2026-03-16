"use client";
import Sidebar from "@/app/ui/layout/Sidebar/Sidebar";
import Header from "@/app/ui/layout/Header/Header";
import ProtectedRoute from "@/app/ui/layout/guards/ProtectedRoute";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 lg:ml-[220px] mt-[64px]">
          <Header />
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
