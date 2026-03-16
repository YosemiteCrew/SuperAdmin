"use client";
import { useState } from "react";
import { CenterModal } from "@/app/ui/overlays/Modal";
import Select from "@/app/ui/inputs/Select";
import { Primary, Secondary } from "@/app/ui/primitives/Button";
import type { TeamRole } from "@/app/types/team";

const roleOptions = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPPORT", label: "Support" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, email: string, role: TeamRole) => void;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AddMemberModal({ isOpen, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("SUPPORT");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("SUPPORT");
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAdd = () => {
    const newErrors: { name?: string; email?: string } = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(email)) newErrors.email = "Invalid email address";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAdd(name.trim(), email.trim(), role);
    resetForm();
    onClose();
  };

  return (
    <CenterModal isOpen={isOpen} onClose={handleClose} title="Add Team Member">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-caption-1 text-text-secondary font-medium">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Full name"
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-card-border text-body-4 text-text-primary font-satoshi outline-none transition-colors duration-200 focus:border-brand-950"
          />
          {errors.name && (
            <span className="text-caption-2 text-danger-600">{errors.name}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption-1 text-text-secondary font-medium">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="email@example.com"
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-card-border text-body-4 text-text-primary font-satoshi outline-none transition-colors duration-200 focus:border-brand-950"
          />
          {errors.email && (
            <span className="text-caption-2 text-danger-600">{errors.email}</span>
          )}
        </div>

        <Select
          label="Role"
          options={roleOptions}
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Secondary onClick={handleClose}>Cancel</Secondary>
          <Primary onClick={handleAdd}>Add Member</Primary>
        </div>
      </div>
    </CenterModal>
  );
}
