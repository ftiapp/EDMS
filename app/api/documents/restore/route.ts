import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/documents/restore
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
    await db.execute(
      `UPDATE edms_documents
       SET is_deleted = 0
       WHERE id = ?`,
      [Number(id)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถกู้คืนเอกสารได้" },
      { status: 500 }
    );
  }
}
