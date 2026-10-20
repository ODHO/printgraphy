import fs from "fs";
import path from "path";

function esc(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function stream(blocks) {
  const lines = ["BT"];
  for (const block of blocks) {
    lines.push(`/${block.font} ${block.size} Tf`);
    lines.push(`${block.color || "0 0 0"} rg`);
    lines.push(`1 0 0 1 ${block.x} ${block.y} Tm`);
    lines.push(`(${esc(block.text)}) Tj`);
  }
  lines.push("ET");
  return lines.join("\n");
}

const pages = [
  stream([
    { font: "F1", size: 22, x: 54, y: 742, color: "0.12 0.45 0.68", text: "XPrintz User Guide" },
    { font: "F2", size: 11, x: 54, y: 718, color: "0.25 0.25 0.28", text: "How to upload artwork, choose a size, and keep your print safe." },
    { font: "F1", size: 14, x: 54, y: 682, text: "1. Choose a size" },
    { font: "F2", size: 11, x: 54, y: 660, text: "If this product comes in more than one size, the choices sit under the artwork card." },
    { font: "F2", size: 11, x: 54, y: 644, text: "Select the size you want. The card changes to that exact width and height." },
    { font: "F2", size: 11, x: 54, y: 628, text: "A product with one size does not show a size list." },
    { font: "F1", size: 14, x: 54, y: 592, text: "2. Upload your design" },
    { font: "F2", size: 11, x: 54, y: 570, text: "Drop your file on the card, or click Browse Files." },
    { font: "F2", size: 11, x: 54, y: 554, text: "Use Change if you need a different file. Rotate, Fit To Bleed, and Fit To Area" },
    { font: "F2", size: 11, x: 54, y: 538, text: "are in the bar above the card." },
    { font: "F2", size: 11, x: 54, y: 522, text: "Click Next when the preview looks right." },
    { font: "F1", size: 14, x: 54, y: 486, text: "3. Bleed and safe area" },
    { font: "F2", size: 11, x: 54, y: 464, text: "Bleed is the extra edge that is trimmed off. Extend backgrounds and photos" },
    { font: "F2", size: 11, x: 54, y: 448, text: "to the red bleed line so the print does not show a white edge." },
    { font: "F2", size: 11, x: 54, y: 432, text: "The safe area sits inside the trim. Keep text, logos, and important details there." },
    { font: "F2", size: 11, x: 54, y: 416, text: "You can set bleed and safe area separately in inches, mm, cm, or pixels." },
    { font: "F1", size: 14, x: 54, y: 380, text: "4. Finish the order" },
    { font: "F2", size: 11, x: 54, y: 358, text: "Next opens the design review. Check the front and back, then approve the design." },
    { font: "F2", size: 11, x: 54, y: 342, text: "Finish continues to your options and cart." },
    { font: "F2", size: 10, x: 54, y: 64, color: "0.45 0.45 0.48", text: "XPrintz  |  Print guidelines  |  Page 1 of 2" },
  ]),
  stream([
    { font: "F1", size: 18, x: 54, y: 742, color: "0.12 0.45 0.68", text: "Files we accept" },
    { font: "F2", size: 11, x: 54, y: 712, text: "JPG, JPEG, PNG, GIF, WEBP, SVG, PDF, AI, EPS, PSD, PPT, PPTX, TIF, and TIFF." },
    { font: "F2", size: 11, x: 54, y: 696, text: "PDF is the best file when the design is already finished." },
    { font: "F2", size: 11, x: 54, y: 680, text: "Use a high-resolution image so type and photos stay sharp." },
    { font: "F1", size: 14, x: 54, y: 640, text: "Before you send the file" },
    { font: "F2", size: 11, x: 54, y: 616, text: "Match the file to the size you selected. Do not stretch a small file to a larger size." },
    { font: "F2", size: 11, x: 54, y: 600, text: "Leave a margin inside the safe area. Do not place type on the trim edge." },
    { font: "F2", size: 11, x: 54, y: 584, text: "Extend color and photos into the bleed so trimming does not cut them short." },
    { font: "F2", size: 11, x: 54, y: 568, text: "Check spelling, phone numbers, and web addresses on the review screen." },
    { font: "F1", size: 14, x: 54, y: 528, text: "Templates" },
    { font: "F2", size: 11, x: 54, y: 504, text: "PDF, SVG, and Adobe Illustrator buttons on the same panel download a blank" },
    { font: "F2", size: 11, x: 54, y: 488, text: "template for the size you selected. Build your art in that file, then upload it." },
    { font: "F1", size: 14, x: 54, y: 448, text: "Need help" },
    { font: "F2", size: 11, x: 54, y: 424, text: "Use Save Draft if you want to come back later. Your file stays with your account." },
    { font: "F2", size: 11, x: 54, y: 408, text: "If the preview does not match the print you want, change the size and upload again." },
    { font: "F2", size: 10, x: 54, y: 64, color: "0.45 0.45 0.48", text: "XPrintz  |  Print guidelines  |  Page 2 of 2" },
  ]),
];

const objects = [];
function add(body) {
  objects.push(body);
  return objects.length;
}

const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const fontBody = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const contentIds = pages.map((body) => {
  const bytes = Buffer.from(body, "latin1");
  return add(`<< /Length ${bytes.length} >>\nstream\n${body}\nendstream`);
});
const pageIds = contentIds.map((contentId) =>
  add(
    `<< /Type /Page /Parent PAGES 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontBold} 0 R /F2 ${fontBody} 0 R >> >> >>`
  )
);
const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

let pdf = objects
  .map((body, index) => body.replace("Parent PAGES 0 R", `Parent ${pagesId} 0 R`).replace(/^/, `${index + 1} 0 obj\n`) + "\nendobj\n")
  .join("");

const header = "%PDF-1.4\n";
const chunks = [header];
const offsets = [0];
let cursor = Buffer.byteLength(header);
for (let index = 0; index < objects.length; index += 1) {
  const body = objects[index].replace("Parent PAGES 0 R", `Parent ${pagesId} 0 R`);
  const piece = `${index + 1} 0 obj\n${body}\nendobj\n`;
  offsets.push(cursor);
  chunks.push(piece);
  cursor += Buffer.byteLength(piece);
}

let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let index = 1; index <= objects.length; index += 1) {
  xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
}
const trailer = `${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${cursor}\n%%EOF\n`;
const output = Buffer.concat([...chunks.map((part) => Buffer.from(part)), Buffer.from(trailer)]);

const dest = path.join(process.cwd(), "public", "guides", "xprintz-user-guide.pdf");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, output);
console.log(`Wrote ${dest} (${output.length} bytes)`);
