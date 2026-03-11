import Image from "next/image";
import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Link href="/dashboard" className="flex items-center">
        <Image
          src="/assets/logo.svg"
          alt="Logo"
          width={44}
          height={44}
          className="h-11 w-11"
          priority
        />
      </Link>
      <div className="flex items-center gap-5">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-700"
          aria-label="Notifications"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-gray-100 text-sm font-medium text-gray-600"
          aria-hidden
        >
          A
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-normal text-[#302F2E] hover:text-gray-700"
        >
          Admin
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </header>
  );
}
