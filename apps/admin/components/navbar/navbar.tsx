import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#", label: "Home" },
  { href: "#", label: "About Us" },
  { href: "#", label: "PMS" },
  { href: "#", label: "Developers" },
  { href: "#", label: "Contact us" },
  { href: "#", label: "Blog" },
];

export function Navbar() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/login" className="flex items-center">
          <Image
            src="/assets/logo.svg"
            alt="Logo"
            width={86}
            height={80}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-normal text-[#302F2E] hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
