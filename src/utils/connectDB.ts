import "server-only";
import mongoose from "mongoose";

// The connection promise is cached on globalThis so that hot reloads in
// development and simultaneous requests never open more than one connection.
const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
};

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  if (!globalForMongoose.mongooseConnection) {
    globalForMongoose.mongooseConnection = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 }) // fail fast on a wrong URI
      .catch((error) => {
        // Do not cache a failed attempt, so the next request can retry.
        globalForMongoose.mongooseConnection = undefined;
        throw error;
      });
  }

  return globalForMongoose.mongooseConnection;
}