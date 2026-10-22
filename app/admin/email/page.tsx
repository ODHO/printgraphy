"use client";

import { useEffect, useState } from "react";
import { DEFAULT_EMAIL_SETTINGS, type EmailEvent, type EmailSettingsContent } from "@/lib/emailSettings";
import EmailBodyEditor from "@/components/admin/EmailBodyEditor";
import { Badge, Button, Card, CardHeader, cx, Field, inputClass, labelClass, LoadingState, Notice, PageHeader, type IconName } from "@/components/admin/ui";

type PublicSettings = Omit<EmailSettingsContent, "smtp"> & {
  smtp: EmailSettingsContent["smtp"] & { hasPassword?: boolean };
};

const EVENTS: { id: EmailEvent; label: string; hint: string }[] = [
  { id: "order", label: "Orders", hint: "{{orderNumber}} {{customerName}} {{email}} {{total}} {{items}}" },
  { id: "quote", label: "Quotes", hint: "{{reference}} {{name}} {{email}} {{category}} {{quantity}} {{description}}" },
  { id: "review", label: "Reviews", hint: "{{userName}} {{rating}} {{title}} {{comment}} {{productId}}" },
];

const EVENT_ICONS: Record<EmailEvent, IconName> = { order: "orders", quote: "quotes", review: "star" };

export default function AdminEmailPage() {
  const [settings, setSettings] = useState<PublicSettings>({
    ...DEFAULT_EMAIL_SETTINGS,
    smtp: { ...DEFAULT_EMAIL_SETTINGS.smtp, hasPassword: false },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/email")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) setSettings(data.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setMessage("Email settings saved.");
      } else {
        setMessage(data.message || "Could not save.");
      }
    } catch {
      setMessage("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setMessage("");
    const res = await fetch("/api/admin/email", { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "Test finished.");
  };

  if (loading) return <LoadingState label="Loading email settings..." />;

  const setSmtp = (patch: Partial<PublicSettings["smtp"]>) => setSettings((prev) => ({ ...prev, smtp: { ...prev.smtp, ...patch } }));

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        icon="mail"
        title="Email"
        description="Set SMTP, the admin inbox, and which notices are sent."
        actions={
          <>
            <Button variant="secondary" icon="mail" onClick={sendTest}>Send test</Button>
            <Button icon="check" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </>
        }
      />
      {message && <Notice tone={message === "Email settings saved." ? "green" : "brand"}>{message}</Notice>}

      <Card className="overflow-hidden">
        <CardHeader icon="settings" title="SMTP" subtitle="Outgoing mail server and sender details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 sm:p-6">
          <Field label="Host">
            <input className={inputClass} value={settings.smtp.host} onChange={(e) => setSmtp({ host: e.target.value })} placeholder="smtp.hostinger.com" />
          </Field>
          <Field label="Port">
            <input type="number" className={cx(inputClass, "tabular-nums")} value={settings.smtp.port} onChange={(e) => setSmtp({ port: Number(e.target.value) })} />
          </Field>
          <Field label="Username">
            <input className={inputClass} value={settings.smtp.user} onChange={(e) => setSmtp({ user: e.target.value })} />
          </Field>
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                Password {settings.smtp.hasPassword ? <Badge tone="green" className="!py-0 text-[10px]">saved</Badge> : ""}
              </span>
            }
          >
            <input type="password" className={inputClass} value={settings.smtp.pass} onChange={(e) => setSmtp({ pass: e.target.value })} placeholder={settings.smtp.hasPassword ? "Leave blank to keep the saved password" : ""} />
          </Field>
          <Field label="From name">
            <input className={inputClass} value={settings.smtp.fromName} onChange={(e) => setSmtp({ fromName: e.target.value })} />
          </Field>
          <Field label="Admin inbox">
            <input type="email" className={inputClass} value={settings.adminEmail} onChange={(e) => setSettings((prev) => ({ ...prev, adminEmail: e.target.value }))} placeholder="admin@printgraphi.com" />
          </Field>
        </div>
      </Card>

      {EVENTS.map((event) => {
        const template = settings.templates[event.id];
        return (
          <Card key={event.id} className="overflow-hidden">
            <CardHeader
              icon={EVENT_ICONS[event.id]}
              title={event.label}
              subtitle={template.active ? "This notice is being sent" : "This notice is turned off"}
              action={
                <button
                  type="button"
                  role="switch"
                  aria-checked={template.active}
                  onClick={() => setSettings((prev) => ({
                    ...prev,
                    templates: { ...prev.templates, [event.id]: { ...prev.templates[event.id], active: !template.active } },
                  }))}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full cursor-pointer text-xs font-semibold"
                >
                  <span className={cx("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", template.active ? "bg-emerald-500" : "bg-zinc-300")}>
                    <span className={cx("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", template.active ? "translate-x-[18px]" : "translate-x-0.5")} />
                  </span>
                  <span className={template.active ? "text-emerald-700" : "text-zinc-500"}>{template.active ? "Active" : "Inactive"}</span>
                </button>
              }
            />
            <div className="space-y-4 p-5 sm:p-6">
              <Field label="Subject">
                <input className={inputClass} value={template.subject} onChange={(e) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, [event.id]: { ...prev.templates[event.id], subject: e.target.value } } }))} />
              </Field>
              <div>
                <p className={labelClass}>Message</p>
                <p className="-mt-0.5 mb-2 text-xs text-zinc-500">Write it the way the email should look. Click a blue field to drop in live details.</p>
                <EmailBodyEditor
                  value={template.body}
                  placeholders={event.hint.split(" ")}
                  onChange={(body) => setSettings((prev) => ({
                    ...prev,
                    templates: { ...prev.templates, [event.id]: { ...prev.templates[event.id], body } },
                  }))}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
