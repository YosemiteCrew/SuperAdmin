import Image from "next/image";
import Link from "next/link";
import { AuthLayout } from "../../components/auth-layout/auth-layout";
import { Button } from "../../components/ui/button";

export default function ScanQrPage() {
  return (
    <AuthLayout
      imageSrc="/assets/qr_scan.png"
      imageAlt="Scan QR Code"
    >
      <div className="text-left">
        <h1 className="mb-4 font-heading">
          Scan the QR Code
        </h1>
        <p className="mb-2 text-base font-normal text-[#302F2E]">
          Use the Google Authenticator App to Scan the QR Code.
        </p>
        <p className="mb-2 text-base font-normal text-[#302F2E]">
          This will connect the Authenticator with app
        </p>
        <p className="mb-8 text-base font-normal text-[#302F2E]">
          After you scan the code, choose &apos;Next&apos;.
        </p>
        <div className="mb-6">
          <Image
            src="/assets/qr_code.svg"
            alt="QR Code"
            width={160}
            height={161}
          />
        </div>
        <Link
          href="#"
          className="mb-8 block text-sm font-normal text-blue-600 underline hover:text-blue-700"
        >
          Can&apos;t Scan Image?
        </Link>
      <div className="flex gap-4">
        <div className="flex-1">
          <Button
            href="/login"
            variant="secondary"
            icon={
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-900">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 6H3M3 6l3 3M3 6l3-3" />
                </svg>
              </span>
            }
            iconPosition="left"
          >
            Back
          </Button>
        </div>
        <div className="flex-1">
          <Button
            href="/verify-code"
            icon={
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h6M6 3l3 3-3 3" />
                </svg>
              </span>
            }
          >
            Next
          </Button>
        </div>
      </div>
      </div>
    </AuthLayout>
  );
}
