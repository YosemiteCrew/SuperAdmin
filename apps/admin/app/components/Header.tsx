import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/pms", label: "PMS" },
  { href: "/developers", label: "Developers" },
  { href: "/contact", label: "Contact Us" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            YOSEMITE CREW
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            BETA
          </span>
        </div>
      </Link>
      <nav className="flex items-center gap-6">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
