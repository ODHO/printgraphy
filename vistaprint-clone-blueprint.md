# Printgraphi — Full Project Blueprint

### Business Card / Print Design Web App — Next.js + MongoDB

---

## 1. Product Concept (What we're building)

A web app where customers can:

1. Browse print products (business cards, flyers, stickers, banners, mugs, t-shirts, invitations, etc.)
2. Customize a design using an online editor (drag-drop text, images, shapes, upload logo) OR pick a pre-made template
3. Preview a live mockup
4. Choose paper/finish/quantity options → price updates live
5. Add to cart → checkout → pay online
6. Track order from "Design Approved" → "Printing" → "Shipped" → "Delivered"

Admin side manages products, templates, orders, printing queue, users, payments, and site content.

---

## 2. Tech Stack

| Layer              | Technology                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| Frontend           | Next.js 14 (App Router), React, Tailwind CSS                                         |
| Backend            | Next.js API Routes / Route Handlers (or separate Express if you want to scale later) |
| Database           | MongoDB + Mongoose                                                                   |
| Auth               | NextAuth.js (Email/Password + Google login) or custom JWT                            |
| File/Image storage | Cloudinary or AWS S3 (for uploaded logos, design exports, product images)            |
| Design Editor      | Fabric.js or Konva.js (canvas-based drag/drop editor)                                |
| Payments           | Stripe (international) or JazzCash/Easypaisa + Stripe (if targeting Pakistan)        |
| Emails             | Resend / Nodemailer (order confirmation, status updates)                             |
| Hosting            | Vercel (frontend+API) + MongoDB Atlas (DB)                                           |
| PDF Generation     | For print-ready files: `pdf-lib` or send canvas export as high-res PNG/PDF           |
| State Management   | Zustand or React Context (cart, editor state)                                        |

---

## 3. User Roles

1. **Guest** – browse products/templates, no checkout
2. **Customer** – register/login, design, order, track, reorder
3. **Admin** – full control panel (super admin)
4. **Staff/Operator** (optional) – limited admin: only sees orders + printing queue, no access to pricing/users
5. **Designer** (optional, for custom design requests) – gets assigned custom-design orders

For MVP you can start with just Customer + Admin, add Staff later.

---

## 4. MongoDB Collections (Schema Overview)

**users**

```
_id, name, email, passwordHash, phone, role (customer/admin/staff),
addresses: [{ label, line1, city, state, zip, country, isDefault }],
createdAt
```

**categories**

```
_id, name, slug, image, parentCategory (for subcategories), order
```

**products**

```
_id, name, slug, categoryId, description, basePrice,
images: [url],
variants: [{ size, material, finish, priceModifier }],
quantityTiers: [{ qty, pricePerUnit }],
isCustomizable, editorTemplateId, isActive, createdAt
```

**templates**

```
_id, productId, name, thumbnail, canvasJSON (Fabric.js/Konva JSON layout),
category, tags, isPremium, createdBy (admin/designer)
```

**designs** (user-saved/custom designs)

```
_id, userId, productId, templateId (optional), canvasJSON,
previewImage, status (draft/finalized), createdAt, updatedAt
```

**orders**

```
_id, orderNumber, userId, items: [{ productId, designId, variant, qty, unitPrice, subtotal }],
shippingAddress, billingAddress, paymentStatus (pending/paid/failed/refunded),
paymentMethod, transactionId,
orderStatus (placed/design_review/approved/printing/shipped/delivered/cancelled),
statusHistory: [{ status, timestamp, note }],
totalAmount, discount, couponCode, createdAt
```

**coupons**

```
_id, code, type (percent/flat), value, minOrderValue, expiryDate,
usageLimit, usedCount, isActive
```

**reviews**

```
_id, productId, userId, rating, comment, images, createdAt
```

**support_tickets** (optional)

```
_id, userId, orderId, subject, messages: [{ sender, text, timestamp }], status
```

**site_settings** (banners, homepage content, shipping rates, tax rules)

---

## 5. Customer-Side Feature List & Flow

### A. Landing / Browse

- Homepage: featured categories, promo banners, best sellers, seasonal deals
- Category pages with filters (price, material, size, occasion)
- Product detail page: variant selector, quantity tiers, live price calculator, "Customize Now" / "Use a Template" buttons

### B. Design Editor (core feature)

- Canvas-based editor (Fabric.js/Konva):
  - Add/edit text (fonts, size, color, alignment)
  - Upload own logo/image (drag, resize, rotate)
  - Choose from clipart/icons library
  - Background color/pattern picker
  - Front & back side toggle for cards
  - Bleed/safe-zone guides overlay (critical for print accuracy)
  - Undo/redo, layers panel
  - Save draft (auto-save to `designs` collection)
  - "Preview 3D mockup" (optional, nice-to-have)
- On finish → generates high-res preview image + stores canvasJSON

### C. Cart & Checkout

- Add multiple customized products to cart
- Edit design from cart before checkout
- Apply coupon code
- Choose shipping method (standard/express) + shipping address
- Payment via Stripe/local gateway
- Order confirmation email with order number

### D. Account Dashboard

- Order history + live status tracker
- Reorder previous design (1-click)
- Saved designs / drafts
- Saved addresses
- Download invoice (PDF)
- Submit support ticket

### E. Order Tracking Flow (customer sees)

```
Placed → Design Under Review (if custom) → Approved →
Printing → Quality Check → Packed → Shipped → Delivered
```

- Email/SMS notification on each status change

---

## 6. Admin Panel — Full Capabilities (A to Z)

### 1. Dashboard

