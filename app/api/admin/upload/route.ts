import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getS3Config, listS3Images, uploadToS3 } from "@/lib/s3";

function sanitizeFolder(raw: string) {
  const cleaned = String(raw || "uploads")
    .replace(/\\/g, "/")
    .replace(/\.\./g, "")
    .replace(/^\/+|\/+$/g, "");
  return cleaned || "uploads";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const ext = path.extname(originalName) || ".png";
    const baseName = path.basename(originalName, ext);
    const fileName = `${baseName}_${Date.now()}${ext}`;

    const folder = sanitizeFolder(String(formData.get("folder") || "uploads"));
    const s3Config = getS3Config();

    if (folder === "categories" && !s3Config.isConfigured) {
      return NextResponse.json(
        { success: false, message: "S3 bucket is not configured. Category images are stored in the bucket." },
        { status: 500 }
      );
    }

    if (s3Config.isConfigured) {
      const key = `${folder}/${fileName}`;
      const { url } = await uploadToS3({
        buffer,
        key,
        contentType: file.type || "image/png",
      });

      return NextResponse.json({
        success: true,
        url,
        fileName,
        storage: "s3",
        message: "File uploaded successfully to Amazon S3",
      });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      storage: "local",
      message: "File uploaded successfully to local storage (public/uploads)",
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const prefix = sanitizeFolder(req.nextUrl.searchParams.get("prefix") || "");
    const maxKeys = Number(req.nextUrl.searchParams.get("limit") || 200) || 200;
    const s3Config = getS3Config();
    const images: Array<{ url: string; name: string; key?: string; storage: string }> = [];

    if (s3Config.isConfigured) {
      const listed = await listS3Images({
        prefix: prefix && prefix !== "uploads" ? `${prefix}/` : "",
        maxKeys,
      });
      for (const img of listed) {
        images.push({ ...img, storage: "s3" });
      }
    }

    // Always include local public/uploads as fallback / hybrid
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      const files = await fs.readdir(uploadsDir);
      for (const f of files) {
        if (!/\.(jpe?g|png|gif|webp|svg|ico|avif|bmp)$/i.test(f)) continue;
        const url = `/uploads/${f}`;
        if (images.some((i) => i.url === url || i.name === f)) continue;
        images.push({ url, name: f, storage: "local" });
      }
    } catch {
      /* ignore local read errors */
    }

    return NextResponse.json({
      success: true,
      images,
      storage: s3Config.isConfigured ? "s3" : "local",
    });
  } catch (error: any) {
    console.error("Error fetching uploads:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch uploads" },
      { status: 500 }
    );
  }
}
