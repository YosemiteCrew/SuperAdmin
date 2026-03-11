import { DashboardHeader } from "./header";
import { Sidebar } from "./sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader />
      <div className="flex pt-16">
        <Sidebar />
        <main className="min-h-[calc(100vh-4rem)] flex-1 overflow-y-auto pl-4 pr-8 pt-8 pb-8 lg:pl-80">
          {children}
        </main>
      </div>
    </div>
  );
}
