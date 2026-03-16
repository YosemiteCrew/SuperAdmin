"use client";
import { useState } from "react";
import { useAuthStore } from "@/app/stores/authStore";
import { useRouter } from "next/navigation";
import Input from "@/app/ui/primitives/Input";
import { Primary, Danger } from "@/app/ui/primitives/Button";
import { ConfirmModal } from "@/app/ui/overlays/Modal";
import { useToast } from "@/app/ui/overlays/Toast/Toast";

export default function Settings() {
  const { user, signOut, updateUser } = useAuthStore();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    updateUser({ name });
    setSaving(false);
    showToast("success", "Profile updated successfully");
  };

  const handleDelete = () => {
    signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-text-primary text-heading-1">Settings</h1>
        <p className="text-body-3 text-text-secondary max-w-3xl">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Profile Section */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #EAEAEA",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h2
          className="text-heading-3 text-text-primary"
          style={{ marginBottom: "20px" }}
        >
          Profile Information
        </h2>

        <div className="flex flex-col gap-4" style={{ maxWidth: "480px" }}>
          {/* Avatar */}
          <div
            className="flex items-center gap-4"
            style={{ marginBottom: "8px" }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#EAEAEA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-satoshi)",
                fontSize: "24px",
                fontWeight: 500,
                color: "#595958",
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-body-3-emphasis text-text-primary">
                {user?.name}
              </span>
              <span className="text-caption-1 text-text-tertiary">
                {user?.role}
              </span>
            </div>
          </div>

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input label="Email" value={user?.email ?? ""} disabled />
          <Input label="Role" value={user?.role ?? ""} disabled />

          <div style={{ marginTop: "8px" }}>
            <Primary
              onClick={handleSave}
              disabled={saving || name === user?.name}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Primary>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #FDEBEA",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h2
          className="text-heading-3"
          style={{ color: "#EA3729", marginBottom: "8px" }}
        >
          Danger Zone
        </h2>
        <p
          className="text-body-4 text-text-secondary"
          style={{ marginBottom: "16px" }}
        >
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        <Danger onClick={() => setShowDeleteModal(true)}>Delete Account</Danger>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all data will be permanently removed."
        confirmLabel="Delete Account"
        confirmTone="danger"
      />

      <ToastContainer />
    </div>
  );
}
