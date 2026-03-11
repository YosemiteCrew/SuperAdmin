import { DashboardLayout } from "../../components/dashboard/dashboard-layout";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-[#302F2E]">Settings</h1>
      <p className="mt-2 text-gray-500">Configure your preferences.</p>
    </DashboardLayout>
  );
}
