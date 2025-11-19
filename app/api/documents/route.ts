import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/documents
export async function GET() {
  try {
    const db = getDb();

    const [rows] = await db.execute(
      `SELECT id, title, department, tags, description, access_level, file_url, created_at
       FROM edms_documents
       WHERE is_deleted = 0
       ORDER BY created_at DESC, id DESC`
    );

    return NextResponse.json({ documents: rows });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงรายการเอกสารได้" },
      { status: 500 }
    );
  }
}

// PUT /api/documents?id=...
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { message: "missing id" },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { message: "invalid id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, department, tags, description, access_level } = body as {
      title?: string;
      department?: string;
      tags?: string;
      description?: string;
      access_level?: string;
    };

    if (!title || !department) {
      return NextResponse.json(
        { message: "missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.execute(
      `UPDATE edms_documents
       SET title = ?, department = ?, tags = ?, description = ?, access_level = COALESCE(?, access_level)
       WHERE id = ?`,
      [title, department, tags ?? null, description ?? null, access_level ?? null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถบันทึกการแก้ไขเอกสารได้" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents?id=...
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { message: "missing id" },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { message: "invalid id" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.execute("UPDATE edms_documents SET is_deleted = 1 WHERE id = ?", [id]);

    return NextResponse.json({ success: true, softDeleted: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบเอกสารได้" },
      { status: 500 }
    );
  }
}
