import mongoose from "mongoose";

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Brak MONGODB_URI w .env");

  await mongoose.connect(uri);
  connected = true;

  console.log("Połączono z MongoDB ✅");
}
