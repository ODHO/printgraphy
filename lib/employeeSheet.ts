export interface EmployeeCard {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  /** Custom template columns, keyed by the column header. */
  extras?: Record<string, string>;
}

export interface SheetField {
  /** A standard card field, or a text-layer id for a custom template field. */
  key: string;
  header: string;
  sample: string;
  layerIds: string[];
}

type EmployeeField = "name" | "title" | "phone" | "email" | "address" | "website";
type HeaderSlot = EmployeeField | "first" | "last";

const ALIASES: Record<string, HeaderSlot> = {
  name: "name",
  fullname: "name",
  employeename: "name",
  employee: "name",
  cardname: "name",
  person: "name",
  firstname: "first",
  first: "first",
  givenname: "first",
  lastname: "last",
  last: "last",
  surname: "last",
  title: "title",
  jobtitle: "title",
  job: "title",
  position: "title",
  role: "title",
  designation: "title",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  tel: "phone",
  telephone: "phone",
  cell: "phone",
  email: "email",
  emailaddress: "email",
  mail: "email",
  address: "address",
  officeaddress: "address",
  location: "address",
  website: "website",
  web: "website",
  url: "website",
  site: "website",
};

const LAYER_FIELDS: Record<string, EmployeeField> = {
  "1": "name",
  "2": "title",
  "3": "phone",
  "4": "email",
  "5": "address",
  "back-website": "website",
  "back-email": "email",
};

const COLUMN_ORDER: EmployeeField[] = ["name", "title", "phone", "email", "address", "website"];

const HEADER_LABEL: Record<EmployeeField, string> = {
  name: "Name",
  title: "Title",
  phone: "Phone",
  email: "Email",
  address: "Address",
  website: "Website",
};

const STANDARD_KEYS = new Set<string>(COLUMN_ORDER);

export function isStandardField(key: string): key is EmployeeField {
  return STANDARD_KEYS.has(key);
}

export function sheetFieldsFromLayers(layers: { id?: string; text?: string }[]): SheetField[] {
  const fields: SheetField[] = [];
  const byKey = new Map<string, SheetField>();
  const usedHeaders = new Set<string>();

  layers.forEach((layer, index) => {
    const id = layer.id || `field-${index + 1}`;
    const text = layer.text || "";
    const known = LAYER_FIELDS[id];
    if (known) {
      const existing = byKey.get(known);
      if (existing) {
        existing.layerIds.push(id);
        if (!existing.sample && text.trim()) existing.sample = text.trim();
        return;
      }
      const field: SheetField = {
        key: known,
        header: HEADER_LABEL[known],
        sample: text.trim(),
        layerIds: [id],
      };
      byKey.set(known, field);
      usedHeaders.add(field.header.toLowerCase());
      fields.push(field);
      return;
    }

    const cleaned = text.replace(/[\r\n]+/g, " ").trim();
    let header = cleaned ? cleaned.slice(0, 40) : `Field ${index + 1}`;
    if (usedHeaders.has(header.toLowerCase())) header = `${header} ${index + 1}`;
    usedHeaders.add(header.toLowerCase());
    fields.push({ key: id, header, sample: text.trim(), layerIds: [id] });
  });

  return fields;
}

export function lockTemplateFields(front: { id?: string; text?: string }[], back: { id?: string; text?: string }[]) {
  const fields = sheetFieldsFromLayers([...front, ...back]);
  return { fields, requiredLayerIds: [...new Set(fields.flatMap((field) => field.layerIds))] };
}

export function withCurrentSamples(
  fields: SheetField[],
  layers: { id?: string; text?: string }[]
): SheetField[] {
  return fields.map((field) => {
    const current = layers.find((layer) => !!layer.id && field.layerIds.includes(layer.id) && !!layer.text?.trim());
    return current?.text ? { ...field, sample: current.text.trim() } : field;
  });
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadSampleEmployeeSheet(fields?: SheetField[]) {
  const columns = fields?.length
    ? fields
    : COLUMN_ORDER.map((key) => ({ key, header: HEADER_LABEL[key], sample: "", layerIds: [] }));
  const header = columns.map((field) => csvCell(field.header)).join(",");
  const example = columns.map((field) => csvCell(field.sample)).join(",");
  const csv = [header, example].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "card-fields.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function fieldValue(employee: EmployeeCard, field: SheetField) {
  if (isStandardField(field.key)) return employee[field.key] || "";
  return employee.extras?.[field.header] || "";
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(current.trim());
      current = "";
    } else if (char === "\n") {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else if (char !== "\r") {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value));
}

