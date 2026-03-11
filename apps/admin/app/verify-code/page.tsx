"use client";

import Link from "next/link";
import { AuthLayout } from "../../components/auth-layout/auth-layout";
import { Button } from "../../components/ui/button";
import { OtpInput } from "../../components/ui/otp-input";
import { useAuthStore } from "../../store/use-auth-store";

export default function VerifyCodePage() {
  const { verificationCode, setVerificationCode } = useAuthStore();

  const code =
    verificationCode.length === 4
      ? verificationCode
      : ["", "", "", ""];
  const handleChange = (newCode: string[]) => {
    setVerificationCode(newCode.length === 4 ? newCode : ["", "", "", ""]);
  };

  return (
    <AuthLayout
      imageSrc="/assets/very_code.png"
      imageAlt="Verify Code"
    >
      <h1 className="mb-2 text-center font-heading">Verify code</h1>
      <p className="mb-8 text-center text-base font-normal text-gray-600">
        Enter the code we just sent to your Authenticator App to proceed with
        your profile
      </p>
      <div className="mb-8 flex justify-center">
        <OtpInput
          length={4}
          value={code}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-4">
        <Button href="/dashboard">Verify Code</Button>
        <Button
          href="/scan-qr"
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
      <p className="mt-6 text-center text-sm font-normal text-gray-600">
        Didn&apos;t receive the code?{" "}
        <Link href="#" className="font-normal text-blue-600 underline hover:text-blue-700">
          Request New Code.
        </Link>
      </p>
    </AuthLayout>
  );
}
