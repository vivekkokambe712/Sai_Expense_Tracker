import { getDatabase } from "@/lib/mongodb";
import { defaults, errorResponse } from "@/lib/finance";

export async function GET() {
  try {
    const collection = (await getDatabase()).collection("categories");
    await collection.createIndex({ type: 1, majorCategory: 1, active: 1, name: 1 }, { unique: true });
    const existing = await collection.countDocuments();
    if (existing === 0) {
      const seeded = [
        ...Object.entries(defaults.expense).flatMap(([majorCategory, names]) =>
          names.map((name) => ({ name, type: "expense", majorCategory, active: true, createdAt: new Date() }))),
        ...Object.entries(defaults.income).flatMap(([majorCategory, names]) =>
          names.map((name) => ({ name, type: "income", majorCategory, active: true, createdAt: new Date() }))),
      ];
      await collection.insertMany(seeded);
    }
    const categories = await collection.find({ active: true }).sort({ majorCategory: 1, type: 1, name: 1 }).toArray();
    return Response.json({ categories: categories.map(({ _id, ...fields }) => ({ ...fields, id: String(_id) })) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: unknown; type?: unknown; majorCategory?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = body.type;
    const majorCategory = body.majorCategory;
    if (!name || name.length > 80 || (type !== "income" && type !== "expense") || (majorCategory !== "home" && majorCategory !== "business")) {
      return Response.json({ error: "Enter a valid category name, type, and major category." }, { status: 400 });
    }
    const collection = (await getDatabase()).collection("categories");
    const existing = await collection.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, type, majorCategory, active: true });
    if (existing) return Response.json({ error: "That category already exists." }, { status: 409 });
    const category = { name, type, majorCategory, active: true, createdAt: new Date() };
    const result = await collection.insertOne(category);
    return Response.json({ category: { ...category, id: result.insertedId.toString() } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}