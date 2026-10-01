import { MongoClient } from "mongodb";

const globalMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoIndexesPromise?: Promise<void>;
};

export async function getDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  globalMongo.mongoClientPromise ??= new MongoClient(process.env.MONGODB_URI).connect();
  const database = (await globalMongo.mongoClientPromise).db(process.env.MONGODB_DB || "printledger");
  globalMongo.mongoIndexesPromise ??= Promise.all([
    database.collection("transactions").createIndex({ date: -1 }),
    database.collection("transactions").createIndex({ type: 1, date: -1 }),
    database.collection("transactions").createIndex({ category: 1, date: -1 }),
    database.collection("transactions").createIndex({ item: 1 }),
  ]).then(() => undefined);
  await globalMongo.mongoIndexesPromise;
  return database;
}