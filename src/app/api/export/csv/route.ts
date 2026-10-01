import { getDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/finance";

function cell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    const transactions = await (await getDatabase()).collection("transactions").find({}).sort({ date: -1, createdAt: -1 }).toArray();
    const columns = ["ID", "Date", "Type", "Category", "Item", "Amount", "Payment Method", "Notes", "Created At", "Updated At"];
    const rows = transactions.map((transaction) => [
      transaction._id,
      transaction.date,
      transaction.type,
      transaction.category,
      transaction.item,
      transaction.amount,
      transaction.paymentMethod,
      transaction.notes,
      transaction.createdAt,
      transaction.updatedAt,
    ].map(cell).join(","));
    return new Response([columns.map(cell).join(","), ...rows].join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="printledger-transactions.csv"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}