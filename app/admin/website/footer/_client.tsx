"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import {
  DEFAULT_FOOTER_CONTENT,
  type FooterContent,
  type FooterPaymentBadge,
  type FooterSocialLink,
} from "@/lib/footerContent";
import {
  Button,
  Card,
  CardHeader,
  Icon,
  IconButton,
  PageHeader,
  LoadingState,
  Spinner,
  cx,
  inputClass,
  labelClass,
} from "@/components/admin/ui";

async function uploadImage(file: File) {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", "uploads");
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = await res.json();
  if (!data.success || !data.url) throw new Error(data.message || "Upload failed");
  return data.url as string;
}

function TextField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      {hint && <p className="mt-1 text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-5 py-5 last:border-b-0 sm:px-6">
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function WhiteSpinner({ className }: { className?: string }) {
  return <span className={cx("inline-block animate-spin rounded-full border-2 border-white/40 border-t-white", className)} />;
}

export default function FooterEditor() {
  const [content, setContent] = useState<FooterContent>(DEFAULT_FOOTER_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/footer")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) setContent(data.content);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/footer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      setMessage(data.success ? "Footer saved." : data.message || "Could not save.");
      if (data.success && data.content) setContent(data.content);
    } catch {
      setMessage("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const saved = message === "Footer saved.";

  const updatePayment = (index: number, patch: Partial<FooterPaymentBadge>) => {
    setContent((prev) => ({
      ...prev,
      payments: prev.payments.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const updateSocial = (index: number, patch: Partial<FooterSocialLink>) => {
    setContent((prev) => ({
      ...prev,
      social: prev.social.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const saveButton = (
    <Button onClick={save} disabled={saving || loading} icon={saving ? undefined : "check"}>
      {saving && <WhiteSpinner className="h-4 w-4" />}
      {saving ? "Saving..." : "Save footer"}
    </Button>
  );

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        icon="menu"
        title="Footer"
        description="Edit logo, tagline, Trustpilot, payments, social links, and legal bar. Link columns are managed separately."
        back={{ href: "/admin/website", label: "Website" }}
        actions={saveButton}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dbeefb] bg-[#f0f8fd] px-4 py-3 text-sm text-[#1b5b80]">
        <Icon name="layers" className="h-4 w-4 shrink-0" />
        <p className="flex-1">
          Footer link columns (Let Us Help, Our Company, etc.) are edited in{" "}
          <Link href="/admin/header-menu?tab=footer" className="font-semibold underline underline-offset-2">
            Header &amp; Footer Menu → Footer
          </Link>
          .
        </p>
      </div>

      {message && (
        <div
          className={cx(
            "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium",
            saved ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-rose-100 bg-rose-50 text-rose-800"
          )}
        >
          <Icon name={saved ? "check" : "ban"} className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          {message}
        </div>
      )}

      {loading ? (
        <Card>
          <LoadingState label="Loading footer..." />
        </Card>
      ) : (
        <Card>
          <CardHeader icon="menu" title="Footer content" subtitle="Everything below the page except link columns." />

          <Group title="Brand" hint="Logo and tagline at the top of the footer.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div>
                <span className={labelClass}>Logo</span>
                <label className="relative mt-1 flex aspect-[16/7] w-full max-w-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-[#071A3D]">
                  {content.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaSrc(content.logo) || content.logo} alt="" className="max-h-full max-w-full object-contain p-3" />
                  ) : (
                    <span className="text-xs font-semibold text-white/70">{uploading ? "Uploading..." : "Upload logo"}</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      setUploading(true);
                      try {
                        const url = await uploadImage(file);
                        setContent((prev) => ({ ...prev, logo: url }));
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </label>
                {uploading && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Spinner /> Uploading...
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <TextField label="Logo URL" value={content.logo} onChange={(logo) => setContent((prev) => ({ ...prev, logo }))} hint="Or paste a path / URL if you prefer not to upload." />
                <TextField label="Tagline" value={content.tagline} onChange={(tagline) => setContent((prev) => ({ ...prev, tagline }))} />
              </div>
            </div>
          </Group>

          <Group title="Trustpilot card" hint="Shown on the right of the link columns.">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={content.trustpilot.enabled}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    trustpilot: { ...prev.trustpilot, enabled: e.target.checked },
                  }))
                }
                className="rounded border-zinc-300"
              />
              Show Trustpilot card
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField
                label="Brand"
                value={content.trustpilot.brand}
                onChange={(brand) => setContent((prev) => ({ ...prev, trustpilot: { ...prev.trustpilot, brand } }))}
              />
              <TextField
                label="Rating label"
                value={content.trustpilot.ratingLabel}
                onChange={(ratingLabel) =>
                  setContent((prev) => ({ ...prev, trustpilot: { ...prev.trustpilot, ratingLabel } }))
                }
              />
              <TextField
                label="Review text"
                value={content.trustpilot.reviewText}
                onChange={(reviewText) =>
                  setContent((prev) => ({ ...prev, trustpilot: { ...prev.trustpilot, reviewText } }))
                }
              />
            </div>
          </Group>

          <Group title="Payment badges" hint="Shown in a row above the legal bar.">
            <div className="space-y-3">
              {content.payments.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updatePayment(index, { label: e.target.value })}
                    className={cx(inputClass, "flex-1")}
                    placeholder="VISA"
                  />
                  <IconButton
                    icon="trash"
                    label="Remove"
                    tone="danger"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        payments: prev.payments.filter((_, i) => i !== index),
                      }))
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setContent((prev) => ({ ...prev, payments: [...prev.payments, { label: "" }] }))}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#b8e0f6] bg-[#f0f8fd]/60 px-4 py-3 text-sm font-semibold text-[#2884b8] cursor-pointer"
              >
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
                Add payment badge
              </button>
            </div>
          </Group>

          <Group title="Social links" hint="Icon keys: facebook, twitter, instagram, pinterest.">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {content.social.map((item, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-800">{item.label || `Social ${index + 1}`}</p>
                    <IconButton
                      icon="trash"
                      label="Remove"
                      tone="danger"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          social: prev.social.filter((_, i) => i !== index),
                        }))
                      }
                    />
                  </div>
                  <TextField label="Label" value={item.label} onChange={(label) => updateSocial(index, { label })} />
                  <TextField label="URL" value={item.href} onChange={(href) => updateSocial(index, { href })} />
                  <TextField label="Icon key" value={item.icon} onChange={(icon) => updateSocial(index, { icon })} />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  social: [...prev.social, { label: "", href: "https://", icon: "facebook" }],
                }))
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#b8e0f6] bg-[#f0f8fd]/60 px-4 py-3 text-sm font-semibold text-[#2884b8] cursor-pointer"
            >
              <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
              Add social link
            </button>
          </Group>

          <Group title="Legal bar" hint="Phone, privacy, terms, copyright, and region.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Phone label" value={content.phoneLabel} onChange={(phoneLabel) => setContent((prev) => ({ ...prev, phoneLabel }))} />
              <TextField label="Phone link" value={content.phoneHref} onChange={(phoneHref) => setContent((prev) => ({ ...prev, phoneHref }))} hint="e.g. tel:18005550190" />
              <TextField label="Privacy label" value={content.privacyLabel} onChange={(privacyLabel) => setContent((prev) => ({ ...prev, privacyLabel }))} />
              <TextField label="Privacy link" value={content.privacyHref} onChange={(privacyHref) => setContent((prev) => ({ ...prev, privacyHref }))} />
              <TextField label="Terms label" value={content.termsLabel} onChange={(termsLabel) => setContent((prev) => ({ ...prev, termsLabel }))} />
              <TextField label="Terms link" value={content.termsHref} onChange={(termsHref) => setContent((prev) => ({ ...prev, termsHref }))} />
              <TextField
                label="Copyright"
                value={content.copyright}
                onChange={(copyright) => setContent((prev) => ({ ...prev, copyright }))}
                hint="Use {year} for the current year."
              />
              <TextField label="Region" value={content.regionLabel} onChange={(regionLabel) => setContent((prev) => ({ ...prev, regionLabel }))} />
            </div>
          </Group>
        </Card>
      )}

      <div className="sticky bottom-4 z-10">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#dbeefb] bg-white/90 px-4 py-3 shadow-lg shadow-[#329AD4]/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <span className={cx("h-2 w-2 rounded-full", saving ? "bg-amber-400 animate-pulse" : saved ? "bg-emerald-500" : "bg-[#329AD4]")} />
            {saving ? "Saving..." : message || "Background is fixed to #071A3D. Link columns: Header & Footer Menu."}
          </p>
          {saveButton}
        </div>
      </div>
    </div>
  );
}
