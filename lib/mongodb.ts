import mongoose from "mongoose";
import dns from "dns";

// Fix for Node.js querySrv ECONNREFUSED on Windows with MongoDB Atlas
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (_) {
  /* ignore */
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
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

  if (!global._mongoosePromise) {
    global._mongoosePromise = mongoose.connect(MONGODB_URI, {
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
