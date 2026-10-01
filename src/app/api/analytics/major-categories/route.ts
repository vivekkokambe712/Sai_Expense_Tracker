import { getDatabase } from "@/lib/mongodb";
import { dateRange, errorResponse } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const match = dateRange(new URL(request.url).searchParams);
    const rows = await (await getDatabase()).collection("transactions").aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$majorCategory", "home"] },
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
        },
      },
    ]).toArray();

    const totals = {
      home: { income: 0, expense: 0 },
      business: { income: 0, expense: 0 },
    };
    for (const row of rows) {
      if (row._id === "business") totals.business = { income: row.income, expense: row.expense };
      else totals.home = { income: row.income, expense: row.expense };
    }

    return Response.json(totals);
  } catch (error) {
    return errorResponse(error);
  }
}