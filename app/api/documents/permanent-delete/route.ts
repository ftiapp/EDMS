import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/documents/permanent-delete
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body as { id?: number };

    if (!id || !Number.isFinite(Number(id))) {
      return NextResponse.json(
        { message: "invalid id" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [result] = await db.execute(
      `DELETE FROM edms_documents WHERE id = ? AND is_deleted = 1`,
      [Number(id)]
    );

    const anyResult: any = result;
    if (!anyResult || !anyResult.affectedRows) {
      return NextResponse.json(
        { message: "ไม่พบเอกสารในถังขยะหรือไม่สามารถลบได้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, permanentlyDeleted: true });
  } catch (error) {
    console.error("Error permanently deleting document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบเอกสารถาวรได้" },
      { status: 500 }
    );
  }
}
