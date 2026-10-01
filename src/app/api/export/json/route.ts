import { getDatabase } from "@/lib/mongodb";
import { errorResponse, serialize } from "@/lib/finance";

export async function GET() {
  try {
    const transactions = await (await getDatabase()).collection("transactions").find({}).sort({ date: -1, createdAt: -1 }).toArray();
    return Response.json(transactions.map(serialize), {
      headers: { "Content-Disposition": 'attachment; filename="printledger-transactions.json"' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}