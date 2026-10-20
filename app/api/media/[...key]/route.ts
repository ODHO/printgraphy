import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, getS3Config } from "@/lib/s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const objectKey = key.map((part) => decodeURIComponent(part)).join("/");

  const allowed = Boolean(objectKey) && !objectKey.includes("..") && !objectKey.startsWith("/");

  if (!allowed) {
    return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
  }

  try {
    const { bucket } = getS3Config();
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: bucket, Key: objectKey })
    );
    const bytes = result.Body ? await result.Body.transformToByteArray() : null;
    if (!bytes) {
      return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": result.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[media]", error);
    return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
  }
}
