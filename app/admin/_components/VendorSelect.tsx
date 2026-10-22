"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, Icon, cx, inputClass } from "@/components/admin/ui";

export interface VendorOption {
  _id: string;
  name: string;
  status: string;
  isAvailable?: boolean;
}

function availability(vendor: VendorOption) {
  if (vendor.status === "deactivated") return { label: "Removed", className: "bg-zinc-100 text-zinc-500 ring-zinc-500/15", dot: "bg-zinc-400" };
  if (vendor.status === "paused" || vendor.isAvailable === false) return { label: "Paused", className: "bg-amber-50 text-amber-700 ring-amber-600/15", dot: "bg-amber-500" };
  return { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" };
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          inputClass,
          "flex items-center justify-between gap-3 text-left cursor-pointer py-2",
          open && "border-[#329AD4] ring-4 ring-[#329AD4]/10"
        )}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <Avatar name={selected.name} size="sm" />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
              <Icon name="vendors" className="w-3.5 h-3.5" />
            </span>
          )}
          <span className={cx("truncate", selected ? "font-semibold text-zinc-900" : "text-zinc-500")}>{selected?.name || "Unassigned"}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {selected && <Badge vendor={selected} />}
          <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-900/5 ring-1 ring-black/[0.02]">
          <ul className="max-h-64 overflow-y-auto p-1" role="listbox">
            <li>
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className={cx(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors",
                  value === "" ? "bg-[#EAF5FB] text-[#2884b8]" : "text-zinc-600 hover:bg-zinc-50"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <Icon name="vendors" className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium">Unassigned</span>
                </span>
                {value === "" && <Icon name="check" className="w-4 h-4 text-[#329AD4]" strokeWidth={2.4} />}
              </button>
            </li>
            {choices.map((vendor) => (
              <li key={vendor._id}>
                <button
                  type="button"
                  onClick={() => { onChange(vendor._id); setOpen(false); }}
                  className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors",
                    value === vendor._id ? "bg-[#EAF5FB]" : "hover:bg-zinc-50"
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={vendor.name} size="sm" />
                    <span className="font-medium text-zinc-900 truncate">{vendor.name}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Badge vendor={vendor} />
                    {value === vendor._id && <Icon name="check" className="w-4 h-4 text-[#329AD4]" strokeWidth={2.4} />}
                  </span>
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
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${state.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
      {state.label}
    </span>
  );
}
