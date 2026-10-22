import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    // Security: Only order owner or guest owner can view invoice
    const isOwner = order.userId ? order.userId.toString() === session.userId : false;
    const isGuestOwner = order.guestEmail ? order.guestEmail === session.email : false;
    if (!isOwner && !isGuestOwner) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${order.orderNumber} - Printgraphy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111827; background: #fff; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.5px; }
    .title { font-size: 20px; font-weight: 800; color: #329AD4; text-align: right; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .box { width: 48%; }
    .box h4 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
    .box p { margin: 0; font-size: 13px; line-height: 1.5; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #6b7280; }
    td { border-bottom: 1px solid #f3f4f6; padding: 12px; font-size: 13px; color: #111827; }
    .totals { width: 300px; margin-left: auto; margin-top: 20px; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row { border-top: 2px solid #111827; font-weight: 800; font-size: 16px; margin-top: 6px; padding-top: 10px; }
    .footer { text-align: center; margin-top: 50px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div className="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #329AD4; color: #fff; border: none; padding: 10px 18px; font-weight: bold; border-radius: 8px; cursor: pointer;">
      🖨️ Print / Save PDF Invoice
    </button>
  </div>

  <div class="header">
    <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" style="width: 20%; height: auto;" className="h-10 w-auto mx-auto object-contain" />
          </Link>
    <div class="title">
      INVOICE
      <div style="font-size: 14px; font-family: monospace; font-weight: bold; color: #111827; margin-top: 4px;">#${order.orderNumber}</div>
    </div>
  </div>

  <div class="meta">
    <div class="box">
      <h4>Billed To & Shipping Address</h4>
      <p><strong>${order.shippingAddress.name}</strong></p>
      <p>${order.shippingAddress.line1}</p>
      ${order.shippingAddress.line2 ? `<p>${order.shippingAddress.line2}</p>` : ""}
      <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}</p>
      <p>${order.shippingAddress.country}</p>
    </div>
    <div class="box" style="text-align: right;">
      <h4>Order Details</h4>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
      <p><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
      <p><strong>Fulfillment:</strong> ${order.fulfillmentStatus.replace("_", " ").toUpperCase()}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${order.items
        .map(
          (item: any) => `
        <tr>
          <td>
            <strong>${item.name}</strong>
            ${
              item.specs && Object.keys(item.specs).length > 0
                ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${Object.entries(item.specs)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}</div>`
                : ""
            }
          </td>
          <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="text-align: right; font-family: monospace;">$${item.unitPrice.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">$${item.totalPrice.toFixed(2)}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Subtotal</span>
      <span>$${order.subtotal.toFixed(2)}</span>
    </div>
    <div class="row">
      <span>Shipping</span>
      <span>${order.shippingCost === 0 ? "FREE" : `$${order.shippingCost.toFixed(2)}`}</span>
    </div>
    <div class="row total-row">
      <span>Total Paid</span>
      <span>$${order.totalAmount.toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing Printgraphy — One-of-a-kind fast eco luxury printing!</p>
    <p>Questions? Contact support@printgraphi.com</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Error generating invoice." }, { status: 500 });
  }
}
