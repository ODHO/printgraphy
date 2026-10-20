import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getS3Config, uploadToS3 } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and append unique timestamp
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const ext = path.extname(originalName) || ".png";
    const baseName = path.basename(originalName, ext);
    const fileName = `${baseName}_${Date.now()}${ext}`;

    const s3Config = getS3Config();

    if (s3Config.isConfigured) {
      // Upload directly to Amazon S3
      const key = `uploads/${fileName}`;
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

    // Fallback: Save to local public/uploads directory
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
