const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Simple helper to load environment variables from .env / .env.local
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!accessKeyId || !secretAccessKey || !bucketName) {
  console.error("\n❌ AWS S3 credentials missing!");
  console.error("Please ensure the following environment variables are set in .env or .env.local:");
  console.error("  - AWS_ACCESS_KEY_ID");
  console.error("  - AWS_SECRET_ACCESS_KEY");
  console.error("  - AWS_S3_BUCKET_NAME");
  console.error("  - AWS_REGION (optional, default: us-east-1)\n");
  process.exit(1);
}

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".gif":
      return "image/gif";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function uploadAllImages() {
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    console.error("❌ 'public' directory not found.");
    process.exit(1);
  }

  const allFiles = getAllFiles(publicDir);
  const imageFiles = allFiles.filter((filePath) =>
    /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(filePath)
  );

  console.log(`\n🚀 Starting upload of ${imageFiles.length} project images to S3 bucket '${bucketName}'...`);
  console.log(`📍 Region: ${region}\n`);

  let successCount = 0;
  let failCount = 0;
  const uploadedUrls = [];

  for (const filePath of imageFiles) {
    const relativePath = path.relative(publicDir, filePath).replace(/\\/g, "/");
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = getMimeType(filePath);

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: relativePath,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await s3.send(command);

      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${relativePath}`;
      uploadedUrls.push({ key: relativePath, url: s3Url });
      successCount++;
      console.log(`✅ Uploaded (${successCount}/${imageFiles.length}): ${relativePath} -> ${s3Url}`);
    } catch (err) {
      failCount++;
      console.error(`❌ Failed to upload ${relativePath}:`, err.message);
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Batch upload complete!`);
  console.log(`  - Successfully uploaded: ${successCount}`);
  console.log(`  - Failed: ${failCount}`);
  console.log(`==================================================\n`);
}

uploadAllImages();
