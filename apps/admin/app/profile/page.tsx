import { DashboardLayout } from "../../components/dashboard/dashboard-layout";

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-[#302F2E]">Profile</h1>
      <p className="mt-2 text-gray-500">Manage your profile settings.</p>
    </DashboardLayout>
  );
}
