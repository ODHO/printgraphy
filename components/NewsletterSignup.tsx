"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";

export default function NewsletterSignup({
  newsletter,
}: {
  newsletter: HomepageContent["newsletter"];
}) {
  const src = mediaSrc(newsletter.image) || newsletter.image || "/catalog/business-stationery-v2.png";
  const local = src.startsWith("/") && !src.startsWith("/api/");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not subscribe.");
      }
      setStatus("success");
      setMessage(data.message || "You're signed up.");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Could not subscribe.");
    }
  };

  return (
    <section className="w-full bg-[#E3F2FF]">
      <div className="grid w-full md:grid-cols-2">
        <div className="relative order-2 min-h-[260px] sm:min-h-[320px] md:order-1 md:min-h-[420px]">
          {local ? (
            <Image
              src={src}
              alt={newsletter.imageAlt || newsletter.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
          ) : (
            <img
              src={src}
              alt={newsletter.imageAlt || newsletter.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
        </div>

        <div className="order-1 flex flex-col justify-center bg-[#E3F2FF] px-8 py-12 sm:px-12 sm:py-16 lg:px-16 xl:px-20 md:order-2">
          <h2 className="max-w-xl text-2xl font-extrabold leading-tight tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
            {newsletter.title}
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#3d4654]">
            {newsletter.body}
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-7 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "idle") {
                  setStatus("idle");
                  setMessage("");
                }
              }}
              placeholder={newsletter.placeholder || "Subscription email"}
              className="min-w-0 flex-1 rounded-lg border border-[#c5d4e6] bg-white px-4 py-3.5 text-sm text-[#111827] outline-none placeholder:text-[#8b95a5] focus:border-[#004EE0] focus:ring-2 focus:ring-[#99CAFF]/50"
              disabled={status === "loading"}
              required
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-lg bg-[#042E7B] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#004EE0] disabled:opacity-70"
            >
              {status === "loading" ? "Submitting…" : newsletter.submitLabel || "Submit"}
            </button>
          </form>

          {message && (
            <p
              className={`mt-3 text-sm font-medium ${
                status === "success" ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
