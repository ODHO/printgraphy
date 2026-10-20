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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="card-quantity" className="text-base font-bold text-zinc-800 block">
          How many cards
        </label>
        <input
          id="card-quantity"
          type="number"
          min={1}
          max={100000}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-base font-bold text-zinc-900 focus:border-[#064FE0] focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setQuantity(preset)}
              className={`px-3 py-1.5 text-base font-bold rounded-lg border cursor-pointer ${
                quantity === preset
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <p className="text-base text-zinc-500">Type any quantity. Base price is ${basePrice.toFixed(2)} per card.</p>
      </div>

      <div className="border-t border-zinc-100 pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-zinc-800">Employee list</p>
            <p className="text-base text-zinc-500 mt-0.5">
              Upload an Excel or CSV sheet. Columns match this template&apos;s fields. Each row prints that person on the card.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadSampleEmployeeSheet(fields)}
            className="shrink-0 text-base font-bold text-[#064FE0] cursor-pointer"
          >
            Sample Excel
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={reading}
          className="w-full py-2.5 border border-dashed border-zinc-300 hover:border-[#064FE0] text-base font-semibold text-zinc-700 rounded-xl cursor-pointer disabled:opacity-50"
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
        {error && <p className="text-base font-semibold text-red-600">{error}</p>}

        {employees.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-zinc-700">{employees.length} people</p>
              <button
                type="button"
                onClick={() => {
                  setFileName("");
                  setActiveIndex(0);
                  onEmployees([]);
                }}
                className="text-base font-bold text-zinc-500 cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="max-h-48 overflow-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-base">
                <thead className="bg-zinc-50 text-zinc-500 sticky top-0">
                  <tr>
                    {(fields?.length ? fields : [
                      { key: "name", header: "Name", sample: "", layerIds: [] },
                      { key: "title", header: "Title", sample: "", layerIds: [] },
                      { key: "email", header: "Email", sample: "", layerIds: [] },
                    ]).map((field) => (
                      <th key={field.header} className="px-2 py-1.5 font-semibold whitespace-nowrap">{field.header}</th>
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
                      className={`cursor-pointer border-t border-zinc-100 ${
                        activeIndex === index ? "bg-sky-50" : "hover:bg-zinc-50"
                      }`}
                    >
                      {(fields?.length ? fields : [
                        { key: "name", header: "Name", sample: "", layerIds: ["1"] },
                        { key: "title", header: "Title", sample: "", layerIds: ["2"] },
                        { key: "email", header: "Email", sample: "", layerIds: ["4"] },
                      ]).map((field) => (
                        <td key={field.header} className="px-2 py-1.5 text-zinc-700 whitespace-nowrap">
                          {fieldValue(employee, field) || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-base text-zinc-500">Click a person to preview their card. Quantity starts at one card per person — type another number if you need a different print run.</p>
          </div>
        )}
      </div>
    </div>
  );
}
