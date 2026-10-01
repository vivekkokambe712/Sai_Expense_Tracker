import { getDatabase } from "@/lib/mongodb";
import { dateRange, errorResponse } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const match = { ...dateRange(new URL(request.url).searchParams), type: "expense" };
    const categories = await (await getDatabase()).collection("transactions").aggregate([
      { $match: match },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray();
    return Response.json({ categories: categories.map((row) => ({ name: row._id, total: row.total, count: row.count })) });
  } catch (error) {
    return errorResponse(error);
  }
}