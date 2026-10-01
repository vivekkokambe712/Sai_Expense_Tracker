import { getDatabase } from "@/lib/mongodb";
import { dateRange, errorResponse } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const match = dateRange(new URL(request.url).searchParams);
    const rows = await (await getDatabase()).collection("transactions").aggregate([
      { $match: match },
      { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]).toArray();
    const totals = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
    for (const row of rows) {
      if (row._id === "income") Object.assign(totals, { income: row.total, incomeCount: row.count });
      if (row._id === "expense") Object.assign(totals, { expense: row.total, expenseCount: row.count });
    }
    return Response.json({ ...totals, profit: totals.income - totals.expense });
  } catch (error) {
    return errorResponse(error);
  }
}