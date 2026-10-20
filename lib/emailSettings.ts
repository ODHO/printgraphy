export type EmailEvent = "order" | "quote" | "review";

export interface EmailTemplate {
  active: boolean;
  subject: string;
  body: string;
}

export interface EmailSettingsContent {
  adminEmail: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromName: string;
  };
  templates: Record<EmailEvent, EmailTemplate>;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettingsContent = {
  adminEmail: "",
  smtp: {
    host: "",
    port: 587,
    user: "",
    pass: "",
    fromName: "Printgraphy",
  },
  templates: {
    order: {
      active: false,
      subject: "New order {{orderNumber}}",
      body: "<p>A new order was placed.</p><p><strong>Order:</strong> {{orderNumber}}<br/><strong>Customer:</strong> {{customerName}}<br/><strong>Email:</strong> {{email}}<br/><strong>Total:</strong> {{total}}</p><p>{{items}}</p>",
    },
    quote: {
      active: false,
      subject: "New quote {{reference}}",
      body: "<p>A new quote request arrived.</p><p><strong>Reference:</strong> {{reference}}<br/><strong>Name:</strong> {{name}}<br/><strong>Email:</strong> {{email}}<br/><strong>Category:</strong> {{category}}<br/><strong>Quantity:</strong> {{quantity}}</p><p>{{description}}</p>",
    },
    review: {
      active: false,
      subject: "New review from {{userName}}",
      body: "<p>A customer left a review.</p><p><strong>Name:</strong> {{userName}}<br/><strong>Rating:</strong> {{rating}} / 5<br/><strong>Product:</strong> {{productId}}</p><p><strong>{{title}}</strong></p><p>{{comment}}</p>",
    },
  },
};

export function mergeEmailSettings(saved?: Partial<EmailSettingsContent> | null): EmailSettingsContent {
  const source = saved || {};
  return {
    adminEmail: source.adminEmail ?? DEFAULT_EMAIL_SETTINGS.adminEmail,
    smtp: { ...DEFAULT_EMAIL_SETTINGS.smtp, ...(source.smtp || {}) },
    templates: {
      order: { ...DEFAULT_EMAIL_SETTINGS.templates.order, ...(source.templates?.order || {}) },
      quote: { ...DEFAULT_EMAIL_SETTINGS.templates.quote, ...(source.templates?.quote || {}) },
      review: { ...DEFAULT_EMAIL_SETTINGS.templates.review, ...(source.templates?.review || {}) },
    },
  };
}

export function applyEmailTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}
