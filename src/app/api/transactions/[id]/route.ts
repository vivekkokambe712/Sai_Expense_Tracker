import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { errorResponse, serialize, validTransaction } from "@/lib/finance";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Transaction not found." }, { status: 404 });
    const document = await (await getDatabase()).collection("transactions").findOne({ _id: new ObjectId(id) });
    return document ? Response.json({ transaction: serialize(document) }) : Response.json({ error: "Transaction not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Transaction not found." }, { status: 404 });
    const body: unknown = await request.json();
    if (!validTransaction(body)) return Response.json({ error: "Check the transaction details and try again." }, { status: 400 });
    const collection = (await getDatabase()).collection("transactions");
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: {
          ...body,
          majorCategory: body.majorCategory,
          category: body.category.trim(),
          item: body.item.trim(),
          notes: body.notes.trim(),
          updatedAt: new Date(),
        } },
      { returnDocument: "after" },
    );
    return result ? Response.json({ transaction: serialize(result) }) : Response.json({ error: "Transaction not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Transaction not found." }, { status: 404 });
    const result = await (await getDatabase()).collection("transactions").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount ? new Response(null, { status: 204 }) : Response.json({ error: "Transaction not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}