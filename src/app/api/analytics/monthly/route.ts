import { getDatabase } from "@/lib/mongodb";
import { dateRange, errorResponse } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const match = dateRange(new URL(request.url).searchParams);
    const months = await (await getDatabase()).collection("transactions").aggregate([
      { $match: match },
      { $group: { _id: { $substrBytes: ["$date", 0, 7] }, income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } }, expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    return Response.json({ months: months.map((row) => ({ month: row._id, income: row.income, expense: row.expense, profit: row.income - row.expense })) });
  } catch (error) {
    return errorResponse(error);
  }
}