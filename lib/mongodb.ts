import mongoose from "mongoose";
import dns from "dns";

// Fix for Node.js querySrv ECONNREFUSED on Windows with MongoDB Atlas
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (_) {
  /* ignore */
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI || "";
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable in .env");
  }
  // Automatically fallback to direct replica set seedlist if srv lookup for cluster0 fails on Windows ISP DNS
  if (uri.startsWith("mongodb+srv://") && uri.includes("cluster0.jyqduie.mongodb.net")) {
    const match = uri.match(/mongodb\+srv:\/\/([^@]+)@cluster0\.jyqduie\.mongodb\.net\/([^?]+)/);
    if (match) {
      const auth = match[1];
      const db = match[2] || "new-project";
      return `mongodb://${auth}@ac-zlezbf4-shard-00-00.jyqduie.mongodb.net:27017,ac-zlezbf4-shard-00-01.jyqduie.mongodb.net:27017,ac-zlezbf4-shard-00-02.jyqduie.mongodb.net:27017/${db}?ssl=true&authSource=admin&replicaSet=atlas-cbqmdu-shard-0`;
    }
  }
  return uri;
}

// Global cache to reuse connection across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | undefined;
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

let cached = global._mongooseConn;

async function connectDB(): Promise<typeof mongoose> {
  if (cached) return cached;

  const uri = getMongoUri();

  if (!global._mongoosePromise) {
    global._mongoosePromise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  try {
    cached = await global._mongoosePromise;
    global._mongooseConn = cached;
  } catch (err) {
    global._mongoosePromise = undefined;
    throw err;
  }

  return cached;
}

export default connectDB;
