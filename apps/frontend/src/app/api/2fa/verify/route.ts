import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";

export async function POST(req: NextRequest) {
  try {
    const { token, secret } = await req.json();

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (verified) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: "Invalid code" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error verifying code" }, { status: 500 });
  }
}
