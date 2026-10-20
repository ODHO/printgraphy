import nodemailer from "nodemailer";
import dbConnect from "@/lib/mongodb";
import EmailSettings from "@/models/EmailSettings";
import { applyEmailTemplate, mergeEmailSettings, type EmailEvent } from "@/lib/emailSettings";

function envSmtp() {
  const host = process.env.EMAIL_HOST?.replace(/^["']|["']$/g, "").trim() || "";
  const user = process.env.EMAIL_USER?.replace(/^["']|["']$/g, "").trim() || "";
  const pass = process.env.EMAIL_PASS?.replace(/^["']|["']$/g, "").trim() || "";
  const port = Number(process.env.EMAIL_PORT?.replace(/^["']|["']$/g, "").trim() || 587);
  return { host, user, pass, port, fromName: "Printgraphy" };
}

export async function notifyAdmin(event: EmailEvent, vars: Record<string, string>) {
  try {
    await dbConnect();
    const doc = await EmailSettings.findOne({ key: "mail" }).lean();
    const settings = mergeEmailSettings(doc?.content);
    const template = settings.templates[event];
    if (!template?.active) return;
    if (!settings.adminEmail.trim()) return;

    const smtp = settings.smtp.host && settings.smtp.user && settings.smtp.pass ? settings.smtp : envSmtp();
    if (!smtp.host || !smtp.user || !smtp.pass) {
      console.warn(`[Admin mail] ${event} is active but SMTP is not configured.`);
      return;
    }

    const port = Number(smtp.port) || 587;
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user: smtp.user, pass: smtp.pass },
      tls: { rejectUnauthorized: false },
    });

    const fromName = settings.smtp.fromName || smtp.fromName || "Printgraphy";
    await transport.sendMail({
      from: `${fromName} <${smtp.user}>`,
      to: settings.adminEmail.trim(),
      subject: applyEmailTemplate(template.subject, vars),
      html: applyEmailTemplate(template.body, vars),
    });
  } catch (error) {
    console.error(`[Admin mail] Failed to send ${event} email:`, error);
  }
}
