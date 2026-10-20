import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import EmailSettings from "@/models/EmailSettings";
import { mergeEmailSettings, type EmailSettingsContent } from "@/lib/emailSettings";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import { notifyAdmin } from "@/lib/adminNotify";

function publicSettings(content: EmailSettingsContent) {
  return {
    ...content,
    smtp: { ...content.smtp, pass: "", hasPassword: Boolean(content.smtp.pass) },
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  await dbConnect();
  const doc = await EmailSettings.findOne({ key: "mail" }).lean();
  return NextResponse.json({ success: true, settings: publicSettings(mergeEmailSettings(doc?.content)) });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  await dbConnect();

  const body = await req.json();
  const existing = await EmailSettings.findOne({ key: "mail" }).lean();
  const current = mergeEmailSettings(existing?.content);
  const incoming = body.settings || body;
  const next = mergeEmailSettings({
    ...current,
    ...incoming,
    smtp: {
      ...current.smtp,
      ...(incoming.smtp || {}),
      pass: incoming.smtp?.pass ? incoming.smtp.pass : current.smtp.pass,
    },
  });

  const doc = await EmailSettings.findOneAndUpdate(
    { key: "mail" },
    { key: "mail", content: next },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ success: true, settings: publicSettings(mergeEmailSettings(doc?.content)) });
}

export async function POST() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await notifyAdmin("order", {
    orderNumber: "TEST-1001",
    customerName: "Test Customer",
    email: "customer@example.com",
    total: "$10.00",
    items: "Sample business cards",
  });

  return NextResponse.json({ success: true, message: "Test email sent if the order template is active and SMTP is set." });
}
