import nodemailer from "nodemailer";

// Build transporter — falls back to console logging if SMTP credentials absent
function createTransport() {
  const EMAIL_HOST = process.env.EMAIL_HOST?.replace(/^["']|["']$/g, "").trim();
  const EMAIL_PORT = process.env.EMAIL_PORT?.replace(/^["']|["']$/g, "").trim();
  const EMAIL_USER = process.env.EMAIL_USER?.replace(/^["']|["']$/g, "").trim();
  const EMAIL_PASS = process.env.EMAIL_PASS?.replace(/^["']|["']$/g, "").trim();

  if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    const port = Number(EMAIL_PORT ?? 587);
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port,
      secure: port === 465,      // SSL only on 465
      requireTLS: port === 587,  // STARTTLS on 587
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });
  }

  return null;
}

// Hostinger/Gmail requires FROM = the authenticated SMTP user
function getFrom(): string {
  const user = process.env.EMAIL_USER?.replace(/^["']|["']$/g, "").trim();
  const label = process.env.EMAIL_FROM?.replace(/^["']|["']$/g, "").trim() ?? "Printgraphy";
  if (user) return `Printgraphy <${user}>`;
  return label;
}

// ─── Internal send helper ─────────────────────────────────────────────────────
async function trySend(
  email: string,
  subject: string,
  html: string,
  otp: string,
  label: string
): Promise<void> {
  const transport = createTransport();

  if (!transport) {
    console.log(`\n[DEV MAILER] ${label} OTP for ${email}: ${otp}\n`);
    return;
  }

  try {
    const info = await transport.sendMail({
      from: getFrom(),
      to: email,
      subject,
      html,
    });
    console.log(`[Mailer] ✓ ${label} email sent to ${email} — ID: ${info.messageId}`);
  } catch (err: unknown) {
    // Log the full SMTP error so you can see it in the terminal
    console.error(`[Mailer ERROR] ✗ Failed to send ${label} email to ${email}:`);
    if (err && typeof err === "object" && "message" in err) {
      console.error("  Message:", (err as { message: string }).message);
    }
    if (err && typeof err === "object" && "code" in err) {
      console.error("  Code:", (err as { code: string }).code);
    }
    console.error("  Full error:", err);

    // IMPORTANT: Do NOT re-throw — the user account is already saved in DB.
    // We log the OTP as a fallback so dev/testing still works.
    console.warn(`[Mailer FALLBACK] ${label} OTP for ${email}: ${otp}`);
  }
}

// ─── Send OTP for email verification ─────────────────────────────────────────
export async function sendVerifyEmail(email: string, otp: string): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#2196D2;margin-bottom:8px">Verify Your Printgraphy Account</h2>
      <p style="color:#374151">Your one-time verification code is:</p>
      <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#1a1a1a;padding:20px 0;text-align:center">${otp}</div>
      <p style="color:#6b7280;font-size:14px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px">Printgraphy — One-Of-A-Kind Fast Eco Luxury Printing</p>
    </div>`;

  await trySend(email, `${otp} — Your Printgraphy Verification Code`, html, otp, "Verify");
}

// ─── Send OTP for password reset ─────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, otp: string): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#2196D2;margin-bottom:8px">Reset Your Printgraphy Password</h2>
      <p style="color:#374151">Your one-time password reset code is:</p>
      <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#1a1a1a;padding:20px 0;text-align:center">${otp}</div>
      <p style="color:#6b7280;font-size:14px">This code expires in <strong>10 minutes</strong>. If you didn&apos;t request this, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px">Printgraphy — One-Of-A-Kind Fast Eco Luxury Printing</p>
    </div>`;

  await trySend(email, `${otp} — Your Printgraphy Password Reset Code`, html, otp, "Reset");
}

// ─── Send Vendor Welcome Credentials Email ───────────────────────────────────
export async function sendVendorWelcomeEmail(
  email: string,
  vendorName: string,
  tempPass: string,
  portalUrl: string
): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fbfd;border-radius:16px;border:1px solid #e2e8f0">
      <h2 style="color:#2196D2;margin-bottom:8px">Welcome to Printgraphy Vendor Network!</h2>
      <p style="color:#334155;font-size:14px">Hello <strong>${vendorName}</strong>,</p>
      <p style="color:#334155;font-size:14px">Your vendor fulfillment account has been created by the Printgraphy Admin team. Below are your login credentials to access your dedicated Vendor Portal:</p>
      
      <div style="background:#ffffff;padding:16px;border-radius:12px;border:1px solid #cbd5e1;margin:16px 0;font-size:14px">
        <p style="margin:4px 0"><strong>Vendor Portal:</strong> <a href="${portalUrl}" style="color:#2563eb">${portalUrl}</a></p>
        <p style="margin:4px 0"><strong>Email:</strong> ${email}</p>
        <p style="margin:4px 0"><strong>Temporary Password:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:16px;font-weight:bold">${tempPass}</code></p>
      </div>

      <p style="color:#64748b;font-size:13px">Please sign in and update your password, product catalog costs, and market coverage.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">Printgraphy Partner Network — One-Of-A-Kind Fast Eco Luxury Printing</p>
    </div>`;

  await trySend(email, "Welcome to Printgraphy Vendor Network — Login Credentials", html, tempPass, "VendorWelcome");
}

export async function sendDeliveryReminderEmail(email: string, vendorName: string, orderNumber: string, portalUrl: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#2196D2">Mark order ${orderNumber} delivered</h2>
      <p>Hello ${vendorName},</p>
      <p>This order was shipped more than 24 hours ago and is still not marked delivered. Update it in the vendor portal so it can qualify for payout.</p>
      <p><a href="${portalUrl}">Open vendor portal</a></p>
    </div>`;
  await trySend(email, `Mark ${orderNumber} delivered to qualify for payout`, html, orderNumber, "DeliveryReminder");
}

export async function sendVendorOfferEmail(email: string, vendorName: string, orderNumber: string, amount: number, portalUrl: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#2196D2">Order ${orderNumber} is offered to you</h2>
      <p>Hello ${vendorName},</p>
      <p>Admin assigned this order with a payment of <strong>$${amount.toFixed(2)}</strong>. Accept it in the vendor portal if you agree.</p>
      <p><a href="${portalUrl}">Open vendor portal</a></p>
    </div>`;
  await trySend(email, `Accept ${orderNumber} for $${amount.toFixed(2)}`, html, orderNumber, "VendorOffer");
}

export async function sendCustomerDeliveryEmail(email: string, orderNumber: string, orderUrl: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#2196D2">Confirm order ${orderNumber}</h2>
      <p>Your vendor marked this order delivered. Open the order and confirm that you received it.</p>
      <p><a href="${orderUrl}">Confirm delivery</a></p>
    </div>`;
  await trySend(email, `Confirm delivery for ${orderNumber}`, html, orderNumber, "CustomerDelivery");
}
