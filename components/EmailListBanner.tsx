"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";

export default function EmailListBanner({
  emailList,
}: {
  emailList: HomepageContent["emailList"];
}) {
  const src = mediaSrc(emailList.image) || emailList.image || "/catalog/apparel-totes-v2.png";
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
    <section className="w-full border-y border-[#D9E0E8] bg-white">
      <div className="grid w-full md:grid-cols-2">
        <div className="relative order-2 min-h-[260px] sm:min-h-[320px] md:order-1 md:min-h-[400px]">
          {local ? (
            <Image
              src={src}
              alt={emailList.imageAlt || emailList.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
          ) : (
            <img
              src={src}
              alt={emailList.imageAlt || emailList.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
        </div>

        <div className="order-1 flex flex-col justify-center bg-white px-8 py-12 sm:px-12 sm:py-16 lg:px-16 xl:px-20 md:order-2">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#004EE0] uppercase">
            {emailList.eyebrow}
          </p>
          <h2 className="mt-3 max-w-md text-2xl font-extrabold leading-tight tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
            {emailList.title}
          </h2>

          <form
            onSubmit={onSubmit}
            className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch"
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
              placeholder={emailList.placeholder || "Subscription email"}
              className="min-w-0 flex-1 rounded-lg border border-[#d1d5db] bg-white px-4 py-3.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#004EE0] focus:ring-2 focus:ring-[#99CAFF]/40"
              disabled={status === "loading"}
              required
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-lg bg-[#042E7B] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#004EE0] disabled:opacity-70"
            >
              {status === "loading" ? "Submitting…" : emailList.submitLabel || "Submit"}
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
