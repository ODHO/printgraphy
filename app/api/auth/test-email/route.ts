import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// TEMPORARY DEBUG ROUTE — remove after fixing email
export async function GET() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;

  // 1. Show what env vars are loaded
  const envCheck = {
    EMAIL_HOST: EMAIL_HOST ?? "❌ NOT SET",
    EMAIL_PORT: EMAIL_PORT ?? "❌ NOT SET",
    EMAIL_USER: EMAIL_USER ?? "❌ NOT SET",
    EMAIL_PASS: EMAIL_PASS ? `✓ SET (length: ${EMAIL_PASS.length}, starts: ${EMAIL_PASS.slice(0, 3)}...)` : "❌ NOT SET",
    EMAIL_FROM: EMAIL_FROM ?? "❌ NOT SET",
  };

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    return NextResponse.json({ envCheck, error: "Missing env vars" }, { status: 400 });
  }

  const port = Number(EMAIL_PORT ?? 587);

  // 2. Try to create transport and verify connection
  const transport = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });

  try {
    // Verify SMTP connection first
    await transport.verify();

    // Try sending a real test email to the same address
    const info = await transport.sendMail({
      from: `Printgraphy <${EMAIL_USER}>`,
      to: EMAIL_USER, // send to self as test
      subject: "Printgraphy — SMTP Test",
      html: `<p>SMTP is working! Test OTP: <strong>123456</strong></p>`,
    });

    return NextResponse.json({
      success: true,
      envCheck,
      messageId: info.messageId,
      response: info.response,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; command?: string; response?: string; responseCode?: number };
    return NextResponse.json({
      success: false,
      envCheck,
      error: {
        message: e.message,
        code: e.code,
        command: e.command,
        smtpResponse: e.response,
        smtpResponseCode: e.responseCode,
      },
    }, { status: 500 });
  }
}
