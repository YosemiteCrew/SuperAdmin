"use client";
import { useAuthStore } from "@/app/stores/authStore";
import { useRouter } from "next/navigation";
import "./Header.css";

export default function Header() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div />
        <div className="header-user">
          <div className="header-user-info">
            <span className="text-body-4-emphasis text-text-primary">
              {user?.name}
            </span>
            <span className="text-caption-1 text-text-tertiary">
              {user?.role}
            </span>
          </div>
          <button onClick={handleSignOut} className="header-signout">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
