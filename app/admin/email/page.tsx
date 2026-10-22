"use client";

import { useEffect, useState } from "react";
import { DEFAULT_EMAIL_SETTINGS, type EmailEvent, type EmailSettingsContent } from "@/lib/emailSettings";
import EmailBodyEditor from "@/components/admin/EmailBodyEditor";

type PublicSettings = Omit<EmailSettingsContent, "smtp"> & {
  smtp: EmailSettingsContent["smtp"] & { hasPassword?: boolean };
};

const EVENTS: { id: EmailEvent; label: string; hint: string }[] = [
  { id: "order", label: "Orders", hint: "{{orderNumber}} {{customerName}} {{email}} {{total}} {{items}}" },
  { id: "quote", label: "Quotes", hint: "{{reference}} {{name}} {{email}} {{category}} {{quantity}} {{description}}" },
  { id: "review", label: "Reviews", hint: "{{userName}} {{rating}} {{title}} {{comment}} {{productId}}" },
];

const fieldClass = "w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]";

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

  if (loading) return <p className="text-base text-zinc-500">Loading email settings...</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Email</h1>
          <p className="mt-1 text-base text-zinc-500">Set SMTP, the admin inbox, and which notices are sent.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={sendTest} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-base font-bold text-zinc-700 cursor-pointer">Send test</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[#e74b2d] px-4 py-2.5 text-base font-bold text-white cursor-pointer disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
      {message && <p className="text-base font-bold text-[#e74b2d]">{message}</p>}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-bold text-zinc-900">SMTP</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-base font-bold text-zinc-700">Host
            <input className={`${fieldClass} mt-1 font-normal`} value={settings.smtp.host} onChange={(e) => setSettings((prev) => ({ ...prev, smtp: { ...prev.smtp, host: e.target.value } }))} placeholder="smtp.hostinger.com" />
          </label>
          <label className="text-base font-bold text-zinc-700">Port
            <input type="number" className={`${fieldClass} mt-1 font-normal`} value={settings.smtp.port} onChange={(e) => setSettings((prev) => ({ ...prev, smtp: { ...prev.smtp, port: Number(e.target.value) } }))} />
          </label>
          <label className="text-base font-bold text-zinc-700">Username
            <input className={`${fieldClass} mt-1 font-normal`} value={settings.smtp.user} onChange={(e) => setSettings((prev) => ({ ...prev, smtp: { ...prev.smtp, user: e.target.value } }))} />
          </label>
          <label className="text-base font-bold text-zinc-700">Password {settings.smtp.hasPassword ? "(saved)" : ""}
            <input type="password" className={`${fieldClass} mt-1 font-normal`} value={settings.smtp.pass} onChange={(e) => setSettings((prev) => ({ ...prev, smtp: { ...prev.smtp, pass: e.target.value } }))} placeholder={settings.smtp.hasPassword ? "Leave blank to keep the saved password" : ""} />
          </label>
          <label className="text-base font-bold text-zinc-700">From name
            <input className={`${fieldClass} mt-1 font-normal`} value={settings.smtp.fromName} onChange={(e) => setSettings((prev) => ({ ...prev, smtp: { ...prev.smtp, fromName: e.target.value } }))} />
          </label>
          <label className="text-base font-bold text-zinc-700">Admin inbox
            <input type="email" className={`${fieldClass} mt-1 font-normal`} value={settings.adminEmail} onChange={(e) => setSettings((prev) => ({ ...prev, adminEmail: e.target.value }))} placeholder="admin@printgraphi.com" />
          </label>
        </div>
      </section>

      {EVENTS.map((event) => {
        const template = settings.templates[event.id];
        return (
          <section key={event.id} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-zinc-900">{event.label}</h2>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({
                  ...prev,
                  templates: { ...prev.templates, [event.id]: { ...prev.templates[event.id], active: !template.active } },
                }))}
                className={`rounded-full px-3 py-1 text-base font-bold cursor-pointer ${template.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}
              >
                {template.active ? "Active" : "Inactive"}
              </button>
            </div>
            <label className="text-base font-bold text-zinc-700 block">Subject
              <input className={`${fieldClass} mt-1 font-normal`} value={template.subject} onChange={(e) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, [event.id]: { ...prev.templates[event.id], subject: e.target.value } } }))} />
            </label>
            <div>
              <p className="text-base font-bold text-zinc-700">Message</p>
              <p className="mt-1 text-base text-zinc-500">Write it the way the email should look. Click a blue field to drop in live details.</p>
              <EmailBodyEditor
                value={template.body}
                placeholders={event.hint.split(" ")}
                onChange={(body) => setSettings((prev) => ({
                  ...prev,
                  templates: { ...prev.templates, [event.id]: { ...prev.templates[event.id], body } },
                }))}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