function emptyEmployee(): EmployeeCard {
  return { name: "", title: "", phone: "", email: "", address: "", website: "", extras: {} };
}

function employeeHasValue(employee: EmployeeCard) {
  if (COLUMN_ORDER.some((field) => employee[field].trim())) return true;
  return Object.values(employee.extras || {}).some((value) => value.trim());
}

export function mapSheetRows(rawRows: unknown[][], fields?: SheetField[]): EmployeeCard[] {
  const rows = rawRows
    .map((row) => row.map(cellText))
    .filter((row) => row.some(Boolean));
  if (!rows.length) return [];

  const headerSlots = rows[0].map((header) => ALIASES[normalizeHeader(header)]);
  const fieldByHeader = new Map((fields || []).map((field) => [normalizeHeader(field.header), field]));
  const hasHeader = headerSlots.some(Boolean) || [...fieldByHeader.keys()].some((key) => rows[0].some((header) => normalizeHeader(header) === key));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map((row) => {
      const employee = emptyEmployee();
      let first = "";
      let last = "";
      if (hasHeader) {
        rows[0].forEach((header, index) => {
          const value = row[index] || "";
          if (!value) return;
          const matched = fieldByHeader.get(normalizeHeader(header));
          if (matched) {
            if (isStandardField(matched.key)) {
              if (!employee[matched.key]) employee[matched.key] = value;
            } else {
              employee.extras![matched.header] = value;
            }
            return;
          }
          const slot = ALIASES[normalizeHeader(header)];
          if (!slot) return;
          if (slot === "first") first = value;
          else if (slot === "last") last = value;
          else if (!employee[slot]) employee[slot] = value;
        });
        if (!employee.name) employee.name = [first, last].filter(Boolean).join(" ");
      } else {
        const order = fields?.length ? fields : COLUMN_ORDER.map((key) => ({ key, header: HEADER_LABEL[key], sample: "", layerIds: [] }));
        order.forEach((field, index) => {
          const value = row[index] || "";
          if (!value) return;
          if (isStandardField(field.key)) employee[field.key] = value;
          else employee.extras![field.header] = value;
        });
      }
      return employee;
    })
    .filter(employeeHasValue);
}

export async function readEmployeeFile(file: File, fields?: SheetField[]): Promise<EmployeeCard[]> {
  const lower = file.name.toLowerCase();
  let rows: unknown[][];
  if (lower.endsWith(".csv") || file.type.includes("csv") || file.type.startsWith("text/")) {
    rows = parseCsv(await file.text());
  } else {
    const { readSheet } = await import("read-excel-file/browser");
    rows = await readSheet(file);
  }
  const employees = mapSheetRows(rows, fields);
  if (!employees.length) {
    const columns = fields?.length ? fields.map((field) => field.header).join(", ") : "Name, Title, Phone, Email, Address, and Website";
    throw new Error(`No people found. Use these columns: ${columns}.`);
  }
  return employees;
}

export function applyEmployeeToLayers<T extends { id: string; text: string }>(
  layers: T[],
  employee: EmployeeCard,
  fields?: SheetField[]
): T[] {
  if (fields?.length) {
    return layers.map((layer) => {
      const field = fields.find((item) => item.layerIds.includes(layer.id));
      if (!field) return layer;
      const value = fieldValue(employee, field).trim();
      return value ? { ...layer, text: value } : layer;
    });
  }

  const hasStandardLayer = layers.some((layer) => LAYER_FIELDS[layer.id]);
  if (hasStandardLayer) {
    return layers.map((layer) => {
      const field = LAYER_FIELDS[layer.id];
      const value = field ? employee[field].trim() : "";
      return value ? { ...layer, text: value } : layer;
    });
  }

  const values = [employee.name, employee.title, employee.phone, employee.email, employee.address].map((value) => value.trim());
  let cursor = 0;
  return layers.map((layer) => {
    const value = values[cursor];
    if (!value) return layer;
    cursor += 1;
    return { ...layer, text: value };
  });
}

export function employeeCardFields(employee: EmployeeCard): Partial<EmployeeCard> {
  return Object.fromEntries(
    COLUMN_ORDER.filter((field) => employee[field].trim()).map((field) => [field, employee[field]])
  );
}
