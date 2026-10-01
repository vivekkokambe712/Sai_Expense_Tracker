import { getDatabase } from "@/lib/mongodb";
import { dateRange, errorResponse } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const match = { ...dateRange(new URL(request.url).searchParams), type: "expense" };
    const expenses = await (await getDatabase()).collection("transactions").aggregate([
      { $match: match },
      { $sort: { amount: -1, date: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, item: 1, category: 1, amount: 1, date: 1 } },
    ]).toArray();
    return Response.json({ expenses });
  } catch (error) {
    return errorResponse(error, "Unable to load business analysis. Please try again.");
  }
}