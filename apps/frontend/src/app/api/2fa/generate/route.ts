import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Yosemite";

export async function GET(req: NextRequest) {
   const { searchParams } = new URL(req.url);
   const email = searchParams.get("email") || "user@example.com";
  

  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
  });

  try {
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || "");

    return NextResponse.json({
      qrCode,
      base32: secret.base32,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "QR generation failed" },
      { status: 500 }
    );
  }
}
