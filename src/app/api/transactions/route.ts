import { getDatabase } from "@/lib/mongodb";
import { errorResponse, escapeRegex, isValidDate, serialize, validTransaction } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const filter: Record<string, unknown> = {};
    const from = query.get("from");
    const to = query.get("to");
    const type = query.get("type");
    const category = query.get("category");
    const majorCategory = query.get("majorCategory");
    const search = query.get("q")?.trim();
    if (from) filter.date = { $gte: from };
    if (to) filter.date = { ...(filter.date as object || {}), $lte: to };
    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return Response.json({ error: "Invalid date range" }, { status: 400 });
    }
    if (type === "income" || type === "expense") filter.type = type;
    if (majorCategory === "home" || majorCategory === "business") filter.majorCategory = majorCategory;
    if (category) filter.category = category;
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = ["item", "category", "notes"].map((field) => ({ [field]: regex }));
    }

    const page = Math.max(1, Number(query.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.get("limit")) || 50));
    const collection = (await getDatabase()).collection("transactions");
    const [documents, total] = await Promise.all([
      collection.find(filter).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);
    return Response.json({ transactions: documents.map(serialize), page, limit, total });
  } catch (error) {
    return errorResponse(error, "Unable to load transactions. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!validTransaction(body)) return Response.json({ error: "Check the transaction details and try again." }, { status: 400 });
    const now = new Date();
    const document = {
      ...body,
      majorCategory: body.majorCategory,
      category: body.category.trim(),
      item: body.item.trim(),
      notes: body.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const result = await (await getDatabase()).collection("transactions").insertOne(document);
    return Response.json({ transaction: { ...document, id: result.insertedId.toString() } }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save transaction. Please try again.");
  }
}