"use client";
import type { ReactNode } from "react";
import Sidebar from "@/app/ui/layout/Sidebar/Sidebar";
import Header from "@/app/ui/layout/Header/Header";
import ProtectedRoute from "@/app/ui/layout/guards/ProtectedRoute";
import "./app-layout.css";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="app-main">
          <Header />
          <main className="p-3 sm:p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
