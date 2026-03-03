import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { Header } from "../components/Header";

const TOTP_URI =
  "otpauth://totp/YosemiteCrew:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=YosemiteCrew";

function BackIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}

export default async function ScanQRPage() {
  const qrDataUrl = await QRCode.toDataURL(TOTP_URI, {
    width: 240,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-2xl flex-col items-center justify-center px-6 py-12">
        <div className="flex w-full flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Scan the QR Code
          </h1>

          <div className="mt-6 space-y-2 text-base text-gray-600">
            <p>Use the Google Authenticator App to Scan the QR Code.</p>
            <p>This will connect the Authenticator with app</p>
            <p>
              After you scan the code, choose &quot;Next&quot;,
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <Image
              src={qrDataUrl}
              alt="QR Code for authenticator setup"
              width={240}
              height={240}
              unoptimized
              className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
            />
          </div>

          <Link
            href="/login/enter-code"
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Can&apos;t Scan Image?
          </Link>

          <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <BackIcon />
              Back
            </Link>
            <Link
              href="/login/verify"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900"
            >
              Next
              <NextIcon />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
