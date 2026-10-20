"use client";

import { useEffect, useRef, useState } from "react";

export interface VendorOption {
  _id: string;
  name: string;
  status: string;
  isAvailable?: boolean;
}

function availability(vendor: VendorOption) {
  if (vendor.status === "deactivated") return { label: "Removed", className: "bg-zinc-100 text-zinc-500" };
  if (vendor.status === "paused" || vendor.isAvailable === false) return { label: "Paused", className: "bg-amber-50 text-amber-700" };
  return { label: "Active", className: "bg-emerald-50 text-emerald-700" };
}

export default function VendorSelect({
  vendors,
  value,
  onChange,
}: {
  vendors: VendorOption[];
  value: string;
  onChange: (vendorId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = vendors.find((vendor) => vendor._id === value);
  const choices = vendors.filter((vendor) => vendor.status !== "deactivated" || vendor._id === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-[#f8fbfd] px-3 py-2.5 text-left text-base cursor-pointer focus:outline-none focus:border-[#064FE0]"
      >
        <span className="font-semibold text-zinc-900 truncate">{selected?.name || "Unassigned"}</span>
        <span className="flex items-center gap-2 shrink-0">
          {selected && <Badge vendor={selected} />}
          <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-base cursor-pointer ${value === "" ? "bg-sky-50 text-[#064FE0]" : "text-zinc-700 hover:bg-zinc-50"}`}
              >
                <span className="font-semibold">Unassigned</span>
              </button>
            </li>
            {choices.map((vendor) => (
              <li key={vendor._id}>
                <button
                  type="button"
                  onClick={() => { onChange(vendor._id); setOpen(false); }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-base cursor-pointer ${value === vendor._id ? "bg-sky-50" : "hover:bg-zinc-50"}`}
                >
                  <span className="font-semibold text-zinc-900 truncate">{vendor.name}</span>
                  <Badge vendor={vendor} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Badge({ vendor }: { vendor: VendorOption }) {
  const state = availability(vendor);
  return <span className={`rounded-full px-2 py-0.5 text-base font-bold ${state.className}`}>{state.label}</span>;
}