- Revenue overview (daily/weekly/monthly graphs)
- Total orders, pending orders, low-stock alerts
- New customer signups
- Top-selling products

### 2. Product Management

- Add/edit/delete products
- Set base price, variants (size/material/finish), quantity-tier pricing
- Upload product images
- Mark product as "customizable" and link an editor template
- Enable/disable product visibility
- Bulk import products via CSV

### 3. Category Management

- Create/edit/delete categories & subcategories
- Reorder categories (drag-drop on storefront)
- Set category banner images

### 4. Template Management (design templates library)

- Upload/create templates per product (canvas JSON)
- Mark templates as free/premium
- Organize by tags/occasion (e.g., "wedding," "corporate," "birthday")
- Approve/reject templates submitted by staff designers

### 5. Order Management

- View all orders (filter by status, date, customer, payment status)
- View customer's finalized design (preview + downloadable print-ready file)
- Change order status manually (move through printing pipeline)
- Add internal notes per order
- Approve or request revision on customer's custom design
- Generate/download print-ready PDF for the print team
- Refund/cancel order
- Print shipping labels (integrate with courier API — e.g., local courier or DHL)

### 6. Printing Queue / Production Management

- See orders currently "In Design Review" and "Approved for Print"
- Assign order to a printing batch
- Mark batch as printed → auto-updates order status
- Track material/stock usage (optional inventory module)

### 7. User Management

- View/search all customers
- View a customer's order history & saved designs
- Suspend/ban user account
- Manually create staff/admin accounts, assign roles & permissions

### 8. Coupon & Discount Management

- Create % or flat discount coupons
- Set expiry, usage limits, minimum order value
- View coupon usage stats

### 9. Reviews & Ratings Moderation

- Approve/reject/delete customer reviews
- Reply to reviews publicly

### 10. Shipping & Tax Settings

- Define shipping zones & rates
- Set tax rules per region
- Set free-shipping thresholds

### 11. Payments & Finance

- View all transactions (success/failed/refunded)
- Reconcile with payment gateway dashboard
- Export sales reports (CSV/Excel) for accounting

### 12. Content / CMS Management

- Edit homepage banners, promotional sections
- Manage static pages (About, FAQ, Terms, Privacy Policy)
- Manage blog (optional, for SEO)

### 13. Support Ticket Management

- View & respond to customer support tickets
- Mark resolved/pending
- Assign ticket to staff member

### 14. Analytics & Reports

- Sales by product/category
- Customer lifetime value
- Abandoned cart tracking (optional)
- Conversion rate of design editor → checkout

### 15. Notifications / Email Templates

- Customize automated email templates (order confirmation, shipped, delivered, etc.)
- Manage SMS notification settings (optional)

### 16. System / Security Settings

- Manage admin/staff roles & permissions (RBAC)
- Activity log (who changed what, when)
- API key management (for payment gateway, courier, storage)

---

## 7. Suggested Next.js Folder Structure

```
/app
  /(storefront)
    /page.tsx                → homepage
    /category/[slug]/page.tsx
    /product/[slug]/page.tsx
    /editor/[productId]/page.tsx   → design editor
    /cart/page.tsx
    /checkout/page.tsx
    /account/page.tsx
    /account/orders/[id]/page.tsx
  /(admin)
    /admin/dashboard/page.tsx
    /admin/products/page.tsx
    /admin/orders/page.tsx
    /admin/templates/page.tsx
    /admin/users/page.tsx
    /admin/coupons/page.tsx
    /admin/settings/page.tsx
  /api
    /auth/[...nextauth]/route.ts
    /products/route.ts
    /orders/route.ts
    /designs/route.ts
    /upload/route.ts
    /payments/webhook/route.ts
/components
  /editor (canvas, toolbar, layers panel)
  /storefront (product-card, price-calculator)
  /admin (data-table, charts)
/lib
  /db.ts (mongoose connection)
  /auth.ts
  /pricing.ts (quantity-tier price calc)
/models
  User.ts, Product.ts, Order.ts, Design.ts, Template.ts, Coupon.ts, Review.ts
```

---

## 8. Build Roadmap (Phased)

**Phase 1 — Foundation**
Auth, product catalog (static, no editor yet), categories, basic cart/checkout, MongoDB models.

**Phase 2 — Design Editor**
Canvas editor with text/image/upload, save design to DB, live price calculator, front/back sides.

**Phase 3 — Orders & Payments**
Stripe integration, order placement, status tracking, email notifications.

**Phase 4 — Admin Panel**
Product/category/template CRUD, order management, user management, coupons.

**Phase 5 — Production & Polish**
Printing queue, print-ready PDF export, reviews, analytics dashboard, CMS pages.

**Phase 6 — Scale**
Staff roles/RBAC, support tickets, courier API, inventory tracking, SEO/blog.

---

## 9. Key Technical Challenges to Plan For

- **Print-ready output**: canvas export must be high-resolution (300 DPI) with bleed/safe zones — not just a screenshot.
- **Pricing logic**: price depends on product + variant + quantity tier + customization complexity — centralize this in one pricing function, don't scatter it across pages.
- **Editor performance**: Fabric.js/Konva canvases can get heavy with many objects — debounce auto-save.
- **Image uploads**: validate size/format, store on Cloudinary/S3, not directly in MongoDB.
- **Order state machine**: enforce valid status transitions server-side (don't let "shipped" jump back to "placed").

---

This covers the end-to-end flow from customer browsing to admin fulfillment. Next step, if you want, I can start scaffolding Phase 1 (Next.js project structure + MongoDB models + auth) as actual code.
