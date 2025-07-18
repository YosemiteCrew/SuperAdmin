import { NextRequest, NextResponse } from "next/server";
import AWS from "aws-sdk";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

export async function POST(req: NextRequest) {
  const { toEmail, code } = await req.json();

  const params = {
    Source: process.env.AWS_MAIL_DRIVER, // Must be verified in SES
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: "Your Signup Verification Code",
      },
      Body: {
        Text: {
          Data: `Your verification code is: ${code}`,
        },
      },
    },
  };

  try {
    await ses.sendEmail(params as any).promise();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Email sending error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
