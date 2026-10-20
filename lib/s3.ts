import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export function getS3Config() {
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
  const bucket = process.env.AWS_S3_BUCKET_NAME || "";

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    isConfigured: Boolean(accessKeyId && secretAccessKey && bucket),
  };
}

export function getS3Client() {
  const { region, accessKeyId, secretAccessKey, isConfigured } = getS3Config();

  if (!isConfigured) {
    throw new Error(
      "AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME in your environment variables."
    );
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export interface S3UploadOptions {
  buffer: Buffer;
  key: string;
  contentType: string;
}

export function publicS3Url(key: string) {
  const { bucket, region } = getS3Config();
  const normalizedKey = key.replace(/^\/+/, "");
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedKey}`;
}

const IMAGE_KEY_RE = /\.(jpe?g|png|gif|webp|svg|ico|avif|bmp)$/i;

export async function listS3Images(options?: {
  prefix?: string;
  maxKeys?: number;
}): Promise<Array<{ url: string; name: string; key: string; lastModified?: string }>> {
  const { bucket } = getS3Config();
  const s3 = getS3Client();
  const prefix = (options?.prefix || "").replace(/^\/+/, "");
  const maxKeys = Math.min(500, Math.max(1, options?.maxKeys ?? 200));

  const out: Array<{ url: string; name: string; key: string; lastModified?: string }> = [];
  let token: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        MaxKeys: Math.min(1000, maxKeys - out.length),
        ContinuationToken: token,
      })
    );

    for (const obj of res.Contents || []) {
      if (!obj.Key || obj.Key.endsWith("/")) continue;
      if (!IMAGE_KEY_RE.test(obj.Key)) continue;
      out.push({
        url: publicS3Url(obj.Key),
        name: obj.Key.split("/").pop() || obj.Key,
        key: obj.Key,
        lastModified: obj.LastModified ? obj.LastModified.toISOString() : undefined,
      });
      if (out.length >= maxKeys) break;
    }

    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token && out.length < maxKeys);

  out.sort((a, b) => {
    const ta = a.lastModified || "";
    const tb = b.lastModified || "";
    return tb.localeCompare(ta);
  });

  return out;
}

export async function uploadToS3({ buffer, key, contentType }: S3UploadOptions): Promise<{ url: string; key: string }> {
  const { bucket } = getS3Config();
  const s3 = getS3Client();

  const normalizedKey = key.replace(/^\/+/, "");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
  });

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: normalizedKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000",
        ACL: "public-read",
      })
    );
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name?: string }).name) : "";
    const aclBlocked =
      name === "AccessControlListNotSupported" || name === "AccessDenied" || name === "InvalidArgument";
    if (!aclBlocked) throw err;
    await s3.send(command);
  }

  return { url: publicS3Url(normalizedKey), key: normalizedKey };
}
