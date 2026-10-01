import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/finance";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await request.json() as { active?: unknown };
    if (!ObjectId.isValid(id) || typeof body.active !== "boolean") return Response.json({ error: "Invalid category update." }, { status: 400 });
    const result = await (await getDatabase()).collection("categories").updateOne({ _id: new ObjectId(id) }, { $set: { active: body.active } });
    return result.matchedCount ? Response.json({ ok: true }) : Response.json({ error: "Category not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Category not found." }, { status: 404 });
    const result = await (await getDatabase()).collection("categories").updateOne({ _id: new ObjectId(id) }, { $set: { active: false } });
    return result.matchedCount ? new Response(null, { status: 204 }) : Response.json({ error: "Category not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}