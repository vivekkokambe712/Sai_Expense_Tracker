import { getDatabase } from "@/lib/mongodb";
import { dateRange, errorResponse, escapeRegex } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const match: Record<string, unknown> = { ...dateRange(params), type: "expense", item: { $nin: [null, ""] } };
    const search = params.get("q")?.trim();
    if (search) match.item = { $nin: [null, ""], $regex: escapeRegex(search), $options: "i" };
    const pipeline: object[] = [
      { $match: match },
      { $group: { _id: "$item", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { count: -1, total: -1 } },
      { $limit: search ? 8 : 10 },
    ];
    const items = await (await getDatabase()).collection("transactions").aggregate(pipeline).toArray();
    return Response.json({ items: items.map((row) => ({ name: row._id, total: row.total, count: row.count })) });
  } catch (error) {
    return errorResponse(error);
  }
}