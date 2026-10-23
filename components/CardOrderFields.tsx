"use client";

import { useRef, useState } from "react";
import {
  downloadSampleEmployeeSheet,
  fieldValue,
  readEmployeeFile,
  type EmployeeCard,
  type SheetField,
} from "@/lib/employeeSheet";

const PRESETS = [50, 100, 250, 500, 1000];

export default function CardOrderFields({
  quantity,
  onQuantity,
  employees,
  onEmployees,
  onUseEmployee,
  fields,
  basePrice = 0.15,
}: {
  quantity: number;
  onQuantity: (quantity: number) => void;
  employees: EmployeeCard[];
  onEmployees: (employees: EmployeeCard[]) => void;
  onUseEmployee: (employee: EmployeeCard) => void;
  fields?: SheetField[];
  basePrice?: number;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const setQuantity = (value: number) => {
    if (!Number.isFinite(value)) return;
    onQuantity(Math.min(100000, Math.max(1, Math.round(value))));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setError("");
    try {
      const rows = await readEmployeeFile(file, fields);
      setFileName(file.name);
      setActiveIndex(0);
      onEmployees(rows);
      onUseEmployee(rows[0]);
      onQuantity(rows.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that sheet.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const tableFields =
    fields?.length
      ? fields
      : [
          { key: "name", header: "Name", sample: "", layerIds: [] as string[] },
          { key: "title", header: "Title", sample: "", layerIds: [] as string[] },
          { key: "email", header: "Email", sample: "", layerIds: [] as string[] },
        ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#d7e8f4] bg-[#f7fbfe] p-4 sm:p-5 space-y-3">
        <label htmlFor="card-quantity" className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 block">
          How many cards
        </label>
        <input
          id="card-quantity"
          type="number"
          min={1}
          max={100000}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="w-full px-4 py-3 rounded-2xl border border-[#d7e8f4] bg-white text-lg font-black tracking-[-0.02em] text-[#1e1d1b] focus:border-[#329AD4] focus:outline-none focus:ring-2 focus:ring-[#329AD4]/20"
        />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setQuantity(preset)}
              className={`min-w-[3.25rem] px-3.5 py-2 text-sm font-bold rounded-xl border transition cursor-pointer ${
                quantity === preset
                  ? "bg-[#329AD4] text-white border-[#329AD4] shadow-[0_8px_18px_-10px_rgba(50,154,212,0.9)]"
                  : "bg-white border-[#d7e8f4] text-zinc-700 hover:border-[#88c9ef]"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-500">
          Type any quantity. Base price is{" "}
          <span className="font-semibold text-[#1e1d1b]">${basePrice.toFixed(2)}</span> per card.
        </p>
      </div>

      <div className="rounded-2xl border border-[#d7e8f4] bg-white p-4 sm:p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#1e1d1b]">Employee list</p>
            <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
              Upload an Excel or CSV sheet. Columns match this template&apos;s fields. Each row prints that person on the card.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadSampleEmployeeSheet(fields)}
            className="shrink-0 text-sm font-bold text-[#329AD4] hover:text-[#2884b8] underline decoration-[#329AD4]/40 underline-offset-4 cursor-pointer"
          >
            Sample Excel
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={reading}
          className="w-full py-4 border-2 border-dashed border-[#b8e0f6] hover:border-[#329AD4] hover:bg-[#f0f8fd] text-sm font-semibold text-[#2172a0] rounded-2xl cursor-pointer disabled:opacity-50 transition"
        >
          {reading ? "Reading sheet..." : fileName ? `Replace ${fileName}` : "Upload Excel or CSV"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        {employees.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#1e1d1b]">{employees.length} people</p>
              <button
                type="button"
                onClick={() => {
                  setFileName("");
                  setActiveIndex(0);
                  onEmployees([]);
                }}
                className="text-sm font-bold text-zinc-500 hover:text-red-500 cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="max-h-48 overflow-auto rounded-2xl border border-[#d7e8f4]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f0f8fd] text-zinc-500 sticky top-0">
                  <tr>
                    {tableFields.map((field) => (
                      <th key={field.header} className="px-3 py-2 font-semibold whitespace-nowrap">
                        {field.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, index) => (
                    <tr
                      key={`${employee.email}-${employee.name}-${index}`}
                      onClick={() => {
                        setActiveIndex(index);
                        onUseEmployee(employee);
                      }}
                      className={`cursor-pointer border-t border-[#e7f1f8] ${
                        activeIndex === index ? "bg-[#eef7fc]" : "hover:bg-[#f7fbfe]"
                      }`}
                    >
                      {tableFields.map((field) => (
                        <td key={field.header} className="px-3 py-2 text-zinc-700 whitespace-nowrap">
                          {fieldValue(employee, field) || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Click a person to preview their card. Quantity starts at one card per person — type another number if you need a different print run.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
